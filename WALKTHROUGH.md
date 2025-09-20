# Decentralized Health Visit Verification System - Walkthrough

This document provides a step-by-step walkthrough of the Decentralized Health Visit Verification System, explaining how each component works and how they interact with each other.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Walkthrough](#component-walkthrough)
   - [CHW Mobile App](#chw-mobile-app)
   - [Backend API](#backend-api)
   - [Smart Contract](#smart-contract)
   - [Admin Dashboard](#admin-dashboard)
   - [Patient Feedback Portal](#patient-feedback-portal)
3. [End-to-End Workflow](#end-to-end-workflow)
4. [Deployment Guide](#deployment-guide)

## System Overview

The Decentralized Health Visit Verification System is designed to verify community health worker (CHW) visits using a combination of IoT devices, blockchain technology, and patient feedback. The system ensures data privacy, trust, and service quality through:

- IoT devices (QR/NFC tags) for physical presence verification
- Blockchain technology for immutable visit logging
- Digital signatures for authenticity
- Patient feedback system for quality assurance
- AI-based fraud detection

## Component Walkthrough

### CHW Mobile App

The CHW Mobile App is built with React Native and provides the following features:

1. **User Authentication**
   - CHWs log in to the app using their credentials
   - Authentication tokens are securely stored

2. **QR/NFC Scanning**
   - CHWs scan patient QR codes or tap NFC tags to verify patient identity
   - The app validates the QR/NFC tag with the backend API
   - Time-based tokens ensure security and prevent reuse

3. **GPS Location Capture**
   - The app captures the CHW's current location during the visit
   - Location data is included in the visit record

4. **Digital Signature Creation**
   - Visit data is signed with the CHW's private key
   - Digital signatures ensure authenticity and non-repudiation

5. **Offline Capability**
   - The app can function offline and sync data when connectivity is restored

### Backend API

The Backend API is built with Node.js and Express, serving as the bridge between the mobile app and blockchain:

1. **Authentication and Authorization**
   - JWT-based authentication for API endpoints
   - Role-based access control for admin functions

2. **QR/NFC Tag Generation and Validation**
   - Dynamic generation of time-based QR codes and NFC tags
   - Validation of scanned tags to prevent fraud

3. **Data Management**
   - Off-chain data caching in MongoDB
   - Visit, CHW, and feedback data management

4. **Blockchain Integration**
   - Communication with the smart contract on Polygon Mumbai
   - Submission of visit data to the blockchain

5. **Fraud Detection**
   - Implementation of basic fraud detection algorithms
   - Detection of anomalous visit patterns

### Smart Contract

The Smart Contract is written in Solidity and deployed on the Polygon Mumbai testnet:

1. **Visit Logging**
   - Immutable storage of visit records
   - Verification of digital signatures

2. **Patient Feedback Hash Storage**
   - Storage of hashed patient feedback
   - Privacy-preserving feedback mechanism

3. **Event Emission**
   - Real-time events for visit logs and feedback
   - Integration with off-chain systems

### Admin Dashboard

The Admin Dashboard is built with React and provides comprehensive analytics and management features:

1. **Visit Analytics and Reporting**
   - Visualization of visit data over time
   - CHW performance metrics

2. **Geographic Heatmaps**
   - Map-based visualization of visit locations
   - Geographic distribution of visits

3. **Fraud Detection Alerts**
   - Real-time alerts for suspicious activities
   - Investigation and resolution workflow

4. **CHW Management**
   - Registration and management of CHWs
   - Performance monitoring

### Patient Feedback Portal

The Patient Feedback Portal is a Progressive Web App (PWA) that allows patients to provide feedback:

1. **OTP-Based Authentication**
   - Secure authentication using SMS-based OTPs
   - Privacy-preserving verification

2. **Rating and Comment System**
   - Simple interface for rating CHW visits
   - Optional comments for detailed feedback

3. **Privacy-Preserving Feedback Hashing**
   - Feedback is hashed before storage
   - Hashes are stored on the blockchain

## End-to-End Workflow

1. **CHW Registration**
   - Admin registers CHW in the dashboard
   - CHW receives login credentials

2. **Patient Tag Generation**
   - Admin generates QR/NFC tags for patients
   - Tags are distributed to patients

3. **Visit Verification**
   - CHW logs into mobile app
   - CHW scans patient QR code or taps NFC tag
   - App validates tag with backend
   - App captures GPS location
   - CHW signs visit data with private key
   - Visit data is submitted to backend
   - Backend submits data to blockchain

4. **Patient Feedback**
   - Patient receives OTP via SMS
   - Patient provides feedback through portal
   - Feedback is hashed and stored on blockchain

5. **Analytics and Monitoring**
   - Admin views visit analytics in dashboard
   - Fraud detection system monitors for anomalies
   - Reports are generated for stakeholders

## Deployment Guide

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- MongoDB running locally or remote connection
- Polygon Mumbai testnet account with MATIC tokens
- Twilio account for SMS (for feedback system)

### Setup

1. Clone the repository
2. Run the setup script:
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. Configure environment variables in each component's `.env` file

### Deployment

1. Deploy smart contract:
   ```bash
   chmod +x scripts/deploy-contract.sh
   ./scripts/deploy-contract.sh
   ```

2. Populate with demo data (optional):
   ```bash
   node scripts/demo-data.js
   ```

3. Start all services:
   ```bash
   chmod +x scripts/start-all.sh
   ./scripts/start-all.sh
   ```

### Services

- Backend API: http://localhost:3001
- Admin Dashboard: http://localhost:3000
- Feedback Portal: http://localhost:3002
