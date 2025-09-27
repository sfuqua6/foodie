import requests
import logging
import time
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..config import get_settings
from ..models import Restaurant
from ..database import get_db

logger = logging.getLogger(__name__)
settings = get_settings()


class GooglePlacesService:
    BASE_URL = "https://maps.googleapis.com/maps/api/place"

    # Free tier limits: 1000 requests per day, max 10 per second
    DAILY_REQUEST_LIMIT = 1000
    RATE_LIMIT_PER_SECOND = 10

    def __init__(self):
        self.api_key = settings.google_places_api_key
        self.request_count = 0
        self.last_request_time = 0
        self.daily_requests = self._load_daily_requests()

    def search_restaurants(
        self,
        lat: float = settings.chapel_hill_lat,
        lng: float = settings.chapel_hill_lng,
        radius: int = settings.places_radius,
        keyword: str = "restaurant"
    ) -> List[Dict[str, Any]]:
        """Search for restaurants using Google Places API."""
        if not self.api_key:
            logger.warning("Google Places API key not configured")
            return []

        url = f"{self.BASE_URL}/nearbysearch/json"
        params = {
            "location": f"{lat},{lng}",
            "radius": radius,
            "type": "restaurant",
            "keyword": keyword,
            "key": self.api_key
        }

        data = self._make_api_request(url, params)
        return data.get("results", []) if data else []

    def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific place."""
        if not self.api_key:
            logger.warning("Google Places API key not configured")
            return None

        url = f"{self.BASE_URL}/details/json"
        params = {
            "place_id": place_id,
            "fields": "name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,photos,geometry,price_level,types",
            "key": self.api_key
        }

        data = self._make_api_request(url, params)
        return data.get("result") if data else None

    def parse_restaurant_data(self, place_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Google Places data into our restaurant format."""
        geometry = place_data.get("geometry", {})
        location = geometry.get("location", {})

        # Determine cuisine type from types
        types = place_data.get("types", [])
        cuisine_type = self._extract_cuisine_type(types)

        # Parse opening hours
        opening_hours = place_data.get("opening_hours", {})
        hours_data = {}
        if opening_hours.get("weekday_text"):
            for day_hour in opening_hours["weekday_text"]:
                parts = day_hour.split(": ", 1)
                if len(parts) == 2:
                    day, hours = parts
                    hours_data[day.lower()] = hours

        # Extract photos
        photos = []
        if place_data.get("photos"):
            for photo in place_data["photos"][:5]:  # Limit to 5 photos
                photo_reference = photo.get("photo_reference")
                if photo_reference:
                    photo_url = f"{self.BASE_URL}/photo?maxwidth=400&photoreference={photo_reference}&key={self.api_key}"
                    photos.append(photo_url)

        return {
            "google_place_id": place_data.get("place_id"),
            "name": place_data.get("name", ""),
            "address": place_data.get("formatted_address") or place_data.get("vicinity", ""),
            "phone": place_data.get("formatted_phone_number"),
            "website": place_data.get("website"),
            "cuisine_type": cuisine_type,
            "price_level": place_data.get("price_level"),
            "latitude": location.get("lat", 0),
            "longitude": location.get("lng", 0),
            "hours": hours_data,
            "google_rating": place_data.get("rating"),
            "google_rating_count": place_data.get("user_ratings_total"),
            "google_photos": photos,
        }

    def _extract_cuisine_type(self, types: List[str]) -> str:
        """Extract cuisine type from Google Places types."""
        cuisine_mapping = {
            "chinese_restaurant": "Chinese",
            "italian_restaurant": "Italian",
            "mexican_restaurant": "Mexican",
            "indian_restaurant": "Indian",
            "japanese_restaurant": "Japanese",
            "thai_restaurant": "Thai",
            "french_restaurant": "French",
            "american_restaurant": "American",
            "pizza": "Pizza",
            "cafe": "Cafe",
            "bakery": "Bakery",
            "bar": "Bar & Grill",
            "fast_food": "Fast Food",
        }

        for place_type in types:
            if place_type in cuisine_mapping:
                return cuisine_mapping[place_type]

        # Default based on common keywords
        types_str = " ".join(types).lower()
        if "pizza" in types_str:
            return "Pizza"
        elif "cafe" in types_str or "coffee" in types_str:
            return "Cafe"
        elif "bar" in types_str:
            return "Bar & Grill"
        elif "fast" in types_str:
            return "Fast Food"

        return "American"  # Default cuisine type

    def _load_daily_requests(self) -> int:
        """Load today's request count from persistent storage."""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            # Use current directory for Windows compatibility
            cache_file = f'google_places_requests_{today}.json'
            try:
                with open(cache_file, 'r') as f:
                    data = json.load(f)
                    return data.get('count', 0)
            except (FileNotFoundError, json.JSONDecodeError):
                return 0
        except Exception:
            return 0

    def _save_daily_requests(self):
        """Save today's request count to persistent storage."""
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            # Use current directory for Windows compatibility
            cache_file = f'google_places_requests_{today}.json'
            with open(cache_file, 'w') as f:
                json.dump({'count': self.daily_requests, 'date': today}, f)
        except Exception as e:
            logger.error(f"Failed to save request count: {e}")

    def _check_rate_limits(self) -> bool:
        """Check if we can make another API request within rate limits."""
        # Check daily limit
        if self.daily_requests >= self.DAILY_REQUEST_LIMIT:
            logger.warning(f"Daily API limit reached ({self.DAILY_REQUEST_LIMIT})")
            return False

        # Check per-second rate limit
        current_time = time.time()
        if current_time - self.last_request_time < (1.0 / self.RATE_LIMIT_PER_SECOND):
            time.sleep(0.1)  # Brief pause to respect rate limiting

        return True

    def _make_api_request(self, url: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Make API request with rate limiting and error handling."""
        if not self._check_rate_limits():
            return None

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            self.daily_requests += 1
            self.last_request_time = time.time()
            self._save_daily_requests()

            data = response.json()

            if data.get("status") not in ["OK", "ZERO_RESULTS"]:
                logger.error(f"Google Places API error: {data.get('error_message', 'Unknown error')}")
                return None

            return data

        except requests.RequestException as e:
            logger.error(f"Request to Google Places API failed: {e}")
            return None

    def batch_update_restaurant_data(self, db: Session, limit: int = 50) -> Dict[str, Any]:
        """
        Batch update restaurant data from Google Places API within free tier limits.
        Prioritizes restaurants with missing data or old data.
        """
        if not self.api_key:
            logger.warning("Google Places API key not configured")
            return {"updated": 0, "errors": 0, "message": "API key not configured"}

        # Get restaurants that need updates (prioritize missing photos/data)
        restaurants = db.query(Restaurant).filter(
            (Restaurant.google_place_id.is_(None)) |
            (Restaurant.google_photos == []) |
            (Restaurant.last_google_update.is_(None)) |
            (Restaurant.last_google_update < datetime.utcnow() - timedelta(days=7))
        ).limit(min(limit, self.DAILY_REQUEST_LIMIT - self.daily_requests)).all()

        updated_count = 0
        error_count = 0

        for restaurant in restaurants:
            try:
                if not self._check_rate_limits():
                    break

                # Search for restaurant if no place_id
                if not restaurant.google_place_id:
                    search_result = self._search_specific_restaurant(
                        restaurant.name,
                        restaurant.latitude,
                        restaurant.longitude
                    )

                    if search_result and search_result.get("place_id"):
                        place_id = search_result["place_id"]

                        # Check if this place_id is already assigned to another restaurant
                        existing_restaurant = db.query(Restaurant).filter(
                            Restaurant.google_place_id == place_id,
                            Restaurant.id != restaurant.id
                        ).first()

                        if existing_restaurant:
                            logger.warning(f"Google Place ID {place_id} already assigned to {existing_restaurant.name}, skipping {restaurant.name}")
                            error_count += 1
                            continue

                        restaurant.google_place_id = place_id
                    else:
                        logger.warning(f"Could not find Google Place ID for {restaurant.name}")
                        error_count += 1
                        continue

                # Get detailed place data
                place_details = self.get_place_details(restaurant.google_place_id)

                if place_details:
                    # Update restaurant with fresh data
                    parsed_data = self.parse_restaurant_data(place_details)

                    # Ensure google_place_id is set
                    if not restaurant.google_place_id and parsed_data.get("google_place_id"):
                        place_id = parsed_data.get("google_place_id")

                        # Check if this place_id is already assigned to another restaurant
                        existing_restaurant = db.query(Restaurant).filter(
                            Restaurant.google_place_id == place_id,
                            Restaurant.id != restaurant.id
                        ).first()

                        if not existing_restaurant:
                            restaurant.google_place_id = place_id

                    restaurant.google_rating = parsed_data.get("google_rating")
                    restaurant.google_rating_count = parsed_data.get("google_rating_count")
                    restaurant.google_photos = parsed_data.get("google_photos", [])
                    restaurant.hours = parsed_data.get("hours", {})
                    restaurant.phone = restaurant.phone or parsed_data.get("phone")
                    restaurant.website = restaurant.website or parsed_data.get("website")
                    restaurant.last_google_update = datetime.utcnow()

                    updated_count += 1
                    logger.info(f"Updated data for {restaurant.name}")
                else:
                    error_count += 1

                # Small delay to be respectful to the API
                time.sleep(0.1)

                # Commit individually to handle constraint errors gracefully
                try:
                    db.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to commit changes for {restaurant.name}: {commit_error}")
                    db.rollback()
                    error_count += 1

            except Exception as e:
                logger.error(f"Error updating {restaurant.name}: {e}")
                db.rollback()
                error_count += 1

        return {
            "updated": updated_count,
            "errors": error_count,
            "remaining_requests": self.DAILY_REQUEST_LIMIT - self.daily_requests,
            "message": f"Updated {updated_count} restaurants, {error_count} errors"
        }

    def _search_specific_restaurant(self, name: str, lat: float, lng: float) -> Optional[Dict[str, Any]]:
        """Search for a specific restaurant by name and location."""
        # First try text search for better name matching
        text_search_url = f"{self.BASE_URL}/textsearch/json"
        params = {
            "query": f"{name} restaurant",
            "location": f"{lat},{lng}",
            "radius": 1000,  # Larger radius for better coverage
            "type": "restaurant",
            "key": self.api_key
        }

        data = self._make_api_request(text_search_url, params)

        if data and data.get("results"):
            # Look for name matches
            for result in data["results"]:
                result_name = result.get("name", "").lower()
                query_name = name.lower()

                # Try exact match first
                if result_name == query_name:
                    return result

                # Then try substantial word overlap
                name_words = set(query_name.split())
                result_words = set(result_name.split())

                # If at least half the words match and they're substantial (>3 chars)
                substantial_words = {w for w in name_words if len(w) > 3}
                if substantial_words and len(substantial_words.intersection(result_words)) >= len(substantial_words) * 0.5:
                    return result

        # Fallback to nearby search with larger radius
        nearby_url = f"{self.BASE_URL}/nearbysearch/json"
        params = {
            "location": f"{lat},{lng}",
            "radius": 500,  # Larger radius
            "keyword": name,
            "type": "restaurant",
            "key": self.api_key
        }

        data = self._make_api_request(nearby_url, params)

        if data and data.get("results"):
            # Return the first result
            return data["results"][0]

        return None

    def discover_new_restaurants(self, db: Session,
                                lat: float = settings.chapel_hill_lat,
                                lng: float = settings.chapel_hill_lng,
                                radius: int = 2000) -> Dict[str, Any]:
        """
        Discover new restaurants in Chapel Hill and add them to the database.
        Uses multiple search queries to find diverse restaurants within free tier limits.
        """
        if not self.api_key:
            return {"added": 0, "message": "API key not configured"}

        # Different search terms to discover variety of restaurants
        search_terms = [
            "restaurant",
            "food",
            "dining",
            "cafe",
            "pizza",
            "sushi",
            "mexican food",
            "italian food",
            "barbecue",
            "chinese food",
            "thai food",
            "indian food",
            "sandwich shop",
            "bakery",
            "brewery",
            "steakhouse",
            "seafood",
            "vegetarian",
            "fast food",
            "deli"
        ]

        added_count = 0
        existing_place_ids = set(
            db.query(Restaurant.google_place_id)
            .filter(Restaurant.google_place_id.is_not(None))
            .all()
        )
        existing_place_ids = {pid[0] for pid in existing_place_ids}

        for search_term in search_terms:
            if not self._check_rate_limits():
                break

            restaurants = self.search_restaurants(lat, lng, radius, search_term)

            for restaurant_data in restaurants:
                place_id = restaurant_data.get("place_id")

                # Skip if we already have this restaurant
                if place_id in existing_place_ids:
                    continue

                try:
                    # Get detailed information
                    if not self._check_rate_limits():
                        break

                    place_details = self.get_place_details(place_id)

                    if place_details:
                        parsed_data = self.parse_restaurant_data(place_details)

                        # Create new restaurant record
                        new_restaurant = Restaurant(
                            google_place_id=parsed_data["google_place_id"],
                            name=parsed_data["name"],
                            address=parsed_data["address"],
                            phone=parsed_data.get("phone"),
                            website=parsed_data.get("website"),
                            cuisine_type=parsed_data["cuisine_type"],
                            price_level=parsed_data.get("price_level"),
                            latitude=parsed_data["latitude"],
                            longitude=parsed_data["longitude"],
                            hours=parsed_data["hours"],
                            google_rating=parsed_data.get("google_rating"),
                            google_rating_count=parsed_data.get("google_rating_count"),
                            google_photos=parsed_data.get("google_photos", []),
                            last_google_update=datetime.utcnow()
                        )

                        db.add(new_restaurant)
                        existing_place_ids.add(place_id)
                        added_count += 1

                        logger.info(f"Added new restaurant: {parsed_data['name']}")

                        # Don't add too many at once
                        if added_count >= 50:
                            break

                    time.sleep(0.1)  # Respectful delay

                except Exception as e:
                    logger.error(f"Error adding restaurant {restaurant_data.get('name', 'unknown')}: {e}")

            if added_count >= 50:
                break

        db.commit()

        return {
            "added": added_count,
            "remaining_requests": self.DAILY_REQUEST_LIMIT - self.daily_requests,
            "message": f"Added {added_count} new restaurants"
        }

    def enhance_restaurant_data(self, restaurant_name: str, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
        """Search for and enhance restaurant data using name and location."""
        if not self.api_key:
            logger.warning("Google Places API key not configured")
            return None

        # First try to find the restaurant using text search
        text_search_url = f"{self.BASE_URL}/textsearch/json"
        params = {
            "query": f"{restaurant_name} restaurant",
            "location": f"{latitude},{longitude}",
            "radius": 500,
            "type": "restaurant",
            "key": self.api_key
        }

        search_data = self._make_api_request(text_search_url, params)
        if not search_data or not search_data.get("results"):
            return None

        # Get the first result that's likely our restaurant
        for result in search_data["results"]:
            result_name = result.get("name", "").lower()
            query_name = restaurant_name.lower()

            # Simple name matching - if substantial overlap, it's likely the same place
            if any(word in result_name for word in query_name.split() if len(word) > 3):
                place_id = result.get("place_id")
                if place_id:
                    # Get detailed information
                    details = self.get_place_details(place_id)
                    if details:
                        return self.parse_restaurant_data(details)
                break

        return None

    def get_photo_url(self, photo_reference: str, maxwidth: int = 600) -> str:
        """Generate Google Places photo URL."""
        return f"{self.BASE_URL}/photo?maxwidth={maxwidth}&photoreference={photo_reference}&key={self.api_key}"