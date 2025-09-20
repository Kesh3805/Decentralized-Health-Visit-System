#!/bin/bash

# Mobile App Export Script for Decentralized Health Visit Verification System

echo "Exporting Mobile App for Deployment..."

# Create build directory if it doesn't exist
mkdir -p build

# Copy source files
rsync -av --exclude 'node_modules' --exclude 'build' --exclude '.git' . build/

# Create deployment instructions
cat > build/DEPLOYMENT.md << 'EOF'
# Mobile App Deployment Instructions

## Prerequisites
1. Node.js (v16 or higher)
2. npm (v6 or higher)
3. React Native CLI
4. Android Studio (for Android deployment)
5. Xcode (for iOS deployment - macOS only)

## Installation
1. Navigate to the project directory
2. Run `npm install` to install dependencies

## Running the App

### Development Mode
- Run `npm start` to start the Metro bundler
- For Android: Run `npm run android`
- For iOS: Run `npm run ios`

### Building for Production

#### Android
1. Ensure you have Android Studio installed
2. Set up environment variables for Android SDK
3. Run `npm run build:android`
4. The APK will be generated in `android/app/build/outputs/apk/release/`

#### iOS (macOS only)
1. Ensure you have Xcode installed
2. Run `npm run build:ios`
3. The IPA will be generated in `ios/build/`

## Environment Variables
Make sure to set the following environment variables:
- API_URL: URL of the backend API
- CONTRACT_ADDRESS: Address of the deployed smart contract
- RPC_URL: URL of the Polygon RPC endpoint

## Additional Notes
- The app uses QR code scanning, NFC, and GPS features
- Make sure to request necessary permissions in the app stores
- The app requires internet connectivity for blockchain interactions
EOF

echo "Export complete! Files are in the build/ directory."
echo "See build/DEPLOYMENT.md for deployment instructions."
