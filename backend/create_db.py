#!/usr/bin/env python3
"""
Simple database creation script for local development
Creates tables directly without using Alembic migrations
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base
from app.models import User, Restaurant, Rating, Review, UserPreference

def create_tables():
    """Create all database tables."""
    try:
        print("Creating database tables...")
        Base.metadata.create_all(engine)
        print("✓ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"Error creating tables: {e}")
        return False

if __name__ == "__main__":
    create_tables()