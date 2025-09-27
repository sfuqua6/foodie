import fake_redis  # Use fake Redis for local development
import redis
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sklearn.metrics.pairwise import cosine_similarity
from geopy.distance import geodesic
import logging

from ..models import User, Restaurant, Rating, UserPreference
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class RecommendationEngine:
    def __init__(self):
        try:
            self.redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            self.redis_client.ping()
        except (redis.ConnectionError, redis.RedisError) as e:
            logger.warning(f"Redis connection failed: {e}. Recommendations will not be cached.")
            self.redis_client = None

    def get_recommendations(
        self,
        db: Session,
        user: User,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
        max_distance: float = 10.0,
        cuisine_filter: List[str] = None,
        price_filter: List[int] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get personalized restaurant recommendations for a user."""

        # Use user's stored location if not provided
        if user_lat is None:
            user_lat = user.location_lat or settings.chapel_hill_lat
        if user_lng is None:
            user_lng = user.location_lng or settings.chapel_hill_lng

        # Check cache first
        cache_key = self._get_cache_key(user.id, user_lat, user_lng, max_distance, cuisine_filter, price_filter, limit)
        if self.redis_client:
            try:
                cached_result = self.redis_client.get(cache_key)
                if cached_result:
                    return json.loads(cached_result)
            except (redis.RedisError, json.JSONDecodeError):
                pass

        # Get candidate restaurants
        restaurants = self._get_candidate_restaurants(
            db, user_lat, user_lng, max_distance, cuisine_filter, price_filter
        )

        if not restaurants:
            return []

        # Get user's rating history
        user_ratings = db.query(Rating).filter(Rating.user_id == user.id).all()
        user_rating_dict = {r.restaurant_id: r.rating for r in user_ratings}

        # Calculate scores
        recommendations = []
        for restaurant in restaurants:
            score = self._calculate_restaurant_score(db, user, restaurant, user_rating_dict)
            distance = geodesic((user_lat, user_lng), (restaurant.latitude, restaurant.longitude)).kilometers

            recommendations.append({
                "restaurant": restaurant,
                "score": score,
                "distance": distance,
                "reasoning": self._generate_reasoning(user, restaurant, score)
            })

        # Sort by score and limit results
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        recommendations = recommendations[:limit]

        # Format results
        formatted_results = self._format_recommendations(recommendations)

        # Cache results for 30 minutes
        if self.redis_client:
            try:
                self.redis_client.setex(cache_key, 1800, json.dumps(formatted_results, default=str))
            except redis.RedisError:
                pass

        return formatted_results

    def _get_candidate_restaurants(
        self,
        db: Session,
        user_lat: float,
        user_lng: float,
        max_distance: float,
        cuisine_filter: List[str] = None,
        price_filter: List[int] = None
    ) -> List[Restaurant]:
        """Get candidate restaurants within distance and filter criteria."""

        query = db.query(Restaurant).filter(Restaurant.is_active == True)

        # Apply cuisine filter
        if cuisine_filter:
            query = query.filter(Restaurant.cuisine_type.in_(cuisine_filter))

        # Apply price filter
        if price_filter:
            query = query.filter(Restaurant.price_level.in_(price_filter))

        restaurants = query.all()

        # Filter by distance
        filtered_restaurants = []
        for restaurant in restaurants:
            distance = geodesic((user_lat, user_lng), (restaurant.latitude, restaurant.longitude)).kilometers
            if distance <= max_distance:
                filtered_restaurants.append(restaurant)

        return filtered_restaurants

    def _calculate_restaurant_score(
        self,
        db: Session,
        user: User,
        restaurant: Restaurant,
        user_rating_dict: Dict[int, float]
    ) -> float:
        """Calculate a recommendation score for a restaurant."""

        # Skip if user already rated this restaurant
        if restaurant.id in user_rating_dict:
            return 0.0

        # Base score from restaurant ratings
        base_score = 0.0
        if restaurant.avg_rating > 0:
            base_score += restaurant.avg_rating * 0.3
        if restaurant.google_rating:
            base_score += restaurant.google_rating * 0.2

        # Collaborative filtering component
        collaborative_score = self._calculate_collaborative_score(db, user, restaurant, user_rating_dict)

        # Content-based filtering component
        content_score = self._calculate_content_score(user, restaurant)

        # Popularity boost
        popularity_score = 0.0
        if restaurant.rating_count > 0:
            popularity_score = min(np.log(restaurant.rating_count + 1) * 0.1, 0.5)

        # Combine scores
        total_score = base_score + collaborative_score + content_score + popularity_score

        return min(total_score, 5.0)  # Cap at 5.0

    def _calculate_collaborative_score(
        self,
        db: Session,
        user: User,
        restaurant: Restaurant,
        user_rating_dict: Dict[int, float]
    ) -> float:
        """Calculate collaborative filtering score."""

        if not user_rating_dict:
            return 0.0

        # Find users who rated this restaurant
        restaurant_ratings = db.query(Rating).filter(Rating.restaurant_id == restaurant.id).all()

        if len(restaurant_ratings) < 2:
            return 0.0

        # Create user-item matrix for similarity calculation
        user_similarities = []
        for rating in restaurant_ratings:
            other_user_ratings = db.query(Rating).filter(Rating.user_id == rating.user_id).all()
            other_user_dict = {r.restaurant_id: r.rating for r in other_user_ratings}

            # Calculate similarity based on common restaurants
            similarity = self._calculate_user_similarity(user_rating_dict, other_user_dict)
            if similarity > 0:
                user_similarities.append((similarity, rating.rating))

        if not user_similarities:
            return 0.0

        # Weighted average of similar users' ratings
        total_weight = sum(sim for sim, _ in user_similarities)
        if total_weight == 0:
            return 0.0

        weighted_sum = sum(sim * rating for sim, rating in user_similarities)
        collaborative_score = (weighted_sum / total_weight) * 0.4

        return collaborative_score

    def _calculate_content_score(self, user: User, restaurant: Restaurant) -> float:
        """Calculate content-based filtering score."""

        score = 0.0

        # Cuisine preference
        if user.preferred_cuisines and restaurant.cuisine_type:
            if restaurant.cuisine_type in user.preferred_cuisines:
                score += 0.5

        # Price level preference
        if user.preferred_price_levels and restaurant.price_level:
            if restaurant.price_level in user.preferred_price_levels:
                score += 0.3

        return score

    def _calculate_user_similarity(self, user1_ratings: Dict[int, float], user2_ratings: Dict[int, float]) -> float:
        """Calculate similarity between two users based on their ratings."""

        common_restaurants = set(user1_ratings.keys()) & set(user2_ratings.keys())

        if len(common_restaurants) < 2:
            return 0.0

        ratings1 = np.array([user1_ratings[r] for r in common_restaurants])
        ratings2 = np.array([user2_ratings[r] for r in common_restaurants])

        # Calculate cosine similarity
        similarity_matrix = cosine_similarity([ratings1], [ratings2])
        return max(0, similarity_matrix[0][0])

    def _generate_reasoning(self, user: User, restaurant: Restaurant, score: float) -> str:
        """Generate human-readable reasoning for the recommendation."""

        reasons = []

        if restaurant.avg_rating > 4.0:
            reasons.append(f"Highly rated ({restaurant.avg_rating:.1f}/5)")

        if user.preferred_cuisines and restaurant.cuisine_type in user.preferred_cuisines:
            reasons.append(f"Matches your preferred {restaurant.cuisine_type} cuisine")

        if user.preferred_price_levels and restaurant.price_level in user.preferred_price_levels:
            price_labels = {1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}
            reasons.append(f"Matches your preferred price range ({price_labels.get(restaurant.price_level, 'N/A')})")

        if restaurant.google_rating and restaurant.google_rating > 4.0:
            reasons.append(f"Popular on Google ({restaurant.google_rating:.1f}/5)")

        if not reasons:
            reasons.append("New restaurant to explore")

        return ", ".join(reasons)

    def _get_cache_key(
        self,
        user_id: int,
        lat: float,
        lng: float,
        max_distance: float,
        cuisine_filter: List[str],
        price_filter: List[int],
        limit: int
    ) -> str:
        """Generate cache key for recommendations."""

        cuisine_str = ",".join(sorted(cuisine_filter)) if cuisine_filter else ""
        price_str = ",".join(map(str, sorted(price_filter))) if price_filter else ""

        return f"rec:{user_id}:{lat:.3f}:{lng:.3f}:{max_distance}:{cuisine_str}:{price_str}:{limit}"

    def update_user_preferences(self, db: Session, user_id: int):
        """Update user preferences based on rating history."""

        user_ratings = db.query(Rating).filter(Rating.user_id == user_id).all()

        if not user_ratings:
            return

        # Get restaurants for these ratings
        restaurant_ids = [r.restaurant_id for r in user_ratings]
        restaurants = db.query(Restaurant).filter(Restaurant.id.in_(restaurant_ids)).all()
        restaurant_dict = {r.id: r for r in restaurants}

        # Calculate cuisine preferences
        cuisine_scores = {}
        price_level_scores = {}
        total_ratings = len(user_ratings)
        avg_rating_given = sum(r.rating for r in user_ratings) / total_ratings

        for rating in user_ratings:
            restaurant = restaurant_dict.get(rating.restaurant_id)
            if not restaurant:
                continue

            # Weight by how much above/below average this rating was
            weight = (rating.rating - avg_rating_given + 2.5) / 5.0  # Normalize to 0-1
            weight = max(0.1, weight)  # Minimum weight

            if restaurant.cuisine_type:
                cuisine_scores[restaurant.cuisine_type] = cuisine_scores.get(restaurant.cuisine_type, 0) + weight

            if restaurant.price_level:
                price_level_scores[str(restaurant.price_level)] = price_level_scores.get(str(restaurant.price_level), 0) + weight

        # Normalize scores
        if cuisine_scores:
            max_cuisine_score = max(cuisine_scores.values())
            for cuisine in cuisine_scores:
                cuisine_scores[cuisine] /= max_cuisine_score

        if price_level_scores:
            max_price_score = max(price_level_scores.values())
            for price in price_level_scores:
                price_level_scores[price] /= max_price_score

        # Update or create user preferences
        preference = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        if not preference:
            preference = UserPreference(user_id=user_id)
            db.add(preference)

        preference.cuisine_scores = cuisine_scores
        preference.price_level_scores = price_level_scores
        preference.total_ratings = total_ratings
        preference.avg_rating_given = avg_rating_given

        db.commit()

    def get_trending_recommendations(
        self,
        db: Session,
        user: User,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get trending restaurants based on recent high ratings and activity."""

        if user_lat is None:
            user_lat = user.location_lat or settings.chapel_hill_lat
        if user_lng is None:
            user_lng = user.location_lng or settings.chapel_hill_lng

        # Get restaurants with high ratings and decent rating counts
        restaurants = self._get_candidate_restaurants(db, user_lat, user_lng, 15.0)

        # Sort by combination of rating and rating count for "trending"
        trending_restaurants = []
        for restaurant in restaurants:
            # Skip if user already rated
            user_rating = db.query(Rating).filter(
                Rating.user_id == user.id,
                Rating.restaurant_id == restaurant.id
            ).first()
            if user_rating:
                continue

            # Trending score: higher rating + more ratings = more trending
            trending_score = 0.0
            if restaurant.avg_rating > 0:
                trending_score += restaurant.avg_rating * 0.6
            if restaurant.rating_count > 0:
                trending_score += min(np.log(restaurant.rating_count + 1) * 0.4, 2.0)
            if restaurant.google_rating:
                trending_score += restaurant.google_rating * 0.2

            distance = geodesic((user_lat, user_lng), (restaurant.latitude, restaurant.longitude)).kilometers

            trending_restaurants.append({
                "restaurant": restaurant,
                "score": trending_score,
                "distance": distance,
                "reasoning": f"Trending with {restaurant.avg_rating:.1f}/5 rating, {restaurant.rating_count} reviews"
            })

        # Sort by trending score and limit
        trending_restaurants.sort(key=lambda x: x["score"], reverse=True)
        trending_restaurants = trending_restaurants[:limit]

        # Format results
        return self._format_recommendations(trending_restaurants)

    def get_similar_recommendations(
        self,
        db: Session,
        user: User,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get restaurants similar to ones the user has rated highly."""

        if user_lat is None:
            user_lat = user.location_lat or settings.chapel_hill_lat
        if user_lng is None:
            user_lng = user.location_lng or settings.chapel_hill_lng

        # Get user's high ratings (4+ stars)
        high_ratings = db.query(Rating).filter(
            Rating.user_id == user.id,
            Rating.rating >= 4.0
        ).all()

        if not high_ratings:
            # Fallback to regular recommendations if no high ratings
            return self.get_recommendations(db, user, user_lat, user_lng, limit=limit)

        # Get restaurants user rated highly
        liked_restaurant_ids = [r.restaurant_id for r in high_ratings]
        liked_restaurants = db.query(Restaurant).filter(Restaurant.id.in_(liked_restaurant_ids)).all()

        # Extract cuisines and price levels from liked restaurants
        liked_cuisines = list(set([r.cuisine_type for r in liked_restaurants if r.cuisine_type]))
        liked_price_levels = list(set([r.price_level for r in liked_restaurants if r.price_level]))

        # Get candidate restaurants with similar attributes
        similar_restaurants = []
        candidates = self._get_candidate_restaurants(db, user_lat, user_lng, 15.0)

        for restaurant in candidates:
            # Skip if user already rated
            user_rating = db.query(Rating).filter(
                Rating.user_id == user.id,
                Rating.restaurant_id == restaurant.id
            ).first()
            if user_rating:
                continue

            # Calculate similarity score
            similarity_score = 0.0

            # Cuisine similarity
            if restaurant.cuisine_type in liked_cuisines:
                similarity_score += 1.0

            # Price level similarity
            if restaurant.price_level in liked_price_levels:
                similarity_score += 0.6

            # Base rating boost
            if restaurant.avg_rating > 0:
                similarity_score += restaurant.avg_rating * 0.3

            distance = geodesic((user_lat, user_lng), (restaurant.latitude, restaurant.longitude)).kilometers

            similar_restaurants.append({
                "restaurant": restaurant,
                "score": similarity_score,
                "distance": distance,
                "reasoning": f"Similar to restaurants you've loved - {restaurant.cuisine_type} cuisine"
            })

        # Sort by similarity score and limit
        similar_restaurants.sort(key=lambda x: x["score"], reverse=True)
        similar_restaurants = similar_restaurants[:limit]

        return self._format_recommendations(similar_restaurants)

    def _format_recommendations(self, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format recommendation results consistently."""

        formatted_results = []
        for rec in recommendations:
            restaurant_data = {
                "id": rec["restaurant"].id,
                "name": rec["restaurant"].name,
                "address": rec["restaurant"].address,
                "phone": rec["restaurant"].phone,
                "website": rec["restaurant"].website,
                "cuisine_type": rec["restaurant"].cuisine_type,
                "price_level": rec["restaurant"].price_level,
                "latitude": rec["restaurant"].latitude,
                "longitude": rec["restaurant"].longitude,
                "google_rating": rec["restaurant"].google_rating,
                "google_rating_count": rec["restaurant"].google_rating_count,
                "avg_rating": rec["restaurant"].avg_rating,
                "rating_count": rec["restaurant"].rating_count,
                "distance": rec["distance"],
                "recommendation_score": rec["score"],
                "reasoning": rec["reasoning"]
            }
            formatted_results.append(restaurant_data)

        return formatted_results