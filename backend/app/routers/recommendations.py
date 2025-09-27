from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import RecommendationRequest
from ..models import User
from ..auth import get_current_active_user
from ..services.recommendation import RecommendationEngine

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/", response_model=List[Dict[str, Any]])
async def get_recommendations(
    request: RecommendationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get personalized restaurant recommendations for the current user."""

    recommendation_engine = RecommendationEngine()

    recommendations = recommendation_engine.get_recommendations(
        db=db,
        user=current_user,
        user_lat=request.user_lat,
        user_lng=request.user_lng,
        max_distance=request.max_distance,
        cuisine_filter=request.cuisine_filter,
        price_filter=request.price_filter,
        limit=request.limit
    )

    return recommendations


@router.get("/", response_model=List[Dict[str, Any]])
async def get_user_recommendations(
    recommendation_type: str = Query("for-you", description="Type of recommendations: for-you, trending, favorites"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get personalized recommendations based on type."""

    recommendation_engine = RecommendationEngine()

    if recommendation_type == "trending":
        # Get trending restaurants (high ratings, recent activity)
        recommendations = recommendation_engine.get_trending_recommendations(
            db=db,
            user=current_user,
            user_lat=current_user.location_lat,
            user_lng=current_user.location_lng,
            limit=20
        )
    elif recommendation_type == "favorites":
        # Get restaurants similar to user's highly rated ones
        recommendations = recommendation_engine.get_similar_recommendations(
            db=db,
            user=current_user,
            user_lat=current_user.location_lat,
            user_lng=current_user.location_lng,
            limit=20
        )
    else:  # for-you (default)
        # Get personalized AI recommendations
        recommendations = recommendation_engine.get_recommendations(
            db=db,
            user=current_user,
            user_lat=current_user.location_lat,
            user_lng=current_user.location_lng,
            max_distance=current_user.max_distance,
            cuisine_filter=current_user.preferred_cuisines,
            price_filter=current_user.preferred_price_levels,
            limit=20
        )

    return recommendations