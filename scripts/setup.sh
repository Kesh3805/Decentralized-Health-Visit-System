#!/bin/bash

# Setup script for Decentralized Health Visit Verification System

echo "Setting up Decentralized Health Visit Verification System..."

echo "Installing root dependencies..."
npm install

echo "Installing blockchain dependencies..."
cd blockchain
npm install
cd ..

echo "Installing backend dependencies..."
cd backend
npm install
cd ..

echo "Installing dashboard dependencies..."
cd dashboard
npm install
cd ..

echo "Installing feedback system dependencies..."
cd feedback
npm install
cd ..

echo "Setup complete!"
echo "Next steps:"
echo "1. Configure environment variables in each component's .env file"
echo "2. Run 'npm run deploy:contract' to deploy the smart contract"
echo "3. Run 'node scripts/demo-data.js' to populate with demo data"
echo "4. Run 'npm run dev' to start all services"
