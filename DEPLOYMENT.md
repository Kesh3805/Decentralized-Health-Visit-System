# Deployment Guide

This guide covers how to deploy the Decentralized Health Visit System to various environments.

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/decentralized-health-visit
cd decentralized-health-visit

# Copy environment file
cp .env.example .env
# Edit .env with your settings

# Start development environment
npm run docker:dev

# Or run in background
npm run docker:dev:d

# Seed the database
npm run docker:seed
```

Access the application:
- Dashboard: http://localhost:3000
- Backend API: http://localhost:3001
- Feedback Portal: http://localhost:3002

### Option 2: Manual Setup (Node.js)

```bash
# Prerequisites: Node.js 18+, MongoDB

# Clone and install
git clone https://github.com/yourusername/decentralized-health-visit
cd decentralized-health-visit
npm run install:all

# Set up environment variables
cp backend/.env.example backend/.env
cp dashboard/.env.example dashboard/.env.local
cp feedback/.env.example feedback/.env

# Deploy smart contracts (optional)
npm run deploy:contracts

# Seed database
npm run seed:all

# Start all services
npm run start:all
```

---

## 🐳 Docker Deployment

### Development

```bash
# Start all services with hot-reload
npm run docker:dev

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Stop and remove volumes (clean start)
npm run docker:down:v
```

### Production

```bash
# Create production environment file
cp .env.example .env
# Edit .env with production values:
# - NODE_ENV=production
# - Strong JWT_SECRET
# - MongoDB Atlas URI
# - SSL certificates in nginx/ssl/

# Build and start production
npm run docker:prod

# View running containers
npm run docker:ps
```

### Docker Commands Reference

| Command | Description |
|---------|-------------|
| `npm run docker:dev` | Start development environment |
| `npm run docker:dev:d` | Start in background (detached) |
| `npm run docker:prod` | Start production environment |
| `npm run docker:down` | Stop all containers |
| `npm run docker:down:v` | Stop and remove volumes |
| `npm run docker:logs` | View container logs |
| `npm run docker:seed` | Seed database |
| `npm run docker:shell:backend` | Shell into backend container |
| `npm run docker:shell:mongo` | MongoDB shell |

---

## ☁️ Cloud Deployment

### AWS / DigitalOcean / Azure

1. **Provision Infrastructure**
   - Virtual Machine (2GB+ RAM)
   - MongoDB Atlas or managed database
   - Load balancer with SSL

2. **Deploy with Docker**
   ```bash
   # On your server
   git clone <your-repo>
   cd decentralized-health-visit
   
   # Configure environment
   cp .env.example .env
   nano .env  # Edit with production values
   
   # Set up SSL certificates
   # See nginx/ssl/README.md
   
   # Deploy
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d yourdomain.com
   cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
   cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
   ```

### Heroku

```bash
# Backend
heroku create your-health-visit-backend
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set JWT_SECRET=your-secret
git subtree push --prefix backend heroku main

# Dashboard (use Netlify or Vercel instead)
```

### Vercel (Dashboard)

```bash
cd dashboard
npm install -g vercel
vercel --prod
```

---

## 🔧 Environment Configuration

### Root `.env` (Docker)

```env
NODE_ENV=production

# Database
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=secure-password-here

# Backend
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
BCRYPT_ROUNDS=14

# Dashboard
REACT_APP_API_URL=https://api.yourdomain.com

# Blockchain
BLOCKCHAIN_RPC_URL=http://blockchain:8545
CONTRACT_ADDRESS=0x...

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Backend `.env`

```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/healthvisit
JWT_SECRET=your-production-jwt-secret
BCRYPT_ROUNDS=14
CORS_ORIGIN=https://yourdomain.com
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=0x...
```

### Dashboard `.env.local`

```env
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENABLE_ANALYTICS=true
```

### Feedback `.env`

```env
NODE_ENV=production
PORT=3002
BACKEND_API_URL=https://api.yourdomain.com
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🔐 Security Checklist

### Pre-Deployment

- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGIN properly
- [ ] Set up SSL certificates
- [ ] Configure firewall (only expose 80/443)
- [ ] Set up database authentication
- [ ] Review rate limiting settings
- [ ] Remove default/demo accounts

### Post-Deployment

- [ ] Test all authentication flows
- [ ] Verify HTTPS is working
- [ ] Check security headers (use securityheaders.com)
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Set up database backups
- [ ] Test disaster recovery

---

## 📊 Monitoring

### Health Check Endpoints

| Service | Endpoint |
|---------|----------|
| Backend | `GET /api/health` |
| Feedback | `GET /health` |
| Nginx | `GET /nginx-health` |

### Logs

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f dashboard

# Application logs
docker-compose exec backend cat combined.log
```

### Backups

```bash
# Database backup
docker-compose exec mongodb mongodump --out=/backup

# Copy backup from container
docker cp healthvisit-mongodb:/backup ./backups/
```

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm run install:all
      - run: npm run test:all

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /app/decentralized-health-visit
            git pull
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 🚨 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs backend

# Verify environment
docker-compose config

# Rebuild
docker-compose build --no-cache backend
```

### Database connection issues

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Test connection
docker-compose exec mongodb mongosh --eval "db.runCommand({ping:1})"
```

### SSL certificate issues

```bash
# Verify certificates exist
ls -la nginx/ssl/

# Check nginx config
docker-compose exec nginx nginx -t
```

---

## 📞 Default Credentials

After running `npm run seed:all` or `npm run docker:seed`:

| Role | Username | Password |
|------|----------|----------|
| Super Admin | admin | admin123 |
| Supervisor | supervisor | supervisor123 |
| Analyst | analyst | analyst123 |
| Demo CHW | chw1@healthvisit.local | password123 |

⚠️ **Change these immediately in production!**
