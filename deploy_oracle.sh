#!/bin/bash

# Oracle Cloud Deployment Script for Rate My Rest
# This script deploys the application to Oracle Cloud Infrastructure

set -e  # Exit on any error

echo "🚀 Starting Oracle Cloud Deployment for Rate My Rest"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/ubuntu/foodie"
WALLET_DIR="$PROJECT_DIR/oracle-wallet"
BACKUP_DIR="/home/ubuntu/backups/$(date +%Y%m%d_%H%M%S)"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as correct user
check_user() {
    if [ "$USER" != "ubuntu" ]; then
        print_warning "Running as $USER, expected ubuntu user"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        exit 1
    fi

    print_success "All prerequisites are met"
}

# Function to backup existing deployment
backup_deployment() {
    if [ -d "$PROJECT_DIR" ]; then
        print_status "Creating backup of existing deployment..."
        mkdir -p "$BACKUP_DIR"
        cp -r "$PROJECT_DIR" "$BACKUP_DIR/"
        print_success "Backup created at $BACKUP_DIR"
    fi
}

# Function to clone or update repository
setup_repository() {
    print_status "Setting up repository..."

    if [ ! -d "$PROJECT_DIR" ]; then
        print_status "Cloning repository..."
        git clone https://github.com/sfuqua6/foodie.git "$PROJECT_DIR"
    else
        print_status "Updating existing repository..."
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/main
    fi

    cd "$PROJECT_DIR"
    print_success "Repository is ready"
}

# Function to check Oracle wallet
check_wallet() {
    print_status "Checking Oracle wallet files..."

    if [ ! -d "$WALLET_DIR" ]; then
        print_error "Oracle wallet directory not found at $WALLET_DIR"
        print_error "Please download and extract your Oracle wallet files to $WALLET_DIR"
        exit 1
    fi

    required_files=("cwallet.sso" "ewallet.p12" "keystore.jks" "ojdbc.properties" "sqlnet.ora" "tnsnames.ora" "truststore.jks")

    for file in "${required_files[@]}"; do
        if [ ! -f "$WALLET_DIR/$file" ]; then
            print_error "Missing wallet file: $file"
            exit 1
        fi
    done

    # Fix wallet file permissions
    chmod 644 "$WALLET_DIR"/*

    print_success "Oracle wallet files are present and configured"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment files..."

    # Copy production environment file
    if [ ! -f "$PROJECT_DIR/.env.production" ]; then
        print_error "Production environment file not found"
        exit 1
    fi

    # Use production environment
    cp "$PROJECT_DIR/.env.production" "$PROJECT_DIR/.env"

    print_success "Environment configured"
}

# Function to test Oracle connection
test_oracle_connection() {
    print_status "Testing Oracle database connection..."

    cd "$PROJECT_DIR"

    # Install Python dependencies for testing
    if ! command -v python3 &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y python3 python3-pip
    fi

    # Install cx_Oracle for testing
    pip3 install cx_Oracle==8.3.0 sqlalchemy python-dotenv

    # Run connection test
    if python3 test_oracle_connection.py; then
        print_success "Oracle connection test passed"
    else
        print_error "Oracle connection test failed"
        print_error "Please check your database configuration and wallet files"
        exit 1
    fi
}

# Function to build and deploy containers
deploy_containers() {
    print_status "Building and deploying containers..."

    cd "$PROJECT_DIR"

    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans

    # Remove old images to ensure fresh build
    print_status "Cleaning up old images..."
    docker system prune -f

    # Build and start new containers
    print_status "Building new containers..."
    docker-compose -f docker-compose.prod.yml build --no-cache

    print_status "Starting containers..."
    docker-compose -f docker-compose.prod.yml up -d

    print_success "Containers are starting up"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."

    # Wait for backend to be ready
    print_status "Waiting for backend to be ready..."
    sleep 30

    # Run migrations
    if docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head; then
        print_success "Database migrations completed"
    else
        print_warning "Migrations may have failed, creating tables manually..."
        docker-compose -f docker-compose.prod.yml exec -T backend python -c "
from app.database import engine, Base
from app import models
Base.metadata.create_all(bind=engine)
print('Tables created successfully')
"
    fi
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."

    # Wait a bit for services to fully start
    sleep 10

    # Check container status
    print_status "Checking container status..."
    docker-compose -f docker-compose.prod.yml ps

    # Test endpoints
    print_status "Testing API endpoints..."

    # Test health endpoint
    if curl -f http://localhost:8000/health; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
    fi

    # Test frontend
    if curl -f http://localhost:3000; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
    fi

    # Test API documentation
    if curl -f http://localhost:8000/docs; then
        print_success "API documentation accessible"
    else
        print_warning "API documentation may not be accessible"
    fi
}

# Function to show deployment status
show_status() {
    echo ""
    echo "================================================="
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "================================================="
    echo ""
    echo "📊 Service URLs:"
    echo "  Frontend:        http://129.80.122.227:3000"
    echo "  Backend API:     http://129.80.122.227:8000"
    echo "  API Docs:        http://129.80.122.227:8000/docs"
    echo "  Health Check:    http://129.80.122.227:8000/health"
    echo ""
    echo "🔧 Management Commands:"
    echo "  View logs:       docker-compose -f docker-compose.prod.yml logs"
    echo "  Restart:         docker-compose -f docker-compose.prod.yml restart"
    echo "  Stop:            docker-compose -f docker-compose.prod.yml down"
    echo "  Update:          bash deploy_oracle.sh"
    echo ""
    echo "📁 Important Paths:"
    echo "  Project:         $PROJECT_DIR"
    echo "  Wallet:          $WALLET_DIR"
    echo "  Backup:          $BACKUP_DIR"
    echo ""
}

# Main deployment function
main() {
    check_user
    check_prerequisites
    backup_deployment
    setup_repository
    check_wallet
    setup_environment
    test_oracle_connection
    deploy_containers
    run_migrations
    verify_deployment
    show_status
}

# Run main function
main "$@"