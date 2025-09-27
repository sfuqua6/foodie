from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import User, UserUpdate
from ..models import User as UserModel
from ..auth import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=User)
async def get_current_user_profile(current_user: UserModel = Depends(get_current_active_user)):
    """Get current user's profile."""
    return current_user


@router.put("/me", response_model=User)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""

    # Update fields if provided
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name

    if user_update.preferred_cuisines is not None:
        current_user.preferred_cuisines = user_update.preferred_cuisines

    if user_update.preferred_price_levels is not None:
        current_user.preferred_price_levels = user_update.preferred_price_levels

    if user_update.location_lat is not None:
        current_user.location_lat = user_update.location_lat

    if user_update.location_lng is not None:
        current_user.location_lng = user_update.location_lng

    if user_update.max_distance is not None:
        current_user.max_distance = user_update.max_distance

    db.commit()
    db.refresh(current_user)

    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user_account(
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete current user's account (deactivate)."""
    current_user.is_active = False
    db.commit()