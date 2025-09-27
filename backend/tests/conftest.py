import pytest
import os
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import get_db, Base
from app.config import get_settings
from app.models import User, Restaurant, Rating, Review

# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def get_test_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = get_test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    from app.auth import get_password_hash

    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for test user."""
    login_data = {
        "username": "testuser",
        "password": "testpassword123"
    }
    response = client.post("/auth/token", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_restaurant(db_session):
    """Create a test restaurant."""
    restaurant = Restaurant(
        name="Test Restaurant",
        address="123 Test St, Chapel Hill, NC",
        phone="(919) 123-4567",
        website="https://testrestaurant.com",
        cuisine_type="American",
        price_level=2,
        latitude=35.9132,
        longitude=-79.0558,
        google_place_id="test_place_id",
        google_rating=4.5,
        google_rating_count=100,
        is_active=True,
        avg_rating=4.0,
        rating_count=5
    )
    db_session.add(restaurant)
    db_session.commit()
    db_session.refresh(restaurant)
    return restaurant


@pytest.fixture
def sample_restaurants(db_session):
    """Create multiple test restaurants."""
    restaurants = [
        Restaurant(
            name="Pizza Palace",
            address="456 Pizza Ave, Chapel Hill, NC",
            cuisine_type="Pizza",
            price_level=2,
            latitude=35.9140,
            longitude=-79.0560,
            is_active=True,
            avg_rating=4.2,
            rating_count=10
        ),
        Restaurant(
            name="Sushi Spot",
            address="789 Sushi Rd, Chapel Hill, NC",
            cuisine_type="Japanese",
            price_level=3,
            latitude=35.9120,
            longitude=-79.0570,
            is_active=True,
            avg_rating=4.8,
            rating_count=15
        ),
        Restaurant(
            name="Burger Bar",
            address="321 Burger Blvd, Chapel Hill, NC",
            cuisine_type="American",
            price_level=1,
            latitude=35.9150,
            longitude=-79.0550,
            is_active=True,
            avg_rating=3.5,
            rating_count=8
        )
    ]

    for restaurant in restaurants:
        db_session.add(restaurant)

    db_session.commit()

    for restaurant in restaurants:
        db_session.refresh(restaurant)

    return restaurants