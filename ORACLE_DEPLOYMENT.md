# 🚀 Oracle Cloud Infrastructure (OCI) Deployment Guide

Complete step-by-step guide to deploy Rate My Rest on Oracle Cloud with free tier resources.

## 📋 Prerequisites

- Oracle Cloud Account (free tier available)
- Domain name (optional, for custom domain)
- Google Places API key
- Local development environment for initial setup

## 🎯 Architecture Overview

```
Internet → Load Balancer → Compute Instance (Docker) → Autonomous Database
                                ↓
                         Container Registry
                                ↓
                        Object Storage (Static Files)
```

## 🔧 Step 1: Oracle Cloud Account Setup

### 1.1 Create Oracle Cloud Account
1. Go to https://www.oracle.com/cloud/free/
2. Click "Start for free"
3. Fill in registration details
4. Verify email and phone number
5. Add credit card (required but won't be charged for free tier)

### 1.2 Access Oracle Cloud Console
1. Login at https://cloud.oracle.com/
2. Select your region (choose closest to your users)
3. Navigate to the OCI Console

## 🏗️ Step 2: Infrastructure Setup

### 2.1 Create Virtual Cloud Network (VCN)

**VCN Configuration:**
```yaml
Name: rate-my-rest-vcn
CIDR Block: 10.0.0.0/16
DNS Resolution: Enabled
DNS Label: ratemyrest
```

**Subnet Configuration:**
```yaml
Public Subnet:
  Name: public-subnet
  CIDR: 10.0.1.0/24
  Route Table: Default (with Internet Gateway)
  Security List: Default (modify rules below)
```

### 2.2 Configure Security Lists

**Public Subnet Security Rules:**
```yaml
Ingress Rules:
  - Source: 0.0.0.0/0, Protocol: TCP, Port: 22 (SSH)
  - Source: 0.0.0.0/0, Protocol: TCP, Port: 80 (HTTP)
  - Source: 0.0.0.0/0, Protocol: TCP, Port: 443 (HTTPS)
  - Source: 0.0.0.0/0, Protocol: TCP, Port: 8000 (Backend API)
```

### 2.3 Create Compute Instance

**Instance Configuration:**
```yaml
Name: rate-my-rest-server
Image: Ubuntu 22.04 LTS
Shape: VM.Standard.E2.1.Micro (Always Free)
Network: rate-my-rest-vcn / public-subnet
SSH Keys: Upload your public key
Boot Volume: 50GB (free tier limit)
```

## 🗄️ Step 3: Database Setup

### 3.1 Create Autonomous Database

**Database Configuration:**
```yaml
Name: ratemyrest-db
Workload Type: Transaction Processing (ATP)
Deployment: Shared Infrastructure
Database Version: 19c
CPU Count: 1 (Always Free)
Storage: 20GB (Always Free)
Auto Scaling: Disabled
Password: [Strong password for ADMIN user]
Network Access: Secure access from everywhere
License: License Included
```

### 3.2 Database User Setup

```sql
-- Connect as ADMIN user via SQL Developer Web
CREATE USER ratemyrest IDENTIFIED BY "YourStrongPassword123!";
GRANT CONNECT, RESOURCE TO ratemyrest;
GRANT UNLIMITED TABLESPACE TO ratemyrest;
```

## 🐳 Step 4: Application Deployment

### 4.1 Connect to Compute Instance

```bash
# Connect via SSH
ssh -i ~/.ssh/oci_rsa ubuntu@<INSTANCE_PUBLIC_IP>
```

### 4.2 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo apt install docker-compose -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install python3 python3-pip python3-venv -y
```

### 4.3 Setup Application Code

```bash
# Clone your repository
git clone https://github.com/yourusername/rate_my_rest.git
cd rate_my_rest
```

### 4.4 Production Environment Configuration

Create `.env.production`:

```env
# Database Configuration (Oracle Autonomous DB)
DATABASE_URL=oracle+cx_oracle://ratemyrest:YourPassword@hostname:1522/service_name

# Redis Configuration
REDIS_URL=redis://redis:6379

# Security
SECRET_KEY=your-super-secret-production-key-here
ENVIRONMENT=production

# Google Places API
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# Frontend Configuration
REACT_APP_API_URL=https://your-domain.com
REACT_APP_ENVIRONMENT=production

# Oracle Wallet Path
TNS_ADMIN=/app/wallet
WALLET_PATH=/app/wallet
```

### 4.5 Production Docker Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY=${SECRET_KEY}
      - GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY}
      - TNS_ADMIN=/app/wallet
    volumes:
      - ./oracle-wallet:/app/wallet:ro
    depends_on:
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - REACT_APP_API_URL=${REACT_APP_API_URL}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  redis_data:
```

## 🚀 Step 5: Deployment Commands

```bash
# Setup Oracle wallet
mkdir -p oracle-wallet
# Upload wallet files here

# Build and deploy
docker-compose -f docker-compose.prod.yml up --build -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python -m alembic upgrade head

# Populate data
docker-compose -f docker-compose.prod.yml exec backend python populate_maximum_coverage.py
```

## 🔒 Step 6: Security and SSL

### 6.1 Install SSL Certificate

```bash
# Install Certbot
sudo apt install certbot -y

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
```

### 6.2 Configure Firewall

```bash
# Setup UFW firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
```

## 📊 Step 7: Monitoring and Maintenance

### 7.1 Setup Monitoring

```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
docker-compose -f docker-compose.prod.yml ps
df -h
free -h
curl -f http://localhost:8000/health || echo "Backend health check failed"
EOF

chmod +x monitor.sh
```

### 7.2 Setup Backups

```bash
# Setup daily backup cron job
crontab -e

# Add this line for daily 2 AM backup:
0 2 * * * /home/ubuntu/rate_my_rest/backup.sh
```

## 🎯 Final Testing

```bash
# Test backend API
curl https://your-domain.com/api/health

# Test frontend
curl https://your-domain.com

# Check application status
docker-compose -f docker-compose.prod.yml logs
```

## 💰 Cost Optimization

**Free Tier Resources Used:**
- 1x VM.Standard.E2.1.Micro compute instance (Always Free)
- 1x Autonomous Database (1 CPU, 20GB storage - Always Free)
- 50GB boot volume (Always Free)
- 10GB object storage (Always Free)

**Estimated Monthly Cost:** $0 (within free tier limits)

Your Rate My Rest application is now deployed on Oracle Cloud Infrastructure!