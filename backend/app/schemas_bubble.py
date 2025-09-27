# Bubble Survey Schemas
# Add these to the main schemas.py file

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class BubblePreferenceData(BaseModel):
    """Individual preference data with weight and survival round"""
    weight: float = Field(..., ge=0, le=10)
    round_survived: int = Field(..., ge=1, le=6)
    selection_order: int = Field(..., ge=1)

class BubblePreferenceCreate(BaseModel):
    """Create bubble survey preferences"""
    cuisine_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    atmosphere_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    price_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    service_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    dietary_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    adventure_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)

    total_rounds_completed: int = Field(..., ge=1, le=6)
    final_score: int = Field(..., ge=0)

class BubblePreferenceResponse(BaseModel):
    """Response with bubble survey preferences"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    survey_completed_at: datetime
    total_rounds_completed: int
    final_score: int
    preference_strength: float

    cuisine_preferences: Optional[Dict[str, Any]] = None
    atmosphere_preferences: Optional[Dict[str, Any]] = None
    price_preferences: Optional[Dict[str, Any]] = None
    service_preferences: Optional[Dict[str, Any]] = None
    dietary_preferences: Optional[Dict[str, Any]] = None
    adventure_preferences: Optional[Dict[str, Any]] = None

    initial_recommendations: Optional[List[Dict[str, Any]]] = None
    message: Optional[str] = None

class TasteProfile(BaseModel):
    """User's computed taste profile"""
    cuisine_affinities: Dict[str, float]
    atmosphere_preferences: Dict[str, float]
    price_sensitivity: Dict[str, float]
    service_expectations: Dict[str, float]
    dietary_requirements: List[str]
    adventure_level: str
    profile_confidence: float
    last_updated: str

class RecommendationRequest(BaseModel):
    """Request for personalized recommendations"""
    limit: int = Field(default=10, ge=1, le=50)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    cuisine_filter: Optional[List[str]] = None
    price_filter: Optional[List[int]] = None
    include_visited: bool = Field(default=False)

class EnhancedRecommendation(BaseModel):
    """Enhanced recommendation with explanation"""
    restaurant_id: int
    name: str
    cuisine_type: str
    price_level: int
    avg_rating: float
    location: Dict[str, float]
    tags: List[str]
    description: str
    image_url: Optional[str] = None

    # Recommendation specific
    match_score: float = Field(..., ge=0, le=1)
    match_reason: str
    confidence: float = Field(..., ge=0, le=1)
    predicted_rating: float = Field(..., ge=1, le=5)

    # Social proof
    similar_users_rating: Optional[float] = None
    similar_users_count: int = 0

    # Temporal factors
    trending_score: float = Field(default=0.0, ge=0, le=1)
    recent_visits: int = 0

class RecommendationFeedbackCreate(BaseModel):
    """User feedback on a recommendation"""
    restaurant_id: int
    recommendation_score: float
    recommendation_rank: int

    was_clicked: bool = False
    was_visited: bool = False
    actual_rating: Optional[float] = Field(None, ge=1, le=5)
    feedback_score: Optional[int] = Field(None, ge=1, le=5)

class SimilarUserProfile(BaseModel):
    """Profile of a similar user for comparison"""
    user_id: int
    username: str
    similarity_score: float
    common_restaurants: int
    taste_overlap: Dict[str, float]

class UserClusterInfo(BaseModel):
    """Information about user's taste cluster"""
    cluster_id: int
    cluster_size: int
    dominant_cuisines: List[str]
    avg_price_preference: float
    adventure_level: str
    similar_users: List[SimilarUserProfile]