from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from geopy.distance import geodesic

from ..database import get_db
from ..schemas import Restaurant, RestaurantSearch
from ..models import Restaurant as RestaurantModel
from ..auth import get_current_active_user
from ..models import User
from ..services.search_intelligence import search_intelligence

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("/", response_model=List[Restaurant])
async def get_restaurants(
    search: RestaurantSearch = Depends(),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get restaurants with search and filter options."""
    query = db.query(RestaurantModel).filter(RestaurantModel.is_active == True)

    # Intelligent text search with semantic expansion
    if search.query:
        # Analyze search intent and expand query
        search_analysis = search_intelligence.analyze_search_intent(search.query)
        expanded_terms = search_analysis["expanded_terms"]

        # Create search conditions for original and expanded terms
        search_conditions = []

        # Original query
        original_term = f"%{search.query}%"
        search_conditions.extend([
            RestaurantModel.name.ilike(original_term),
            RestaurantModel.address.ilike(original_term),
            RestaurantModel.cuisine_type.ilike(original_term)
        ])

        # Expanded terms
        for term in expanded_terms:
            expanded_term = f"%{term}%"
            search_conditions.extend([
                RestaurantModel.name.ilike(expanded_term),
                RestaurantModel.cuisine_type.ilike(expanded_term)
            ])

        # Apply semantic cuisine filtering if detected
        if search_analysis["filters"]["cuisine_types"]:
            search_conditions.extend([
                RestaurantModel.cuisine_type.ilike(f"%{cuisine}%")
                for cuisine in search_analysis["filters"]["cuisine_types"]
            ])

        query = query.filter(or_(*search_conditions))

    # Cuisine filter
    if search.cuisine_filter:
        query = query.filter(RestaurantModel.cuisine_type.in_(search.cuisine_filter))

    # Price filter
    if search.price_filter:
        query = query.filter(RestaurantModel.price_level.in_(search.price_filter))

    # Minimum rating filter
    if search.min_rating:
        query = query.filter(RestaurantModel.avg_rating >= search.min_rating)

    # Order by rating
    query = query.order_by(RestaurantModel.avg_rating.desc())

    # Pagination
    restaurants = query.offset(search.offset).limit(search.limit).all()

    # Calculate distances if user location provided
    if search.user_lat and search.user_lng:
        user_location = (search.user_lat, search.user_lng)

        filtered_restaurants = []
        for restaurant in restaurants:
            restaurant_location = (restaurant.latitude, restaurant.longitude)
            distance = geodesic(user_location, restaurant_location).kilometers

            if distance <= search.max_distance:
                # Add distance to the restaurant object
                restaurant.distance = distance
                filtered_restaurants.append(restaurant)

        # Sort by distance
        filtered_restaurants.sort(key=lambda x: x.distance)
        restaurants = filtered_restaurants

    return restaurants


@router.get("/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(
    restaurant_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific restaurant by ID."""
    restaurant = db.query(RestaurantModel).filter(
        RestaurantModel.id == restaurant_id,
        RestaurantModel.is_active == True
    ).first()

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    return restaurant


@router.get("/nearby/", response_model=List[Restaurant])
async def get_nearby_restaurants(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(10.0, description="Search radius in kilometers"),
    limit: int = Query(20, description="Maximum number of results"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get restaurants near a specific location."""
    restaurants = db.query(RestaurantModel).filter(RestaurantModel.is_active == True).all()

    user_location = (lat, lng)
    nearby_restaurants = []

    for restaurant in restaurants:
        restaurant_location = (restaurant.latitude, restaurant.longitude)
        distance = geodesic(user_location, restaurant_location).kilometers

        if distance <= radius:
            restaurant.distance = distance
            nearby_restaurants.append(restaurant)

    # Sort by distance
    nearby_restaurants.sort(key=lambda x: x.distance)

    return nearby_restaurants[:limit]


@router.get("/search/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Partial search query"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get search auto-complete suggestions."""
    # Get available cuisines from database
    available_cuisines = db.query(RestaurantModel.cuisine_type).distinct().all()
    available_cuisines = [c[0] for c in available_cuisines if c[0]]

    suggestions = search_intelligence.get_search_suggestions(q, available_cuisines)

    return {"suggestions": suggestions}


@router.get("/search/corrections")
async def get_search_corrections(
    q: str = Query(..., description="Search query that might need correction"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get 'did you mean' suggestions for search queries."""
    # Get available cuisines and restaurant names
    available_cuisines = db.query(RestaurantModel.cuisine_type).distinct().all()
    available_cuisines = [c[0] for c in available_cuisines if c[0]]

    restaurant_names = db.query(RestaurantModel.name).distinct().limit(100).all()
    restaurant_names = [r[0] for r in restaurant_names if r[0]]

    available_terms = available_cuisines + restaurant_names

    corrections = search_intelligence.suggest_corrections(q, available_terms)

    return {
        "original_query": q,
        "suggestions": corrections,
        "has_suggestions": len(corrections) > 0
    }


@router.get("/search/analyze")
async def analyze_search_query(
    q: str = Query(..., description="Search query to analyze"),
    current_user: User = Depends(get_current_active_user)
):
    """Analyze search query to understand user intent (for debugging)."""
    analysis = search_intelligence.analyze_search_intent(q)
    return analysis