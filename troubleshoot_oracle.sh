#!/bin/bash

# Oracle Cloud Troubleshooting Script for Rate My Rest
# This script helps diagnose and fix common deployment issues

set -e

echo "🔍 Oracle Cloud Troubleshooting for Rate My Rest"
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/ubuntu/foodie"
WALLET_DIR="$PROJECT_DIR/oracle-wallet"

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Function to check system resources
check_system_resources() {
    print_status "Checking system resources..."

    echo "📊 System Information:"
    echo "  CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
    echo "  Memory Usage: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
    echo "  Disk Usage: $(df -h / | awk 'NR==2{print $3 "/" $2 " (" $5 ")"}')"
    echo ""
}

# Function to check Docker status
check_docker_status() {
    print_status "Checking Docker status..."

    if ! systemctl is-active --quiet docker; then
        print_error "Docker service is not running"
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        print_success "Docker service is running"
    fi

    echo "🐳 Docker Information:"
    docker version --format 'Client: {{.Client.Version}}, Server: {{.Server.Version}}'
    echo ""
}

# Function to check container status
check_containers() {
    print_status "Checking container status..."

    cd "$PROJECT_DIR"

    echo "📦 Container Status:"
    docker-compose -f docker-compose.prod.yml ps
    echo ""

    # Check if containers are healthy
    for service in backend frontend redis; do
        status=$(docker-compose -f docker-compose.prod.yml ps -q $service | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck")
        if [ "$status" = "healthy" ]; then
            print_success "$service is healthy"
        elif [ "$status" = "no-healthcheck" ]; then
            print_warning "$service has no health check"
        else
            print_error "$service is unhealthy: $status"
        fi
    done
    echo ""
}

# Function to check Oracle wallet
check_oracle_wallet() {
    print_status "Checking Oracle wallet configuration..."

    if [ ! -d "$WALLET_DIR" ]; then
        print_error "Oracle wallet directory not found: $WALLET_DIR"
        return 1
    fi

    required_files=("cwallet.sso" "ewallet.p12" "keystore.jks" "ojdbc.properties" "sqlnet.ora" "tnsnames.ora" "truststore.jks")

    for file in "${required_files[@]}"; do
        if [ -f "$WALLET_DIR/$file" ]; then
            print_success "Found: $file"
        else
            print_error "Missing: $file"
        fi
    done

    # Check file permissions
    print_status "Wallet file permissions:"
    ls -la "$WALLET_DIR"
    echo ""
}

# Function to test Oracle connection
test_oracle_connection() {
    print_status "Testing Oracle database connection..."

    cd "$PROJECT_DIR"

    # Test from host
    if python3 test_oracle_connection.py; then
        print_success "Oracle connection test from host passed"
    else
        print_error "Oracle connection test from host failed"
    fi

    # Test from container
    print_status "Testing from backend container..."
    if docker-compose -f docker-compose.prod.yml exec -T backend python -c "
from app.database import test_connection
if test_connection():
    print('✅ Container database connection successful')
else:
    print('❌ Container database connection failed')
"; then
        print_success "Container Oracle connection test completed"
    else
        print_error "Container Oracle connection test failed"
    fi
    echo ""
}

# Function to check logs
check_logs() {
    print_status "Checking recent logs..."

    cd "$PROJECT_DIR"

    echo "📋 Backend Logs (last 50 lines):"
    docker-compose -f docker-compose.prod.yml logs --tail=50 backend
    echo ""

    echo "📋 Frontend Logs (last 20 lines):"
    docker-compose -f docker-compose.prod.yml logs --tail=20 frontend
    echo ""

    echo "📋 Redis Logs (last 10 lines):"
    docker-compose -f docker-compose.prod.yml logs --tail=10 redis
    echo ""
}

# Function to check network connectivity
check_network() {
    print_status "Checking network connectivity..."

    # Check external connectivity
    if curl -s --max-time 5 https://google.com > /dev/null; then
        print_success "External network connectivity OK"
    else
        print_error "External network connectivity failed"
    fi

    # Check internal service connectivity
    if curl -s --max-time 5 http://localhost:8000/health > /dev/null; then
        print_success "Backend service reachable"
    else
        print_error "Backend service not reachable"
    fi

    if curl -s --max-time 5 http://localhost:3000 > /dev/null; then
        print_success "Frontend service reachable"
    else
        print_error "Frontend service not reachable"
    fi

    # Check Oracle Cloud firewall
    print_status "Checking firewall rules..."
    sudo ufw status || print_warning "UFW not configured"
    echo ""
}

# Function to check environment variables
check_environment() {
    print_status "Checking environment configuration..."

    cd "$PROJECT_DIR"

    if [ -f ".env" ]; then
        print_success "Environment file found"
        echo "📄 Environment variables:"
        grep -v "PASSWORD\|SECRET\|KEY" .env || true
    else
        print_error "Environment file not found"
    fi
    echo ""
}

# Function to restart services
restart_services() {
    print_status "Restarting services..."

    cd "$PROJECT_DIR"

    docker-compose -f docker-compose.prod.yml restart

    print_status "Waiting for services to start..."
    sleep 30

    check_containers
}

# Function to rebuild containers
rebuild_containers() {
    print_status "Rebuilding containers..."

    cd "$PROJECT_DIR"

    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d

    print_status "Waiting for services to start..."
    sleep 30

    check_containers
}

# Function to show fix suggestions
show_fixes() {
    echo ""
    echo "🔧 COMMON FIXES:"
    echo "=============="
    echo ""
    echo "1. Restart Services:"
    echo "   bash troubleshoot_oracle.sh restart"
    echo ""
    echo "2. Rebuild Containers:"
    echo "   bash troubleshoot_oracle.sh rebuild"
    echo ""
    echo "3. Check Oracle Wallet:"
    echo "   - Ensure all wallet files are present in $WALLET_DIR"
    echo "   - Check file permissions (should be 644)"
    echo "   - Verify service name in tnsnames.ora matches 'foodiedb_medium'"
    echo ""
    echo "4. Check Environment:"
    echo "   - Verify DATABASE_URL in .env file"
    echo "   - Check GOOGLE_PLACES_API_KEY is set"
    echo "   - Ensure SECRET_KEY is properly configured"
    echo ""
    echo "5. Oracle Connection Issues:"
    echo "   - Check Oracle Autonomous Database is running"
    echo "   - Verify network access to Oracle Cloud"
    echo "   - Confirm database credentials are correct"
    echo ""
    echo "6. Port Access Issues:"
    echo "   - Check Oracle Cloud security groups allow ports 3000 and 8000"
    echo "   - Verify firewall rules: sudo ufw allow 3000 && sudo ufw allow 8000"
    echo ""
}

# Main function
main() {
    case "${1:-check}" in
        "check")
            check_system_resources
            check_docker_status
            check_containers
            check_oracle_wallet
            check_environment
            check_network
            test_oracle_connection
            show_fixes
            ;;
        "logs")
            check_logs
            ;;
        "restart")
            restart_services
            ;;
        "rebuild")
            rebuild_containers
            ;;
        "oracle")
            check_oracle_wallet
            test_oracle_connection
            ;;
        *)
            echo "Usage: $0 [check|logs|restart|rebuild|oracle]"
            echo ""
            echo "  check   - Run all diagnostic checks (default)"
            echo "  logs    - Show recent container logs"
            echo "  restart - Restart all services"
            echo "  rebuild - Rebuild and restart containers"
            echo "  oracle  - Check Oracle-specific issues"
            exit 1
            ;;
    esac
}

main "$@"