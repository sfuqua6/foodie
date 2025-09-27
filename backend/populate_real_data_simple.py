#!/usr/bin/env python3
"""
One-Click Real Restaurant Data Population Script (Windows Compatible)

This script populates the database with maximum possible real restaurant data
from Google Places API within free tier limits.

Usage: python populate_real_data_simple.py
"""

import os
import sys
import time
from datetime import datetime

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
        print("This script is designed to stay within free limits.")
        return False

    return True

def main():
    """Main function to populate database with real restaurant data."""
    print("Rate My Rest - Real Data Population Script")
    print("=" * 50)
    print(f"Started at: {datetime.now()}")

    # Check API key
    if not check_api_key():
        print("\nPlease configure your Google Places API key and try again.")
        return

    # Get database session
    db = next(get_db())

    try:
        # Initialize Google Places service
        places_service = GooglePlacesService()

        print(f"\nAPI Usage Status:")
        print(f"Daily requests used: {places_service.daily_requests}/{places_service.DAILY_REQUEST_LIMIT}")

        if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT:
            print("WARNING: Daily API limit reached. Exiting...")
            return

        remaining_requests = places_service.DAILY_REQUEST_LIMIT - places_service.daily_requests
        print(f"Remaining API requests today: {remaining_requests}")

        # Run the existing sync script logic
        print("\n" + "="*50)
        print("RUNNING COMPREHENSIVE DATA SYNC")
        print("="*50)

        # Step 1: Update existing restaurants
        print("\nStep 1: Updating existing restaurants with missing data...")
        update_result = places_service.batch_update_restaurant_data(db, limit=min(30, remaining_requests // 2))

        print(f"Updated {update_result['updated']} restaurants")
        print(f"Errors: {update_result['errors']}")
        print(f"API requests remaining: {update_result['remaining_requests']}")

        # Small delay between operations
        time.sleep(1)

        # Step 2: Discover new restaurants if we have API budget left
        if update_result['remaining_requests'] > 10:
            print(f"\nStep 2: Discovering new restaurants...")

            discover_result = places_service.discover_new_restaurants(
                db,
                lat=35.9132,  # Chapel Hill coordinates
                lng=-79.0558,
                radius=10000   # 10km radius for maximum coverage
            )

            print(f"Added {discover_result['added']} new restaurants")
            print(f"API requests remaining: {discover_result['remaining_requests']}")
        else:
            print("\nSkipping discovery - insufficient API budget")

        # Generate final summary
        print(f"\n" + "="*50)
        print("DATABASE SUMMARY")
        print("="*50)

        restaurant_count = db.query(Restaurant).count()
        restaurants_with_google_data = db.query(Restaurant).filter(Restaurant.google_place_id.isnot(None)).count()
        restaurants_with_photos = db.query(Restaurant).filter(Restaurant.google_photos != []).count()

        print(f"Total Restaurants: {restaurant_count}")
        print(f"With Google Place ID: {restaurants_with_google_data}")
        print(f"With Photos: {restaurants_with_photos}")

        # Show top rated restaurants
        print(f"\nTop Rated Restaurants:")
        top_restaurants = db.query(Restaurant).order_by(Restaurant.avg_rating.desc()).limit(5).all()

        for i, restaurant in enumerate(top_restaurants, 1):
            rating_str = f"{restaurant.avg_rating:.1f}/5" if restaurant.avg_rating else "No rating"
            print(f"{i}. {restaurant.name} - {rating_str}")
            if restaurant.address:
                print(f"   Address: {restaurant.address}")
            print()

        print(f"Sync completed at: {datetime.now()}")
        print("\nSUCCESS: Database is now populated with real restaurant data!")
        print("You can now test the application with live Google Places data.")
        print("\nAccess your application at:")
        print("Frontend: http://localhost:3000")
        print("Backend API: http://localhost:8000/docs")

    except Exception as e:
        print(f"Error during sync: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()