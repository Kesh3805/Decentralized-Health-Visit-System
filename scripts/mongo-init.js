// MongoDB Initialization Script
// This script runs when the MongoDB container is first created

// Switch to the healthvisit database
db = db.getSiblingDB('healthvisit');

// Create collections with validation
db.createCollection('admins', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['adminId', 'username', 'password', 'role'],
      properties: {
        adminId: { bsonType: 'string' },
        username: { bsonType: 'string' },
        password: { bsonType: 'string' },
        role: { enum: ['super_admin', 'supervisor', 'analyst'] }
      }
    }
  }
});

db.createCollection('chws', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['chwId', 'email', 'name'],
      properties: {
        chwId: { bsonType: 'string' },
        email: { bsonType: 'string' },
        name: { bsonType: 'string' },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('patients');
db.createCollection('visits');
db.createCollection('feedbacks');

// Create indexes for performance
db.admins.createIndex({ 'adminId': 1 }, { unique: true });
db.admins.createIndex({ 'username': 1 }, { unique: true });

db.chws.createIndex({ 'chwId': 1 }, { unique: true });
db.chws.createIndex({ 'email': 1 }, { unique: true });
db.chws.createIndex({ 'isActive': 1 });

db.patients.createIndex({ 'patientId': 1 }, { unique: true });
db.patients.createIndex({ 'nfcTagId': 1 }, { sparse: true });
db.patients.createIndex({ 'qrCode': 1 }, { sparse: true });

db.visits.createIndex({ 'visitId': 1 }, { unique: true });
db.visits.createIndex({ 'chwId': 1 });
db.visits.createIndex({ 'patientId': 1 });
db.visits.createIndex({ 'timestamp': -1 });
db.visits.createIndex({ 'isVerified': 1 });
db.visits.createIndex({ 'status': 1 });

db.feedbacks.createIndex({ 'visitId': 1 });
db.feedbacks.createIndex({ 'timestamp': -1 });

print('MongoDB initialization completed successfully');
