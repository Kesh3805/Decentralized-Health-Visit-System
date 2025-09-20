# Deployment Guide

This guide covers how to deploy the Decentralized Health Visit System to various environments.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 16+
- MongoDB (local or cloud)
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/decentralized-health-visit
cd decentralized-health-visit

# Install all dependencies
npm run install:all

# Set up environment variables (copy and modify .env.example files)
cp backend/.env.example backend/.env
cp feedback/.env.example feedback/.env
cp blockchain/.env.example blockchain/.env

# Deploy smart contracts
npm run deploy:contracts

# Start all services
npm run start:all
```

## 🌐 Production Deployment

### Backend API Deployment

#### Option 1: Heroku
```bash
# Create Heroku app
heroku create your-health-visit-backend

# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-atlas-uri
heroku config:set JWT_SECRET=your-production-jwt-secret

# Deploy
git subtree push --prefix backend heroku master
```

#### Option 2: AWS/DigitalOcean
```bash
# Build and deploy using PM2
cd backend
npm install -g pm2
pm2 start server.js --name "health-visit-backend"
pm2 startup
pm2 save
```

### Dashboard Deployment

#### Option 1: Netlify
```bash
cd dashboard
npm run build
# Upload build/ folder to Netlify or connect GitHub repository
```

#### Option 2: Vercel
```bash
cd dashboard
npm install -g vercel
vercel --prod
```

### Mobile App Deployment

#### Android
```bash
cd mobile-app
expo build:android
# Download APK from Expo and distribute
```

#### iOS
```bash
cd mobile-app  
expo build:ios
# Submit to App Store using Expo
```

## 🔧 Environment Configuration

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/healthvisit
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
BCRYPT_ROUNDS=12
CONTRACT_ADDRESS=0x1234567890abcdef...
PRIVATE_KEY=0xabcdef1234567890...
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://your-dashboard-domain.com
```

### Feedback System (.env)
```env
NODE_ENV=production
PORT=3002
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
BACKEND_URL=https://your-backend-domain.com
SESSION_SECRET=your-session-secret-key
```

### Blockchain (.env)
```env
PRIVATE_KEY=0x1234567890abcdef...
INFURA_PROJECT_ID=your-infura-project-id
SEPOLIA_URL=https://sepolia.infura.io/v3/your-project-id
MAINNET_URL=https://mainnet.infura.io/v3/your-project-id
```

## 🐳 Docker Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/healthvisit
    depends_on:
      - mongo
      
  dashboard:
    build: ./dashboard
    ports:
      - "3000:3000"
      
  feedback:
    build: ./feedback
    ports:
      - "3002:3002"
      
  mongo:
    image: mongo:5
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Build and Run
```bash
docker-compose up --build
```

## 🔐 Security Checklist

### Pre-Deployment
- [ ] Update all default passwords and secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Test all API endpoints
- [ ] Verify smart contract deployment
- [ ] Test mobile app functionality

### Post-Deployment
- [ ] Monitor application logs
- [ ] Set up uptime monitoring
- [ ] Configure error tracking (Sentry)
- [ ] Test fraud detection system
- [ ] Verify SMS functionality
- [ ] Check database performance
- [ ] Monitor blockchain transactions

## 📊 Monitoring & Maintenance

### Application Monitoring
```bash
# Backend logs
tail -f backend/logs/combined.log

# PM2 monitoring (if using PM2)
pm2 monit

# Database monitoring
mongo --eval "db.stats()"
```

### Health Check Endpoints
- Backend: `GET /api/health`
- Database: `GET /api/admin/dashboard/stats`
- Blockchain: Check contract deployment

### Backup Strategy
```bash
# Database backup
mongodump --uri="mongodb://localhost:27017/healthvisit" --out=backup/

# Application backup
tar -czf app-backup-$(date +%Y%m%d).tar.gz /path/to/app
```

## 🚨 Troubleshooting

### Common Issues

#### Backend won't start
```bash
# Check MongoDB connection
mongo --eval "db.runCommand({connectionStatus : 1})"

# Check environment variables
node -e "console.log(process.env.MONGODB_URI)"

# Check port availability
netstat -an | grep 3001
```

#### Smart Contract deployment fails
```bash
# Check network configuration
npx hardhat console --network sepolia

# Verify private key and gas settings
npx hardhat run scripts/deploy.js --network sepolia
```

#### Mobile app build fails
```bash
# Clear Expo cache
expo r -c

# Check dependencies
cd mobile-app && npm audit

# Rebuild with verbose logging
expo build:android --type apk --verbose
```

## 📞 Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Check network configurations
5. Contact support team

## 🔄 CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm run install:all
      
    - name: Run tests
      run: npm run test:all
      
    - name: Deploy to production
      run: |
        # Add your deployment commands here
        echo "Deploying to production..."
```