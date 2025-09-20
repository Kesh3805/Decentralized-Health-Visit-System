# Deployment Scripts

This directory contains scripts for deploying the Decentralized Health Visit Verification System.

## Available Scripts

- `setup.sh` - Complete setup script for all components
- `deploy-contract.sh` - Deploy smart contract to Polygon Mumbai
- `start-all.sh` - Start all services (backend, dashboard, feedback)
- `demo-data.js` - Populate database with demo data

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- MongoDB running locally or remote connection
- Polygon Mumbai testnet account with MATIC tokens
- Twilio account for SMS (for feedback system)

## Usage

1. Run `setup.sh` to install all dependencies
2. Configure environment variables in each component's `.env` file
3. Run `deploy-contract.sh` to deploy the smart contract
4. Run `demo-data.js` to populate with sample data
5. Run `start-all.sh` to start all services

## Environment Variables

Each component requires specific environment variables. See each component's README for details.
