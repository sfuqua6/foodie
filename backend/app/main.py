from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from .config import get_settings
from .database import engine
from .models import Base
from .routers import auth, restaurants, ratings, reviews, recommendations, users, lottery, bubble_survey, data_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Rate My Rest API...")

    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")

    yield

    # Shutdown
    logger.info("Shutting down Rate My Rest API...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="A restaurant discovery and rating application for Chapel Hill, NC",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Include routers
app.include_router(auth.router)
app.include_router(restaurants.router)
app.include_router(ratings.router)
app.include_router(reviews.router)
app.include_router(recommendations.router)
app.include_router(users.router)
app.include_router(lottery.router)
app.include_router(bubble_survey.router)
app.include_router(data_pipeline.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Rate My Rest API",
        "version": settings.app_version,
        "environment": settings.environment
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment
    }


@app.get("/cuisines")
async def get_cuisines():
    """Get list of available cuisine types."""
    return {
        "cuisines": [
            "American", "Italian", "Chinese", "Mexican", "Japanese", "Thai",
            "Indian", "French", "Pizza", "Cafe", "Bakery", "Bar & Grill",
            "Fast Food", "Mediterranean", "Korean", "Vietnamese", "Greek"
        ]
    }


@app.get("/price-levels")
async def get_price_levels():
    """Get available price levels."""
    return {
        "price_levels": [
            {"level": 1, "label": "$", "description": "Inexpensive"},
            {"level": 2, "label": "$$", "description": "Moderate"},
            {"level": 3, "label": "$$$", "description": "Expensive"},
            {"level": 4, "label": "$$$$", "description": "Very Expensive"}
        ]
    }