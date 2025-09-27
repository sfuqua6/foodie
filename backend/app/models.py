from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Enhanced user preferences
    preferred_cuisines = Column(JSON, default=list)
    preferred_price_levels = Column(JSON, default=list)
    location_lat = Column(Float)
    location_lng = Column(Float)
    max_distance = Column(Float, default=10.0)  # km

    # ML Profile Data
    taste_profile = Column(JSON, default=dict)  # Computed taste preferences
    similarity_cluster = Column(Integer)  # User cluster for collaborative filtering
    exploration_ratio = Column(Float, default=0.5)  # Tendency to try new things
    quality_standards = Column(Float, default=0.0)  # How user rates vs avg
    last_profile_update = Column(DateTime(timezone=True))

    # Relationships
    ratings = relationship("Rating", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    bubble_preferences = relationship("BubblePreference", back_populates="user", uselist=False)


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    google_place_id = Column(String(100), unique=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    address = Column(String(500))
    phone = Column(String(20))
    website = Column(String(200))
    cuisine_type = Column(String(100), index=True)
    price_level = Column(Integer)  # 1-4 scale ($ to $$$$)

    # Location
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)

    # Hours (JSON format)
    hours = Column(JSON, default=dict)

    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_google_update = Column(DateTime(timezone=True))

    # Google Places data
    google_rating = Column(Float)
    google_rating_count = Column(Integer)
    google_photos = Column(JSON, default=list)

    # Calculated fields
    avg_rating = Column(Float, default=0.0, index=True)
    rating_count = Column(Integer, default=0)

    # Relationships
    ratings = relationship("Rating", back_populates="restaurant")
    reviews = relationship("Review", back_populates="restaurant")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)
    rating = Column(Float, nullable=False)  # 1-5 scale with decimals
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="ratings")
    restaurant = relationship("Restaurant", back_populates="ratings")

    # Ensure one rating per user per restaurant
    __table_args__ = (
        {"schema": None},
    )


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)
    title = Column(String(200))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="reviews")
    restaurant = relationship("Restaurant", back_populates="reviews")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Implicit preferences learned from behavior
    cuisine_scores = Column(JSON, default=dict)  # {"italian": 0.8, "chinese": 0.3}
    price_level_scores = Column(JSON, default=dict)  # {"1": 0.2, "2": 0.8}

    # Interaction history
    total_ratings = Column(Integer, default=0)
    avg_rating_given = Column(Float, default=3.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Lottery System Models

class CheckinStatus(enum.Enum):
    PENDING = "pending"  # User checked in but hasn't stayed 10 minutes
    ACTIVE = "active"    # Ready for rating (10+ minutes elapsed)
    RATED = "rated"      # User has submitted rating
    EXPIRED = "expired"  # 48 hours passed without rating


class RestaurantCheckin(Base):
    __tablename__ = "restaurant_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)

    # GPS validation
    check_in_lat = Column(Float, nullable=False)
    check_in_lng = Column(Float, nullable=False)
    distance_from_restaurant = Column(Float)  # meters

    # Timing
    check_in_time = Column(DateTime(timezone=True), server_default=func.now())
    min_stay_completed_at = Column(DateTime(timezone=True))  # When 10 minutes elapsed
    rating_deadline = Column(DateTime(timezone=True))  # 48 hours from min_stay_completed

    # Status tracking
    status = Column(Enum(CheckinStatus), default=CheckinStatus.PENDING, index=True)

    # Connected rating if completed
    rating_id = Column(Integer, ForeignKey("ratings.id"))

    # Relationships
    user = relationship("User")
    restaurant = relationship("Restaurant")
    rating = relationship("Rating")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserPoints(Base):
    __tablename__ = "user_points"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Points tracking
    total_points = Column(Integer, default=0, index=True)
    monthly_points = Column(Integer, default=0)
    current_month = Column(String(7), index=True)  # YYYY-MM format

    # Statistics
    total_ratings = Column(Integer, default=0)
    total_photos = Column(Integer, default=0)
    total_checkins = Column(Integer, default=0)

    # Bulk import tracking
    bulk_import_points = Column(Integer, default=0)  # Track points from past visits
    bulk_import_completed = Column(Boolean, default=False)

    # Relationships
    user = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Transaction details
    points = Column(Integer, nullable=False)  # Can be negative for deductions
    reason = Column(String(100), nullable=False)  # "rating", "photo_bonus", "bulk_import"

    # Related records
    rating_id = Column(Integer, ForeignKey("ratings.id"))
    checkin_id = Column(Integer, ForeignKey("restaurant_checkins.id"))

    # Metadata
    month = Column(String(7), index=True)  # YYYY-MM format

    # Relationships
    user = relationship("User")
    rating = relationship("Rating")
    checkin = relationship("RestaurantCheckin")

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MonthlyLottery(Base):
    __tablename__ = "monthly_lotteries"

    id = Column(Integer, primary_key=True, index=True)

    # Lottery period
    month = Column(String(7), unique=True, index=True)  # YYYY-MM format

    # Prize details
    prize_amount = Column(Float, default=100.00)
    prize_currency = Column(String(3), default="USD")

    # Winner details
    winner_user_id = Column(Integer, ForeignKey("users.id"))
    winning_ticket_number = Column(Integer)
    total_tickets = Column(Integer)  # Total points across all users

    # Status
    is_drawn = Column(Boolean, default=False)
    draw_date = Column(DateTime(timezone=True))

    # Relationships
    winner = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Enhanced Rating Model for Detailed Feedback
class DetailedRating(Base):
    __tablename__ = "detailed_ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)
    rating_id = Column(Integer, ForeignKey("ratings.id"), nullable=False, index=True)
    checkin_id = Column(Integer, ForeignKey("restaurant_checkins.id"))

    # Overall rating (1-5)
    overall_rating = Column(Float, nullable=False)

    # Food Quality (1-5 Likert scale)
    food_quality_expectation = Column(Integer)  # "The food quality met my expectations"
    portion_size_appropriate = Column(Integer)  # "The portion sizes were appropriate for the price"
    food_fresh_prepared = Column(Integer)      # "The food was fresh and well-prepared"

    # Service Experience (1-5 Likert scale)
    service_attentive = Column(Integer)        # "The service was attentive and professional"
    wait_times_reasonable = Column(Integer)    # "Wait times were reasonable"

    # Atmosphere & Experience (1-5 Likert scale)
    atmosphere_pleasant = Column(Integer)      # "The atmosphere was pleasant and comfortable"
    restaurant_clean = Column(Integer)         # "The restaurant was clean and well-maintained"
    noise_level_appropriate = Column(Integer)  # "The noise level was appropriate for conversation"
    restaurant_welcoming = Column(Integer)     # "The restaurant felt welcoming and inviting"

    # Value & Overall (1-5 Likert scale)
    prices_fair = Column(Integer)              # "The prices were fair for what I received"
    would_recommend = Column(Integer)          # "I would recommend this restaurant to others"
    would_return = Column(Integer)             # "I would return to this restaurant"

    # Photo upload
    photos = Column(JSON, default=list)  # List of photo URLs/paths
    has_photos = Column(Boolean, default=False)

    # Points earned
    points_earned = Column(Integer, default=10)  # Base 10, +5 for photos

    # Relationships
    user = relationship("User")
    restaurant = relationship("Restaurant")
    rating = relationship("Rating")
    checkin = relationship("RestaurantCheckin")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Enhanced Recommendation System Models

class BubblePreference(Base):
    """Store user's bubble survey preferences with hierarchical data"""
    __tablename__ = "bubble_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # Survey completion data
    survey_completed_at = Column(DateTime(timezone=True), server_default=func.now())
    total_rounds_completed = Column(Integer, default=0)
    final_score = Column(Integer, default=0)

    # Preference categories with weights and round survival
    cuisine_preferences = Column(JSON, default=dict)  # {"italian": {"weight": 5, "round_survived": 1}}
    atmosphere_preferences = Column(JSON, default=dict)
    price_preferences = Column(JSON, default=dict)
    service_preferences = Column(JSON, default=dict)
    dietary_preferences = Column(JSON, default=dict)
    adventure_preferences = Column(JSON, default=dict)

    # Computed preference vectors for ML
    preference_vector = Column(JSON, default=list)  # Normalized preference vector
    preference_strength = Column(Float, default=1.0)  # How confident the preferences are

    # Relationships
    user = relationship("User", back_populates="bubble_preferences")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserSimilarity(Base):
    """Store computed user similarities for faster collaborative filtering"""
    __tablename__ = "user_similarities"

    id = Column(Integer, primary_key=True, index=True)
    user_1_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user_2_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Similarity metrics
    rating_similarity = Column(Float, default=0.0)  # Cosine similarity of ratings
    preference_similarity = Column(Float, default=0.0)  # Bubble preference similarity
    demographic_similarity = Column(Float, default=0.0)  # Age, location, etc.
    behavior_similarity = Column(Float, default=0.0)  # Exploration patterns

    # Combined similarity score
    overall_similarity = Column(Float, default=0.0, index=True)

    # Metadata
    common_restaurants_rated = Column(Integer, default=0)
    last_computed = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user_1 = relationship("User", foreign_keys=[user_1_id])
    user_2 = relationship("User", foreign_keys=[user_2_id])

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class RestaurantFeatures(Base):
    """Enhanced restaurant feature vectors for content-based filtering"""
    __tablename__ = "restaurant_features"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, unique=True, index=True)

    # Enhanced feature vectors
    cuisine_vector = Column(JSON, default=list)  # Multi-hot encoded cuisine features
    ambiance_vector = Column(JSON, default=list)  # Atmosphere features
    service_vector = Column(JSON, default=list)  # Service style features
    price_vector = Column(JSON, default=list)  # Price/value features
    dietary_vector = Column(JSON, default=list)  # Dietary accommodation features

    # Computed features from ratings
    quality_percentile = Column(Float, default=0.5)  # How this restaurant ranks quality-wise
    popularity_score = Column(Float, default=0.0)  # Number of ratings + recency boost
    consistency_score = Column(Float, default=1.0)  # Rating variance (lower = more consistent)

    # Social proof features
    similar_user_avg_rating = Column(JSON, default=dict)  # Avg rating by user cluster
    demographic_ratings = Column(JSON, default=dict)  # Ratings by demographic segments

    # Temporal features
    trending_score = Column(Float, default=0.0)  # Recent rating trend
    seasonal_patterns = Column(JSON, default=dict)  # Seasonal preference patterns

    # Feature vector for ML (normalized)
    feature_vector = Column(JSON, default=list)
    last_computed = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    restaurant = relationship("Restaurant")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class WeightedRating(Base):
    """Store dynamically weighted ratings based on user similarity"""
    __tablename__ = "weighted_ratings"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False, index=True)
    user_cluster = Column(Integer, nullable=False, index=True)  # User similarity cluster

    # Weighted rating calculations
    weighted_avg_rating = Column(Float, nullable=False)
    confidence_score = Column(Float, default=0.0)  # Based on sample size and similarity
    total_ratings = Column(Integer, default=0)
    rating_variance = Column(Float, default=0.0)

    # Temporal aspects
    recent_trend = Column(Float, default=0.0)  # Recent rating trend
    last_rating_date = Column(DateTime(timezone=True))

    # Detailed breakdowns
    quality_weighted_avg = Column(Float, default=0.0)
    service_weighted_avg = Column(Float, default=0.0)
    atmosphere_weighted_avg = Column(Float, default=0.0)
    value_weighted_avg = Column(Float, default=0.0)

    # Computation metadata
    last_computed = Column(DateTime(timezone=True), server_default=func.now())
    computation_version = Column(String(10), default="1.0")  # Track algorithm version

    # Relationships
    restaurant = relationship("Restaurant")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())