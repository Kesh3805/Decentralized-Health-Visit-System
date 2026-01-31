/**
 * Demo Data Seed Script
 * Creates sample CHWs, patients, visits, and feedback for testing
 * 
 * Usage: node scripts/seed-demo-data.js
 * Or: npm run seed:demo
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ethers } = require('ethers');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthvisits';

// Models (inline schemas)
const chwSchema = new mongoose.Schema({
  chwId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  walletAddress: { type: String, required: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  registrationTime: { type: Date, default: Date.now },
  totalVisits: { type: Number, default: 0 },
  organization: String,
  region: String,
  specialization: String
}, { timestamps: true });

const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  hashedPatientId: { type: String, required: true, unique: true },
  demographics: {
    ageGroup: String,
    gender: String
  },
  location: {
    region: String,
    district: String,
    coordinates: { latitude: Number, longitude: Number }
  },
  contactInfo: {
    phone: String,
    alternateContact: String
  },
  qrCode: {
    data: { type: String, required: true, unique: true },
    generatedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  },
  enrollmentDate: { type: Date, default: Date.now },
  totalVisits: { type: Number, default: 0 },
  lastVisitDate: Date
}, { timestamps: true });

const visitSchema = new mongoose.Schema({
  visitId: { type: String, required: true, unique: true },
  patientId: { type: String, required: true },
  chwId: { type: String, required: true },
  chwAddress: { type: String, required: true, lowercase: true },
  visitHash: { type: String, required: true },
  location: {
    coordinates: { latitude: Number, longitude: Number },
    address: String,
    accuracy: Number
  },
  timestamp: { type: Date, required: true },
  signature: { type: String, required: true },
  visitType: { type: String, default: 'routine_checkup' },
  services: [String],
  duration: Number,
  isVerified: { type: Boolean, default: false },
  hasFeedback: { type: Boolean, default: false },
  notes: String,
  qrCode: { type: String, required: true },
  fraudScore: { type: Number, default: 0 },
  status: { type: String, default: 'pending' }
}, { timestamps: true });

const feedbackSchema = new mongoose.Schema({
  feedbackId: { type: String, required: true, unique: true },
  visitId: { type: String, required: true },
  patientId: { type: String, required: true },
  feedbackHash: { type: String, required: true, unique: true },
  rating: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    categories: {
      professionalism: Number,
      communication: Number,
      serviceQuality: Number,
      timeliness: Number,
      satisfaction: Number
    }
  },
  comments: {
    positive: String,
    improvement: String,
    general: String
  },
  status: { type: String, default: 'submitted' }
}, { timestamps: true });

const CHW = mongoose.model('CHW', chwSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Visit = mongoose.model('Visit', visitSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);

// Sample data generators
const regions = ['Northern Region', 'Southern Region', 'Eastern Region', 'Western Region', 'Central Region'];
const districts = ['District A', 'District B', 'District C', 'District D'];
const visitTypes = ['routine_checkup', 'vaccination', 'follow_up', 'education', 'emergency'];
const services = ['health_screening', 'medication_delivery', 'education', 'vaccination', 'consultation'];
const ageGroups = ['0-5', '6-17', '18-35', '36-50', '51-65', '65+'];
const genders = ['male', 'female', 'other'];

function generateWalletAddress() {
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCoordinates() {
  // Generate coordinates around a central point (example: East Africa region)
  return {
    latitude: -1.2921 + (Math.random() - 0.5) * 2,
    longitude: 36.8219 + (Math.random() - 0.5) * 2
  };
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

function hashString(str) {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
}

async function seedDemoData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully!\n');

    // Clear existing demo data (optional)
    console.log('Note: This will add new demo data. Run with --clean to clear existing data first.\n');
    
    if (process.argv.includes('--clean')) {
      console.log('Cleaning existing data...');
      await CHW.deleteMany({});
      await Patient.deleteMany({});
      await Visit.deleteMany({});
      await Feedback.deleteMany({});
      console.log('Data cleaned.\n');
    }

    // Create sample CHWs
    console.log('Creating CHWs...');
    const chws = [];
    const chwNames = [
      'Dr. Sarah Johnson', 'James Mwangi', 'Fatima Ahmed', 
      'Peter Ochieng', 'Mary Nyambura', 'David Kipchoge',
      'Grace Wanjiku', 'Samuel Kiprotich', 'Lucy Adhiambo', 'John Kamau'
    ];

    for (let i = 0; i < chwNames.length; i++) {
      const existingCHW = await CHW.findOne({ email: `chw${i + 1}@healthvisit.local` });
      if (existingCHW) {
        chws.push(existingCHW);
        console.log(`  ⏭️  Skipping ${chwNames[i]} (already exists)`);
        continue;
      }

      const chw = new CHW({
        chwId: `CHW-${Date.now()}-${String(i + 1).padStart(3, '0')}`,
        name: chwNames[i],
        email: `chw${i + 1}@healthvisit.local`,
        phone: `+254${700000000 + Math.floor(Math.random() * 99999999)}`,
        password: await hashPassword('password123'),
        licenseNumber: `LIC-${Date.now()}-${String(i + 1).padStart(4, '0')}`,
        walletAddress: generateWalletAddress(),
        isActive: i < 8, // 8 active, 2 inactive
        isVerified: i < 6, // 6 verified
        organization: 'Community Health Initiative',
        region: randomFromArray(regions),
        specialization: i % 2 === 0 ? 'General Healthcare' : 'Maternal & Child Health'
      });

      await chw.save();
      chws.push(chw);
      console.log(`  ✅ Created CHW: ${chw.name}`);
    }

    // Create sample patients
    console.log('\nCreating Patients...');
    const patients = [];
    
    for (let i = 0; i < 50; i++) {
      const patientId = `PAT-${Date.now()}-${String(i + 1).padStart(4, '0')}`;
      
      const existingPatient = await Patient.findOne({ patientId });
      if (existingPatient) {
        patients.push(existingPatient);
        continue;
      }

      const coords = randomCoordinates();
      const patient = new Patient({
        patientId,
        hashedPatientId: hashString(patientId),
        demographics: {
          ageGroup: randomFromArray(ageGroups),
          gender: randomFromArray(genders)
        },
        location: {
          region: randomFromArray(regions),
          district: randomFromArray(districts),
          coordinates: coords
        },
        contactInfo: {
          phone: `+254${700000000 + Math.floor(Math.random() * 99999999)}`
        },
        qrCode: {
          data: `QR-${patientId}-${Date.now()}`,
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        totalVisits: 0
      });

      await patient.save();
      patients.push(patient);
    }
    console.log(`  ✅ Created ${patients.length} patients`);

    // Create sample visits
    console.log('\nCreating Visits...');
    const visits = [];
    const now = new Date();
    
    for (let i = 0; i < 200; i++) {
      const chw = randomFromArray(chws.filter(c => c.isActive));
      const patient = randomFromArray(patients);
      const visitDate = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      const visitId = `VIS-${visitDate.getTime()}-${String(i + 1).padStart(4, '0')}`;
      
      const existingVisit = await Visit.findOne({ visitId });
      if (existingVisit) {
        visits.push(existingVisit);
        continue;
      }

      const coords = patient.location.coordinates;
      const visitHash = hashString(`${chw.walletAddress}${patient.patientId}${coords.latitude},${coords.longitude}${visitDate.getTime()}`);
      
      const visit = new Visit({
        visitId,
        patientId: patient.patientId,
        chwId: chw.chwId,
        chwAddress: chw.walletAddress,
        visitHash,
        location: {
          coordinates: {
            latitude: coords.latitude + (Math.random() - 0.5) * 0.01,
            longitude: coords.longitude + (Math.random() - 0.5) * 0.01
          },
          address: `${randomFromArray(districts)}, ${randomFromArray(regions)}`,
          accuracy: Math.floor(Math.random() * 50) + 5
        },
        timestamp: visitDate,
        signature: `sig_${hashString(visitId).substring(0, 20)}`,
        visitType: randomFromArray(visitTypes),
        services: services.slice(0, Math.floor(Math.random() * 3) + 1),
        duration: Math.floor(Math.random() * 45) + 15,
        isVerified: Math.random() > 0.3, // 70% verified
        hasFeedback: Math.random() > 0.5,
        qrCode: patient.qrCode.data,
        fraudScore: Math.floor(Math.random() * 30), // Most low fraud scores
        status: Math.random() > 0.2 ? 'verified' : 'pending'
      });

      // Add some high fraud score visits for testing
      if (i < 5) {
        visit.fraudScore = 70 + Math.floor(Math.random() * 30);
        visit.status = 'flagged';
      }

      await visit.save();
      visits.push(visit);

      // Update CHW and patient visit counts
      await CHW.updateOne({ _id: chw._id }, { $inc: { totalVisits: 1 } });
      await Patient.updateOne({ _id: patient._id }, { $inc: { totalVisits: 1 }, lastVisitDate: visitDate });
    }
    console.log(`  ✅ Created ${visits.length} visits`);

    // Create sample feedback
    console.log('\nCreating Feedback...');
    const visitsWithFeedback = visits.filter(v => v.hasFeedback);
    let feedbackCount = 0;

    for (const visit of visitsWithFeedback.slice(0, 80)) {
      const existingFeedback = await Feedback.findOne({ visitId: visit.visitId });
      if (existingFeedback) continue;

      const overallRating = Math.floor(Math.random() * 3) + 3; // 3-5 stars mostly
      const feedbackData = {
        visitId: visit.visitId,
        rating: overallRating,
        timestamp: Date.now()
      };
      
      const feedback = new Feedback({
        feedbackId: `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        visitId: visit.visitId,
        patientId: visit.patientId,
        feedbackHash: hashString(JSON.stringify(feedbackData)),
        rating: {
          overall: overallRating,
          categories: {
            professionalism: Math.floor(Math.random() * 2) + 4,
            communication: Math.floor(Math.random() * 2) + 4,
            serviceQuality: Math.floor(Math.random() * 2) + 4,
            timeliness: Math.floor(Math.random() * 2) + 3,
            satisfaction: overallRating
          }
        },
        comments: {
          positive: 'The CHW was very helpful and professional.',
          general: 'Good experience overall.'
        },
        status: 'submitted'
      });

      await feedback.save();
      feedbackCount++;
    }
    console.log(`  ✅ Created ${feedbackCount} feedback entries`);

    // Display summary
    const [chwCount, patientCount, visitCount, feedbackTotalCount] = await Promise.all([
      CHW.countDocuments(),
      Patient.countDocuments(),
      Visit.countDocuments(),
      Feedback.countDocuments()
    ]);

    console.log('\n========================================');
    console.log('Demo Data Seed Summary');
    console.log('========================================');
    console.log(`CHWs: ${chwCount}`);
    console.log(`Patients: ${patientCount}`);
    console.log(`Visits: ${visitCount}`);
    console.log(`Feedback: ${feedbackTotalCount}`);
    console.log('========================================');
    console.log('\nSample CHW Login:');
    console.log('  Email: chw1@healthvisit.local');
    console.log('  Password: password123');
    console.log('========================================\n');

  } catch (error) {
    console.error('Error seeding demo data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

// Run the seed
seedDemoData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
