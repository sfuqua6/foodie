#!/usr/bin/env python3
"""
Google Places data sync script
Fetches fresh restaurant data and images from Google Places API
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

def sync_restaurant_data():
    """Main sync function to update restaurant data from Google Places"""

    print("Starting Google Places data sync...")
    print(f"Started at: {datetime.now()}")

    # Get database session
    db = next(get_db())

    try:
        # Initialize Google Places service
        places_service = GooglePlacesService()

        # Check API usage before starting
        print(f"Daily API requests used: {places_service.daily_requests}/{places_service.DAILY_REQUEST_LIMIT}")

        if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT:
            print("WARNING: Daily API limit reached. Exiting...")
            return

        remaining_requests = places_service.DAILY_REQUEST_LIMIT - places_service.daily_requests
        print(f"Remaining API requests today: {remaining_requests}")

        # Step 1: Update existing restaurants with missing data/photos
        print("\nStep 1: Updating existing restaurants with missing photos/data...")
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
                radius=3000   # 3km radius
            )

            print(f"Added {discover_result['added']} new restaurants")
            print(f"API requests remaining: {discover_result['remaining_requests']}")
        else:
            print("\nSkipping discovery - insufficient API budget")

        print(f"\nSync completed at: {datetime.now()}")

    except Exception as e:
        print(f"Error during sync: {e}")
        db.rollback()
    finally:
        db.close()

def quick_image_sync():
    """Quick sync focusing only on restaurant images"""

    print("Starting quick image sync...")

    db = next(get_db())

    try:
        places_service = GooglePlacesService()

        print(f"Daily API requests used: {places_service.daily_requests}/{places_service.DAILY_REQUEST_LIMIT}")

        if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT:
            print("WARNING: Daily API limit reached. Exiting...")
            return

        # Focus specifically on restaurants without photos
        result = places_service.batch_update_restaurant_data(db, limit=20)

        print(f"Updated images for {result['updated']} restaurants")
        print(f"API requests remaining: {result['remaining_requests']}")

    except Exception as e:
        print(f"Error during image sync: {e}")
        db.rollback()
    finally:
        db.close()

def show_usage_stats():
    """Show current API usage statistics"""

    places_service = GooglePlacesService()

    print("Google Places API Usage Stats")
    print("=" * 40)
    print(f"Daily requests used: {places_service.daily_requests}")
    print(f"Daily limit: {places_service.DAILY_REQUEST_LIMIT}")
    print(f"Remaining today: {places_service.DAILY_REQUEST_LIMIT - places_service.daily_requests}")
    print(f"Usage percentage: {(places_service.daily_requests / places_service.DAILY_REQUEST_LIMIT) * 100:.1f}%")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()

        if command == "images":
            quick_image_sync()
        elif command == "stats":
            show_usage_stats()
        elif command == "full":
            sync_restaurant_data()
        else:
            print("Usage: python sync_google_data.py [full|images|stats]")
            print("  full   - Complete sync (restaurants + images)")
            print("  images - Quick image sync only")
            print("  stats  - Show API usage statistics")
    else:
        # Default to quick image sync
        quick_image_sync()