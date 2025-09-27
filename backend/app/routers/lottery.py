from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import math
import random

from ..database import get_db
from ..auth import get_current_active_user
from .. import models, schemas

router = APIRouter(prefix="/lottery", tags=["lottery"])


def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two GPS coordinates in meters using Haversine formula."""
    R = 6371000  # Earth's radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def get_current_month() -> str:
    """Get current month in YYYY-MM format."""
    return datetime.now().strftime("%Y-%m")


def get_or_create_user_points(db: Session, user_id: int) -> models.UserPoints:
    """Get or create user points record for current month."""
    current_month = get_current_month()

    user_points = db.query(models.UserPoints).filter(
        models.UserPoints.user_id == user_id,
        models.UserPoints.current_month == current_month
    ).first()

    if not user_points:
        user_points = models.UserPoints(
            user_id=user_id,
            current_month=current_month
        )
        db.add(user_points)
        db.commit()
        db.refresh(user_points)

    return user_points


@router.post("/checkin", response_model=schemas.RestaurantCheckin)
async def check_into_restaurant(
    checkin_data: schemas.RestaurantCheckinCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check into a restaurant for lottery eligibility."""

    # Get restaurant
    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == checkin_data.restaurant_id
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )

    # Calculate distance from restaurant
    distance = calculate_distance(
        checkin_data.user_lat, checkin_data.user_lng,
        restaurant.latitude, restaurant.longitude
    )

    # Validate GPS proximity (100 meters)
    if distance > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You must be within 100 meters of the restaurant to check in. You are {distance:.0f}m away."
        )

    # Check if user already has an active checkin for this restaurant today
    today = datetime.now().date()
    existing_checkin = db.query(models.RestaurantCheckin).filter(
        models.RestaurantCheckin.user_id == current_user.id,
        models.RestaurantCheckin.restaurant_id == checkin_data.restaurant_id,
        models.RestaurantCheckin.check_in_time >= datetime.combine(today, datetime.min.time()),
        models.RestaurantCheckin.status.in_([models.CheckinStatus.PENDING, models.CheckinStatus.ACTIVE])
    ).first()

    if existing_checkin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active check-in for this restaurant today"
        )

    # Create check-in record
    checkin = models.RestaurantCheckin(
        user_id=current_user.id,
        restaurant_id=checkin_data.restaurant_id,
        check_in_lat=checkin_data.user_lat,
        check_in_lng=checkin_data.user_lng,
        distance_from_restaurant=distance,
        status=models.CheckinStatus.PENDING
    )

    db.add(checkin)
    db.commit()
    db.refresh(checkin)

    # Update user points (increment checkin count)
    user_points = get_or_create_user_points(db, current_user.id)
    user_points.total_checkins += 1
    db.commit()

    return checkin


@router.get("/checkins/active", response_model=List[schemas.RestaurantCheckin])
async def get_active_checkins(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's active check-ins (pending or ready for rating)."""

    checkins = db.query(models.RestaurantCheckin).filter(
        models.RestaurantCheckin.user_id == current_user.id,
        models.RestaurantCheckin.status.in_([models.CheckinStatus.PENDING, models.CheckinStatus.ACTIVE])
    ).order_by(models.RestaurantCheckin.created_at.desc()).all()

    # Update statuses based on time elapsed
    now = datetime.now()
    for checkin in checkins:
        if checkin.status == models.CheckinStatus.PENDING:
            time_elapsed = now - checkin.check_in_time

            if time_elapsed >= timedelta(minutes=10):
                # Mark as active and set deadline
                checkin.status = models.CheckinStatus.ACTIVE
                checkin.min_stay_completed_at = now
                checkin.rating_deadline = now + timedelta(hours=48)
                db.commit()

        elif checkin.status == models.CheckinStatus.ACTIVE:
            # Check if deadline has passed
            if checkin.rating_deadline and now > checkin.rating_deadline:
                checkin.status = models.CheckinStatus.EXPIRED
                db.commit()

    return checkins


@router.post("/ratings", response_model=schemas.DetailedRating)
async def submit_detailed_rating(
    rating_data: schemas.DetailedRatingCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit a detailed rating for lottery points."""

    # Get restaurant
    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == rating_data.restaurant_id
    ).first()

    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found"
        )

    # If checkin_id provided, validate it
    checkin = None
    if rating_data.checkin_id:
        checkin = db.query(models.RestaurantCheckin).filter(
            models.RestaurantCheckin.id == rating_data.checkin_id,
            models.RestaurantCheckin.user_id == current_user.id,
            models.RestaurantCheckin.status == models.CheckinStatus.ACTIVE
        ).first()

        if not checkin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired check-in"
            )

    # Create or update basic rating
    existing_rating = db.query(models.Rating).filter(
        models.Rating.user_id == current_user.id,
        models.Rating.restaurant_id == rating_data.restaurant_id
    ).first()

    if existing_rating:
        existing_rating.rating = rating_data.overall_rating
        existing_rating.updated_at = datetime.now()
        rating = existing_rating
    else:
        rating = models.Rating(
            user_id=current_user.id,
            restaurant_id=rating_data.restaurant_id,
            rating=rating_data.overall_rating
        )
        db.add(rating)

    db.commit()
    db.refresh(rating)

    # Calculate points
    base_points = 10
    photo_bonus = 5 if rating_data.photos and len(rating_data.photos) > 0 else 0
    total_points = base_points + photo_bonus

    # Create detailed rating
    detailed_rating = models.DetailedRating(
        user_id=current_user.id,
        restaurant_id=rating_data.restaurant_id,
        rating_id=rating.id,
        checkin_id=rating_data.checkin_id,
        overall_rating=rating_data.overall_rating,
        food_quality_expectation=rating_data.food_quality_expectation,
        portion_size_appropriate=rating_data.portion_size_appropriate,
        food_fresh_prepared=rating_data.food_fresh_prepared,
        service_attentive=rating_data.service_attentive,
        wait_times_reasonable=rating_data.wait_times_reasonable,
        atmosphere_pleasant=rating_data.atmosphere_pleasant,
        restaurant_clean=rating_data.restaurant_clean,
        noise_level_appropriate=rating_data.noise_level_appropriate,
        restaurant_welcoming=rating_data.restaurant_welcoming,
        prices_fair=rating_data.prices_fair,
        would_recommend=rating_data.would_recommend,
        would_return=rating_data.would_return,
        photos=rating_data.photos or [],
        has_photos=bool(rating_data.photos and len(rating_data.photos) > 0),
        points_earned=total_points
    )

    db.add(detailed_rating)
    db.commit()
    db.refresh(detailed_rating)

    # Update checkin status if applicable
    if checkin:
        checkin.status = models.CheckinStatus.RATED
        checkin.rating_id = rating.id
        db.commit()

    # Award points
    user_points = get_or_create_user_points(db, current_user.id)
    user_points.total_points += total_points
    user_points.monthly_points += total_points
    user_points.total_ratings += 1
    if photo_bonus > 0:
        user_points.total_photos += 1

    db.commit()

    # Create point transaction record
    current_month = get_current_month()
    transaction = models.PointTransaction(
        user_id=current_user.id,
        points=total_points,
        reason="detailed_rating" + ("_with_photo" if photo_bonus > 0 else ""),
        rating_id=rating.id,
        checkin_id=rating_data.checkin_id,
        month=current_month
    )
    db.add(transaction)
    db.commit()

    return detailed_rating


@router.get("/points", response_model=schemas.UserPoints)
async def get_user_points(
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's current points and statistics."""

    user_points = get_or_create_user_points(db, current_user.id)
    return user_points


@router.get("/leaderboard", response_model=List[schemas.LeaderboardEntry])
async def get_leaderboard(
    month: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get leaderboard for current or specified month."""

    target_month = month or get_current_month()

    # Get top users for the month
    user_points = db.query(models.UserPoints, models.User).join(
        models.User, models.UserPoints.user_id == models.User.id
    ).filter(
        models.UserPoints.current_month == target_month
    ).order_by(
        models.UserPoints.monthly_points.desc()
    ).limit(limit).all()

    leaderboard = []
    for rank, (points, user) in enumerate(user_points, 1):
        leaderboard.append(schemas.LeaderboardEntry(
            user_id=user.id,
            username=user.username,
            total_points=points.total_points,
            monthly_points=points.monthly_points,
            rank=rank,
            total_ratings=points.total_ratings,
            total_photos=points.total_photos
        ))

    return leaderboard


@router.post("/bulk-import")
async def bulk_import_past_visits(
    import_data: schemas.BulkImportRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Allow users to bulk import past restaurant visits for bonus points."""

    user_points = get_or_create_user_points(db, current_user.id)

    # Check if user already completed bulk import
    if user_points.bulk_import_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bulk import has already been completed for this account"
        )

    # Limit to reasonable number
    if len(import_data.restaurants) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 50 restaurants can be imported at once"
        )

    imported_count = 0
    total_points = 0
    current_month = get_current_month()

    for restaurant_data in import_data.restaurants:
        # Try to find existing restaurant by name and cuisine
        existing_restaurant = db.query(models.Restaurant).filter(
            models.Restaurant.name.ilike(f"%{restaurant_data.name}%")
        ).first()

        if existing_restaurant:
            # Check if user already rated this restaurant
            existing_rating = db.query(models.Rating).filter(
                models.Rating.user_id == current_user.id,
                models.Rating.restaurant_id == existing_restaurant.id
            ).first()

            if not existing_rating:
                # Create rating
                rating = models.Rating(
                    user_id=current_user.id,
                    restaurant_id=existing_restaurant.id,
                    rating=restaurant_data.rating
                )
                db.add(rating)
                db.commit()
                db.refresh(rating)

                # Award points (base points only for bulk import)
                points_earned = 10
                total_points += points_earned
                imported_count += 1

                # Create point transaction
                transaction = models.PointTransaction(
                    user_id=current_user.id,
                    points=points_earned,
                    reason="bulk_import",
                    rating_id=rating.id,
                    month=current_month
                )
                db.add(transaction)

    # Apply point cap (200 points maximum)
    if total_points > 200:
        total_points = 200

    # Update user points
    user_points.total_points += total_points
    user_points.monthly_points += total_points
    user_points.bulk_import_points = total_points
    user_points.bulk_import_completed = True
    user_points.total_ratings += imported_count

    db.commit()

    return {
        "message": f"Successfully imported {imported_count} restaurant ratings",
        "points_earned": total_points,
        "capped_at_200": total_points == 200
    }


@router.get("/lottery/current", response_model=schemas.MonthlyLottery)
async def get_current_lottery(db: Session = Depends(get_db)):
    """Get current month's lottery information."""

    current_month = get_current_month()
    lottery = db.query(models.MonthlyLottery).filter(
        models.MonthlyLottery.month == current_month
    ).first()

    if not lottery:
        # Create current month's lottery
        lottery = models.MonthlyLottery(month=current_month)
        db.add(lottery)
        db.commit()
        db.refresh(lottery)

    # Calculate total tickets (points) for the month
    total_points = db.query(models.UserPoints.monthly_points).filter(
        models.UserPoints.current_month == current_month
    ).all()

    lottery.total_tickets = sum(points[0] for points in total_points)
    db.commit()

    return lottery


@router.post("/lottery/draw")
async def draw_monthly_lottery(
    month: str,
    db: Session = Depends(get_db)
):
    """Draw the monthly lottery (admin function - should be secured)."""

    lottery = db.query(models.MonthlyLottery).filter(
        models.MonthlyLottery.month == month
    ).first()

    if not lottery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lottery not found for specified month"
        )

    if lottery.is_drawn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lottery already drawn for this month"
        )

    # Get all users with points for this month
    user_points = db.query(models.UserPoints).filter(
        models.UserPoints.current_month == month,
        models.UserPoints.monthly_points > 0
    ).all()

    if not user_points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No eligible participants for lottery"
        )

    # Create weighted random selection based on points
    total_tickets = sum(up.monthly_points for up in user_points)
    winning_ticket = random.randint(1, total_tickets)

    # Find winner
    current_ticket = 0
    winner = None
    for up in user_points:
        current_ticket += up.monthly_points
        if current_ticket >= winning_ticket:
            winner = up
            break

    if not winner:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error determining lottery winner"
        )

    # Update lottery record
    lottery.is_drawn = True
    lottery.winner_user_id = winner.user_id
    lottery.winning_ticket_number = winning_ticket
    lottery.total_tickets = total_tickets
    lottery.draw_date = datetime.now()

    db.commit()

    return {
        "message": "Lottery drawn successfully",
        "winner_user_id": winner.user_id,
        "winning_ticket": winning_ticket,
        "total_tickets": total_tickets
    }