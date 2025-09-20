```markdown
# Decentralized Health Visit System

A blockchain-enabled health visit tracking system for Community Health Workers (CHWs) ensuring transparency, preventing fraud, and enabling patient feedback.

## 🎯 Project Overview

This system addresses the issue of fake or misreported CHW visits with:
- **Backend API**: MongoDB, JWT authentication
- **Smart Contracts**: Immutable visit logging on Hardhat network
- **Admin Dashboard**: Real-time analytics and fraud detection
- **CHW Mobile App**: QR scanning, GPS tracking
- **SMS Feedback System**: Twilio integration with OTP verification
- **Fraud Detection**: Anomaly detection algorithms

## 🏗️ System Architecture


## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask wallet
- Android Studio (for mobile app)

### Installation
1. Clone the repo
   ```bash
   git clone <repository-url>
   cd decentralized-health-visit
````

2. Install dependencies

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

* **CHW Mobile App**: QR/NFC scanning, GPS capture, offline sync
* **Smart Contract**: Immutable visit logging, digital signature verification
* **Backend API**: Authentication, off-chain caching, QR generation
* **Admin Dashboard**: Analytics, fraud detection, performance metrics
* **Patient Feedback Portal**: OTP-based authentication, feedback hashing

## 🔧 Technology Stack

* **Frontend**: React, React Native, Chart.js, Mapbox GL JS
* **Backend**: Node.js, Express.js, MongoDB
* **Blockchain**: Solidity, Hardhat, Web3.js, Polygon Mumbai
* **Authentication**: Firebase Auth, Twilio SMS
* **Deployment**: Render, Firebase Hosting, Vercel

## 📊 Key Features

* Tamper-proof visit verification
* Real-time GPS tracking
* Digital signature authentication
* Patient feedback integration
* Fraud detection algorithms
* Mobile-first design with offline capability

## 🔒 Security

* End-to-end encryption
* Digital signature verification
* Time-based QR expiry
* Multi-factor authentication
* Privacy-preserving feedback hashing

## 📈 Metrics & Analytics

* Visit authenticity, fraud detection accuracy
* Feedback collection rates, community trust levels
* System usability

## 🚀 Deployment

* **Smart Contract**: Polygon Mumbai Testnet
* **Backend**: Render or Railway
* **Frontend**: Vercel or Firebase Hosting
* **Mobile App**: APK or Play Store

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## 📞 Support

For support, open an issue or contact the development team.

```

This version condenses the same information but retains key details in a more succinct format. It can fit in a single view on GitHub without losing the important technical and project context.
```
