from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import json
import logging
from datetime import datetime

from ..database import get_db
from ..models import User, BubblePreference
from ..auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bubble-survey", tags=["bubble-survey"])

# Schemas
class BubblePreferenceData(BaseModel):
    weight: float = Field(..., ge=0, le=10)
    round_survived: int = Field(..., ge=1, le=6)
    selection_order: int = Field(..., ge=1)

class BubblePreferenceCreate(BaseModel):
    cuisine_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    atmosphere_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    price_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    service_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    dietary_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    adventure_preferences: Dict[str, BubblePreferenceData] = Field(default_factory=dict)
    total_rounds_completed: int = Field(..., ge=1, le=6)
    final_score: int = Field(..., ge=0)

class BubblePreferenceResponse(BaseModel):
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
    initial_recommendations: Optional[list] = None
    message: Optional[str] = None


@router.post("/submit", response_model=BubblePreferenceResponse)
async def submit_bubble_preferences(
    preferences: BubblePreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit bubble survey preferences and compute recommendation profile"""

    try:
        # Check if user already has preferences
        existing_prefs = db.query(BubblePreference).filter(
            BubblePreference.user_id == current_user.id
        ).first()

        if existing_prefs:
            # Update existing preferences
            existing_prefs.cuisine_preferences = preferences.cuisine_preferences
            existing_prefs.atmosphere_preferences = preferences.atmosphere_preferences
            existing_prefs.price_preferences = preferences.price_preferences
            existing_prefs.service_preferences = preferences.service_preferences
            existing_prefs.dietary_preferences = preferences.dietary_preferences
            existing_prefs.adventure_preferences = preferences.adventure_preferences
            existing_prefs.total_rounds_completed = preferences.total_rounds_completed
            existing_prefs.final_score = preferences.final_score
            existing_prefs.survey_completed_at = datetime.utcnow()

            bubble_pref = existing_prefs
        else:
            # Create new preferences
            bubble_pref = BubblePreference(
                user_id=current_user.id,
                cuisine_preferences=preferences.cuisine_preferences,
                atmosphere_preferences=preferences.atmosphere_preferences,
                price_preferences=preferences.price_preferences,
                service_preferences=preferences.service_preferences,
                dietary_preferences=preferences.dietary_preferences,
                adventure_preferences=preferences.adventure_preferences,
                total_rounds_completed=preferences.total_rounds_completed,
                final_score=preferences.final_score
            )
            db.add(bubble_pref)

        # Compute preference vector and strength
        preference_vector, preference_strength = _compute_preference_vector(preferences)
        bubble_pref.preference_vector = preference_vector
        bubble_pref.preference_strength = preference_strength

        db.commit()
        db.refresh(bubble_pref)

        # Update user's taste profile
        _update_user_taste_profile(current_user.id, preferences, db)

        # Generate initial recommendations based on preferences (simplified for now)
        initial_recs = []  # TODO: Implement advanced recommendations

        return BubblePreferenceResponse(
            id=bubble_pref.id,
            user_id=bubble_pref.user_id,
            survey_completed_at=bubble_pref.survey_completed_at,
            total_rounds_completed=bubble_pref.total_rounds_completed,
            final_score=bubble_pref.final_score,
            preference_strength=bubble_pref.preference_strength,
            initial_recommendations=initial_recs,
            message="Taste profile updated successfully! 🎯"
        )

    except Exception as e:
        logger.error(f"Error submitting bubble preferences for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process bubble survey preferences"
        )


@router.get("/preferences", response_model=BubblePreferenceResponse)
async def get_bubble_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's current bubble survey preferences"""

    bubble_prefs = db.query(BubblePreference).filter(
        BubblePreference.user_id == current_user.id
    ).first()

    if not bubble_prefs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No bubble survey preferences found. Please complete the taste survey first."
        )

    return BubblePreferenceResponse(
        id=bubble_prefs.id,
        user_id=bubble_prefs.user_id,
        survey_completed_at=bubble_prefs.survey_completed_at,
        total_rounds_completed=bubble_prefs.total_rounds_completed,
        final_score=bubble_prefs.final_score,
        preference_strength=bubble_prefs.preference_strength,
        cuisine_preferences=bubble_prefs.cuisine_preferences,
        atmosphere_preferences=bubble_prefs.atmosphere_preferences,
        price_preferences=bubble_prefs.price_preferences,
        service_preferences=bubble_prefs.service_preferences,
        dietary_preferences=bubble_prefs.dietary_preferences,
        adventure_preferences=bubble_prefs.adventure_preferences
    )


@router.delete("/preferences")
async def delete_bubble_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user's bubble survey preferences (allows retaking survey)"""

    bubble_prefs = db.query(BubblePreference).filter(
        BubblePreference.user_id == current_user.id
    ).first()

    if not bubble_prefs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No bubble survey preferences found"
        )

    db.delete(bubble_prefs)
    db.commit()

    return {"message": "Bubble survey preferences deleted. You can now retake the taste survey."}


@router.get("/analysis")
async def get_preference_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed analysis of user's taste preferences"""

    bubble_prefs = db.query(BubblePreference).filter(
        BubblePreference.user_id == current_user.id
    ).first()

    if not bubble_prefs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No bubble survey preferences found"
        )

    analysis = _analyze_taste_profile(bubble_prefs)

    return {
        "user_id": current_user.id,
        "preference_strength": bubble_prefs.preference_strength,
        "taste_profile": analysis,
        "recommendations_accuracy": _estimate_recommendation_accuracy(bubble_prefs, db),
        "profile_completeness": _calculate_profile_completeness(bubble_prefs)
    }


def _compute_preference_vector(preferences: BubblePreferenceCreate) -> tuple[list, float]:
    """Convert bubble preferences to normalized vector for ML"""

    vector = []
    total_weight = 0

    # Cuisine preferences (first 20 dimensions)
    cuisine_weights = [0.0] * 20
    for cuisine, data in preferences.cuisine_preferences.items():
        idx = _get_cuisine_index(cuisine)
        if idx < 20:
            weight = data.get('weight', 1.0)
            cuisine_weights[idx] = weight
            total_weight += weight

    vector.extend(cuisine_weights)

    # Atmosphere preferences (next 10 dimensions)
    atmosphere_weights = [0.0] * 10
    for atmosphere, data in preferences.atmosphere_preferences.items():
        idx = _get_atmosphere_index(atmosphere)
        if idx < 10:
            weight = data.get('weight', 1.0)
            atmosphere_weights[idx] = weight
            total_weight += weight

    vector.extend(atmosphere_weights)

    # Price preferences (next 6 dimensions)
    price_weights = [0.0] * 6
    for price, data in preferences.price_preferences.items():
        idx = _get_price_index(price)
        if idx < 6:
            weight = data.get('weight', 1.0)
            price_weights[idx] = weight
            total_weight += weight

    vector.extend(price_weights)

    # Service preferences (next 6 dimensions)
    service_weights = [0.0] * 6
    for service, data in preferences.service_preferences.items():
        idx = _get_service_index(service)
        if idx < 6:
            weight = data.get('weight', 1.0)
            service_weights[idx] = weight
            total_weight += weight

    vector.extend(service_weights)

    # Dietary preferences (next 8 dimensions)
    dietary_weights = [0.0] * 8
    for dietary, data in preferences.dietary_preferences.items():
        idx = _get_dietary_index(dietary)
        if idx < 8:
            weight = data.get('weight', 1.0)
            dietary_weights[idx] = weight
            total_weight += weight

    vector.extend(dietary_weights)

    # Adventure preferences (last 5 dimensions)
    adventure_weights = [0.0] * 5
    for adventure, data in preferences.adventure_preferences.items():
        idx = _get_adventure_index(adventure)
        if idx < 5:
            weight = data.get('weight', 1.0)
            adventure_weights[idx] = weight
            total_weight += weight

    vector.extend(adventure_weights)

    # Normalize vector
    if total_weight > 0:
        vector = [w / total_weight for w in vector]

    # Calculate preference strength (0-1 scale)
    non_zero_prefs = sum(1 for w in vector if w > 0)
    preference_strength = min(non_zero_prefs / 20, 1.0)  # Normalize to max 20 preferences

    return vector, preference_strength


def _update_user_taste_profile(user_id: int, preferences: BubblePreferenceCreate, db: Session):
    """Update user's taste profile based on bubble survey"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return

    # Create comprehensive taste profile
    taste_profile = {
        "cuisine_affinities": _calculate_cuisine_affinities(preferences.cuisine_preferences),
        "atmosphere_preferences": _calculate_atmosphere_preferences(preferences.atmosphere_preferences),
        "price_sensitivity": _calculate_price_sensitivity(preferences.price_preferences),
        "service_expectations": _calculate_service_expectations(preferences.service_preferences),
        "dietary_requirements": _extract_dietary_requirements(preferences.dietary_preferences),
        "adventure_level": _calculate_adventure_level(preferences.adventure_preferences),
        "profile_confidence": _calculate_profile_confidence(preferences),
        "last_updated": datetime.utcnow().isoformat()
    }

    user.taste_profile = taste_profile
    user.last_profile_update = datetime.utcnow()

    db.commit()


def _analyze_taste_profile(bubble_prefs: BubblePreference) -> Dict[str, Any]:
    """Generate detailed taste profile analysis"""

    analysis = {
        "dominant_cuisines": _get_top_preferences(bubble_prefs.cuisine_preferences, 3),
        "preferred_atmosphere": _get_top_preferences(bubble_prefs.atmosphere_preferences, 2),
        "price_comfort_zone": _get_top_preferences(bubble_prefs.price_preferences, 2),
        "service_style": _get_top_preferences(bubble_prefs.service_preferences, 2),
        "dietary_considerations": _get_top_preferences(bubble_prefs.dietary_preferences, 3),
        "adventure_personality": _determine_adventure_personality(bubble_prefs.adventure_preferences),
        "taste_diversity_score": _calculate_taste_diversity(bubble_prefs),
        "recommendation_themes": _generate_recommendation_themes(bubble_prefs)
    }

    return analysis


# Helper functions for mapping preferences to indices
def _get_cuisine_index(cuisine: str) -> int:
    """Map cuisine types to vector indices"""
    cuisine_map = {
        'italian': 0, 'mexican': 1, 'chinese': 2, 'japanese': 3, 'indian': 4,
        'thai': 5, 'american': 6, 'french': 7, 'mediterranean': 8, 'korean': 9,
        'vietnamese': 10, 'middle_eastern': 11
    }
    return cuisine_map.get(cuisine, 19)  # Last index for unknown

def _get_atmosphere_index(atmosphere: str) -> int:
    """Map atmosphere types to vector indices"""
    atmosphere_map = {
        'romantic': 0, 'casual': 1, 'upscale': 2, 'family_friendly': 3,
        'lively': 4, 'quiet': 5, 'outdoor': 6, 'cozy': 7
    }
    return atmosphere_map.get(atmosphere, 9)  # Last index for unknown

def _get_price_index(price: str) -> int:
    """Map price preferences to vector indices"""
    price_map = {
        'budget_friendly': 0, 'moderate': 1, 'upscale_worth_it': 2,
        'price_no_object': 3, 'happy_hour': 4, 'deal_seeker': 5
    }
    return price_map.get(price, 5)

def _get_service_index(service: str) -> int:
    """Map service styles to vector indices"""
    service_map = {
        'fast_casual': 0, 'full_service': 1, 'takeout': 2,
        'buffet': 3, 'food_truck': 4, 'fine_dining': 5
    }
    return service_map.get(service, 5)

def _get_dietary_index(dietary: str) -> int:
    """Map dietary preferences to vector indices"""
    dietary_map = {
        'vegetarian_friendly': 0, 'vegan_options': 1, 'gluten_free': 2,
        'keto_friendly': 3, 'healthy_options': 4, 'comfort_food': 5,
        'no_restrictions': 6
    }
    return dietary_map.get(dietary, 7)

def _get_adventure_index(adventure: str) -> int:
    """Map adventure levels to vector indices"""
    adventure_map = {
        'stick_to_favorites': 0, 'mild_adventurer': 1, 'food_explorer': 2,
        'extreme_foodie': 3, 'try_anything_once': 4
    }
    return adventure_map.get(adventure, 4)

# Additional helper functions would go here...
def _calculate_cuisine_affinities(cuisine_prefs: dict) -> dict:
    """Calculate cuisine affinity scores"""
    return {k: v.get('weight', 1.0) for k, v in cuisine_prefs.items()}

def _get_top_preferences(prefs: dict, limit: int) -> list:
    """Get top N preferences by weight"""
    sorted_prefs = sorted(prefs.items(), key=lambda x: x[1].get('weight', 0), reverse=True)
    return [pref[0] for pref in sorted_prefs[:limit]]

def _calculate_profile_confidence(preferences: BubblePreferenceCreate) -> float:
    """Calculate how confident the profile is based on survey completion"""
    total_categories = 6
    completed_categories = sum(1 for prefs in [
        preferences.cuisine_preferences,
        preferences.atmosphere_preferences,
        preferences.price_preferences,
        preferences.service_preferences,
        preferences.dietary_preferences,
        preferences.adventure_preferences
    ] if prefs)

    return completed_categories / total_categories

# More helper functions would be implemented here...