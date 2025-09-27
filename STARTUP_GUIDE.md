# 🚀 Rate My Rest - Startup Guide

## Prerequisites

Make sure you have:
- **Python 3.11+** installed
- **Node.js 18+** installed
- **Git** installed

## Quick Start (Recommended)

### 1. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:
```bash
# Copy the Oracle template
cp .env.oracle .env
```

Edit `.env` with basic settings:
```env
# Basic setup (no external services needed for testing)
SECRET_KEY=your-secret-key-here-make-it-long-and-random
ENVIRONMENT=development
DATABASE_URL=sqlite:///./rate_my_rest.db
REDIS_URL=redis://localhost:6379

# Optional: Google Places API (for restaurant data)
GOOGLE_PLACES_API_KEY=your-google-places-api-key-here

# Frontend
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=development
```

### 3. Initialize Database

```bash
cd backend
python -c "
from app.database import engine, Base
from app import models
Base.metadata.create_all(bind=engine)
print('✅ Database tables created!')
"
```

### 4. Seed Sample Data

```bash
cd backend
python seed_data.py
```

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 6. Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🎮 Testing the New Features

### 1. **Bubble Survey Game**
1. Register a new user or login
2. Navigate to the taste survey (should auto-prompt new users)
3. Play through all 6 rounds of bubble preferences
4. See your personalized taste profile and initial recommendations

### 2. **Advanced Recommendations**
1. Complete the bubble survey
2. Rate some restaurants to build your profile
3. Check the recommendations page for ML-powered suggestions
4. Notice match scores and explanations for each recommendation

### 3. **User Similarity**
1. Create multiple test users
2. Have them complete bubble surveys with different preferences
3. Rate some common restaurants
4. The similarity engine will start finding taste twins

## 🛠️ Development Setup

### Run with Docker (Alternative)

If you prefer Docker:
```bash
# Start with Oracle Cloud config
docker-compose -f docker-compose.oracle.yml up --build

# Seed data
docker-compose exec backend python seed_data.py
```

### Database Management

**Create new migration:**
```bash
cd backend
alembic revision --autogenerate -m "Add new feature"
```

**Apply migrations:**
```bash
cd backend
alembic upgrade head
```

### Background Services

The ML recommendation system includes background processing. For production, you'd run:
```bash
# Similarity computation (run periodically)
cd backend
python -c "
from app.services.similarity_engine import SimilarityEngine
from app.database import get_db

db = next(get_db())
engine = SimilarityEngine(db)
stats = engine.update_all_similarities()
print(f'✅ Similarity update complete: {stats}')
"
```

## 🔧 Configuration Options

### Basic Setup (No External Services)
- Uses SQLite database (no PostgreSQL needed)
- Mock Redis (no Redis server needed)
- Sample restaurant data (no Google Places API needed)

### Full Setup (Production-Ready)
- PostgreSQL database
- Redis server
- Google Places API for real restaurant data
- Oracle Cloud deployment

## 📱 Sample Users

After seeding, you can login with:
- **Username**: `foodie_student`, **Password**: `password123`
- **Username**: `local_explorer`, **Password**: `password123`
- **Username**: `grad_student`, **Password**: `password123`

## 🧪 Testing the ML Features

### 1. **Test Bubble Survey**
- Complete survey with different preference patterns
- Check how it affects recommendations
- Verify preference vectors are generated

### 2. **Test User Similarity**
- Create users with similar bubble survey responses
- Rate same restaurants similarly
- Check if similarity engine groups them together

### 3. **Test Dynamic Ratings**
- Have similar users rate a restaurant
- Check if ratings are weighted by similarity
- Verify confidence scores are calculated

## 🆘 Troubleshooting

### **Port Already in Use**
```bash
# Kill processes on ports 3000 or 8000
npx kill-port 3000
npx kill-port 8000
```

### **Database Issues**
```bash
# Reset database
cd backend
rm rate_my_rest.db
python -c "
from app.database import engine, Base
from app import models
Base.metadata.create_all(bind=engine)
"
python seed_data.py
```

### **Frontend Build Issues**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### **Missing Dependencies**
```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm install framer-motion  # For bubble animations
```

## 🎯 What to Expect

1. **Bubble Survey**: Fun 6-round game collecting taste preferences
2. **Personalized Recommendations**: AI-powered suggestions with match scores
3. **Dynamic Ratings**: Restaurant ratings weighted by similar users
4. **Taste Twins**: Discovery of users with similar preferences
5. **Continuous Learning**: System improves as you rate more restaurants

## 🚀 Ready to Go!

Your Rate My Rest app now has industry-standard ML recommendations! The bubble survey will collect rich preference data, and the recommendation engine will provide personalized restaurant suggestions that get smarter with every rating.

**Have fun discovering your food preferences! 🍽️✨**