from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import Review, ReviewCreate
from ..models import Review as ReviewModel, Restaurant as RestaurantModel, User
from ..auth import get_current_active_user

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("/", response_model=Review, status_code=status.HTTP_201_CREATED)
async def create_review(
    review: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a review for a restaurant."""

    # Check if restaurant exists
    restaurant = db.query(RestaurantModel).filter(RestaurantModel.id == review.restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Check if user already reviewed this restaurant
    existing_review = db.query(ReviewModel).filter(
        ReviewModel.user_id == current_user.id,
        ReviewModel.restaurant_id == review.restaurant_id
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="You have already reviewed this restaurant. Use PUT to update your review."
        )

    # Create new review
    db_review = ReviewModel(
        user_id=current_user.id,
        restaurant_id=review.restaurant_id,
        title=review.title,
        content=review.content
    )

    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    return db_review


@router.get("/user", response_model=List[Review])
async def get_user_reviews(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all reviews by the current user."""
    reviews = db.query(ReviewModel).filter(ReviewModel.user_id == current_user.id).all()
    return reviews


@router.get("/restaurant/{restaurant_id}", response_model=List[Review])
async def get_restaurant_reviews(
    restaurant_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all reviews for a specific restaurant."""

    # Check if restaurant exists
    restaurant = db.query(RestaurantModel).filter(RestaurantModel.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    reviews = db.query(ReviewModel).filter(ReviewModel.restaurant_id == restaurant_id).all()
    return reviews


@router.put("/{review_id}", response_model=Review)
async def update_review(
    review_id: int,
    review_update: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a review."""

    review = db.query(ReviewModel).filter(
        ReviewModel.id == review_id,
        ReviewModel.user_id == current_user.id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Update review fields
    review.title = review_update.title
    review.content = review_update.content

    db.commit()
    db.refresh(review)

    return review


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a review."""

    review = db.query(ReviewModel).filter(
        ReviewModel.id == review_id,
        ReviewModel.user_id == current_user.id
    ).first()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(review)
    db.commit()