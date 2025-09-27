#!/usr/bin/env python3
"""
One-Click Real Restaurant Data Population Script

This script populates the database with maximum possible real restaurant data
from Google Places API within free tier limits.

Usage: python populate_real_data.py
"""

import os
import sys
import time
import json
from datetime import datetime
from typing import List, Dict, Any

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import get_db
from app.services.google_places import GooglePlacesService
from app.models import Restaurant
from app.config import get_settings

def check_api_key():
    """Check if a valid Google Places API key is configured."""
    settings = get_settings()

    if not settings.google_places_api_key or settings.google_places_api_key == "your-google-places-api-key":
        print("ERROR: No valid Google Places API key found!")
        print("\nTo get real restaurant data, you need to:")
        print("1. Go to https://console.cloud.google.com/apis/credentials")
        print("2. Create a new project or select existing one")
        print("3. Enable the 'Places API (New)' or 'Places API'")
        print("4. Create credentials -> API Key")
        print("5. Copy the API key")
        print("6. Edit backend/.env file and replace:")
        print("   GOOGLE_PLACES_API_KEY=your-actual-api-key-here")
        print("\nNote: Google Places API has a free tier with $200/month credit")
        print("   This script is designed to stay within free limits.")
        return False

    return True

def get_chapel_hill_search_areas():
    """Define search areas around Chapel Hill to maximize coverage."""
    return [
        {
            "name": "Downtown Chapel Hill",
            "lat": 35.9132,
            "lng": -79.0558,
            "radius": 1500,
            "keywords": ["restaurant", "food", "dining"]
        },
        {
            "name": "Franklin Street",
            "lat": 35.9135,
            "lng": -79.0520,
            "radius": 1000,
            "keywords": ["restaurant", "cafe", "bar"]
        },
        {
            "name": "Carrboro",
            "lat": 35.9108,
            "lng": -79.0753,
            "radius": 1500,
            "keywords": ["restaurant", "food", "dining"]
        },
        {
            "name": "UNC Campus Area",
            "lat": 35.9049,
            "lng": -79.0469,
            "radius": 1200,
            "keywords": ["restaurant", "food", "dining"]
        },
        {
            "name": "South Chapel Hill",
            "lat": 35.8989,
            "lng": -79.0558,
            "radius": 1500,
            "keywords": ["restaurant", "food", "dining"]
        },
        {
            "name": "East Chapel Hill",
            "lat": 35.9132,
            "lng": -79.0350,
            "radius": 1500,
            "keywords": ["restaurant", "food", "dining"]
        }
    ]

def comprehensive_restaurant_discovery(db: Session):
    """Discover restaurants using multiple search strategies."""
    places_service = GooglePlacesService()

    print(f"Starting comprehensive restaurant discovery...")
    print(f"API requests used today: {places_service.daily_requests}/{places_service.DAILY_REQUEST_LIMIT}")

    if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT:
        print("WARNING: Daily API limit already reached!")
        return {"total_found": 0, "total_saved": 0, "api_requests_used": 0}

    total_found = 0
    total_saved = 0
    api_requests_used = 0
    search_areas = get_chapel_hill_search_areas()

    for area in search_areas:
        print(f"\nSearching {area['name']}...")

        for keyword in area['keywords']:
            if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT:
                print("WARNING: Reached daily API limit, stopping search.")
                break

            print(f"   Keyword: {keyword}")

            try:
                restaurants = places_service.search_restaurants(
                    lat=area['lat'],
                    lng=area['lng'],
                    radius=area['radius'],
                    keyword=keyword
                )

                api_requests_used += 1
                found_count = len(restaurants)
                total_found += found_count

                print(f"      Found {found_count} restaurants")

                # Save new restaurants to database
                saved_count = 0
                for restaurant_data in restaurants:
                    try:
                        # Check if restaurant already exists
                        existing = db.query(Restaurant).filter(
                            Restaurant.name == restaurant_data['name']
                        ).first()

                        if not existing:
                            restaurant = Restaurant(
                                name=restaurant_data['name'],
                                address=restaurant_data.get('address'),
                                phone=restaurant_data.get('phone'),
                                website=restaurant_data.get('website'),
                                cuisine_type=restaurant_data.get('cuisine_type', 'Restaurant'),
                                price_level=restaurant_data.get('price_level', 2),
                                latitude=restaurant_data['latitude'],
                                longitude=restaurant_data['longitude'],
                                google_place_id=restaurant_data.get('place_id'),
                                google_rating=restaurant_data.get('rating'),
                                google_rating_count=restaurant_data.get('user_ratings_total', 0),
                                google_photos=restaurant_data.get('photos', []),
                                hours=restaurant_data.get('hours', {}),
                                avg_rating=restaurant_data.get('rating', 4.0),
                                rating_count=0
                            )
                            db.add(restaurant)
                            saved_count += 1

                    except Exception as e:
                        print(f"      ⚠️  Error saving restaurant: {e}")
                        continue

                if saved_count > 0:
                    db.commit()
                    total_saved += saved_count
                    print(f"      ✅ Saved {saved_count} new restaurants")
                else:
                    print(f"      📝 No new restaurants (all already in database)")

                # Rate limiting delay
                time.sleep(0.2)  # Stay well under 10 requests/second

            except Exception as e:
                print(f"      ❌ Error searching with keyword '{keyword}': {e}")
                continue

        if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT:
            break

    return {
        "total_found": total_found,
        "total_saved": total_saved,
        "api_requests_used": api_requests_used
    }

def enhance_existing_restaurants(db: Session):
    """Enhance existing restaurants with missing Google Places data."""
    places_service = GooglePlacesService()

    print(f"\n📷 Enhancing existing restaurants with Google Places data...")

    # Get restaurants missing Google data
    restaurants = db.query(Restaurant).filter(
        (Restaurant.google_place_id.is_(None)) |
        (Restaurant.google_photos == []) |
        (Restaurant.google_rating.is_(None))
    ).limit(50).all()  # Limit to stay within API budget

    enhanced_count = 0

    for restaurant in restaurants:
        if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT:
            print("⚠️  Reached daily API limit, stopping enhancement.")
            break

        print(f"   🔸 Enhancing: {restaurant.name}")

        try:
            # Search for the restaurant by name and location
            enhanced_data = places_service.enhance_restaurant_data(restaurant.name, restaurant.latitude, restaurant.longitude)

            if enhanced_data:
                # Update restaurant with enhanced data
                if enhanced_data.get('google_place_id'):
                    restaurant.google_place_id = enhanced_data['google_place_id']
                if enhanced_data.get('google_rating'):
                    restaurant.google_rating = enhanced_data['google_rating']
                if enhanced_data.get('google_rating_count'):
                    restaurant.google_rating_count = enhanced_data['google_rating_count']
                if enhanced_data.get('google_photos'):
                    restaurant.google_photos = enhanced_data['google_photos']
                if enhanced_data.get('phone') and not restaurant.phone:
                    restaurant.phone = enhanced_data['phone']
                if enhanced_data.get('website') and not restaurant.website:
                    restaurant.website = enhanced_data['website']
                if enhanced_data.get('hours'):
                    restaurant.hours = enhanced_data['hours']

                enhanced_count += 1
                print(f"      ✅ Enhanced with Google Places data")
            else:
                print(f"      📝 No additional data found")

            time.sleep(0.2)  # Rate limiting

        except Exception as e:
            print(f"      ❌ Error enhancing restaurant: {e}")
            continue

    if enhanced_count > 0:
        db.commit()
        print(f"✅ Enhanced {enhanced_count} restaurants with Google Places data")

    return enhanced_count

def generate_summary_report(db: Session):
    """Generate a summary report of the database population."""
    print(f"\n📊 DATABASE POPULATION SUMMARY")
    print("=" * 50)

    restaurant_count = db.query(Restaurant).count()
    restaurants_with_google_data = db.query(Restaurant).filter(Restaurant.google_place_id.isnot(None)).count()
    restaurants_with_photos = db.query(Restaurant).filter(Restaurant.google_photos != []).count()
    restaurants_with_ratings = db.query(Restaurant).filter(Restaurant.google_rating.isnot(None)).count()

    print(f"📍 Total Restaurants: {restaurant_count}")
    print(f"🔗 With Google Place ID: {restaurants_with_google_data}")
    print(f"📷 With Photos: {restaurants_with_photos}")
    print(f"⭐ With Google Ratings: {restaurants_with_ratings}")

    # Show some sample restaurants
    print(f"\n🍽️  SAMPLE RESTAURANTS:")
    sample_restaurants = db.query(Restaurant).order_by(Restaurant.google_rating.desc()).limit(5).all()

    for i, restaurant in enumerate(sample_restaurants, 1):
        rating_str = f"{restaurant.google_rating}★" if restaurant.google_rating else "No rating"
        photo_str = f"{len(restaurant.google_photos)} photos" if restaurant.google_photos else "No photos"
        print(f"{i}. {restaurant.name}")
        print(f"   📍 {restaurant.address}")
        print(f"   ⭐ {rating_str} | 📷 {photo_str}")
        print(f"   🍽️  {restaurant.cuisine_type} | 💰 {'$' * (restaurant.price_level or 2)}")
        print()

def main():
    """Main function to populate database with real restaurant data."""
    print("Rate My Rest - Real Data Population Script")
    print("=" * 50)
    print(f"Started at: {datetime.now()}")

    # Check API key
    if not check_api_key():
        return

    # Get database session
    db = next(get_db())

    try:
        # Step 1: Discover new restaurants
        discovery_results = comprehensive_restaurant_discovery(db)

        # Step 2: Enhance existing restaurants
        enhanced_count = enhance_existing_restaurants(db)

        # Step 3: Generate summary report
        generate_summary_report(db)

        # Final summary
        print(f"\n🎉 POPULATION COMPLETE!")
        print("=" * 30)
        print(f"🔍 Total restaurants found: {discovery_results['total_found']}")
        print(f"💾 New restaurants saved: {discovery_results['total_saved']}")
        print(f"✨ Existing restaurants enhanced: {enhanced_count}")
        print(f"📡 API requests used: {discovery_results['api_requests_used']}")

        places_service = GooglePlacesService()
        remaining = places_service.DAILY_REQUEST_LIMIT - places_service.daily_requests
        print(f"📊 API requests remaining today: {remaining}")

        print(f"\n✅ Database is now populated with real restaurant data!")
        print(f"🌐 You can now test the application with live Google Places data.")

    except Exception as e:
        print(f"💥 Error during population: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()