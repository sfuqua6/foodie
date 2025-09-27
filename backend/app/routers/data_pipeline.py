from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..services.google_places import GooglePlacesService
from ..auth import get_current_user
from ..models import User

router = APIRouter(prefix="/data-pipeline", tags=["data-pipeline"])


@router.post("/update-restaurants", response_model=Dict[str, Any])
async def update_restaurant_data(
    background_tasks: BackgroundTasks,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update restaurant data from Google Places API.
    Runs as background task to avoid timeout.
    """
    google_places = GooglePlacesService()

    def update_task():
        try:
            result = google_places.batch_update_restaurant_data(db, limit)
            return result
        except Exception as e:
            return {"error": str(e), "updated": 0}

    # Run update in background
    background_tasks.add_task(update_task)

    return {
        "message": f"Restaurant update started for up to {limit} restaurants",
        "status": "running",
        "remaining_daily_requests": google_places.DAILY_REQUEST_LIMIT - google_places.daily_requests
    }


@router.post("/discover-restaurants", response_model=Dict[str, Any])
async def discover_new_restaurants(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Discover and add new restaurants from Google Places API.
    Runs as background task to avoid timeout.
    """
    google_places = GooglePlacesService()

    def discover_task():
        try:
            result = google_places.discover_new_restaurants(db)
            return result
        except Exception as e:
            return {"error": str(e), "added": 0}

    # Run discovery in background
    background_tasks.add_task(discover_task)

    return {
        "message": "Restaurant discovery started",
        "status": "running",
        "remaining_daily_requests": google_places.DAILY_REQUEST_LIMIT - google_places.daily_requests
    }


@router.get("/api-usage")
async def get_api_usage(current_user: User = Depends(get_current_user)):
    """Get current Google Places API usage stats."""
    google_places = GooglePlacesService()

    return {
        "daily_requests_used": google_places.daily_requests,
        "daily_requests_limit": google_places.DAILY_REQUEST_LIMIT,
        "remaining_requests": google_places.DAILY_REQUEST_LIMIT - google_places.daily_requests,
        "usage_percentage": (google_places.daily_requests / google_places.DAILY_REQUEST_LIMIT) * 100
    }


@router.post("/sync-images")
async def sync_restaurant_images(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync restaurant images from Google Places.
    Prioritizes restaurants without photos.
    """
    google_places = GooglePlacesService()

    def sync_images_task():
        try:
            # Focus on restaurants without photos first
            result = google_places.batch_update_restaurant_data(db, limit=30)
            return result
        except Exception as e:
            return {"error": str(e), "updated": 0}

    background_tasks.add_task(sync_images_task)

    return {
        "message": "Image sync started - updating restaurants with missing photos",
        "status": "running",
        "remaining_daily_requests": google_places.DAILY_REQUEST_LIMIT - google_places.daily_requests
    }