#!/usr/bin/env python3
"""
Seed data script for Rate My Rest
Creates sample users, restaurants, and ratings for Chapel Hill, NC
"""

import os
import sys
from datetime import datetime, timedelta
import random
from typing import List, Dict, Any

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.models import Base, User, Restaurant, Rating, Review, UserPreference
from app.auth import get_password_hash
from app.database import engine

settings = get_settings()

# Sample Chapel Hill restaurants data
CHAPEL_HILL_RESTAURANTS = [
    {
        "name": "Lantern Restaurant",
        "address": "423 W Franklin St, Chapel Hill, NC 27516",
        "phone": "(919) 969-8846",
        "website": "https://lanternrestaurant.com",
        "cuisine_type": "Asian",
        "price_level": 3,
        "latitude": 35.9132,
        "longitude": -79.0558,
        "google_rating": 4.4,
        "google_rating_count": 1250,
        "description": "Contemporary Asian cuisine in an elegant setting"
    },
    {
        "name": "Crook's Corner",
        "address": "610 W Franklin St, Chapel Hill, NC 27516",
        "phone": "(919) 929-7643",
        "website": "https://crookscorner.com",
        "cuisine_type": "Southern",
        "price_level": 3,
        "latitude": 35.9128,
        "longitude": -79.0575,
        "google_rating": 4.3,
        "google_rating_count": 980,
        "description": "Iconic Southern restaurant serving innovative regional cuisine"
    },
    {
        "name": "Mama Dip's Kitchen",
        "address": "408 W Rosemary St, Chapel Hill, NC 27516",
        "phone": "(919) 942-5837",
        "website": "https://mamadips.com",
        "cuisine_type": "Southern",
        "price_level": 2,
        "latitude": 35.9141,
        "longitude": -79.0556,
        "google_rating": 4.2,
        "google_rating_count": 1180,
        "description": "Traditional Southern comfort food and hospitality"
    },
    {
        "name": "Mediterranean Deli",
        "address": "410 W Franklin St, Chapel Hill, NC 27516",
        "phone": "(919) 967-2666",
        "website": "https://mediterraneandeli.com",
        "cuisine_type": "Mediterranean",
        "price_level": 2,
        "latitude": 35.9133,
        "longitude": -79.0557,
        "google_rating": 4.6,
        "google_rating_count": 1520,
        "description": "Fresh Mediterranean food and grocery items"
    },
    {
        "name": "Time-Out Restaurant",
        "address": "201 E Franklin St, Chapel Hill, NC 27514",
        "phone": "(919) 942-3200",
        "cuisine_type": "American",
        "price_level": 2,
        "latitude": 35.9135,
        "longitude": -79.0513,
        "google_rating": 4.1,
        "google_rating_count": 890,
        "description": "Classic diner serving burgers and comfort food since 1955"
    },
    {
        "name": "Kipos Greek Taverna",
        "address": "431 W Franklin St, Chapel Hill, NC 27516",
        "phone": "(919) 967-7797",
        "website": "https://kiposchapelhill.com",
        "cuisine_type": "Greek",
        "price_level": 2,
        "latitude": 35.9132,
        "longitude": -79.0559,
        "google_rating": 4.5,
        "google_rating_count": 740,
        "description": "Authentic Greek cuisine in a warm, welcoming atmosphere"
    },
    {
        "name": "Sutton's Drug Store",
        "address": "159 E Franklin St, Chapel Hill, NC 27514",
        "phone": "(919) 942-5161",
        "cuisine_type": "American",
        "price_level": 1,
        "latitude": 35.9136,
        "longitude": -79.0520,
        "google_rating": 4.0,
        "google_rating_count": 450,
        "description": "Historic soda fountain and lunch counter"
    },
    {
        "name": "Bin 54",
        "address": "120 E Main St, Carrboro, NC 27510",
        "phone": "(919) 967-1100",
        "website": "https://bin54.com",
        "cuisine_type": "American",
        "price_level": 3,
        "latitude": 35.9107,
        "longitude": -79.0753,
        "google_rating": 4.4,
        "google_rating_count": 890,
        "description": "Contemporary American cuisine with extensive wine selection"
    },
    {
        "name": "Pizzeria Mercato",
        "address": "1009 W Main St, Carrboro, NC 27510",
        "phone": "(919) 967-4002",
        "website": "https://pizzeriamercato.com",
        "cuisine_type": "Pizza",
        "price_level": 2,
        "latitude": 35.9098,
        "longitude": -79.0842,
        "google_rating": 4.3,
        "google_rating_count": 1120,
        "description": "Authentic Neapolitan wood-fired pizza"
    },
    {
        "name": "Saigon Bistro",
        "address": "431 W Franklin St, Chapel Hill, NC 27516",
        "phone": "(919) 933-4551",
        "cuisine_type": "Vietnamese",
        "price_level": 2,
        "latitude": 35.9132,
        "longitude": -79.0559,
        "google_rating": 4.2,
        "google_rating_count": 680,
        "description": "Fresh Vietnamese cuisine and pho"
    },
    {
        "name": "Carolina Coffee Shop",
        "address": "138 E Franklin St, Chapel Hill, NC 27514",
        "phone": "(919) 942-6875",
        "cuisine_type": "American",
        "price_level": 2,
        "latitude": 35.9137,
        "longitude": -79.0523,
        "google_rating": 4.0,
        "google_rating_count": 520,
        "description": "Classic college town diner since 1922"
    },
    {
        "name": "Elmo's Diner",
        "address": "776 9th St, Durham, NC 27705",
        "phone": "(919) 416-3823",
        "website": "https://elmosdiner.com",
        "cuisine_type": "American",
        "price_level": 2,
        "latitude": 35.9943,
        "longitude": -78.9065,
        "google_rating": 4.2,
        "google_rating_count": 1340,
        "description": "Popular brunch spot with creative American fare"
    },
    {
        "name": "Top of the Hill Restaurant",
        "address": "100 E Franklin St, Chapel Hill, NC 27514",
        "phone": "(919) 929-8676",
        "website": "https://thetopofthehill.com",
        "cuisine_type": "American",
        "price_level": 3,
        "latitude": 35.9138,
        "longitude": -79.0527,
        "google_rating": 4.1,
        "google_rating_count": 970,
        "description": "Upscale dining with rooftop views and craft beer"
    },
    {
        "name": "Acme Food & Beverage Co.",
        "address": "110 E Main St, Carrboro, NC 27510",
        "phone": "(919) 929-2263",
        "website": "https://acmefoodbev.com",
        "cuisine_type": "American",
        "price_level": 2,
        "latitude": 35.9108,
        "longitude": -79.0750,
        "google_rating": 4.3,
        "google_rating_count": 830,
        "description": "Farm-to-table American cuisine in historic Carrboro"
    },
    {
        "name": "Al's Burger Shack",
        "address": "516 W Franklin St, Chapel Hill, NC 27516",
        "phone": "(919) 967-2444",
        "cuisine_type": "American",
        "price_level": 1,
        "latitude": 35.9130,
        "longitude": -79.0568,
        "google_rating": 4.4,
        "google_rating_count": 650,
        "description": "Gourmet burgers and craft beer in a casual setting"
    },
    {
        "name": "Panzanella",
        "address": "110 N Main St, Carrboro, NC 27510",
        "phone": "(919) 929-6626",
        "website": "https://panzanellacarrboro.com",
        "cuisine_type": "Italian",
        "price_level": 3,
        "latitude": 35.9113,
        "longitude": -79.0756,
        "google_rating": 4.5,
        "google_rating_count": 720,
        "description": "Authentic Italian cuisine with seasonal ingredients"
    },
    {
        "name": "Bandido's Mexican Cafe",
        "address": "319 E Main St, Carrboro, NC 27510",
        "phone": "(919) 967-5048",
        "cuisine_type": "Mexican",
        "price_level": 2,
        "latitude": 35.9101,
        "longitude": -79.0722,
        "google_rating": 4.1,
        "google_rating_count": 580,
        "description": "Tex-Mex favorites and strong margaritas"
    },
    {
        "name": "Chopsticks III",
        "address": "1840 E Franklin St, Chapel Hill, NC 27514",
        "phone": "(919) 942-7346",
        "cuisine_type": "Chinese",
        "price_level": 2,
        "latitude": 35.9254,
        "longitude": -79.0254,
        "google_rating": 4.0,
        "google_rating_count": 420,
        "description": "Traditional Chinese cuisine and sushi"
    },
    {
        "name": "Linda's Bar & Grill",
        "address": "203 E Franklin St, Chapel Hill, NC 27514",
        "phone": "(919) 933-5550",
        "cuisine_type": "American",
        "price_level": 2,
        "latitude": 35.9135,
        "longitude": -79.0512,
        "google_rating": 3.9,
        "google_rating_count": 380,
        "description": "Casual sports bar with pub food and games"
    },
    {
        "name": "Caffe Driade",
        "address": "1215B E Franklin St, Chapel Hill, NC 27514",
        "phone": "(919) 942-2333",
        "website": "https://caffedriade.com",
        "cuisine_type": "Cafe",
        "price_level": 1,
        "latitude": 35.9189,
        "longitude": -79.0364,
        "google_rating": 4.2,
        "google_rating_count": 340,
        "description": "Cozy coffee shop with light meals and outdoor seating"
    }
]

# Sample user data
SAMPLE_USERS = [
    {
        "username": "foodie_student",
        "email": "foodie@email.com",
        "password": "password123",
        "full_name": "Alex Chen",
        "preferred_cuisines": ["Asian", "Italian"],
        "preferred_price_levels": [2, 3],
        "location_lat": 35.9132,
        "location_lng": -79.0558
    },
    {
        "username": "local_explorer",
        "email": "explorer@email.com",
        "password": "password123",
        "full_name": "Sarah Johnson",
        "preferred_cuisines": ["American", "Mediterranean"],
        "preferred_price_levels": [2],
        "location_lat": 35.9125,
        "location_lng": -79.0565
    },
    {
        "username": "grad_student",
        "email": "gradstudent@email.com",
        "password": "password123",
        "full_name": "Mike Rodriguez",
        "preferred_cuisines": ["Mexican", "Pizza"],
        "preferred_price_levels": [1, 2],
        "location_lat": 35.9140,
        "location_lng": -79.0550
    },
    {
        "username": "professor_diner",
        "email": "professor@email.com",
        "password": "password123",
        "full_name": "Dr. Emily Watson",
        "preferred_cuisines": ["French", "Greek", "Italian"],
        "preferred_price_levels": [3, 4],
        "location_lat": 35.9135,
        "location_lng": -79.0560
    },
    {
        "username": "unc_alum",
        "email": "alum@email.com",
        "password": "password123",
        "full_name": "David Kim",
        "preferred_cuisines": ["Southern", "American"],
        "preferred_price_levels": [2, 3],
        "location_lat": 35.9130,
        "location_lng": -79.0555
    }
]

# Sample reviews
SAMPLE_REVIEWS = [
    "Absolutely loved this place! Great atmosphere and fantastic food.",
    "Good food, friendly service. Will definitely come back.",
    "The flavors were incredible. Highly recommend!",
    "Solid choice for a casual meal. Good value for money.",
    "Amazing experience! The staff was very accommodating.",
    "Fresh ingredients and creative presentation. Impressive!",
    "Classic spot with consistent quality. A local favorite.",
    "Great for groups. Generous portions and reasonable prices.",
    "Cozy atmosphere, perfect for a date night.",
    "Exceeded my expectations. The chef really knows what they're doing.",
    "Good selection and quick service. Perfect for lunch.",
    "Authentic cuisine that reminds me of home cooking.",
    "The outdoor seating is lovely. Great spot to relax.",
    "Innovative menu with something for everyone.",
    "A bit pricey but worth it for the quality.",
    "Friendly staff and clean environment. Well managed.",
    "Perfect comfort food when you need a good meal.",
    "Great cocktails and appetizers. Nice happy hour spot.",
    "Fresh, healthy options. Great for dietary restrictions.",
    "Been coming here for years. Never disappoints!"
]


def create_users(session) -> List[User]:
    """Create sample users."""
    users = []

    for user_data in SAMPLE_USERS:
        user = User(
            username=user_data["username"],
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            full_name=user_data["full_name"],
            preferred_cuisines=user_data["preferred_cuisines"],
            preferred_price_levels=user_data["preferred_price_levels"],
            location_lat=user_data["location_lat"],
            location_lng=user_data["location_lng"],
            is_active=True
        )
        session.add(user)
        users.append(user)

    session.commit()

    for user in users:
        session.refresh(user)

    print(f"Created {len(users)} sample users")
    return users


def create_restaurants(session) -> List[Restaurant]:
    """Create sample restaurants."""
    restaurants = []

    for rest_data in CHAPEL_HILL_RESTAURANTS:
        restaurant = Restaurant(
            name=rest_data["name"],
            address=rest_data["address"],
            phone=rest_data.get("phone"),
            website=rest_data.get("website"),
            cuisine_type=rest_data["cuisine_type"],
            price_level=rest_data["price_level"],
            latitude=rest_data["latitude"],
            longitude=rest_data["longitude"],
            google_rating=rest_data["google_rating"],
            google_rating_count=rest_data["google_rating_count"],
            is_active=True,
            created_at=datetime.utcnow(),
            last_google_update=datetime.utcnow()
        )
        session.add(restaurant)
        restaurants.append(restaurant)

    session.commit()

    for restaurant in restaurants:
        session.refresh(restaurant)

    print(f"Created {len(restaurants)} Chapel Hill restaurants")
    return restaurants


def create_ratings_and_reviews(session, users: List[User], restaurants: List[Restaurant]):
    """Create sample ratings and reviews."""
    ratings_created = 0
    reviews_created = 0

    # Each user rates 60-80% of restaurants
    for user in users:
        num_ratings = random.randint(int(len(restaurants) * 0.6), int(len(restaurants) * 0.8))
        restaurants_to_rate = random.sample(restaurants, num_ratings)

        for restaurant in restaurants_to_rate:
            # Create rating (bias towards higher ratings for better restaurants)
            base_rating = restaurant.google_rating or 3.5
            # Add some randomness but keep it realistic
            rating_value = max(1.0, min(5.0, base_rating + random.gauss(0, 0.7)))

            rating = Rating(
                user_id=user.id,
                restaurant_id=restaurant.id,
                rating=round(rating_value, 1),
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 180))
            )
            session.add(rating)
            ratings_created += 1

            # 40% chance to add a review
            if random.random() < 0.4:
                review_content = random.choice(SAMPLE_REVIEWS)

                review = Review(
                    user_id=user.id,
                    restaurant_id=restaurant.id,
                    title=f"Review of {restaurant.name}",
                    content=review_content,
                    created_at=rating.created_at
                )
                session.add(review)
                reviews_created += 1

    session.commit()
    print(f"Created {ratings_created} ratings and {reviews_created} reviews")


def update_restaurant_averages(session, restaurants: List[Restaurant]):
    """Update restaurant average ratings based on user ratings."""
    for restaurant in restaurants:
        ratings = session.query(Rating).filter(Rating.restaurant_id == restaurant.id).all()

        if ratings:
            avg_rating = sum(r.rating for r in ratings) / len(ratings)
            restaurant.avg_rating = round(avg_rating, 1)
            restaurant.rating_count = len(ratings)
        else:
            restaurant.avg_rating = 0.0
            restaurant.rating_count = 0

    session.commit()
    print("Updated restaurant average ratings")


def create_user_preferences(session, users: List[User]):
    """Create user preference records based on their ratings."""
    for user in users:
        preference = UserPreference(
            user_id=user.id,
            cuisine_scores={},
            price_level_scores={},
            total_ratings=0,
            avg_rating_given=3.0
        )
        session.add(preference)

    session.commit()
    print(f"Created user preference records for {len(users)} users")


def main():
    """Main function to seed the database."""
    print("Starting database seeding...")

    # Create database tables
    Base.metadata.create_all(bind=engine)
    print("Database tables created")

    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Check if data already exists
        existing_users = session.query(User).count()
        existing_restaurants = session.query(Restaurant).count()

        if existing_users > 0 or existing_restaurants > 0:
            response = input(f"Database already contains {existing_users} users and {existing_restaurants} restaurants. Continue? (y/N): ")
            if response.lower() != 'y':
                print("Seeding cancelled")
                return

        # Create sample data
        users = create_users(session)
        restaurants = create_restaurants(session)
        create_ratings_and_reviews(session, users, restaurants)
        update_restaurant_averages(session, restaurants)
        create_user_preferences(session, users)

        print("\n" + "="*50)
        print("DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("="*50)
        print(f"Created:")
        print(f"  - {len(users)} sample users")
        print(f"  - {len(restaurants)} Chapel Hill restaurants")
        print(f"  - Ratings and reviews for realistic data")
        print(f"  - User preference records")
        print("\nSample login credentials:")
        for user_data in SAMPLE_USERS[:3]:
            print(f"  Username: {user_data['username']}, Password: {user_data['password']}")
        print("\nYou can now start the application and test all features!")

    except Exception as e:
        session.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()