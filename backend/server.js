require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const QRCode = require('qrcode');
const speakeasy = require('speakeasy');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');

// Import models
const { CHW, Visit, Patient, Feedback, Admin } = require('./models');

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for production (behind nginx/load balancer)
if (isProduction) {
  app.set('trust proxy', 1);
}

// Security middleware with production-aware settings
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: isProduction
}));

// CORS configuration
const corsOptions = {
  origin: isProduction 
    ? (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim())
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting with production-aware settings
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 100 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !isProduction && req.ip === '127.0.0.1'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthvisits', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  logger.info('Connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  logger.error('MongoDB connection error:', err);
});

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const admin = await Admin.findById(decoded.id);
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Blockchain connection
let provider;
let contract;

const initBlockchain = async () => {
  try {
    // Load deployed contract address
    const fs = require('fs');
    const path = require('path');
    
    let contractAddress = process.env.CONTRACT_ADDRESS;
    
    // Try to load from deployment file
    if (!contractAddress) {
      try {
        const deploymentPath = path.join(__dirname, '../blockchain/deployments/hardhat.json');
        if (fs.existsSync(deploymentPath)) {
          const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
          contractAddress = deployment.contractAddress;
        }
      } catch (error) {
        console.log('Could not load deployment file:', error.message);
      }
    }
    
    if (contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000') {
      // Connect to local Hardhat network
      provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545');
      
      // Load contract ABI
      const contractABI = [
        "function logVisit(string memory _patientId, string memory _location, bytes memory _signature, uint256 _visitTimestamp) external",
        "function submitFeedback(bytes32 _visitId, bytes32 _feedbackHash, uint256 _rating) external",
        "function getVisit(bytes32 _visitId) external view returns (tuple(bytes32 visitHash, address chwAddress, uint256 timestamp, string patientId, string location, bytes signature, bytes32 feedbackHash, bool isVerified, uint256 blockNumber))",
        "function getTotalVisits() external view returns (uint256)",
        "function registerCHW(address _chwAddress, string memory _name, string memory _licenseNumber) external",
        "event VisitLogged(bytes32 indexed visitId, address indexed chwAddress, string patientId, uint256 timestamp)",
        "event FeedbackSubmitted(bytes32 indexed visitId, bytes32 indexed feedbackHash, uint256 rating)",
        "event CHWRegistered(address indexed chwAddress, string name, string licenseNumber)"
      ];
      
      contract = new ethers.Contract(contractAddress, contractABI, provider);
      console.log('Connected to blockchain contract at:', contractAddress);
      logger.info('Connected to blockchain contract at:', contractAddress);
    } else {
      console.log('Contract address not set, blockchain features disabled');
      logger.warn('Contract address not set, blockchain features disabled');
    }
  } catch (error) {
    console.error('Blockchain initialization error:', error);
    logger.error('Blockchain initialization error:', error);
  }
};

// Initialize blockchain connection
initBlockchain();

// Utility functions
const generateJWT = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });
};

const hashString = (str) => {
  return ethers.keccak256(ethers.toUtf8Bytes(str));
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    blockchain: !!contract,
    database: mongoose.connection.readyState === 1
  });
});

// Authentication Routes

// CHW Login
app.post('/api/auth/chw/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find CHW by email
    const chw = await CHW.findOne({ email: email.toLowerCase() });
    if (!chw) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if CHW is active
    if (!chw.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    // Verify password
    const isValidPassword = await chw.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await chw.updateLastLogin();
    
    // Generate JWT token
    const token = generateJWT({ 
      id: chw._id, 
      chwId: chw.chwId, 
      walletAddress: chw.walletAddress,
      role: 'chw' 
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: chw._id,
        chwId: chw.chwId,
        name: chw.name,
        email: chw.email,
        walletAddress: chw.walletAddress,
        totalVisits: chw.totalVisits,
        role: 'chw'
      }
    });
  } catch (error) {
    console.error('CHW login error:', error);
    logger.error('CHW login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin Login
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Find admin by username or email
    const admin = await Admin.findOne({ 
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if account is locked
    if (admin.isLocked()) {
      return res.status(423).json({ error: 'Account temporarily locked due to too many failed attempts' });
    }
    
    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    // Verify password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      await admin.incrementLoginAttempts();
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Reset login attempts and update last login
    await admin.resetLoginAttempts();
    
    // Generate JWT token
    const token = generateJWT({ 
      id: admin._id, 
      adminId: admin.adminId, 
      role: admin.role,
      permissions: admin.permissions
    });
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: admin._id,
        adminId: admin.adminId,
        username: admin.username,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    logger.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin Password Change
app.post('/api/auth/admin/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // Verify current password
    const isValidPassword = await admin.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Admin password change error:', error);
    logger.error('Admin password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Patient QR/NFC Tag Management

// Generate dynamic QR code or NFC tag for patient
app.post('/api/patients/generate-tag', authenticateToken, async (req, res) => {
  try {
    const { patientId, tagType = 'qr' } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID required' });
    }
    
    // Find or create patient
    let patient = await Patient.findOne({ patientId });
    if (!patient) {
      // Create new patient with basic info
      patient = new Patient({
        patientId,
        hashedPatientId: hashString(patientId),
        qrCode: {
          data: '',
          generatedAt: new Date(),
          isActive: true
        },
        consentGiven: true,
        consentDate: new Date()
      });
    }
    
    // Generate new QR code
    await patient.generateNewQRCode();
    
    let tagOutput = {};
    
    if (tagType === 'qr') {
      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(patient.qrCode.data);
      tagOutput = { qrCode: qrCodeImage, qrData: patient.qrCode.data };
    } else if (tagType === 'nfc') {
      // For NFC, return the data to be written to tag
      tagOutput = { nfcData: patient.qrCode.data };
    } else {
      return res.status(400).json({ error: 'Invalid tag type. Use "qr" or "nfc"' });
    }
    
    res.json({
      message: `${tagType.toUpperCase()} tag generated successfully`,
      patientId,
      ...tagOutput,
      expiresAt: patient.qrCode.expiresAt,
      tagType
    });
  } catch (error) {
    console.error('Tag generation error:', error);
    logger.error('Tag generation error:', error);
    res.status(500).json({ error: `Failed to generate ${req.body.tagType || 'QR'} tag` });
  }
});

// Verify QR code or NFC tag
app.post('/api/patients/verify-tag', authenticateToken, async (req, res) => {
  try {
    const { tagData, tagType = 'qr' } = req.body;
    
    if (!tagData) {
      return res.status(400).json({ error: 'Tag data required' });
    }
    
    // Find patient by QR/NFC data
    const patient = tagType === 'nfc' 
      ? await Patient.findByNFC(tagData)
      : await Patient.findByQRCode(tagData);
    
    if (!patient) {
      return res.status(404).json({ 
        valid: false, 
        error: `Invalid or expired ${tagType.toUpperCase()} tag` 
      });
    }
    
    // Check if tag is still valid (not expired)
    const now = new Date();
    if (patient.qrCode.expiresAt && now > patient.qrCode.expiresAt) {
      return res.status(400).json({ 
        valid: false, 
        error: `${tagType.toUpperCase()} tag has expired` 
      });
    }
    
    res.json({ 
      valid: true, 
      message: `${tagType.toUpperCase()} tag verified successfully`,
      patient: {
        patientId: patient.patientId,
        hashedId: patient.hashedPatientId,
        totalVisits: patient.totalVisits,
        lastVisitDate: patient.lastVisitDate
      }
    });
  } catch (error) {
    console.error('Tag verification error:', error);
    logger.error('Tag verification error:', error);
    res.status(500).json({ error: `Failed to verify ${req.body.tagType || 'QR'} tag` });
  }
});

// Visit Management Routes

// Log a new visit
app.post('/api/visits', authenticateToken, async (req, res) => {
  try {
    const { 
      patientId, 
      location, 
      signature, 
      timestamp, 
      visitType, 
      services, 
      duration, 
      notes,
      qrCode,
      deviceInfo 
    } = req.body;
    
    if (!patientId || !location || !signature || !timestamp || !qrCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify CHW exists and is active
    const chw = await CHW.findById(req.user.id);
    if (!chw || !chw.isActive) {
      return res.status(403).json({ error: 'CHW not found or inactive' });
    }
    
    // Verify patient exists
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Generate unique visit ID
    const visitId = `${chw.chwId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create visit hash for blockchain
    const visitHash = hashString(`${chw.walletAddress}${patientId}${location.coordinates.latitude},${location.coordinates.longitude}${timestamp}`);
    
    // Create new visit record
    const visit = new Visit({
      visitId,
      patientId,
      chwId: chw.chwId,
      chwAddress: chw.walletAddress,
      visitHash,
      location,
      timestamp: new Date(timestamp),
      signature,
      visitType: visitType || 'routine_checkup',
      services: services || [],
      duration,
      notes,
      qrCode,
      deviceInfo,
      status: 'pending'
    });
    
    // Save to database
    await visit.save();
    
    // Update CHW and patient visit counts
    await CHW.findByIdAndUpdate(chw._id, { $inc: { totalVisits: 1 } });
    await patient.recordVisit();
    
    // If blockchain is available, log visit (in real implementation, this would be async)
    let blockchainTxHash = null;
    if (contract) {
      try {
        // In production, this would use the CHW's private key to sign the transaction
        console.log('Would send transaction to blockchain for visit:', visitId);
        logger.info('Visit would be logged to blockchain:', { visitId, chwId: chw.chwId, patientId });
        // blockchainTxHash = 'mock_tx_hash_' + Date.now();
      } catch (blockchainError) {
        console.error('Blockchain logging error:', blockchainError);
        logger.error('Blockchain logging error:', blockchainError);
      }
    }
    
    if (blockchainTxHash) {
      visit.blockchainTxHash = blockchainTxHash;
      await visit.save();
    }
    
    res.status(201).json({
      message: 'Visit logged successfully',
      visit: {
        visitId: visit.visitId,
        patientId: visit.patientId,
        timestamp: visit.timestamp,
        status: visit.status,
        blockchainTxHash
      },
      savedToDatabase: true,
      sentToBlockchain: !!blockchainTxHash
    });
  } catch (error) {
    console.error('Visit logging error:', error);
    logger.error('Visit logging error:', error);
    res.status(500).json({ error: 'Failed to log visit' });
  }
});

// Get visits for authenticated CHW
app.get('/api/visits', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    // Build query filter
    const filter = { chwId: req.user.chwId };
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const visits = await Visit.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-signature -deviceInfo'); // Exclude sensitive data
    
    const total = await Visit.countDocuments(filter);
    
    res.json({
      visits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get visits error:', error);
    logger.error('Get visits error:', error);
    res.status(500).json({ error: 'Failed to retrieve visits' });
  }
});

// Get specific visit details
app.get('/api/visits/:visitId', authenticateToken, async (req, res) => {
  try {
    const { visitId } = req.params;
    
    const visit = await Visit.findOne({ 
      visitId,
      chwId: req.user.chwId 
    });
    
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    // Get patient info (anonymized)
    const patient = await Patient.findOne({ patientId: visit.patientId });
    
    res.json({
      ...visit.toObject(),
      patient: patient ? patient.anonymizedData : null
    });
  } catch (error) {
    console.error('Get visit error:', error);
    logger.error('Get visit error:', error);
    res.status(500).json({ error: 'Failed to retrieve visit' });
  }
});

// Verify visit for feedback portal (public endpoint)
app.get('/api/visits/:visitId/verify-for-feedback', async (req, res) => {
  try {
    const { visitId } = req.params;
    
    const visit = await Visit.findOne({ visitId });
    
    if (!visit) {
      return res.json({ valid: false, error: 'Visit not found' });
    }
    
    // Check if visit already has feedback
    const existingFeedback = await Feedback.findOne({ visitId });
    if (existingFeedback) {
      return res.json({ valid: false, error: 'Feedback already submitted for this visit' });
    }
    
    // Check if visit is within feedback window (e.g., 7 days)
    const feedbackWindowDays = 7;
    const visitDate = new Date(visit.timestamp);
    const now = new Date();
    const daysSinceVisit = Math.floor((now - visitDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceVisit > feedbackWindowDays) {
      return res.json({ 
        valid: false, 
        error: `Feedback window has expired. Visits can only receive feedback within ${feedbackWindowDays} days.`
      });
    }
    
    res.json({
      valid: true,
      visit: {
        visitId: visit.visitId,
        timestamp: visit.timestamp,
        visitType: visit.visitType,
        services: visit.services
      }
    });
  } catch (error) {
    console.error('Visit verification for feedback error:', error);
    logger.error('Visit verification for feedback error:', error);
    res.json({ valid: false, error: 'Failed to verify visit' });
  }
});

// CHW Registration (public endpoint for self-registration)
app.post('/api/auth/chw/register', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      password,
      licenseNumber, 
      walletAddress, 
      organization, 
      region, 
      specialization 
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !password || !licenseNumber || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields: name, email, phone, password, licenseNumber, walletAddress' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    
    // Check for existing CHW with same email, license, or wallet
    const existingCHW = await CHW.findOne({
      $or: [
        { email: email.toLowerCase() },
        { licenseNumber },
        { walletAddress: walletAddress.toLowerCase() }
      ]
    });
    
    if (existingCHW) {
      if (existingCHW.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingCHW.licenseNumber === licenseNumber) {
        return res.status(400).json({ error: 'License number already registered' });
      }
      if (existingCHW.walletAddress === walletAddress.toLowerCase()) {
        return res.status(400).json({ error: 'Wallet address already registered' });
      }
    }
    
    // Generate CHW ID
    const chwId = `CHW-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const chw = new CHW({
      chwId,
      name,
      email: email.toLowerCase(),
      phone,
      password, // Will be hashed by the pre-save hook
      licenseNumber,
      walletAddress: walletAddress.toLowerCase(),
      organization,
      region,
      specialization,
      isVerified: false, // Requires admin verification
      isActive: true
    });
    
    await chw.save();
    
    // Generate JWT token
    const token = generateJWT({ 
      id: chw._id, 
      chwId: chw.chwId, 
      walletAddress: chw.walletAddress,
      role: 'chw' 
    });
    
    logger.info(`New CHW registered: ${chwId}`);
    
    res.status(201).json({
      message: 'Registration successful. Your account is pending verification.',
      token,
      user: {
        id: chw._id,
        chwId: chw.chwId,
        name: chw.name,
        email: chw.email,
        walletAddress: chw.walletAddress,
        isVerified: chw.isVerified,
        role: 'chw'
      }
    });
  } catch (error) {
    console.error('CHW registration error:', error);
    logger.error('CHW registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Password change for CHW
app.post('/api/auth/chw/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    
    const chw = await CHW.findById(req.user.id);
    if (!chw) {
      return res.status(404).json({ error: 'CHW not found' });
    }
    
    const isValidPassword = await chw.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    chw.password = newPassword; // Will be hashed by pre-save hook
    await chw.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get CHW profile
app.get('/api/chw/profile', authenticateToken, async (req, res) => {
  try {
    const chw = await CHW.findById(req.user.id).select('-password');
    
    if (!chw) {
      return res.status(404).json({ error: 'CHW not found' });
    }
    
    res.json({
      user: {
        id: chw._id,
        chwId: chw.chwId,
        name: chw.name,
        email: chw.email,
        phone: chw.phone,
        walletAddress: chw.walletAddress,
        organization: chw.organization,
        region: chw.region,
        specialization: chw.specialization,
        totalVisits: chw.totalVisits,
        isVerified: chw.isVerified,
        isActive: chw.isActive,
        registrationTime: chw.registrationTime,
        lastLogin: chw.lastLogin
      }
    });
  } catch (error) {
    console.error('Get CHW profile error:', error);
    logger.error('Get CHW profile error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Feedback Management Routes

// Submit patient feedback (public endpoint with OTP verification)
app.post('/api/feedback/submit', async (req, res) => {
  try {
    const { 
      visitId, 
      phoneNumber, 
      rating, 
      comments, 
      serviceReceived, 
      visitConfirmation, 
      chwPerformance, 
      reportIssues, 
      demographics 
    } = req.body;
    
    if (!visitId || !phoneNumber || !rating || !rating.overall) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Verify visit exists
    const visit = await Visit.findOne({ visitId });
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ visitId });
    if (existingFeedback) {
      return res.status(400).json({ error: 'Feedback already submitted for this visit' });
    }
    
    // Generate feedback ID and hash
    const feedbackId = `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const feedbackData = { visitId, rating, comments, timestamp: Date.now() };
    const feedbackHash = hashString(JSON.stringify(feedbackData));
    
    // Create feedback record
    const feedback = new Feedback({
      feedbackId,
      visitId,
      patientId: visit.patientId,
      feedbackHash,
      rating,
      comments,
      serviceReceived,
      visitConfirmation,
      chwPerformance,
      reportIssues,
      demographics,
      otpVerification: {
        phoneNumber,
        isVerified: false,
        attempts: 0
      },
      status: 'draft'
    });
    
    await feedback.save();
    
    // Update visit with feedback hash
    visit.hasFeedback = true;
    visit.feedbackHash = feedbackHash;
    await visit.save();
    
    res.json({
      message: 'Feedback submitted successfully',
      feedbackId,
      needsOTPVerification: true
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    logger.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Admin Routes (require admin authentication)

// Get dashboard statistics
app.get('/api/admin/dashboard/stats', authenticateAdmin, async (req, res) => {
  try {
    const [
      totalVisits,
      verifiedVisits,
      totalCHWs,
      activeCHWs,
      totalFeedbacks,
      avgRating,
      fraudAlerts
    ] = await Promise.all([
      Visit.countDocuments(),
      Visit.countDocuments({ isVerified: true }),
      CHW.countDocuments(),
      CHW.countDocuments({ isActive: true }),
      Feedback.countDocuments({ status: 'submitted' }),
      Feedback.aggregate([
        { $match: { status: 'submitted' } },
        { $group: { _id: null, avgRating: { $avg: '$rating.overall' } } }
      ]),
      Visit.countDocuments({ fraudScore: { $gte: 70 } })
    ]);
    
    res.json({
      totalVisits,
      verifiedVisits,
      totalCHWs,
      activeCHWs,
      totalFeedbacks,
      averageRating: avgRating[0]?.avgRating || 0,
      fraudAlerts,
      verificationRate: totalVisits > 0 ? (verifiedVisits / totalVisits * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
  }
});

// Get all CHWs (admin only)
app.get('/api/admin/chws', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('manage_chws')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { page = 1, limit = 20, status, region } = req.query;
    
    const filter = {};
    if (status) filter.isActive = status === 'active';
    if (region) filter.region = region;
    
    const chws = await CHW.find(filter)
      .select('-password')
      .sort({ registrationTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await CHW.countDocuments(filter);
    
    res.json({
      chws,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get CHWs error:', error);
    logger.error('Get CHWs error:', error);
    res.status(500).json({ error: 'Failed to retrieve CHWs' });
  }
});

// Register new CHW (admin only)
app.post('/api/admin/chws', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('manage_chws')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { 
      name, 
      email, 
      phone, 
      licenseNumber, 
      walletAddress, 
      organization, 
      region, 
      specialization 
    } = req.body;
    
    if (!name || !email || !licenseNumber || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate CHW ID
    const chwId = `CHW-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    
    const chw = new CHW({
      chwId,
      name,
      email: email.toLowerCase(),
      phone,
      password: tempPassword, // Will be hashed by the pre-save hook
      licenseNumber,
      walletAddress: walletAddress.toLowerCase(),
      organization,
      region,
      specialization
    });
    
    await chw.save();
    
    res.status(201).json({
      message: 'CHW registered successfully',
      chw: {
        chwId: chw.chwId,
        name: chw.name,
        email: chw.email,
        walletAddress: chw.walletAddress,
        temporaryPassword: tempPassword
      }
    });
  } catch (error) {
    console.error('CHW registration error:', error);
    logger.error('CHW registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    
    res.status(500).json({ error: 'Failed to register CHW' });
  }
});

// Update CHW (admin only)
app.patch('/api/admin/chws/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('manage_chws')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const allowedUpdates = ['name', 'phone', 'region', 'organization', 'specialization', 'isActive'];
    const updates = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    const chw = await CHW.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!chw) {
      return res.status(404).json({ error: 'CHW not found' });
    }
    
    res.json({
      message: 'CHW updated successfully',
      chw
    });
  } catch (error) {
    console.error('Update CHW error:', error);
    logger.error('Update CHW error:', error);
    res.status(500).json({ error: 'Failed to update CHW' });
  }
});

// Get single CHW (admin only)
app.get('/api/admin/chws/:id', authenticateAdmin, async (req, res) => {
  try {
    const chw = await CHW.findById(req.params.id).select('-password');
    
    if (!chw) {
      return res.status(404).json({ error: 'CHW not found' });
    }
    
    res.json({ chw });
  } catch (error) {
    console.error('Get CHW error:', error);
    logger.error('Get CHW error:', error);
    res.status(500).json({ error: 'Failed to retrieve CHW' });
  }
});

// Deactivate CHW (admin only)
app.delete('/api/admin/chws/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('manage_chws')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const chw = await CHW.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    
    if (!chw) {
      return res.status(404).json({ error: 'CHW not found' });
    }
    
    res.json({
      message: 'CHW deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate CHW error:', error);
    logger.error('Deactivate CHW error:', error);
    res.status(500).json({ error: 'Failed to deactivate CHW' });
  }
});

// =============================================
// PATIENT MANAGEMENT (ADMIN)
// =============================================

// Get all patients (admin only)
app.get('/api/admin/patients', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search,
      region,
      isActive
    } = req.query;
    
    const filter = {};
    
    if (search) {
      filter.$or = [
        { patientId: { $regex: search, $options: 'i' } },
        { 'location.region': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (region) filter['location.region'] = region;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const patients = await Patient.find(filter)
      .select('-hashedPatientId')
      .sort({ enrollmentDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Patient.countDocuments(filter);
    
    res.json({
      patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get patients error:', error);
    logger.error('Get patients error:', error);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
});

// Get patient stats (admin only)
app.get('/api/admin/patients/stats', authenticateAdmin, async (req, res) => {
  try {
    const total = await Patient.countDocuments();
    const active = await Patient.countDocuments({ isActive: true });
    const withNfc = await Patient.countDocuments({ 'nfcTag.isActive': true });
    
    // Patients who haven't been visited in 30+ days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const needsVisit = await Patient.countDocuments({
      isActive: true,
      $or: [
        { lastVisitDate: { $lt: thirtyDaysAgo } },
        { lastVisitDate: { $exists: false } }
      ]
    });
    
    res.json({
      total,
      active,
      withNfc,
      needsVisit
    });
  } catch (error) {
    console.error('Get patient stats error:', error);
    logger.error('Get patient stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve patient stats' });
  }
});

// Register new patient (admin only)
app.post('/api/admin/patients', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('manage_chws')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { 
      patientId, 
      demographics, 
      location, 
      contactInfo, 
      consentGiven 
    } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    
    // Generate hashed patient ID for privacy
    const crypto = require('crypto');
    const hashedPatientId = crypto.createHash('sha256').update(patientId).digest('hex');
    
    // Generate QR code data
    const qrData = crypto.randomBytes(32).toString('hex');
    
    const patient = new Patient({
      patientId,
      hashedPatientId,
      demographics,
      location,
      contactInfo,
      consentGiven: consentGiven || false,
      consentDate: consentGiven ? new Date() : null,
      qrCode: {
        data: qrData,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true
      }
    });
    
    await patient.save();
    
    res.status(201).json({
      message: 'Patient registered successfully',
      patient: {
        patientId: patient.patientId,
        qrCode: patient.qrCode.data,
        enrollmentDate: patient.enrollmentDate
      }
    });
  } catch (error) {
    console.error('Patient registration error:', error);
    logger.error('Patient registration error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    
    res.status(500).json({ error: 'Failed to register patient' });
  }
});

// Get single patient (admin only)
app.get('/api/admin/patients/:id', authenticateAdmin, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select('-hashedPatientId');
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({ patient });
  } catch (error) {
    console.error('Get patient error:', error);
    logger.error('Get patient error:', error);
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

// Update patient (admin only)
app.patch('/api/admin/patients/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('manage_chws')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const allowedUpdates = ['demographics', 'location', 'contactInfo', 'consentGiven', 'isActive', 'preferences'];
    const updates = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-hashedPatientId');
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Update patient error:', error);
    logger.error('Update patient error:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Deactivate patient (admin only)
app.delete('/api/admin/patients/:id', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('manage_chws')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          isActive: false,
          'qrCode.isActive': false,
          'nfcTag.isActive': false
        }
      },
      { new: true }
    );
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({
      message: 'Patient deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate patient error:', error);
    logger.error('Deactivate patient error:', error);
    res.status(500).json({ error: 'Failed to deactivate patient' });
  }
});

// Generate QR code for patient (admin only)
app.post('/api/admin/patients/:id/generate-qr', authenticateAdmin, async (req, res) => {
  try {
    const crypto = require('crypto');
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    // Generate new QR code data
    const qrData = crypto.randomBytes(32).toString('hex');
    
    patient.qrCode = {
      data: qrData,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      isActive: true
    };
    
    await patient.save();
    
    // Generate QR code image (base64)
    const QRCode = require('qrcode');
    let qrCodeImage = null;
    
    try {
      qrCodeImage = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (qrError) {
      console.error('QR code generation error:', qrError);
      // Continue without the image
    }
    
    res.json({
      message: 'QR code generated successfully',
      qrData,
      qrCode: qrCodeImage,
      expiresAt: patient.qrCode.expiresAt
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    logger.error('Generate QR error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Assign NFC tag to patient (admin only)
app.post('/api/admin/patients/:id/assign-nfc', authenticateAdmin, async (req, res) => {
  try {
    const { nfcUid } = req.body;
    
    if (!nfcUid) {
      return res.status(400).json({ error: 'NFC UID is required' });
    }
    
    // Check if NFC tag is already assigned
    const existingPatient = await Patient.findOne({ 'nfcTag.uid': nfcUid, 'nfcTag.isActive': true });
    if (existingPatient) {
      return res.status(400).json({ error: 'NFC tag is already assigned to another patient' });
    }
    
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'nfcTag.uid': nfcUid,
          'nfcTag.isActive': true
        }
      },
      { new: true }
    );
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({
      message: 'NFC tag assigned successfully',
      patient: {
        patientId: patient.patientId,
        nfcTag: patient.nfcTag
      }
    });
  } catch (error) {
    console.error('Assign NFC error:', error);
    logger.error('Assign NFC error:', error);
    res.status(500).json({ error: 'Failed to assign NFC tag' });
  }
});

// Verify NFC tag
app.post('/api/patients/verify-nfc', authenticateToken, async (req, res) => {
  try {
    const { nfcUid } = req.body;
    
    if (!nfcUid) {
      return res.status(400).json({ error: 'NFC UID is required' });
    }
    
    const patient = await Patient.findByNFC(nfcUid);
    
    if (!patient) {
      return res.status(404).json({ 
        valid: false, 
        error: 'NFC tag not found or inactive' 
      });
    }
    
    res.json({
      valid: true,
      patient: {
        patientId: patient.patientId,
        demographics: patient.demographics,
        location: patient.location,
        totalVisits: patient.totalVisits,
        lastVisitDate: patient.lastVisitDate
      }
    });
  } catch (error) {
    console.error('Verify NFC error:', error);
    logger.error('Verify NFC error:', error);
    res.status(500).json({ error: 'Failed to verify NFC tag' });
  }
});

// =============================================
// END PATIENT MANAGEMENT
// =============================================

// Get all visits (admin only)
app.get('/api/admin/visits', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('view_analytics')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { 
      page = 1, 
      limit = 20, 
      status, 
      chwId, 
      startDate, 
      endDate,
      fraudScore 
    } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (chwId) filter.chwId = chwId;
    if (fraudScore) filter.fraudScore = { $gte: parseInt(fraudScore) };
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const visits = await Visit.find(filter)
      .select('-signature -deviceInfo')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Visit.countDocuments(filter);
    
    res.json({
      visits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin visits error:', error);
    logger.error('Get admin visits error:', error);
    res.status(500).json({ error: 'Failed to retrieve visits' });
  }
});

// Verify visit (admin only)
app.post('/api/admin/visits/:visitId/verify', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('verify_visits')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { visitId } = req.params;
    const { notes } = req.body;
    
    const visit = await Visit.findOne({ visitId });
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    visit.isVerified = true;
    visit.verifiedBy = req.admin.adminId;
    visit.verifiedAt = new Date();
    visit.status = 'verified';
    
    if (notes) {
      visit.notes = visit.notes ? `${visit.notes}\n\nVerification Notes: ${notes}` : `Verification Notes: ${notes}`;
    }
    
    await visit.save();
    
    res.json({
      message: 'Visit verified successfully',
      visit: {
        visitId: visit.visitId,
        isVerified: visit.isVerified,
        verifiedBy: visit.verifiedBy,
        verifiedAt: visit.verifiedAt
      }
    });
  } catch (error) {
    console.error('Visit verification error:', error);
    logger.error('Visit verification error:', error);
    res.status(500).json({ error: 'Failed to verify visit' });
  }
});

// Verify visit on blockchain (admin only)
app.get('/api/admin/visits/:visitId/blockchain-status', authenticateAdmin, async (req, res) => {
  try {
    const { visitId } = req.params;
    
    const visit = await Visit.findOne({ visitId });
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    let blockchainStatus = {
      isOnBlockchain: false,
      blockNumber: null,
      transactionHash: null,
      blockTimestamp: null,
      contractVerified: false
    };
    
    // Check if blockchain is connected
    if (contract && visit.blockchainTxHash) {
      try {
        // Get transaction receipt
        const txReceipt = await provider.getTransactionReceipt(visit.blockchainTxHash);
        if (txReceipt) {
          const block = await provider.getBlock(txReceipt.blockNumber);
          blockchainStatus = {
            isOnBlockchain: true,
            blockNumber: txReceipt.blockNumber,
            transactionHash: visit.blockchainTxHash,
            blockTimestamp: block ? new Date(block.timestamp * 1000).toISOString() : null,
            contractVerified: txReceipt.status === 1,
            gasUsed: txReceipt.gasUsed?.toString()
          };
        }
      } catch (bcError) {
        console.error('Blockchain query error:', bcError);
        blockchainStatus.error = 'Failed to query blockchain';
      }
    } else if (!contract) {
      blockchainStatus.error = 'Blockchain not connected';
    } else if (!visit.blockchainTxHash) {
      blockchainStatus.error = 'Visit not recorded on blockchain';
    }
    
    res.json({
      visitId: visit.visitId,
      databaseStatus: {
        isVerified: visit.isVerified,
        verifiedBy: visit.verifiedBy,
        verifiedAt: visit.verifiedAt,
        status: visit.status
      },
      blockchainStatus
    });
  } catch (error) {
    console.error('Blockchain status check error:', error);
    logger.error('Blockchain status check error:', error);
    res.status(500).json({ error: 'Failed to check blockchain status' });
  }
});

// Record visit on blockchain (admin only)
app.post('/api/admin/visits/:visitId/record-blockchain', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('verify_visits')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { visitId } = req.params;
    
    const visit = await Visit.findOne({ visitId }).populate('chw');
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    if (!contract) {
      return res.status(503).json({ error: 'Blockchain not connected' });
    }
    
    if (visit.blockchainTxHash) {
      return res.status(400).json({ error: 'Visit already recorded on blockchain' });
    }
    
    try {
      // Create a wallet from private key for signing
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractWithSigner = contract.connect(wallet);
      
      // Prepare visit data
      const patientId = visit.patientId || 'unknown';
      const location = visit.location?.coordinates 
        ? `${visit.location.coordinates.latitude},${visit.location.coordinates.longitude}`
        : '0,0';
      const signature = ethers.toUtf8Bytes(visit.chwSignature || '');
      const visitTimestamp = Math.floor(new Date(visit.timestamp).getTime() / 1000);
      
      // Log the visit to blockchain
      const tx = await contractWithSigner.logVisit(
        patientId,
        location,
        signature,
        visitTimestamp
      );
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Update visit with blockchain info
      visit.blockchainTxHash = receipt.hash;
      visit.blockNumber = receipt.blockNumber;
      await visit.save();
      
      res.json({
        message: 'Visit recorded on blockchain successfully',
        transaction: {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString()
        }
      });
    } catch (bcError) {
      console.error('Blockchain recording error:', bcError);
      throw new Error('Failed to record on blockchain: ' + bcError.message);
    }
  } catch (error) {
    console.error('Blockchain recording error:', error);
    logger.error('Blockchain recording error:', error);
    res.status(500).json({ error: error.message || 'Failed to record visit on blockchain' });
  }
});

// Analytics Routes

// Get analytics data
app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('view_analytics')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    // Get visits by date
    const visitsByDate = await Visit.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp"
            }
          },
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: ["$isVerified", 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get visits by CHW
    const visitsByCHW = await Visit.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$chwId",
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: ["$isVerified", 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get visits by region (from CHW data)
    const visitsByRegion = await Visit.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'chws',
          localField: 'chwId',
          foreignField: 'chwId',
          as: 'chw'
        }
      },
      { $unwind: '$chw' },
      {
        $group: {
          _id: "$chw.region",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get feedback ratings distribution
    const ratingDistribution = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'submitted'
        }
      },
      {
        $group: {
          _id: "$rating.overall",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      timeframe,
      dateRange: { startDate, endDate },
      visitsByDate,
      visitsByCHW,
      visitsByRegion,
      ratingDistribution
    });
  } catch (error) {
    console.error('Analytics error:', error);
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// Fraud Detection Routes

// Get fraud detection alerts
app.get('/api/admin/fraud-alerts', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('fraud_detection')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Implement fraud detection algorithms
    const alerts = [];
    
    // Rule 1: Detect CHWs with unusually high visit frequency
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const highFrequencyVisits = await Visit.aggregate([
      {
        $match: {
          timestamp: { $gte: oneHourAgo }
        }
      },
      {
        $group: {
          _id: "$chwId",
          visitCount: { $sum: 1 },
          visits: { $push: "$$ROOT" }
        }
      },
      {
        $match: {
          visitCount: { $gt: 5 } // More than 5 visits in 1 hour
        }
      }
    ]);
    
    highFrequencyVisits.forEach(chw => {
      alerts.push({
        id: `FREQ_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'High Visit Frequency',
        severity: 'medium',
        chwId: chw._id,
        description: `CHW has ${chw.visitCount} visits in the last hour`,
        details: {
          visitCount: chw.visitCount,
          timeWindow: '1 hour'
        },
        timestamp: new Date(),
        status: 'pending'
      });
    });
    
    // Rule 2: Detect location anomalies
    const recentVisits = await Visit.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 });
    
    // Group visits by CHW and detect impossible travel distances
    const visitsByCHW = {};
    recentVisits.forEach(visit => {
      if (!visitsByCHW[visit.chwId]) {
        visitsByCHW[visit.chwId] = [];
      }
      visitsByCHW[visit.chwId].push(visit);
    });
    
    Object.entries(visitsByCHW).forEach(([chwId, visits]) => {
      for (let i = 0; i < visits.length - 1; i++) {
        const visit1 = visits[i];
        const visit2 = visits[i + 1];
        
        const timeDiff = Math.abs(visit1.timestamp - visit2.timestamp) / (1000 * 60); // minutes
        
        if (timeDiff < 60) { // Within 1 hour
          const lat1 = visit1.location.coordinates.latitude;
          const lng1 = visit1.location.coordinates.longitude;
          const lat2 = visit2.location.coordinates.latitude;
          const lng2 = visit2.location.coordinates.longitude;
          
          // Calculate distance using Haversine formula (simplified)
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          // Flag if distance > 50km in < 60 minutes (unrealistic travel)
          if (distance > 50) {
            alerts.push({
              id: `LOC_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              type: 'Location Anomaly',
              severity: 'high',
              chwId,
              description: `Visits ${distance.toFixed(1)}km apart within ${timeDiff.toFixed(1)} minutes`,
              details: {
                distance: distance.toFixed(1),
                timeInterval: timeDiff.toFixed(1),
                visit1: visit1.visitId,
                visit2: visit2.visitId
              },
              timestamp: new Date(),
              status: 'pending'
            });
          }
        }
      }
    });
    
    // Rule 3: Detect visits with low feedback scores
    const lowRatedVisits = await Feedback.aggregate([
      {
        $match: {
          'rating.overall': { $lte: 2 },
          status: 'submitted'
        }
      },
      {
        $lookup: {
          from: 'visits',
          localField: 'visitId',
          foreignField: 'visitId',
          as: 'visit'
        }
      },
      { $unwind: '$visit' },
      {
        $group: {
          _id: '$visit.chwId',
          lowRatingCount: { $sum: 1 },
          avgRating: { $avg: '$rating.overall' }
        }
      },
      {
        $match: {
          lowRatingCount: { $gte: 3 } // 3 or more low ratings
        }
      }
    ]);
    
    lowRatedVisits.forEach(chw => {
      alerts.push({
        id: `RATING_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: 'Low Feedback Ratings',
        severity: 'medium',
        chwId: chw._id,
        description: `CHW has ${chw.lowRatingCount} visits with ratings ≤2 stars`,
        details: {
          lowRatingCount: chw.lowRatingCount,
          averageRating: chw.avgRating.toFixed(1)
        },
        timestamp: new Date(),
        status: 'pending'
      });
    });
    
    res.json({
      alerts: alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    });
  } catch (error) {
    console.error('Fraud detection error:', error);
    logger.error('Fraud detection error:', error);
    res.status(500).json({ error: 'Failed to perform fraud detection' });
  }
});

// Resolve fraud alert
app.post('/api/admin/fraud-alerts/:alertId/resolve', authenticateAdmin, async (req, res) => {
  try {
    if (!req.admin.hasPermission('fraud_detection')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const { alertId } = req.params;
    const { resolution, resolvedBy, notes } = req.body;
    
    // In a production system, you would store alerts in a database
    // For now, we'll just acknowledge the resolution
    
    logger.info(`Fraud alert ${alertId} resolved by ${resolvedBy || req.admin.adminId}: ${resolution}`);
    
    res.json({
      message: 'Alert resolved successfully',
      alert: {
        id: alertId,
        status: 'resolved',
        resolution,
        resolvedBy: resolvedBy || req.admin.adminId,
        resolvedAt: new Date(),
        notes
      }
    });
  } catch (error) {
    console.error('Resolve fraud alert error:', error);
    logger.error('Resolve fraud alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Health Visit Backend API running on port ${PORT}`);
  logger.info(`Health Visit Backend API running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/auth/chw/login');
  console.log('  POST /api/auth/admin/login');
  console.log('  POST /api/patients/generate-tag');
  console.log('  POST /api/patients/verify-tag');
  console.log('  POST /api/visits');
  console.log('  GET  /api/visits');
  console.log('  POST /api/feedback/submit');
  console.log('  GET  /api/admin/dashboard/stats');
  console.log('  GET  /api/admin/chws');
  console.log('  POST /api/admin/chws');
  console.log('  GET  /api/admin/visits');
  console.log('  GET  /api/admin/analytics');
  console.log('  GET  /api/admin/fraud-alerts');
});

module.exports = app;
