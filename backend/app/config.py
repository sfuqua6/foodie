from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    database_url: str = "sqlite:///./rate_my_rest.db"
    redis_url: str = "redis://localhost:6379"
    google_places_api_key: str = ""
    secret_key: str = "dev-secret-key"
    environment: str = "development"
    log_level: str = "info"

    # JWT settings
    access_token_expire_minutes: int = 30
    algorithm: str = "HS256"

    # App settings
    app_name: str = "Rate My Rest"
    app_version: str = "1.0.0"

    # Google Places settings
    places_radius: int = 10000  # 10km in meters
    chapel_hill_lat: float = 35.9132
    chapel_hill_lng: float = -79.0558

    # Oracle Cloud specific settings
    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> list:
        if self.is_production:
            return [
                "https://your-domain.com",
                "https://www.your-domain.com"
            ]
        return ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()