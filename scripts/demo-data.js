// Demo data script for Decentralized Health Visit Verification System

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Import models
const Visit = require('../backend/models/Visit');
const CHW = require('../backend/models/CHW');
const Feedback = require('../backend/models/Feedback');

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthvisit';
mongoose.connect(mongoURI);

// Demo data
const demoCHWs = [
  {
    chwId: 'CHW001',
    name: 'Alice Johnson',
    email: 'alice@chw.org',
    phone: '+1234567890',
    registrationTime: new Date('2023-01-15')
  },
  {
    chwId: 'CHW002',
    name: 'Bob Smith',
    email: 'bob@chw.org',
    phone: '+1234567891',
    registrationTime: new Date('2023-02-20')
  },
  {
    chwId: 'CHW003',
    name: 'Carol Davis',
    email: 'carol@chw.org',
    phone: '+1234567892',
    registrationTime: new Date('2023-03-10')
  }
];

const demoVisits = [
  {
    patientId: 'PATIENT001',
    chwId: 'CHW001',
    location: '40.7128,-74.0060',
    timestamp: new Date('2023-06-01T10:00:00'),
    signature: '0xSignature1',
    transactionHash: '0xTransactionHash1'
  },
  {
    patientId: 'PATIENT002',
    chwId: 'CHW001',
    location: '40.7130,-74.0062',
    timestamp: new Date('2023-06-01T11:30:00'),
    signature: '0xSignature2',
    transactionHash: '0xTransactionHash2'
  },
  {
    patientId: 'PATIENT003',
    chwId: 'CHW002',
    location: '40.7589,-73.9851',
    timestamp: new Date('2023-06-02T09:15:00'),
    signature: '0xSignature3',
    transactionHash: '0xTransactionHash3'
  },
  {
    patientId: 'PATIENT004',
    chwId: 'CHW002',
    location: '40.7591,-73.9853',
    timestamp: new Date('2023-06-02T10:45:00'),
    signature: '0xSignature4',
    transactionHash: '0xTransactionHash4'
  },
  {
    patientId: 'PATIENT005',
    chwId: 'CHW003',
    location: '40.7505,-73.9934',
    timestamp: new Date('2023-06-03T14:20:00'),
    signature: '0xSignature5',
    transactionHash: '0xTransactionHash5'
  }
];

const demoFeedback = [
  {
    patientId: 'PATIENT001',
    chwId: 'CHW001',
    rating: 5,
    comment: 'Great service, very helpful!',
    timestamp: new Date('2023-06-01T12:00:00'),
    feedbackHash: '0xFeedbackHash1'
  },
  {
    patientId: 'PATIENT002',
    chwId: 'CHW001',
    rating: 4,
    comment: 'Good visit, answered all my questions.',
    timestamp: new Date('2023-06-01T13:00:00'),
    feedbackHash: '0xFeedbackHash2'
  },
  {
    patientId: 'PATIENT003',
    chwId: 'CHW002',
    rating: 3,
    comment: 'Average service.',
    timestamp: new Date('2023-06-02T11:30:00'),
    feedbackHash: '0xFeedbackHash3'
  }
];

// Insert demo data
async function insertDemoData() {
  try {
    // Clear existing data
    await CHW.deleteMany({});
    await Visit.deleteMany({});
    await Feedback.deleteMany({});
    
    // Insert CHWs
    await CHW.insertMany(demoCHWs);
    console.log('Inserted demo CHWs');
    
    // Insert visits
    await Visit.insertMany(demoVisits);
    console.log('Inserted demo visits');
    
    // Insert feedback
    await Feedback.insertMany(demoFeedback);
    console.log('Inserted demo feedback');
    
    console.log('Demo data insertion complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting demo data:', error);
    process.exit(1);
  }
}

// Run the script
insertDemoData();
