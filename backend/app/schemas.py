from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')
    full_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=50)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    preferred_cuisines: Optional[List[str]] = Field(default_factory=list)
    preferred_price_levels: Optional[List[int]] = Field(default_factory=list)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    max_distance: Optional[float] = Field(None, ge=1, le=50)


class User(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    preferred_cuisines: List[str] = Field(default_factory=list)
    preferred_price_levels: List[int] = Field(default_factory=list)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    max_distance: float = 10.0


class RestaurantBase(BaseModel):
    name: str = Field(..., max_length=200)
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=200)
    cuisine_type: Optional[str] = Field(None, max_length=100)
    price_level: Optional[int] = Field(None, ge=1, le=4)


class RestaurantCreate(RestaurantBase):
    google_place_id: Optional[str] = Field(None, max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class Restaurant(RestaurantBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    google_place_id: Optional[str] = None
    latitude: float
    longitude: float
    hours: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool
    created_at: datetime
    google_rating: Optional[float] = None
    google_rating_count: Optional[int] = None
    google_photos: List[str] = Field(default_factory=list)
    avg_rating: float = 0.0
    rating_count: int = 0
    distance: Optional[float] = None  # Calculated field for distance from user


class RatingBase(BaseModel):
    rating: float = Field(..., ge=1, le=5)


class RatingCreate(RatingBase):
    restaurant_id: int


class Rating(RatingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    created_at: datetime


class ReviewBase(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    content: str = Field(..., min_length=10, max_length=1000)


class ReviewCreate(ReviewBase):
    restaurant_id: int


class Review(ReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    created_at: datetime
    user: User


class RestaurantWithDetails(Restaurant):
    ratings: List[Rating] = Field(default_factory=list)
    reviews: List[Review] = Field(default_factory=list)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class RecommendationRequest(BaseModel):
    user_lat: Optional[float] = Field(None, ge=-90, le=90)
    user_lng: Optional[float] = Field(None, ge=-180, le=180)
    max_distance: Optional[float] = Field(10.0, ge=1, le=50)
    cuisine_filter: Optional[List[str]] = Field(default_factory=list)
    price_filter: Optional[List[int]] = Field(default_factory=list)
    limit: Optional[int] = Field(20, ge=1, le=100)


class RestaurantSearch(BaseModel):
    query: Optional[str] = Field(None, max_length=100)
    user_lat: Optional[float] = Field(None, ge=-90, le=90)
    user_lng: Optional[float] = Field(None, ge=-180, le=180)
    max_distance: Optional[float] = Field(10.0, ge=1, le=50)
    cuisine_filter: Optional[List[str]] = Field(default_factory=list)
    price_filter: Optional[List[int]] = Field(default_factory=list)
    min_rating: Optional[float] = Field(None, ge=1, le=5)
    limit: Optional[int] = Field(20, ge=1, le=100)
    offset: Optional[int] = Field(0, ge=0)


# Lottery System Schemas

class CheckinStatusEnum(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    RATED = "rated"
    EXPIRED = "expired"


class RestaurantCheckinCreate(BaseModel):
    restaurant_id: int
    user_lat: float = Field(..., ge=-90, le=90)
    user_lng: float = Field(..., ge=-180, le=180)


class RestaurantCheckin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    check_in_lat: float
    check_in_lng: float
    distance_from_restaurant: Optional[float] = None
    check_in_time: datetime
    min_stay_completed_at: Optional[datetime] = None
    rating_deadline: Optional[datetime] = None
    status: CheckinStatusEnum
    rating_id: Optional[int] = None
    created_at: datetime


class DetailedRatingCreate(BaseModel):
    restaurant_id: int
    checkin_id: Optional[int] = None

    # Overall rating
    overall_rating: float = Field(..., ge=1, le=5)

    # Food Quality (1-5 Likert scale)
    food_quality_expectation: Optional[int] = Field(None, ge=1, le=5)
    portion_size_appropriate: Optional[int] = Field(None, ge=1, le=5)
    food_fresh_prepared: Optional[int] = Field(None, ge=1, le=5)

    # Service Experience
    service_attentive: Optional[int] = Field(None, ge=1, le=5)
    wait_times_reasonable: Optional[int] = Field(None, ge=1, le=5)

    # Atmosphere & Experience
    atmosphere_pleasant: Optional[int] = Field(None, ge=1, le=5)
    restaurant_clean: Optional[int] = Field(None, ge=1, le=5)
    noise_level_appropriate: Optional[int] = Field(None, ge=1, le=5)
    restaurant_welcoming: Optional[int] = Field(None, ge=1, le=5)

    # Value & Overall
    prices_fair: Optional[int] = Field(None, ge=1, le=5)
    would_recommend: Optional[int] = Field(None, ge=1, le=5)
    would_return: Optional[int] = Field(None, ge=1, le=5)

    # Photos
    photos: Optional[List[str]] = Field(default_factory=list)


class DetailedRating(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    restaurant_id: int
    rating_id: int
    checkin_id: Optional[int] = None
    overall_rating: float

    # Food Quality
    food_quality_expectation: Optional[int] = None
    portion_size_appropriate: Optional[int] = None
    food_fresh_prepared: Optional[int] = None

    # Service Experience
    service_attentive: Optional[int] = None
    wait_times_reasonable: Optional[int] = None

    # Atmosphere & Experience
    atmosphere_pleasant: Optional[int] = None
    restaurant_clean: Optional[int] = None
    noise_level_appropriate: Optional[int] = None
    restaurant_welcoming: Optional[int] = None

    # Value & Overall
    prices_fair: Optional[int] = None
    would_recommend: Optional[int] = None
    would_return: Optional[int] = None

    photos: List[str] = Field(default_factory=list)
    has_photos: bool = False
    points_earned: int = 10
    created_at: datetime


class UserPoints(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    total_points: int = 0
    monthly_points: int = 0
    current_month: str
    total_ratings: int = 0
    total_photos: int = 0
    total_checkins: int = 0
    bulk_import_points: int = 0
    bulk_import_completed: bool = False
    created_at: datetime


class PointTransaction(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    points: int
    reason: str
    rating_id: Optional[int] = None
    checkin_id: Optional[int] = None
    month: str
    created_at: datetime


class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    total_points: int
    monthly_points: int
    rank: int
    total_ratings: int
    total_photos: int


class MonthlyLottery(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    month: str
    prize_amount: float = 100.00
    prize_currency: str = "USD"
    winner_user_id: Optional[int] = None
    winning_ticket_number: Optional[int] = None
    total_tickets: Optional[int] = None
    is_drawn: bool = False
    draw_date: Optional[datetime] = None
    created_at: datetime


class BulkImportRestaurant(BaseModel):
    name: str = Field(..., max_length=200)
    cuisine_type: Optional[str] = Field(None, max_length=100)
    rating: float = Field(..., ge=1, le=5)
    # For bulk import, we'll allow approximate location
    approximate_address: Optional[str] = Field(None, max_length=500)


class BulkImportRequest(BaseModel):
    restaurants: List[BulkImportRestaurant]