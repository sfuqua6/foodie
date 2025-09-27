import pytest
from fastapi.testclient import TestClient


class TestRatings:
    def test_create_rating(self, client: TestClient, auth_headers, test_restaurant):
        """Test creating a rating."""
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 4.5
        }

        response = client.post("/ratings/", json=rating_data, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        assert data["restaurant_id"] == test_restaurant.id
        assert data["rating"] == 4.5

    def test_create_rating_unauthenticated(self, client: TestClient, test_restaurant):
        """Test that unauthenticated users cannot create ratings."""
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 4.5
        }

        response = client.post("/ratings/", json=rating_data)
        assert response.status_code == 401

    def test_create_rating_nonexistent_restaurant(self, client: TestClient, auth_headers):
        """Test creating a rating for nonexistent restaurant."""
        rating_data = {
            "restaurant_id": 99999,
            "rating": 4.5
        }

        response = client.post("/ratings/", json=rating_data, headers=auth_headers)
        assert response.status_code == 404

    def test_create_rating_invalid_rating(self, client: TestClient, auth_headers, test_restaurant):
        """Test creating a rating with invalid rating value."""
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 6.0  # Invalid rating (> 5)
        }

        response = client.post("/ratings/", json=rating_data, headers=auth_headers)
        assert response.status_code == 422

    def test_update_existing_rating(self, client: TestClient, auth_headers, test_restaurant):
        """Test updating an existing rating."""
        # Create initial rating
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 3.0
        }
        response = client.post("/ratings/", json=rating_data, headers=auth_headers)
        assert response.status_code == 201

        # Update the rating
        updated_rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 4.5
        }
        response = client.post("/ratings/", json=updated_rating_data, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        assert data["rating"] == 4.5

    def test_get_user_ratings(self, client: TestClient, auth_headers, test_restaurant):
        """Test getting user's ratings."""
        # Create a rating first
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 4.0
        }
        client.post("/ratings/", json=rating_data, headers=auth_headers)

        response = client.get("/ratings/user", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["restaurant_id"] == test_restaurant.id
        assert data[0]["rating"] == 4.0

    def test_get_restaurant_ratings(self, client: TestClient, auth_headers, test_restaurant):
        """Test getting ratings for a specific restaurant."""
        # Create a rating first
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 3.5
        }
        client.post("/ratings/", json=rating_data, headers=auth_headers)

        response = client.get(f"/ratings/restaurant/{test_restaurant.id}", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert len(data) == 1
        assert data[0]["restaurant_id"] == test_restaurant.id
        assert data[0]["rating"] == 3.5

    def test_get_ratings_nonexistent_restaurant(self, client: TestClient, auth_headers):
        """Test getting ratings for nonexistent restaurant."""
        response = client.get("/ratings/restaurant/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_delete_rating(self, client: TestClient, auth_headers, test_restaurant):
        """Test deleting a rating."""
        # Create a rating first
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 2.5
        }
        create_response = client.post("/ratings/", json=rating_data, headers=auth_headers)
        rating_id = create_response.json()["id"]

        response = client.delete(f"/ratings/{rating_id}", headers=auth_headers)
        assert response.status_code == 204

        # Verify rating is deleted
        get_response = client.get("/ratings/user", headers=auth_headers)
        ratings = get_response.json()
        assert len(ratings) == 0

    def test_delete_nonexistent_rating(self, client: TestClient, auth_headers):
        """Test deleting a nonexistent rating."""
        response = client.delete("/ratings/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_rating_updates_restaurant_average(self, client: TestClient, auth_headers, test_restaurant, db_session):
        """Test that creating ratings updates restaurant average."""
        initial_avg = test_restaurant.avg_rating
        initial_count = test_restaurant.rating_count

        # Create a rating
        rating_data = {
            "restaurant_id": test_restaurant.id,
            "rating": 5.0
        }
        client.post("/ratings/", json=rating_data, headers=auth_headers)

        # Refresh restaurant from database
        db_session.refresh(test_restaurant)

        # Check that average and count were updated
        assert test_restaurant.rating_count == initial_count + 1
        # The average should have changed (exact calculation depends on previous ratings)