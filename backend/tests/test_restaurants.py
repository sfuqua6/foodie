import pytest
from fastapi.testclient import TestClient


class TestRestaurants:
    def test_get_restaurants_unauthenticated(self, client: TestClient):
        """Test that unauthenticated users cannot access restaurants."""
        response = client.get("/restaurants/")
        assert response.status_code == 401

    def test_get_restaurants_empty(self, client: TestClient, auth_headers):
        """Test getting restaurants when database is empty."""
        response = client.get("/restaurants/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    def test_get_restaurants(self, client: TestClient, auth_headers, sample_restaurants):
        """Test getting all restaurants."""
        response = client.get("/restaurants/", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 3
        assert all("name" in restaurant for restaurant in data)
        assert all("avg_rating" in restaurant for restaurant in data)

    def test_get_restaurants_with_search(self, client: TestClient, auth_headers, sample_restaurants):
        """Test searching restaurants by name."""
        response = client.get("/restaurants/?query=Pizza", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Pizza Palace"

    def test_get_restaurants_with_cuisine_filter(self, client: TestClient, auth_headers, sample_restaurants):
        """Test filtering restaurants by cuisine."""
        response = client.get("/restaurants/?cuisine_filter=Japanese", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["cuisine_type"] == "Japanese"

    def test_get_restaurants_with_price_filter(self, client: TestClient, auth_headers, sample_restaurants):
        """Test filtering restaurants by price level."""
        response = client.get("/restaurants/?price_filter=1", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["price_level"] == 1

    def test_get_restaurants_with_rating_filter(self, client: TestClient, auth_headers, sample_restaurants):
        """Test filtering restaurants by minimum rating."""
        response = client.get("/restaurants/?min_rating=4.5", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["avg_rating"] >= 4.5

    def test_get_restaurant_by_id(self, client: TestClient, auth_headers, test_restaurant):
        """Test getting a specific restaurant by ID."""
        response = client.get(f"/restaurants/{test_restaurant.id}", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert data["id"] == test_restaurant.id
        assert data["name"] == test_restaurant.name

    def test_get_nonexistent_restaurant(self, client: TestClient, auth_headers):
        """Test getting a nonexistent restaurant."""
        response = client.get("/restaurants/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_get_nearby_restaurants(self, client: TestClient, auth_headers, sample_restaurants):
        """Test getting nearby restaurants."""
        # Chapel Hill coordinates
        lat, lng = 35.9132, -79.0558
        response = client.get(
            f"/restaurants/nearby/?lat={lat}&lng={lng}&radius=10",
            headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 3  # All test restaurants should be nearby
        assert all("distance" in restaurant for restaurant in data)

    def test_get_nearby_restaurants_small_radius(self, client: TestClient, auth_headers, sample_restaurants):
        """Test getting nearby restaurants with small radius."""
        # Far from Chapel Hill
        lat, lng = 40.7128, -74.0060  # New York coordinates
        response = client.get(
            f"/restaurants/nearby/?lat={lat}&lng={lng}&radius=1",
            headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 0  # No restaurants should be nearby

    def test_pagination(self, client: TestClient, auth_headers, sample_restaurants):
        """Test restaurant pagination."""
        response = client.get("/restaurants/?limit=2&offset=0", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) <= 2

        # Test offset
        response2 = client.get("/restaurants/?limit=2&offset=1", headers=auth_headers)
        assert response2.status_code == 200

        data2 = response2.json()
        if len(data) > 1 and len(data2) > 0:
            # Make sure we're getting different results with offset
            assert data[1]["id"] != data2[0]["id"] or len(data) == 1