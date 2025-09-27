import pytest
from fastapi.testclient import TestClient


class TestAuth:
    def test_register_user(self, client: TestClient):
        """Test user registration."""
        user_data = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "password123",
            "full_name": "New User"
        }

        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 201

        data = response.json()
        assert data["username"] == user_data["username"]
        assert data["email"] == user_data["email"]
        assert data["full_name"] == user_data["full_name"]
        assert "hashed_password" not in data

    def test_register_duplicate_username(self, client: TestClient, test_user):
        """Test registration with duplicate username."""
        user_data = {
            "username": "testuser",  # Same as test_user
            "email": "different@example.com",
            "password": "password123"
        }

        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 400
        assert "Username already registered" in response.json()["detail"]

    def test_register_duplicate_email(self, client: TestClient, test_user):
        """Test registration with duplicate email."""
        user_data = {
            "username": "differentuser",
            "email": "test@example.com",  # Same as test_user
            "password": "password123"
        }

        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_login_success(self, client: TestClient, test_user):
        """Test successful login."""
        login_data = {
            "username": "testuser",
            "password": "testpassword123"
        }

        response = client.post("/auth/token", data=login_data)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, test_user):
        """Test login with wrong password."""
        login_data = {
            "username": "testuser",
            "password": "wrongpassword"
        }

        response = client.post("/auth/token", data=login_data)
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with nonexistent user."""
        login_data = {
            "username": "nonexistent",
            "password": "password123"
        }

        response = client.post("/auth/token", data=login_data)
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]

    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email."""
        user_data = {
            "username": "testuser2",
            "email": "invalid-email",
            "password": "password123"
        }

        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422  # Validation error

    def test_register_short_password(self, client: TestClient):
        """Test registration with short password."""
        user_data = {
            "username": "testuser3",
            "email": "test3@example.com",
            "password": "123"
        }

        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422  # Validation error