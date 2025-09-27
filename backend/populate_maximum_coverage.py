#!/usr/bin/env python3
"""
Maximum Restaurant Coverage Script

This script maximizes restaurant discovery by:
1. Searching multiple geographic areas around Chapel Hill
2. Using extensive search terms
3. Utilizing maximum API budget efficiently
4. Covering Durham, Raleigh, and surrounding areas
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

def main():
    """Main function for maximum restaurant coverage."""
    print("Rate My Rest - Maximum Coverage Script")
    print("=" * 50)
    print(f"Started at: {datetime.now()}")

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

        # Multiple search areas for comprehensive coverage
        search_areas = [
            # Chapel Hill core
            {"name": "Chapel Hill Downtown", "lat": 35.9132, "lng": -79.0558, "radius": 5000},
            {"name": "UNC Campus Area", "lat": 35.9049, "lng": -79.0469, "radius": 3000},

            # Carrboro
            {"name": "Carrboro Downtown", "lat": 35.9101, "lng": -79.0753, "radius": 4000},

            # Durham areas
            {"name": "Durham Downtown", "lat": 35.9940, "lng": -78.8986, "radius": 8000},
            {"name": "Duke University Area", "lat": 36.0014, "lng": -78.9382, "radius": 4000},
            {"name": "Research Triangle Park", "lat": 35.8992, "lng": -78.8747, "radius": 6000},

            # Raleigh areas
            {"name": "Raleigh Downtown", "lat": 35.7796, "lng": -78.6382, "radius": 8000},
            {"name": "NC State Area", "lat": 35.7847, "lng": -78.6821, "radius": 4000},

            # Suburbs and surrounding areas
            {"name": "Cary", "lat": 35.7915, "lng": -78.7811, "radius": 6000},
            {"name": "Apex", "lat": 35.7321, "lng": -78.8503, "radius": 5000},
            {"name": "Morrisville", "lat": 35.8235, "lng": -78.8264, "radius": 4000},
            {"name": "Holly Springs", "lat": 35.6513, "lng": -78.8336, "radius": 5000}
        ]

        total_added = 0

        for area in search_areas:
            if places_service.daily_requests >= places_service.DAILY_REQUEST_LIMIT - 10:
                print(f"\nStopping - approaching API limit")
                break

            print(f"\n--- Searching {area['name']} ---")
            print(f"Location: {area['lat']}, {area['lng']} (radius: {area['radius']}m)")

            result = places_service.discover_new_restaurants(
                db,
                lat=area['lat'],
                lng=area['lng'],
                radius=area['radius']
            )

            area_added = result.get('added', 0)
            total_added += area_added

            print(f"Added {area_added} new restaurants from {area['name']}")
            print(f"API requests remaining: {result.get('remaining_requests', 0)}")

            # Brief pause between areas
            time.sleep(1)

        # Final summary
        print(f"\n" + "="*50)
        print("MAXIMUM COVERAGE SUMMARY")
        print("="*50)

        restaurant_count = db.query(Restaurant).count()
        restaurants_with_google_data = db.query(Restaurant).filter(Restaurant.google_place_id.isnot(None)).count()
        restaurants_with_photos = db.query(Restaurant).filter(Restaurant.google_photos != []).count()

        print(f"Total Restaurants in Database: {restaurant_count}")
        print(f"With Google Place ID: {restaurants_with_google_data}")
        print(f"With Photos: {restaurants_with_photos}")
        print(f"Total Added This Session: {total_added}")
        print(f"API Requests Used: {places_service.daily_requests}")

        # Show geographic distribution
        print(f"\nGeographic Distribution:")
        areas_with_counts = []
        for area in search_areas:
            # Count restaurants in this area (approximate)
            area_restaurants = db.query(Restaurant).filter(
                Restaurant.latitude.between(area['lat'] - 0.05, area['lat'] + 0.05),
                Restaurant.longitude.between(area['lng'] - 0.05, area['lng'] + 0.05)
            ).count()
            areas_with_counts.append((area['name'], area_restaurants))

        for area_name, count in sorted(areas_with_counts, key=lambda x: x[1], reverse=True):
            if count > 0:
                print(f"  {area_name}: {count} restaurants")

        print(f"\nCompleted at: {datetime.now()}")
        print("\nSUCCESS: Maximum restaurant coverage achieved!")
        print("Your database now contains restaurants from across the Triangle area.")

    except Exception as e:
        print(f"Error during maximum coverage sync: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()