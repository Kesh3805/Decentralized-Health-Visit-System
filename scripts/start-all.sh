#!/bin/bash

# Start all services for Decentralized Health Visit Verification System

echo "Starting all services..."

# Start backend API server
echo "Starting backend API server..."
cd backend
npm start &
cd ..

# Start admin dashboard
echo "Starting admin dashboard..."
cd dashboard
npm start &
cd ..

# Start feedback portal
echo "Starting feedback portal..."
cd feedback
npm start &
cd ..

echo "All services started!"
echo "Backend API: http://localhost:3001"
echo "Admin Dashboard: http://localhost:3000"
echo "Feedback Portal: http://localhost:3002"
