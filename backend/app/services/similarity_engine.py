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
from sqlalchemy import text

from ..models import (
    User, Restaurant, Rating, Review, BubblePreference,
    UserSimilarity, RestaurantFeatures, WeightedRating
)

logger = logging.getLogger(__name__)

class SimilarityEngine:
    """
    Computes and maintains user similarities for collaborative filtering.
    Runs as a background service to keep similarity data fresh.
    """

    def __init__(self, db: Session):
        self.db = db
        self.scaler = StandardScaler()

    def update_all_similarities(self) -> Dict[str, int]:
        """Update all user similarities - run this periodically"""

        logger.info("Starting full similarity computation...")

        stats = {
            "users_processed": 0,
            "similarities_computed": 0,
            "clusters_updated": 0,
            "weighted_ratings_updated": 0
        }

        try:
            # Get all active users with ratings
            users_with_ratings = self._get_users_with_ratings()
            logger.info(f"Found {len(users_with_ratings)} users with ratings")

            if len(users_with_ratings) < 2:
                logger.warning("Not enough users with ratings for similarity computation")
                return stats

            # Compute rating-based similarities
            rating_similarities = self._compute_rating_similarities(users_with_ratings)
            stats["similarities_computed"] += len(rating_similarities)

            # Compute preference-based similarities (bubble survey)
            preference_similarities = self._compute_preference_similarities(users_with_ratings)

            # Combine similarities and store
            self._store_combined_similarities(rating_similarities, preference_similarities)

            # Update user clusters
            cluster_assignments = self._update_user_clusters(users_with_ratings)
            stats["clusters_updated"] = len(cluster_assignments)

            # Update weighted ratings for each cluster
            for cluster_id in set(cluster_assignments.values()):
                weighted_count = self._update_cluster_weighted_ratings(cluster_id)
                stats["weighted_ratings_updated"] += weighted_count

            stats["users_processed"] = len(users_with_ratings)

            logger.info(f"Similarity computation complete: {stats}")
            return stats

        except Exception as e:
            logger.error(f"Error in similarity computation: {str(e)}")
            raise

    def _get_users_with_ratings(self) -> List[int]:
        """Get users who have submitted ratings"""

        result = self.db.execute(
            text("""
            SELECT DISTINCT user_id
            FROM ratings
            WHERE created_at > :cutoff_date
            ORDER BY user_id
            """),
            {"cutoff_date": datetime.now() - timedelta(days=365)}
        ).fetchall()

        return [row[0] for row in result]

    def _compute_rating_similarities(self, user_ids: List[int]) -> Dict[Tuple[int, int], float]:
        """Compute rating-based similarities using collaborative filtering"""

        logger.info("Computing rating similarities...")

        # Get rating matrix
        ratings_query = text("""
        SELECT user_id, restaurant_id, rating
        FROM ratings
        WHERE user_id = ANY(:user_ids)
        AND created_at > :cutoff_date
        """)

        ratings_df = pd.read_sql(
            ratings_query,
            self.db.bind,
            params={
                "user_ids": user_ids,
                "cutoff_date": datetime.now() - timedelta(days=365)
            }
        )

        if ratings_df.empty:
            return {}

        # Create user-item matrix
        user_item_matrix = ratings_df.pivot_table(
            index='user_id',
            columns='restaurant_id',
            values='rating'
        ).fillna(0)

        # Compute cosine similarity
        similarity_matrix = cosine_similarity(user_item_matrix)

        # Convert to dictionary format
        similarities = {}
        user_list = user_item_matrix.index.tolist()

        for i, user1 in enumerate(user_list):
            for j, user2 in enumerate(user_list):
                if i < j and similarity_matrix[i][j] > 0.1:  # Minimum threshold
                    similarities[(user1, user2)] = float(similarity_matrix[i][j])

        logger.info(f"Computed {len(similarities)} rating similarities")
        return similarities

    def _compute_preference_similarities(self, user_ids: List[int]) -> Dict[Tuple[int, int], float]:
        """Compute preference-based similarities from bubble surveys"""

        logger.info("Computing preference similarities...")

        # Get bubble preferences for these users
        bubble_prefs = self.db.query(BubblePreference).filter(
            BubblePreference.user_id.in_(user_ids),
            BubblePreference.preference_vector.isnot(None)
        ).all()

        if len(bubble_prefs) < 2:
            logger.info("Not enough bubble preferences for similarity computation")
            return {}

        # Create preference matrix
        preference_data = []
        user_preference_map = {}

        for pref in bubble_prefs:
            if pref.preference_vector:
                preference_data.append(pref.preference_vector)
                user_preference_map[len(preference_data) - 1] = pref.user_id

        if len(preference_data) < 2:
            return {}

        preference_matrix = np.array(preference_data)
        similarity_matrix = cosine_similarity(preference_matrix)

        # Convert to dictionary format
        similarities = {}
        for i in range(len(preference_data)):
            for j in range(i + 1, len(preference_data)):
                if similarity_matrix[i][j] > 0.2:  # Higher threshold for preferences
                    user1 = user_preference_map[i]
                    user2 = user_preference_map[j]
                    similarities[(user1, user2)] = float(similarity_matrix[i][j])

        logger.info(f"Computed {len(similarities)} preference similarities")
        return similarities

    def _store_combined_similarities(
        self,
        rating_sims: Dict[Tuple[int, int], float],
        pref_sims: Dict[Tuple[int, int], float]
    ):
        """Combine and store similarity data"""

        logger.info("Storing combined similarities...")

        # Clear old similarities (older than 7 days)
        cutoff_date = datetime.now() - timedelta(days=7)
        self.db.query(UserSimilarity).filter(
            UserSimilarity.last_computed < cutoff_date
        ).delete()

        # Combine similarities
        all_user_pairs = set(rating_sims.keys()) | set(pref_sims.keys())

        batch_size = 1000
        batch = []

        for user1, user2 in all_user_pairs:
            rating_sim = rating_sims.get((user1, user2), 0.0)
            pref_sim = pref_sims.get((user1, user2), 0.0)

            # Weighted combination (rating similarity gets higher weight)
            overall_sim = (rating_sim * 0.7 + pref_sim * 0.3)

            if overall_sim > 0.15:  # Only store meaningful similarities
                # Check if similarity already exists
                existing = self.db.query(UserSimilarity).filter(
                    ((UserSimilarity.user_1_id == user1) & (UserSimilarity.user_2_id == user2)) |
                    ((UserSimilarity.user_1_id == user2) & (UserSimilarity.user_2_id == user1))
                ).first()

                if existing:
                    # Update existing
                    existing.rating_similarity = rating_sim
                    existing.preference_similarity = pref_sim
                    existing.overall_similarity = overall_sim
                    existing.last_computed = datetime.now()
                else:
                    # Create new
                    batch.append(UserSimilarity(
                        user_1_id=min(user1, user2),
                        user_2_id=max(user1, user2),
                        rating_similarity=rating_sim,
                        preference_similarity=pref_sim,
                        overall_similarity=overall_sim,
                        last_computed=datetime.now()
                    ))

                if len(batch) >= batch_size:
                    self.db.add_all(batch)
                    self.db.commit()
                    batch = []

        # Add remaining batch
        if batch:
            self.db.add_all(batch)

        self.db.commit()
        logger.info(f"Stored similarities for {len(all_user_pairs)} user pairs")

    def _update_user_clusters(self, user_ids: List[int]) -> Dict[int, int]:
        """Update user clusters based on similarities"""

        logger.info("Updating user clusters...")

        # Get similarity matrix
        similarities = self.db.query(UserSimilarity).filter(
            UserSimilarity.user_1_id.in_(user_ids),
            UserSimilarity.user_2_id.in_(user_ids),
            UserSimilarity.overall_similarity > 0.2
        ).all()

        if len(similarities) < 10:  # Need minimum connections
            logger.info("Not enough similarities for clustering")
            return {}

        # Create similarity matrix for clustering
        user_idx_map = {user_id: idx for idx, user_id in enumerate(user_ids)}
        n_users = len(user_ids)
        sim_matrix = np.zeros((n_users, n_users))

        for sim in similarities:
            i = user_idx_map.get(sim.user_1_id)
            j = user_idx_map.get(sim.user_2_id)
            if i is not None and j is not None:
                sim_matrix[i][j] = sim.overall_similarity
                sim_matrix[j][i] = sim.overall_similarity

        # Perform clustering
        n_clusters = min(max(2, len(user_ids) // 10), 20)  # Dynamic cluster count

        # Convert similarity to distance for clustering
        distance_matrix = 1 - sim_matrix

        try:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(distance_matrix)

            # Update user cluster assignments
            cluster_assignments = {}
            for idx, user_id in enumerate(user_ids):
                cluster_id = int(cluster_labels[idx])
                cluster_assignments[user_id] = cluster_id

                # Update user record
                user = self.db.query(User).filter(User.id == user_id).first()
                if user:
                    user.similarity_cluster = cluster_id

            self.db.commit()
            logger.info(f"Updated clusters for {len(cluster_assignments)} users")
            return cluster_assignments

        except Exception as e:
            logger.error(f"Clustering failed: {str(e)}")
            return {}

    def _update_cluster_weighted_ratings(self, cluster_id: int) -> int:
        """Update weighted ratings for a specific cluster"""

        logger.info(f"Updating weighted ratings for cluster {cluster_id}")

        # Get users in this cluster
        cluster_users = self.db.query(User).filter(
            User.similarity_cluster == cluster_id
        ).all()

        user_ids = [user.id for user in cluster_users]
        if len(user_ids) < 3:  # Need minimum users for meaningful weights
            return 0

        # Get all restaurants rated by cluster users
        restaurants_query = text("""
        SELECT DISTINCT restaurant_id
        FROM ratings
        WHERE user_id = ANY(:user_ids)
        """)

        restaurant_results = self.db.execute(
            restaurants_query,
            {"user_ids": user_ids}
        ).fetchall()

        restaurant_ids = [row[0] for row in restaurant_results]

        updated_count = 0

        # Calculate weighted ratings for each restaurant
        for restaurant_id in restaurant_ids:
            weighted_data = self._calculate_weighted_rating(restaurant_id, user_ids)

            if weighted_data:
                # Update or create weighted rating record
                existing = self.db.query(WeightedRating).filter(
                    WeightedRating.restaurant_id == restaurant_id,
                    WeightedRating.user_cluster == cluster_id
                ).first()

                if existing:
                    # Update existing
                    existing.weighted_avg_rating = weighted_data['avg_rating']
                    existing.confidence_score = weighted_data['confidence']
                    existing.total_ratings = weighted_data['total_ratings']
                    existing.rating_variance = weighted_data['variance']
                    existing.recent_trend = weighted_data['trend']
                    existing.last_computed = datetime.now()
                else:
                    # Create new
                    new_weighted = WeightedRating(
                        restaurant_id=restaurant_id,
                        user_cluster=cluster_id,
                        weighted_avg_rating=weighted_data['avg_rating'],
                        confidence_score=weighted_data['confidence'],
                        total_ratings=weighted_data['total_ratings'],
                        rating_variance=weighted_data['variance'],
                        recent_trend=weighted_data['trend'],
                        last_computed=datetime.now()
                    )
                    self.db.add(new_weighted)

                updated_count += 1

        self.db.commit()
        logger.info(f"Updated {updated_count} weighted ratings for cluster {cluster_id}")
        return updated_count

    def _calculate_weighted_rating(self, restaurant_id: int, user_ids: List[int]) -> Optional[Dict]:
        """Calculate weighted rating for a restaurant within a user cluster"""

        # Get ratings from cluster users
        ratings_query = text("""
        SELECT r.rating, r.created_at, u.similarity_cluster,
               COUNT(*) OVER (PARTITION BY r.user_id) as user_total_ratings
        FROM ratings r
        JOIN users u ON r.user_id = u.id
        WHERE r.restaurant_id = :restaurant_id
        AND r.user_id = ANY(:user_ids)
        AND r.created_at > :cutoff_date
        ORDER BY r.created_at DESC
        """)

        ratings_df = pd.read_sql(
            ratings_query,
            self.db.bind,
            params={
                "restaurant_id": restaurant_id,
                "user_ids": user_ids,
                "cutoff_date": datetime.now() - timedelta(days=365)
            }
        )

        if ratings_df.empty:
            return None

        # Calculate weighted average with various factors
        weights = []
        ratings = []

        for _, row in ratings_df.iterrows():
            rating = row['rating']
            created_at = pd.to_datetime(row['created_at'])
            user_total_ratings = row['user_total_ratings']

            # Base weight
            weight = 1.0

            # Time decay (more recent ratings have higher weight)
            days_old = (datetime.now() - created_at.to_pydatetime()).days
            time_weight = np.exp(-days_old / 180)  # 180-day half-life
            weight *= time_weight

            # User experience weight (users with more ratings get higher weight)
            experience_weight = min(user_total_ratings / 20, 2.0)  # Cap at 2x weight
            weight *= experience_weight

            weights.append(weight)
            ratings.append(rating)

        # Calculate weighted statistics
        weights = np.array(weights)
        ratings = np.array(ratings)

        weighted_avg = np.average(ratings, weights=weights)
        variance = np.average((ratings - weighted_avg) ** 2, weights=weights)

        # Confidence based on sample size and weight distribution
        effective_sample_size = (weights.sum() ** 2) / (weights ** 2).sum()
        confidence = min(effective_sample_size / 10, 1.0)

        # Calculate recent trend
        recent_ratings = ratings_df[
            ratings_df['created_at'] > datetime.now() - timedelta(days=60)
        ]['rating'].values

        trend = 0.0
        if len(recent_ratings) >= 2:
            old_avg = ratings_df[
                ratings_df['created_at'] <= datetime.now() - timedelta(days=60)
            ]['rating'].mean()
            recent_avg = recent_ratings.mean()
            if not pd.isna(old_avg):
                trend = recent_avg - old_avg

        return {
            'avg_rating': float(weighted_avg),
            'confidence': float(confidence),
            'total_ratings': len(ratings),
            'variance': float(variance),
            'trend': float(trend)
        }

    def get_user_similarities(self, user_id: int, limit: int = 20) -> List[Dict]:
        """Get similar users for a given user"""

        similarities = self.db.query(UserSimilarity).filter(
            ((UserSimilarity.user_1_id == user_id) | (UserSimilarity.user_2_id == user_id)),
            UserSimilarity.overall_similarity > 0.2
        ).order_by(UserSimilarity.overall_similarity.desc()).limit(limit).all()

        result = []
        for sim in similarities:
            other_user_id = sim.user_2_id if sim.user_1_id == user_id else sim.user_1_id
            other_user = self.db.query(User).filter(User.id == other_user_id).first()

            if other_user:
                result.append({
                    'user_id': other_user_id,
                    'username': other_user.username,
                    'similarity_score': sim.overall_similarity,
                    'rating_similarity': sim.rating_similarity,
                    'preference_similarity': sim.preference_similarity,
                    'common_restaurants': sim.common_restaurants_rated
                })

        return result

    def get_cluster_weighted_rating(self, restaurant_id: int, user_cluster: int) -> Optional[float]:
        """Get weighted rating for a restaurant from a specific user cluster"""

        weighted_rating = self.db.query(WeightedRating).filter(
            WeightedRating.restaurant_id == restaurant_id,
            WeightedRating.user_cluster == user_cluster,
            WeightedRating.last_computed > datetime.now() - timedelta(days=7)
        ).first()

        return weighted_rating.weighted_avg_rating if weighted_rating else None