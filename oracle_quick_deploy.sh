#!/bin/bash

# Quick Oracle Cloud Deployment Script
# Run this script on your Oracle Cloud server to deploy Rate My Rest

echo "🚀 Rate My Rest - Oracle Cloud Quick Deploy"
echo "=========================================="

# Exit on error
set -e

# Configuration
REPO_URL="https://github.com/sfuqua6/foodie.git"
PROJECT_DIR="/home/ubuntu/foodie"
SERVER_IP="129.80.122.227"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
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

# Step 1: Update system
print_step "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Step 2: Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_step "Installing Docker..."
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker ubuntu
else
    print_success "Docker already installed"
fi

# Step 3: Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    print_step "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    print_success "Docker Compose already installed"
fi

# Step 4: Install Python and cx_Oracle for testing
print_step "Installing Python dependencies..."
sudo apt-get install -y python3 python3-pip
pip3 install cx_Oracle==8.3.0 sqlalchemy python-dotenv

# Step 5: Clone or update repository
if [ ! -d "$PROJECT_DIR" ]; then
    print_step "Cloning repository..."
    git clone "$REPO_URL" "$PROJECT_DIR"
else
    print_step "Updating repository..."
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/main
fi

cd "$PROJECT_DIR"

# Step 6: Configure firewall
print_step "Configuring firewall..."
sudo ufw allow 22    # SSH
sudo ufw allow 3000  # Frontend
sudo ufw allow 8000  # Backend
sudo ufw --force enable

# Step 7: Check for Oracle wallet
print_step "Checking Oracle wallet..."
if [ ! -d "$PROJECT_DIR/oracle-wallet" ]; then
    print_error "Oracle wallet directory not found!"
    echo ""
    echo "📋 NEXT STEPS REQUIRED:"
    echo "====================="
    echo ""
    echo "1. Download your Oracle wallet from Oracle Cloud Console"
    echo "2. Extract the wallet files to: $PROJECT_DIR/oracle-wallet/"
    echo "3. Required files:"
    echo "   - cwallet.sso"
    echo "   - ewallet.p12"
    echo "   - keystore.jks"
    echo "   - ojdbc.properties"
    echo "   - sqlnet.ora"
    echo "   - tnsnames.ora"
    echo "   - truststore.jks"
    echo ""
    echo "4. After adding wallet files, run:"
    echo "   bash deploy_oracle.sh"
    echo ""
    exit 1
fi

# Step 8: Test Oracle connection
print_step "Testing Oracle connection..."
if python3 test_oracle_connection.py; then
    print_success "Oracle connection test passed!"
else
    print_error "Oracle connection test failed!"
    echo ""
    echo "🔧 TROUBLESHOOTING:"
    echo "=================="
    echo ""
    echo "1. Check wallet files are present and readable"
    echo "2. Verify database credentials in .env.production"
    echo "3. Ensure Oracle Autonomous Database is running"
    echo "4. Run troubleshooting script: bash troubleshoot_oracle.sh"
    echo ""
    exit 1
fi

# Step 9: Deploy application
print_step "Deploying application..."
bash deploy_oracle.sh

print_success "Deployment completed successfully!"

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "====================="
echo ""
echo "📊 Your application is now running at:"
echo "  Frontend:     http://$SERVER_IP:3000"
echo "  Backend API:  http://$SERVER_IP:8000"
echo "  API Docs:     http://$SERVER_IP:8000/docs"
echo ""
echo "🔧 Useful commands:"
echo "  View logs:       docker-compose -f docker-compose.prod.yml logs"
echo "  Restart:         docker-compose -f docker-compose.prod.yml restart"
echo "  Troubleshoot:    bash troubleshoot_oracle.sh"
echo ""

# Step 10: Final verification
print_step "Running final verification..."
sleep 10

if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    print_success "Backend health check passed"
else
    print_warning "Backend may still be starting up"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend health check passed"
else
    print_warning "Frontend may still be starting up"
fi

echo ""
echo "✅ Quick deployment completed!"
echo "Visit http://$SERVER_IP:3000 to see your application"