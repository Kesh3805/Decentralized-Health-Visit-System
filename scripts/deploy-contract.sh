#!/bin/bash

# Deploy smart contract to Polygon Mumbai testnet

echo "Deploying smart contract to Polygon Mumbai testnet..."

cd blockchain
npm run deploy:testnet
cd ..

echo "Contract deployment complete!"
echo "Make sure to update the contract address in the backend .env file."
