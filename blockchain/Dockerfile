# Blockchain Node Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create deployments directory
RUN mkdir -p deployments

# Expose Hardhat node port
EXPOSE 8545

# Start Hardhat node and deploy contracts
CMD ["sh", "-c", "npx hardhat node & sleep 5 && npx hardhat run scripts/deploy.js --network localhost && wait"]
