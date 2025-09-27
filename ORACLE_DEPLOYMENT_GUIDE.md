# Oracle Cloud Deployment Guide - Rate My Rest

## 🚀 Quick Start

Run this single command on your Oracle Cloud server to deploy everything:

```bash
curl -sSL https://raw.githubusercontent.com/sfuqua6/foodie/main/oracle_quick_deploy.sh | bash
```

**Note:** You'll need to add your Oracle wallet files before the deployment completes.

## 📋 Manual Deployment Steps

If you prefer manual deployment, follow these steps on your Oracle Cloud server:

### 1. Initial Setup

```bash
# SSH into your Oracle Cloud server
ssh -i <your-key-file> ubuntu@129.80.122.227

# Clone this repository
git clone https://github.com/sfuqua6/foodie.git
cd foodie

# Make scripts executable
chmod +x *.sh
```

### 2. Add Oracle Wallet Files

Extract your Oracle wallet files to `./oracle-wallet/` directory:

```
oracle-wallet/
├── cwallet.sso
├── ewallet.p12
├── keystore.jks
├── ojdbc.properties
├── sqlnet.ora
├── tnsnames.ora
└── truststore.jks
```

### 3. Test Oracle Connection

```bash
# Install Python dependencies
pip3 install cx_Oracle==8.3.0 sqlalchemy python-dotenv

# Test connection
python3 test_oracle_connection.py
```

### 4. Deploy Application

```bash
# Run full deployment
bash deploy_oracle.sh
```

### 5. Verify Deployment

```bash
# Check all services
bash troubleshoot_oracle.sh

# Test endpoints
curl http://129.80.122.227:8000/health
curl http://129.80.122.227:3000
```

## 🔧 Management Commands

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs redis
```

### Restart Services
```bash
bash troubleshoot_oracle.sh restart
```

### Rebuild Containers
```bash
bash troubleshoot_oracle.sh rebuild
```

### Run Diagnostics
```bash
bash troubleshoot_oracle.sh check
```

## 📊 Service URLs

- **Frontend:** http://129.80.122.227:3000
- **Backend API:** http://129.80.122.227:8000
- **API Documentation:** http://129.80.122.227:8000/docs
- **Health Check:** http://129.80.122.227:8000/health

## 🗄️ Database Management

### Create Tables
```bash
docker-compose -f docker-compose.prod.yml exec backend python -c "
from app.database import engine, Base
from app import models
Base.metadata.create_all(bind=engine)
"
```

### Run Migrations
```bash
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Seed Sample Data
```bash
docker-compose -f docker-compose.prod.yml exec backend python seed_data.py
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Oracle Connection Failed

**Symptoms:**
- Backend container exits with database connection errors
- Test script fails with TNS errors

**Solutions:**
```bash
# Check wallet files
ls -la oracle-wallet/

# Verify file permissions
chmod 644 oracle-wallet/*

# Test connection
python3 test_oracle_connection.py

# Check database status in Oracle Cloud Console
```

#### 2. Container Build Failures

**Symptoms:**
- Docker build fails during Oracle client installation
- cx_Oracle installation errors

**Solutions:**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild with no cache
docker-compose -f docker-compose.prod.yml build --no-cache
```

#### 3. Port Access Issues

**Symptoms:**
- Services not accessible from external IP
- Connection timeouts

**Solutions:**
```bash
# Configure firewall
sudo ufw allow 3000
sudo ufw allow 8000
sudo ufw status

# Check Oracle Cloud security groups
# Ensure ingress rules allow ports 3000 and 8000
```

#### 4. Service Health Check Failures

**Symptoms:**
- Containers restart frequently
- Health checks fail

**Solutions:**
```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs

# Run diagnostics
bash troubleshoot_oracle.sh check

# Restart services
bash troubleshoot_oracle.sh restart
```

## 📁 File Structure

```
rate_my_rest/
├── backend/
│   ├── Dockerfile.prod              # Production backend container
│   ├── requirements.prod.txt        # Production Python dependencies
│   └── app/
│       ├── database.py              # Oracle-aware database config
│       └── ...
├── frontend/
│   ├── Dockerfile.prod              # Production frontend container
│   └── ...
├── oracle-wallet/                   # Oracle database wallet files
│   ├── cwallet.sso
│   ├── tnsnames.ora
│   └── ...
├── docker-compose.prod.yml          # Production Docker Compose
├── .env.production                  # Production environment variables
├── deploy_oracle.sh                 # Main deployment script
├── troubleshoot_oracle.sh           # Troubleshooting script
├── oracle_quick_deploy.sh           # Quick deployment script
└── test_oracle_connection.py        # Oracle connection test
```

## 🔒 Security Considerations

### Environment Variables
- Change default SECRET_KEY in .env.production
- Rotate Google Places API key if compromised
- Use strong database passwords

### Network Security
- Configure Oracle Cloud security groups
- Enable UFW firewall
- Use HTTPS in production (add SSL certificates)

### Database Security
- Use least-privilege database user
- Enable Oracle audit logging
- Regular security updates

## 🚀 Production Optimizations

### Performance
- Enable Redis for caching
- Configure database connection pooling
- Use CDN for static assets

### Monitoring
- Set up health check monitoring
- Configure log aggregation
- Monitor database performance

### Backup
- Regular database backups
- Container image versioning
- Configuration backup

## 📞 Support

If you encounter issues:

1. Run diagnostics: `bash troubleshoot_oracle.sh check`
2. Check logs: `docker-compose -f docker-compose.prod.yml logs`
3. Review Oracle Cloud documentation
4. Check GitHub issues: https://github.com/sfuqua6/foodie/issues

---

**Last Updated:** September 2025
**Version:** 1.0.0