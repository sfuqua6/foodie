# Claude Code Development Notes

This file contains development information and commands for the Rate My Rest project.

## Development Commands

### Backend Commands
```bash
# Start backend development server
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run backend tests
pytest

# Run backend tests with coverage
pytest --cov=app --cov-report=html

# Run linting (add to requirements-dev.txt if needed)
# black app/
# flake8 app/

# Create database migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Seed database
python seed_data.py
```

### Frontend Commands
```bash
# Start frontend development server
cd frontend
npm start

# Run frontend tests
npm test

# Run frontend tests with coverage
npm test -- --coverage --watchAll=false

# Build for production
npm run build

# Run linting (if configured)
# npm run lint
```

### Docker Commands

#### Local Development
```bash
# Start all services
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs backend
docker-compose logs frontend

# Stop all services
docker-compose down

# Remove volumes (clears database)
docker-compose down -v
```

#### Oracle Cloud Production
```bash
# Build and deploy to Oracle Cloud
docker-compose -f docker-compose.oracle.yml up --build -d

# View production logs
docker-compose -f docker-compose.oracle.yml logs

# Deploy with Kubernetes
kubectl apply -f kubernetes-manifests.yaml
```

### Database Commands
```bash
# Access database directly (in Docker)
docker-compose exec postgres psql -U postgres -d rate_my_rest

# Backup database
docker-compose exec postgres pg_dump -U postgres rate_my_rest > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres rate_my_rest < backup.sql
```

## Project Architecture

### Backend Structure
- FastAPI with async support
- SQLAlchemy ORM with Alembic migrations
- JWT authentication with bcrypt hashing
- Redis caching for recommendations
- Google Places API integration
- Comprehensive test suite with pytest

### Frontend Structure
- React 18 with TypeScript
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling
- React Testing Library for tests
- Custom hooks for auth and location

### Database Schema
- Users: Authentication and preferences
- Restaurants: Chapel Hill restaurant data
- Ratings: User ratings (1-5 scale)
- Reviews: User reviews with text
- UserPreferences: ML-computed preferences

### Recommendation Algorithm
1. Collaborative filtering using cosine similarity
2. Content-based filtering using user preferences
3. Popularity and rating boost
4. Location-based filtering
5. Redis caching with 30-minute TTL

## Development Workflow

1. **Feature Development**
   - Create feature branch
   - Add backend models/routes if needed
   - Add frontend components
   - Write tests
   - Update documentation

2. **Testing Strategy**
   - Unit tests for individual components
   - Integration tests for API endpoints
   - End-to-end tests for user flows
   - Manual testing with seed data

3. **Code Quality**
   - Type checking with TypeScript
   - Linting with standard tools
   - Format with Prettier/Black
   - Test coverage monitoring

## Production Considerations

### Security
- Environment-based configuration
- JWT token expiration
- Password hashing with bcrypt
- Input validation with Pydantic
- CORS configuration

### Performance
- Database indexing on common queries
- Connection pooling
- Redis caching for expensive operations
- React optimization (memo, lazy loading)
- Pagination for large datasets

### Monitoring
- Health check endpoints
- Structured logging
- Error handling and reporting
- API rate limiting (if needed)

### Deployment
- Docker containers for consistency
- Environment variable configuration
- Database migration strategy
- Static file serving
- Load balancer configuration

## Known Limitations

1. **Google Places API**
   - Rate limits (consider caching strategy)
   - Costs money in production
   - Some restaurants may not be in Google Places

2. **Recommendation Engine**
   - Needs sufficient rating data to work well
   - Cold start problem for new users
   - Simple algorithm (could be enhanced with ML frameworks)

3. **Location Services**
   - Requires user permission
   - May be inaccurate
   - Falls back to Chapel Hill coordinates

## Future Enhancements

### Technical
- [ ] Advanced ML recommendations (TensorFlow/PyTorch)
- [ ] Real-time notifications
- [ ] Mobile app with React Native
- [ ] Advanced search with Elasticsearch
- [ ] Image upload for restaurants/reviews
- [ ] Social features (follow users, share reviews)

### Business
- [ ] Restaurant owner dashboard
- [ ] Analytics and insights
- [ ] Integration with reservation systems
- [ ] Loyalty program features
- [ ] Event-based recommendations

## Testing Data

The seed script creates:
- 5 sample users with different preferences
- 20 Chapel Hill restaurants with real data
- Realistic ratings and reviews
- User preference records

Sample credentials:
- foodie_student / password123
- local_explorer / password123
- grad_student / password123

## API Endpoints Summary

### Authentication
- POST /auth/register - User registration
- POST /auth/token - Login

### Restaurants
- GET /restaurants/ - Search with filters
- GET /restaurants/{id} - Get specific restaurant
- GET /restaurants/nearby/ - Location-based search

### Ratings & Reviews
- POST /ratings/ - Create/update rating
- GET /ratings/user - Get user ratings
- POST /reviews/ - Create review
- GET /reviews/restaurant/{id} - Get restaurant reviews

### Recommendations
- POST /recommendations/ - Get personalized recommendations
- GET /recommendations/ - Get user-based recommendations

### Utilities
- GET /health - Health check
- GET /cuisines - Available cuisine types
- GET /price-levels - Price level definitions