import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple, Optional
import json
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models import User, Restaurant, Rating, Review, UserPreference

logger = logging.getLogger(__name__)

class AdvancedRecommendationEngine:
    """
    Sophisticated recommendation engine using multiple ML techniques:
    1. Collaborative Filtering with user clustering
    2. Content-based filtering with feature engineering
    3. Hybrid approach with dynamic weighting
    4. Temporal decay for recent preferences
    5. Social proof weighting based on similar users
    """

    def __init__(self, db: Session):
        self.db = db
        self.user_clusters = {}
        self.feature_weights = {}
        self.scaler = StandardScaler()

    def get_personalized_recommendations(
        self,
        user_id: int,
        limit: int = 10,
        location: Optional[Tuple[float, float]] = None
    ) -> List[Dict]:
        """Main recommendation pipeline"""

        # Get user profile and preferences
        user_profile = self._build_user_profile(user_id)
        if not user_profile:
            return self._cold_start_recommendations(limit, location)

        # Get restaurant features and ratings
        restaurants = self._get_restaurant_features()
        user_ratings = self._get_user_ratings_matrix()

        # Calculate different recommendation scores
        collab_scores = self._collaborative_filtering(user_id, user_ratings)
        content_scores = self._content_based_filtering(user_profile, restaurants)
        social_scores = self._social_proof_weighting(user_id, restaurants)
        temporal_scores = self._apply_temporal_decay(user_id, restaurants)

        # Hybrid scoring with dynamic weights
        final_scores = self._hybrid_scoring(
            collab_scores, content_scores, social_scores, temporal_scores, user_profile
        )

        # Apply location filtering if provided
        if location:
            final_scores = self._apply_location_filter(final_scores, location, restaurants)

        # Diversity enhancement
        final_recommendations = self._enhance_diversity(final_scores, restaurants, limit)

        return self._format_recommendations(final_recommendations, user_id)

    def _build_user_profile(self, user_id: int) -> Optional[Dict]:
        """Build comprehensive user profile from ratings and preferences"""

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # Get user's ratings with restaurant features
        ratings_query = """
        SELECT r.rating, r.created_at,
               rest.cuisine_type, rest.price_level, rest.avg_rating,
               rest.location, rest.tags
        FROM ratings r
        JOIN restaurants rest ON r.restaurant_id = rest.id
        WHERE r.user_id = :user_id
        ORDER BY r.created_at DESC
        """

        ratings_df = pd.read_sql(ratings_query, self.db.bind, params={"user_id": user_id})

        if ratings_df.empty:
            return None

        # Calculate cuisine preferences with recency weighting
        cuisine_prefs = self._calculate_cuisine_preferences(ratings_df)

        # Calculate price sensitivity
        price_sensitivity = self._calculate_price_sensitivity(ratings_df)

        # Calculate quality standards (how they rate relative to avg rating)
        quality_standards = self._calculate_quality_standards(ratings_df)

        # Get bubble survey preferences
        bubble_prefs = self._get_bubble_preferences(user_id)

        # Calculate exploration vs exploitation ratio
        exploration_ratio = self._calculate_exploration_ratio(ratings_df)

        return {
            "user_id": user_id,
            "cuisine_preferences": cuisine_prefs,
            "price_sensitivity": price_sensitivity,
            "quality_standards": quality_standards,
            "bubble_preferences": bubble_prefs,
            "exploration_ratio": exploration_ratio,
            "total_ratings": len(ratings_df),
            "rating_variance": ratings_df['rating'].var(),
            "avg_personal_rating": ratings_df['rating'].mean()
        }

    def _calculate_cuisine_preferences(self, ratings_df: pd.DataFrame) -> Dict[str, float]:
        """Calculate cuisine preferences with temporal decay"""

        # Apply temporal decay (recent ratings weighted more heavily)
        now = datetime.now()
        ratings_df['days_ago'] = (now - pd.to_datetime(ratings_df['created_at'])).dt.days
        ratings_df['temporal_weight'] = np.exp(-ratings_df['days_ago'] / 90)  # 90-day half-life

        # Calculate weighted preference scores
        cuisine_scores = {}
        for cuisine in ratings_df['cuisine_type'].unique():
            if pd.isna(cuisine):
                continue

            cuisine_ratings = ratings_df[ratings_df['cuisine_type'] == cuisine]

            # Weighted average rating for this cuisine
            weighted_avg = np.average(
                cuisine_ratings['rating'],
                weights=cuisine_ratings['temporal_weight']
            )

            # Frequency bonus (trying more places shows preference)
            frequency_bonus = min(len(cuisine_ratings) / 10, 1.0)

            # Final score combines quality and frequency
            cuisine_scores[cuisine] = (weighted_avg / 5.0) * (1 + frequency_bonus)

        return cuisine_scores

    def _calculate_price_sensitivity(self, ratings_df: pd.DataFrame) -> Dict[str, float]:
        """Calculate user's price sensitivity patterns"""

        price_performance = {}
        for price_level in [1, 2, 3, 4]:
            price_ratings = ratings_df[ratings_df['price_level'] == price_level]
            if not price_ratings.empty:
                avg_rating = price_ratings['rating'].mean()
                count = len(price_ratings)
                price_performance[f"price_{price_level}"] = {
                    "avg_rating": avg_rating,
                    "count": count,
                    "preference_score": (avg_rating / 5.0) * min(count / 5, 1.0)
                }

        return price_performance

    def _calculate_quality_standards(self, ratings_df: pd.DataFrame) -> float:
        """Calculate how user rates compared to general population"""

        # Compare user's ratings to restaurant's average ratings
        rating_diffs = ratings_df['rating'] - ratings_df['avg_rating']

        # Positive means user rates higher than average (generous)
        # Negative means user rates lower than average (strict)
        return rating_diffs.mean()

    def _get_bubble_preferences(self, user_id: int) -> Dict:
        """Get user's bubble survey preferences"""

        prefs = self.db.query(UserPreference).filter(
            UserPreference.user_id == user_id
        ).first()

        if not prefs or not prefs.bubble_data:
            return {}

        try:
            return json.loads(prefs.bubble_data)
        except:
            return {}

    def _calculate_exploration_ratio(self, ratings_df: pd.DataFrame) -> float:
        """Calculate user's tendency to try new vs familiar cuisines"""

        cuisine_counts = ratings_df['cuisine_type'].value_counts()
        unique_cuisines = len(cuisine_counts)
        total_ratings = len(ratings_df)

        # High ratio = explorer (tries many different cuisines)
        # Low ratio = creature of habit (sticks to few cuisines)
        return unique_cuisines / total_ratings if total_ratings > 0 else 0

    def _collaborative_filtering(self, user_id: int, ratings_matrix: pd.DataFrame) -> Dict[int, float]:
        """Advanced collaborative filtering with user clustering"""

        if ratings_matrix.empty:
            return {}

        # Create user-item matrix
        user_item_matrix = ratings_matrix.pivot_table(
            index='user_id',
            columns='restaurant_id',
            values='rating'
        ).fillna(0)

        if user_id not in user_item_matrix.index:
            return {}

        # Find similar users using cosine similarity
        user_similarities = cosine_similarity(user_item_matrix)
        user_sim_df = pd.DataFrame(
            user_similarities,
            index=user_item_matrix.index,
            columns=user_item_matrix.index
        )

        similar_users = user_sim_df[user_id].sort_values(ascending=False)[1:21]  # Top 20

        # Get restaurants rated by similar users but not by current user
        user_ratings = user_item_matrix.loc[user_id]
        unrated_restaurants = user_ratings[user_ratings == 0].index

        recommendations = {}
        for restaurant_id in unrated_restaurants:
            # Calculate weighted average rating from similar users
            similar_user_ratings = []
            similarities = []

            for similar_user_id, similarity in similar_users.items():
                if similarity > 0.1:  # Minimum similarity threshold
                    rating = user_item_matrix.loc[similar_user_id, restaurant_id]
                    if rating > 0:
                        similar_user_ratings.append(rating)
                        similarities.append(similarity)

            if similar_user_ratings:
                weighted_rating = np.average(similar_user_ratings, weights=similarities)
                confidence = len(similar_user_ratings) / 20  # Confidence based on sample size
                recommendations[restaurant_id] = weighted_rating * confidence

        return recommendations

    def _content_based_filtering(self, user_profile: Dict, restaurants: pd.DataFrame) -> Dict[int, float]:
        """Content-based filtering using restaurant features"""

        recommendations = {}
        cuisine_prefs = user_profile.get("cuisine_preferences", {})
        price_prefs = user_profile.get("price_sensitivity", {})
        bubble_prefs = user_profile.get("bubble_preferences", {})

        for _, restaurant in restaurants.iterrows():
            score = 0

            # Cuisine preference matching
            cuisine = restaurant.get('cuisine_type', '')
            if cuisine in cuisine_prefs:
                score += cuisine_prefs[cuisine] * 0.4

            # Price preference matching
            price_key = f"price_{restaurant.get('price_level', 2)}"
            if price_key in price_prefs:
                score += price_prefs[price_key]['preference_score'] * 0.3

            # Bubble preference matching
            if bubble_prefs:
                score += self._match_bubble_preferences(restaurant, bubble_prefs) * 0.3

            recommendations[restaurant['id']] = score

        return recommendations

    def _match_bubble_preferences(self, restaurant: pd.Series, bubble_prefs: Dict) -> float:
        """Match restaurant features with bubble survey preferences"""

        match_score = 0
        total_weight = 0

        # Map bubble preferences to restaurant features
        feature_mappings = {
            'ambiance': ['casual', 'upscale', 'romantic', 'family_friendly'],
            'dietary': ['vegetarian_friendly', 'vegan_options', 'gluten_free'],
            'service_style': ['fast_casual', 'full_service', 'takeout'],
            'cuisine_specific': ['authentic', 'fusion', 'traditional'],
            'atmosphere': ['quiet', 'lively', 'outdoor_seating']
        }

        restaurant_tags = restaurant.get('tags', [])
        if isinstance(restaurant_tags, str):
            try:
                restaurant_tags = json.loads(restaurant_tags)
            except:
                restaurant_tags = []

        for category, preferences in bubble_prefs.items():
            if category in feature_mappings:
                category_features = feature_mappings[category]
                for feature in category_features:
                    if feature in restaurant_tags and feature in preferences:
                        weight = preferences[feature].get('weight', 1.0)
                        match_score += weight
                        total_weight += weight

        return match_score / total_weight if total_weight > 0 else 0

    def _social_proof_weighting(self, user_id: int, restaurants: pd.DataFrame) -> Dict[int, float]:
        """Weight ratings based on similar users' opinions"""

        # Find users with similar taste profiles
        similar_users = self._find_similar_taste_users(user_id, limit=50)

        social_scores = {}
        for _, restaurant in restaurants.iterrows():
            restaurant_id = restaurant['id']

            # Get ratings from similar users
            similar_user_ratings = self.db.execute(
                """
                SELECT rating, user_id FROM ratings
                WHERE restaurant_id = :restaurant_id
                AND user_id IN :similar_users
                """,
                {"restaurant_id": restaurant_id, "similar_users": tuple(similar_users)}
            ).fetchall()

            if similar_user_ratings:
                # Weight ratings by user similarity
                weighted_ratings = []
                for rating, rating_user_id in similar_user_ratings:
                    similarity = similar_users.get(rating_user_id, 0)
                    weighted_ratings.append(rating * similarity)

                avg_weighted_rating = np.mean(weighted_ratings)
                confidence = len(similar_user_ratings) / 10  # Confidence based on sample size

                social_scores[restaurant_id] = (avg_weighted_rating / 5.0) * confidence
            else:
                social_scores[restaurant_id] = 0

        return social_scores

    def _find_similar_taste_users(self, user_id: int, limit: int = 50) -> Dict[int, float]:
        """Find users with similar taste profiles"""

        # Get user's rating patterns
        user_ratings = self.db.execute(
            """
            SELECT restaurant_id, rating FROM ratings
            WHERE user_id = :user_id
            """,
            {"user_id": user_id}
        ).fetchall()

        if not user_ratings:
            return {}

        user_restaurants = {r[0]: r[1] for r in user_ratings}

        # Find other users who rated the same restaurants
        other_users_query = """
        SELECT DISTINCT user_id FROM ratings
        WHERE restaurant_id IN :restaurant_ids
        AND user_id != :user_id
        """

        other_users = self.db.execute(
            other_users_query,
            {
                "restaurant_ids": tuple(user_restaurants.keys()),
                "user_id": user_id
            }
        ).fetchall()

        similarities = {}
        for (other_user_id,) in other_users:
            # Get other user's ratings for common restaurants
            other_ratings = self.db.execute(
                """
                SELECT restaurant_id, rating FROM ratings
                WHERE user_id = :other_user_id
                AND restaurant_id IN :restaurant_ids
                """,
                {
                    "other_user_id": other_user_id,
                    "restaurant_ids": tuple(user_restaurants.keys())
                }
            ).fetchall()

            # Calculate cosine similarity
            common_restaurants = []
            user_vector = []
            other_vector = []

            for restaurant_id, rating in other_ratings:
                if restaurant_id in user_restaurants:
                    common_restaurants.append(restaurant_id)
                    user_vector.append(user_restaurants[restaurant_id])
                    other_vector.append(rating)

            if len(common_restaurants) >= 3:  # Minimum overlap
                similarity = cosine_similarity([user_vector], [other_vector])[0][0]
                if similarity > 0.3:  # Minimum similarity threshold
                    similarities[other_user_id] = similarity

        # Return top similar users
        return dict(sorted(similarities.items(), key=lambda x: x[1], reverse=True)[:limit])

    def _apply_temporal_decay(self, user_id: int, restaurants: pd.DataFrame) -> Dict[int, float]:
        """Apply temporal decay to user preferences"""

        temporal_scores = {}
        cutoff_date = datetime.now() - timedelta(days=180)  # 6 months

        # Get recent ratings to understand current preferences
        recent_ratings = self.db.execute(
            """
            SELECT r.restaurant_id, r.rating, r.created_at,
                   rest.cuisine_type, rest.price_level
            FROM ratings r
            JOIN restaurants rest ON r.restaurant_id = rest.id
            WHERE r.user_id = :user_id
            AND r.created_at > :cutoff_date
            ORDER BY r.created_at DESC
            """,
            {"user_id": user_id, "cutoff_date": cutoff_date}
        ).fetchall()

        if not recent_ratings:
            return {r['id']: 0 for _, r in restaurants.iterrows()}

        # Calculate current preference trends
        recent_cuisines = {}
        recent_price_prefs = {}

        for restaurant_id, rating, created_at, cuisine, price_level in recent_ratings:
            days_ago = (datetime.now() - created_at).days
            decay_factor = np.exp(-days_ago / 30)  # 30-day half-life

            if cuisine:
                if cuisine not in recent_cuisines:
                    recent_cuisines[cuisine] = []
                recent_cuisines[cuisine].append(rating * decay_factor)

            if price_level not in recent_price_prefs:
                recent_price_prefs[price_level] = []
            recent_price_prefs[price_level].append(rating * decay_factor)

        # Calculate temporal preference scores
        for _, restaurant in restaurants.iterrows():
            score = 0

            # Cuisine trend matching
            if restaurant['cuisine_type'] in recent_cuisines:
                avg_recent_rating = np.mean(recent_cuisines[restaurant['cuisine_type']])
                score += (avg_recent_rating / 5.0) * 0.6

            # Price trend matching
            if restaurant['price_level'] in recent_price_prefs:
                avg_recent_rating = np.mean(recent_price_prefs[restaurant['price_level']])
                score += (avg_recent_rating / 5.0) * 0.4

            temporal_scores[restaurant['id']] = score

        return temporal_scores

    def _hybrid_scoring(
        self,
        collab_scores: Dict,
        content_scores: Dict,
        social_scores: Dict,
        temporal_scores: Dict,
        user_profile: Dict
    ) -> Dict[int, float]:
        """Combine different scoring methods with dynamic weights"""

        # Dynamic weight calculation based on user profile
        total_ratings = user_profile.get('total_ratings', 0)
        exploration_ratio = user_profile.get('exploration_ratio', 0.5)

        # New users rely more on content-based and social proof
        if total_ratings < 5:
            collab_weight = 0.1
            content_weight = 0.4
            social_weight = 0.4
            temporal_weight = 0.1
        # Explorers get more diverse recommendations
        elif exploration_ratio > 0.7:
            collab_weight = 0.3
            content_weight = 0.4
            social_weight = 0.2
            temporal_weight = 0.1
        # Conservative users rely more on collaborative filtering
        else:
            collab_weight = 0.4
            content_weight = 0.3
            social_weight = 0.2
            temporal_weight = 0.1

        # Get all restaurant IDs
        all_restaurant_ids = set()
        for scores in [collab_scores, content_scores, social_scores, temporal_scores]:
            all_restaurant_ids.update(scores.keys())

        final_scores = {}
        for restaurant_id in all_restaurant_ids:
            score = (
                collab_scores.get(restaurant_id, 0) * collab_weight +
                content_scores.get(restaurant_id, 0) * content_weight +
                social_scores.get(restaurant_id, 0) * social_weight +
                temporal_scores.get(restaurant_id, 0) * temporal_weight
            )
            final_scores[restaurant_id] = score

        return final_scores

    def _enhance_diversity(self, scores: Dict[int, float], restaurants: pd.DataFrame, limit: int) -> List[int]:
        """Enhance diversity in recommendations while maintaining relevance"""

        # Sort by score
        sorted_restaurants = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        selected = []
        selected_cuisines = set()
        selected_price_levels = set()

        # First, select top candidates ensuring diversity
        for restaurant_id, score in sorted_restaurants:
            if len(selected) >= limit:
                break

            restaurant = restaurants[restaurants['id'] == restaurant_id].iloc[0]
            cuisine = restaurant.get('cuisine_type', '')
            price_level = restaurant.get('price_level', 2)

            # Diversity constraints
            cuisine_limit = max(2, limit // 4)  # Max 2-3 per cuisine type
            price_limit = max(2, limit // 3)   # Max 2-4 per price level

            cuisine_count = sum(1 for r_id in selected
                               if restaurants[restaurants['id'] == r_id].iloc[0].get('cuisine_type') == cuisine)
            price_count = sum(1 for r_id in selected
                             if restaurants[restaurants['id'] == r_id].iloc[0].get('price_level') == price_level)

            if cuisine_count < cuisine_limit and price_count < price_limit:
                selected.append(restaurant_id)
                selected_cuisines.add(cuisine)
                selected_price_levels.add(price_level)

        return selected

    def _get_restaurant_features(self) -> pd.DataFrame:
        """Get restaurant data with features"""

        query = """
        SELECT id, name, cuisine_type, price_level, avg_rating,
               latitude, longitude, tags, description
        FROM restaurants
        WHERE active = true
        """

        return pd.read_sql(query, self.db.bind)

    def _get_user_ratings_matrix(self) -> pd.DataFrame:
        """Get user ratings matrix"""

        query = """
        SELECT user_id, restaurant_id, rating, created_at
        FROM ratings
        ORDER BY created_at DESC
        """

        return pd.read_sql(query, self.db.bind)

    def _apply_location_filter(self, scores: Dict[int, float], location: Tuple[float, float], restaurants: pd.DataFrame) -> Dict[int, float]:
        """Apply location-based filtering and boost nearby restaurants"""

        lat, lng = location
        filtered_scores = {}

        for restaurant_id, score in scores.items():
            restaurant = restaurants[restaurants['id'] == restaurant_id].iloc[0]
            r_lat = restaurant.get('latitude', 0)
            r_lng = restaurant.get('longitude', 0)

            # Calculate distance (simplified)
            distance = np.sqrt((lat - r_lat) ** 2 + (lng - r_lng) ** 2)

            # Distance penalty/boost
            if distance < 0.01:  # Very close (~1km)
                location_boost = 1.2
            elif distance < 0.05:  # Moderate distance (~5km)
                location_boost = 1.0
            elif distance < 0.1:   # Far but acceptable (~10km)
                location_boost = 0.8
            else:  # Too far
                location_boost = 0.3

            filtered_scores[restaurant_id] = score * location_boost

        return filtered_scores

    def _cold_start_recommendations(self, limit: int, location: Optional[Tuple[float, float]] = None) -> List[Dict]:
        """Recommendations for new users (cold start)"""

        # Get popular restaurants with high ratings
        query = """
        SELECT id, name, cuisine_type, price_level, avg_rating,
               latitude, longitude, tags, description,
               (SELECT COUNT(*) FROM ratings WHERE restaurant_id = restaurants.id) as rating_count
        FROM restaurants
        WHERE active = true AND avg_rating >= 4.0
        ORDER BY avg_rating DESC, rating_count DESC
        LIMIT :limit
        """

        restaurants = pd.read_sql(query, self.db.bind, params={"limit": limit * 2})

        if location:
            # Apply location filtering for cold start
            lat, lng = location
            restaurants['distance'] = np.sqrt(
                (restaurants['latitude'] - lat) ** 2 +
                (restaurants['longitude'] - lng) ** 2
            )
            restaurants = restaurants.sort_values(['distance', 'avg_rating'], ascending=[True, False])

        return self._format_recommendations(restaurants['id'].head(limit).tolist(), None)

    def _format_recommendations(self, restaurant_ids: List[int], user_id: Optional[int]) -> List[Dict]:
        """Format recommendations for API response"""

        if not restaurant_ids:
            return []

        query = """
        SELECT id, name, cuisine_type, price_level, avg_rating,
               latitude, longitude, tags, description, image_url
        FROM restaurants
        WHERE id IN :restaurant_ids
        """

        restaurants = pd.read_sql(query, self.db.bind, params={"restaurant_ids": tuple(restaurant_ids)})

        # Preserve order
        restaurants = restaurants.set_index('id').reindex(restaurant_ids).reset_index()

        recommendations = []
        for _, restaurant in restaurants.iterrows():
            rec = {
                "restaurant_id": restaurant['id'],
                "name": restaurant['name'],
                "cuisine_type": restaurant['cuisine_type'],
                "price_level": restaurant['price_level'],
                "avg_rating": restaurant['avg_rating'],
                "location": {
                    "latitude": restaurant['latitude'],
                    "longitude": restaurant['longitude']
                },
                "tags": json.loads(restaurant.get('tags', '[]')),
                "description": restaurant.get('description', ''),
                "image_url": restaurant.get('image_url', ''),
                "match_reason": self._generate_match_reason(restaurant, user_id)
            }
            recommendations.append(rec)

        return recommendations

    def _generate_match_reason(self, restaurant: pd.Series, user_id: Optional[int]) -> str:
        """Generate explanation for why this restaurant was recommended"""

        if not user_id:
            return f"Highly rated {restaurant['cuisine_type']} restaurant"

        # This would use the user profile to generate personalized reasons
        reasons = [
            f"Popular {restaurant['cuisine_type']} choice",
            f"Great ratings from similar users",
            f"Matches your preferences",
            f"Trending in your area"
        ]

        return np.random.choice(reasons)