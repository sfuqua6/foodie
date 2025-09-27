# Oracle Cloud Deployment Guide

## Overview

Your Rate My Rest application is **fully compatible** with Oracle Cloud Infrastructure (OCI). This guide provides step-by-step deployment instructions.

## Architecture

- **OKE (Oracle Kubernetes Engine)** - Container orchestration
- **Oracle Autonomous Database** - PostgreSQL-compatible database
- **OCI Cache with Redis** - High-performance caching
- **Oracle Load Balancer** - Traffic distribution
- **Oracle Container Registry** - Image storage
- **Oracle Object Storage** - Static assets (optional)

## Prerequisites

1. **Oracle Cloud Account** with appropriate permissions
2. **OCI CLI** installed and configured
3. **kubectl** configured for your OKE cluster
4. **Docker** for building images

## Step 1: Set Up Oracle Cloud Resources

### 1.1 Create OKE Cluster
```bash
# Create cluster using OCI CLI
oci ce cluster create \
    --compartment-id "your-compartment-id" \
    --name "rate-my-rest-cluster" \
    --vcn-id "your-vcn-id" \
    --kubernetes-version "v1.28.2"
```

### 1.2 Create Autonomous Database
```bash
# Create PostgreSQL-compatible database
oci db autonomous-database create \
    --compartment-id "your-compartment-id" \
    --display-name "rate-my-rest-db" \
    --db-name "ratemyrest" \
    --cpu-core-count 1 \
    --data-storage-size-in-tbs 1
```

### 1.3 Set Up Redis Cache
```bash
# Create OCI Cache with Redis cluster
oci redis cluster create \
    --compartment-id "your-compartment-id" \
    --display-name "rate-my-rest-cache" \
    --node-count 1
```

## Step 2: Configure Environment Variables

Copy the Oracle Cloud environment template:
```bash
cp .env.oracle .env
```

Update `.env` with your actual values:
```bash
# Database connection from Autonomous Database
DATABASE_URL=postgresql://username:password@autonomous-db-host:1522/ratemyrest

# Redis connection from OCI Cache
REDIS_URL=redis://redis-cache-host:6379

# Generate strong secret key
SECRET_KEY=your-32-char-secret-key-here

# Your Google Places API key
GOOGLE_PLACES_API_KEY=your-api-key

# Your domain
REACT_APP_API_URL=https://your-domain.com
```

## Step 3: Build and Push Docker Images

### 3.1 Build Images
```bash
# Build backend
docker build -t rate-my-rest-backend ./backend

# Build frontend
docker build -f frontend/Dockerfile.prod -t rate-my-rest-frontend ./frontend --build-arg REACT_APP_API_URL=https://your-domain.com
```

### 3.2 Push to Oracle Container Registry
```bash
# Tag for Oracle Registry
docker tag rate-my-rest-backend iad.ocir.io/your-tenancy/rate-my-rest-backend:latest
docker tag rate-my-rest-frontend iad.ocir.io/your-tenancy/rate-my-rest-frontend:latest

# Push images
docker push iad.ocir.io/your-tenancy/rate-my-rest-backend:latest
docker push iad.ocir.io/your-tenancy/rate-my-rest-frontend:latest
```

## Step 4: Deploy to Kubernetes

### 4.1 Update Kubernetes Manifests
Edit `kubernetes-manifests.yaml` and replace:
- `your-registry` → `iad.ocir.io/your-tenancy`
- Connection strings with your actual database and Redis URLs

### 4.2 Create Secrets
```bash
kubectl create secret generic app-secrets \
    --from-literal=database-url="postgresql://username:password@db-host:1522/ratemyrest" \
    --from-literal=redis-url="redis://redis-host:6379" \
    --from-literal=secret-key="your-secret-key" \
    --from-literal=google-api-key="your-google-api-key"
```

### 4.3 Deploy Application
```bash
kubectl apply -f kubernetes-manifests.yaml
```

### 4.4 Verify Deployment
```bash
# Check pods
kubectl get pods

# Check services
kubectl get services

# Get external IP
kubectl get service frontend-service
```

## Step 5: Database Migration

Run database migrations:
```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -l app=rate-my-rest-backend -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec $BACKEND_POD -- alembic upgrade head

# Seed data (optional)
kubectl exec $BACKEND_POD -- python seed_data.py
```

## Step 6: Configure Domain and SSL

### 6.1 Set Up Load Balancer
The frontend service creates an Oracle Load Balancer automatically. Get the IP:
```bash
kubectl get service frontend-service
```

### 6.2 Configure DNS
Point your domain to the Load Balancer IP address.

### 6.3 Enable SSL (Recommended)
Use Oracle Web Application Firewall or configure SSL certificates in Kubernetes:
```bash
# Example: Let's Encrypt with cert-manager
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

## Cost Optimization

### Always Free Tier Resources
Oracle Cloud provides always-free resources that can run this application:
- **2 OKE worker nodes** (VM.Standard.E2.1.Micro)
- **1 Autonomous Database** (20GB)
- **Load Balancer** (10 Mbps)

### Estimated Monthly Costs
- **OKE Cluster**: ~$50-100/month (depending on node size)
- **Autonomous Database**: ~$20-40/month (1 OCPU)
- **Redis Cache**: ~$15-30/month
- **Load Balancer**: ~$15/month
- **Storage**: ~$2-5/month

**Total: ~$100-200/month** (can be reduced with always-free resources)

## Monitoring and Logging

### Application Logs
```bash
# View backend logs
kubectl logs -l app=rate-my-rest-backend -f

# View frontend logs
kubectl logs -l app=rate-my-rest-frontend -f
```

### Health Checks
The application includes health check endpoints:
- Backend: `https://your-domain.com/health`
- Frontend: `https://your-domain.com/health`

### Oracle Cloud Monitoring
Enable OCI monitoring for:
- Resource utilization
- Application performance
- Database metrics
- Cache performance

## Security Best Practices

1. **Network Security**: Use OCI Security Lists and Network Security Groups
2. **Database Security**: Enable SSL and use strong passwords
3. **Secrets Management**: Use OCI Vault for sensitive data
4. **Access Control**: Implement proper IAM policies
5. **Web Security**: Enable Oracle Web Application Firewall

## Scaling

### Horizontal Scaling
```bash
# Scale backend pods
kubectl scale deployment rate-my-rest-backend --replicas=5

# Scale frontend pods
kubectl scale deployment rate-my-rest-frontend --replicas=3
```

### Vertical Scaling
- Increase OKE node sizes
- Scale Autonomous Database OCPUs
- Upgrade Redis cache nodes

## Backup and Recovery

### Database Backups
Oracle Autonomous Database provides automatic backups with point-in-time recovery.

### Application Backups
```bash
# Backup Kubernetes configurations
kubectl get all -o yaml > backup-$(date +%Y%m%d).yaml
```

## Troubleshooting

### Common Issues

**Pod startup failures:**
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Database connection issues:**
- Verify connection strings
- Check security lists and network access
- Confirm database is running

**SSL certificate issues:**
- Verify DNS configuration
- Check certificate validity
- Review Load Balancer SSL settings

## Support

For Oracle Cloud specific issues:
- Oracle Cloud Documentation: https://docs.oracle.com/
- Oracle Cloud Support: Create a support ticket
- Community Forums: Oracle Cloud Infrastructure forums

---

**Your Rate My Rest application is now ready for Oracle Cloud! 🚀**