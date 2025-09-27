import pytest
from fastapi.testclient import TestClient
from app.models import Rating as RatingModel


class TestRecommendations:
    def test_get_recommendations_no_ratings(self, client: TestClient, auth_headers, sample_restaurants):
        """Test getting recommendations when user has no ratings."""
        response = client.post("/recommendations/", json={}, headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        # Should return restaurants, even if no personalized recommendations
        assert isinstance(data, list)

    def test_get_recommendations_with_user_ratings(self, client: TestClient, auth_headers, sample_restaurants, db_session, test_user):
        """Test getting recommendations when user has ratings."""
        # Create some ratings for the test user
        for i, restaurant in enumerate(sample_restaurants[:2]):
            rating = RatingModel(
                user_id=test_user.id,
                restaurant_id=restaurant.id,
                rating=4.0 + i * 0.5  # 4.0, 4.5
            )
            db_session.add(rating)
        db_session.commit()

        response = client.post("/recommendations/", json={}, headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        # Should not include restaurants the user has already rated
        rated_restaurant_ids = {restaurant.id for restaurant in sample_restaurants[:2]}
        recommended_ids = {r["id"] for r in data}
        assert not (rated_restaurant_ids & recommended_ids)

    def test_get_recommendations_with_filters(self, client: TestClient, auth_headers, sample_restaurants):
        """Test getting recommendations with filters."""
        request_data = {
            "cuisine_filter": ["Pizza"],
            "price_filter": [2],
            "limit": 10
        }

        response = client.post("/recommendations/", json=request_data, headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        # All returned restaurants should match the filter criteria
        for restaurant in data:
            if restaurant.get("cuisine_type"):
                assert restaurant["cuisine_type"] in request_data["cuisine_filter"]
            if restaurant.get("price_level"):
                assert restaurant["price_level"] in request_data["price_filter"]

    def test_get_recommendations_with_location(self, client: TestClient, auth_headers, sample_restaurants):
        """Test getting recommendations with user location."""
        request_data = {
            "user_lat": 35.9132,
            "user_lng": -79.0558,
            "max_distance": 5.0,
            "limit": 20
        }

        response = client.post("/recommendations/", json=request_data, headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        # All returned restaurants should have distance information
        for restaurant in data:
            assert "distance" in restaurant
            assert restaurant["distance"] <= request_data["max_distance"]

    def test_get_user_recommendations(self, client: TestClient, auth_headers, sample_restaurants):
        """Test getting recommendations using user's stored preferences."""
        response = client.get("/recommendations/", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_recommendations_include_scores(self, client: TestClient, auth_headers, sample_restaurants):
        """Test that recommendations include scoring information."""
        response = client.post("/recommendations/", json={}, headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        if data:  # If there are recommendations
            # Check that recommendation data includes required fields
            restaurant = data[0]
            assert "recommendation_score" in restaurant
            assert "reasoning" in restaurant

    def test_recommendations_unauthenticated(self, client: TestClient, sample_restaurants):
        """Test that unauthenticated users cannot get recommendations."""
        response = client.post("/recommendations/", json={})
        assert response.status_code == 401

    def test_recommendations_limit(self, client: TestClient, auth_headers, sample_restaurants):
        """Test that recommendation limit is respected."""
        request_data = {"limit": 2}

        response = client.post("/recommendations/", json=request_data, headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 2

    def test_recommendations_exclude_rated_restaurants(self, client: TestClient, auth_headers, sample_restaurants, db_session, test_user):
        """Test that recommendations exclude restaurants the user has already rated."""
        # Rate all sample restaurants
        for restaurant in sample_restaurants:
            rating = RatingModel(
                user_id=test_user.id,
                restaurant_id=restaurant.id,
                rating=4.0
            )
            db_session.add(rating)
        db_session.commit()

        response = client.post("/recommendations/", json={}, headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        # Should return empty list since all restaurants are rated
        assert len(data) == 0

    def test_recommendation_algorithm_consistency(self, client: TestClient, auth_headers, sample_restaurants, db_session, test_user):
        """Test that recommendation algorithm produces consistent results."""
        # Create consistent rating data
        rating = RatingModel(
            user_id=test_user.id,
            restaurant_id=sample_restaurants[0].id,
            rating=5.0
        )
        db_session.add(rating)
        db_session.commit()

        # Get recommendations twice
        request_data = {"limit": 10}

        response1 = client.post("/recommendations/", json=request_data, headers=auth_headers)
        response2 = client.post("/recommendations/", json=request_data, headers=auth_headers)

        assert response1.status_code == 200
        assert response2.status_code == 200

        data1 = response1.json()
        data2 = response2.json()

        # Results should be identical for the same request
        assert len(data1) == len(data2)
        if data1:
            assert data1[0]["id"] == data2[0]["id"]