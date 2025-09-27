from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..schemas import Rating, RatingCreate
from ..models import Rating as RatingModel, Restaurant as RestaurantModel, User
from ..auth import get_current_active_user
from ..services.recommendation import RecommendationEngine

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post("/", response_model=Rating, status_code=status.HTTP_201_CREATED)
async def create_rating(
    rating: RatingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create or update a rating for a restaurant."""

    # Check if restaurant exists
    restaurant = db.query(RestaurantModel).filter(RestaurantModel.id == rating.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Check if user already rated this restaurant
    existing_rating = db.query(RatingModel).filter(
        RatingModel.user_id == current_user.id,
        RatingModel.restaurant_id == rating.restaurant_id
    ).first()

    if existing_rating:
        # Update existing rating
        existing_rating.rating = rating.rating
        db_rating = existing_rating
    else:
        # Create new rating
        db_rating = RatingModel(
            user_id=current_user.id,
            restaurant_id=rating.restaurant_id,
            rating=rating.rating
        )
        db.add(db_rating)

    db.commit()
    db.refresh(db_rating)

    # Update restaurant's average rating
    avg_rating = db.query(func.avg(RatingModel.rating)).filter(
        RatingModel.restaurant_id == rating.restaurant_id
    ).scalar()

    rating_count = db.query(func.count(RatingModel.id)).filter(
        RatingModel.restaurant_id == rating.restaurant_id
    ).scalar()

    restaurant.avg_rating = float(avg_rating) if avg_rating else 0.0
    restaurant.rating_count = rating_count
    db.commit()

    # Update user preferences asynchronously
    recommendation_engine = RecommendationEngine()
    recommendation_engine.update_user_preferences(db, current_user.id)

    return db_rating


@router.get("/user", response_model=List[Rating])
async def get_user_ratings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all ratings for the current user."""
    ratings = db.query(RatingModel).filter(RatingModel.user_id == current_user.id).all()
    return ratings


@router.get("/restaurant/{restaurant_id}", response_model=List[Rating])
async def get_restaurant_ratings(
    restaurant_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all ratings for a specific restaurant."""

    # Check if restaurant exists
    restaurant = db.query(RestaurantModel).filter(RestaurantModel.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    ratings = db.query(RatingModel).filter(RatingModel.restaurant_id == restaurant_id).all()
    return ratings


@router.delete("/{rating_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating(
    rating_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a rating."""

    rating = db.query(RatingModel).filter(
        RatingModel.id == rating_id,
        RatingModel.user_id == current_user.id
    ).first()

    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")

    restaurant_id = rating.restaurant_id
    db.delete(rating)
    db.commit()

    # Update restaurant's average rating
    avg_rating = db.query(func.avg(RatingModel.rating)).filter(
        RatingModel.restaurant_id == restaurant_id
    ).scalar()

    rating_count = db.query(func.count(RatingModel.id)).filter(
        RatingModel.restaurant_id == restaurant_id
    ).scalar()

    restaurant = db.query(RestaurantModel).filter(RestaurantModel.id == restaurant_id).first()
    if restaurant:
        restaurant.avg_rating = float(avg_rating) if avg_rating else 0.0
        restaurant.rating_count = rating_count
        db.commit()

    # Update user preferences
    recommendation_engine = RecommendationEngine()
    recommendation_engine.update_user_preferences(db, current_user.id)