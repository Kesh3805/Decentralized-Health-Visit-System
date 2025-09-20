# Decentralized Health Visit System

A comprehensive blockchain-enabled health visit tracking system for Community Health Workers (CHWs) that ensures transparency, prevents fraud, and enables patient feedback.

## 🎯 Project Overview

This fully implemented system addresses the problem of fake or misreported CHW visits by providing:
- **Complete Backend API** with MongoDB integration and JWT authentication
- **Smart Contracts** deployed on Hardhat network for immutable visit logging
- **Admin Dashboard** with real-time analytics and fraud detection
- **Mobile App** for CHWs with QR scanning and GPS tracking
- **SMS Feedback System** with Twilio integration and OTP verification
- **Fraud Detection** algorithms with anomaly detection

## 🏗️ System Architecture

```
┌─────────────────────┐
│  Admin Dashboard    │
│  (React + Charts)   │
└──────────┬──────────┘
           │
    ┌──────▼──────┐
    │ Backend API │
    │ (Node.js)   │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │ Smart       │
    │ Contract    │
    │ (Solidity)  │
    └──────┬──────┘
           │
┌──────────┴──────────┐
│                     │
▼                     ▼
┌─────────────┐   ┌─────────────┐
│ CHW Mobile  │   │ Patient     │
│ App         │   │ Feedback    │
│ (React      │   │ Portal      │
│ Native)     │   │ (PWA)       │
└─────────────┘   └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask wallet
- Android Studio (for mobile app)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd decentralized-health-visit
```

2. Install dependencies for all components
```bash
npm run install-all
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Deploy smart contract to testnet
```bash
cd blockchain
npm run deploy:testnet
```

5. Start all services
```bash
npm run dev
```

## 📱 Components

### 1. CHW Mobile App (`/mobile-app`)
- QR/NFC scanning for patient verification
- GPS location capture
- Digital signature creation
- Offline capability with sync

### 2. Smart Contract (`/blockchain`)
- Visit logging with immutable records
- Digital signature verification
- Patient feedback hash storage
- Event emission for real-time updates

### 3. Backend API (`/backend`)
- Bridge between mobile app and blockchain
- Off-chain data caching
- Authentication and authorization
- QR code generation service

### 4. Admin Dashboard (`/dashboard`)
- Visit analytics and reporting
- Geographic heatmaps
- Fraud detection alerts
- CHW performance metrics

### 5. Patient Feedback Portal (`/feedback`)
- OTP-based authentication
- Rating and comment system
- Privacy-preserving feedback hashing

## 🔧 Technology Stack

- **Frontend**: React, React Native, Chart.js, Mapbox GL JS
- **Backend**: Node.js, Express.js, MongoDB
- **Blockchain**: Solidity, Hardhat, Web3.js, Polygon Mumbai
- **Authentication**: Firebase Auth, Twilio SMS
- **Deployment**: Render, Firebase Hosting, Vercel

## 📊 Key Features

- ✅ Tamper-proof visit verification
- ✅ Real-time GPS tracking
- ✅ Digital signature authentication
- ✅ Patient feedback integration
- ✅ Fraud detection algorithms
- ✅ Analytics dashboard
- ✅ Mobile-first design
- ✅ Offline capability

## 🔒 Security

- End-to-end encryption
- Digital signature verification
- Time-based QR code expiry
- Multi-factor authentication
- Privacy-preserving data hashing

## 📈 Metrics & Analytics

- Visit authenticity verification
- Feedback collection rates
- Fraud detection accuracy
- Community trust levels
- System usability metrics

## 🚀 Deployment

The system is designed for deployment on:
- **Smart Contract**: Polygon Mumbai Testnet
- **Backend**: Render or Railway
- **Frontend**: Vercel or Firebase Hosting
- **Mobile App**: APK distribution or Play Store

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Please read CONTRIBUTING.md for contribution guidelines.

## 📞 Support

For support and questions, please open an issue or contact the development team.
