require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const { ethers } = require('ethers');
const winston = require('winston');
const axios = require('axios');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

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

// Twilio client initialization
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  logger.info('Twilio client initialized');
} else {
  logger.warn('Twilio not configured, SMS features disabled');
}

// In-memory storage for demo purposes
// In a real application, you would use a database
const otpStorage = new Map(); // { phoneNumber: { otp, expiresAt, visitId } }
const feedbackStorage = new Map(); // { visitId: { rating, comment, timestamp } }

// Utility functions
const verifyVisitWithBackend = async (visitId) => {
  try {
    const response = await axios.get(`${BACKEND_API_URL}/api/visits/${visitId}/verify-for-feedback`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to verify visit with backend:', error.message);
    return { valid: false, error: 'Unable to verify visit' };
  }
};

const submitFeedbackToBackend = async (feedbackData) => {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/api/feedback/submit`, feedbackData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to submit feedback to backend:', error.message);
    return { success: false, error: 'Unable to submit feedback to main system' };
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Home page
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Health Visit Feedback',
    message: 'Provide feedback for your recent health visit'
  });
});

// Request OTP page
app.get('/request-otp', (req, res) => {
  res.render('request-otp', { 
    title: 'Request OTP',
    error: null,
    success: null
  });
});

// Send OTP
app.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, visitId } = req.body;
    
    if (!phoneNumber || !visitId) {
      return res.render('request-otp', { 
        title: 'Request OTP',
        error: 'Phone number and visit ID are required',
        success: null
      });
    }
    
    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.render('request-otp', { 
        title: 'Request OTP',
        error: 'Invalid phone number format',
        success: null
      });
    }
    
    // Verify visit exists and is eligible for feedback
    const visitVerification = await verifyVisitWithBackend(visitId);
    if (!visitVerification.valid) {
      return res.render('request-otp', { 
        title: 'Request OTP',
        error: visitVerification.error || 'Visit not found or not eligible for feedback',
        success: null
      });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10-minute expiration
    otpStorage.set(phoneNumber, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      visitId,
      visitData: visitVerification.visit
    });
    
    // Send OTP via SMS if Twilio is configured
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      try {
        await twilioClient.messages.create({
          body: `Your Health Visit feedback verification code is: ${otp}. Valid for 10 minutes. Visit ID: ${visitId}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        
        logger.info(`OTP sent to ${phoneNumber} for visit ${visitId}`);
      } catch (error) {
        logger.error('Twilio error:', error);
        return res.render('request-otp', { 
          title: 'Request OTP',
          error: 'Failed to send SMS. Please check your phone number and try again.',
          success: null
        });
      }
    } else {
      // For demo purposes, log OTP to console
      console.log(`DEMO: OTP for ${phoneNumber} (Visit: ${visitId}) is ${otp}`);
      logger.info(`DEMO OTP generated for ${phoneNumber} visit ${visitId}: ${otp}`);
    }
    
    // Redirect to verification page
    res.render('verify-otp', { 
      title: 'Verify OTP',
      phoneNumber,
      visitId,
      error: null,
      message: twilioClient ? 'OTP sent to your phone' : 'Demo mode: Check console for OTP'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    logger.error('Send OTP error:', error);
    res.render('request-otp', { 
      title: 'Request OTP',
      error: 'Failed to process request. Please try again.',
      success: null
    });
  }
});

// Verify OTP page
app.get('/verify-otp', (req, res) => {
  const { phoneNumber, visitId } = req.query;
  res.render('verify-otp', { 
    title: 'Verify OTP',
    phoneNumber: phoneNumber || '',
    visitId: visitId || '',
    error: null
  });
});

// Verify OTP
app.post('/verify-otp', (req, res) => {
  try {
    const { phoneNumber, otp, visitId } = req.body;
    
    if (!phoneNumber || !otp || !visitId) {
      return res.render('verify-otp', { 
        title: 'Verify OTP',
        phoneNumber,
        visitId,
        error: 'All fields are required'
      });
    }
    
    // Check if OTP exists and is valid
    const storedOtp = otpStorage.get(phoneNumber);
    
    if (!storedOtp) {
      return res.render('verify-otp', { 
        title: 'Verify OTP',
        phoneNumber,
        visitId,
        error: 'No OTP found for this number. Please request a new one.'
      });
    }
    
    if (storedOtp.expiresAt < Date.now()) {
      otpStorage.delete(phoneNumber);
      return res.render('verify-otp', { 
        title: 'Verify OTP',
        phoneNumber,
        visitId,
        error: 'OTP has expired. Please request a new one.'
      });
    }
    
    if (storedOtp.otp !== otp) {
      return res.render('verify-otp', { 
        title: 'Verify OTP',
        phoneNumber,
        visitId,
        error: 'Invalid OTP. Please try again.'
      });
    }
    
    // OTP is valid, remove it
    otpStorage.delete(phoneNumber);
    
    // Redirect to feedback form
    res.render('feedback', { 
      title: 'Visit Feedback',
      visitId,
      phoneNumber,
      error: null
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    logger.error('Verify OTP error:', error);
    res.render('verify-otp', { 
      title: 'Verify OTP',
      phoneNumber: req.body?.phoneNumber || '',
      visitId: req.body?.visitId || '',
      error: 'Failed to verify OTP. Please try again.'
    });
  }
});

// Submit feedback
app.post('/submit-feedback', async (req, res) => {
  try {
    const { visitId, rating, comment, phoneNumber } = req.body;
    
    if (!visitId || !rating) {
      return res.render('feedback', { 
        title: 'Visit Feedback',
        visitId: visitId || '',
        phoneNumber: phoneNumber || '',
        error: 'Visit ID and rating are required'
      });
    }
    
    // Validate rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.render('feedback', { 
        title: 'Visit Feedback',
        visitId,
        phoneNumber,
        error: 'Rating must be between 1 and 5'
      });
    }
    
    // Prepare feedback data
    const feedbackData = {
      visitId,
      rating: ratingNum,
      comment: comment || '',
      phoneNumber: phoneNumber || '',
      timestamp: new Date().toISOString(),
      source: 'feedback_portal'
    };
    
    // Store feedback locally
    feedbackStorage.set(visitId, feedbackData);
    
    // Submit to main backend
    const backendResult = await submitFeedbackToBackend(feedbackData);
    
    if (!backendResult.success) {
      logger.warn(`Feedback stored locally but failed to sync with backend: ${backendResult.error}`);
      // Still show success to user, but log the sync issue
    }
    
    // Hash feedback data for blockchain storage
    const feedbackString = JSON.stringify({
      visitId,
      rating: ratingNum,
      comment: comment || '',
      timestamp: feedbackData.timestamp
    });
    
    const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes(feedbackString));
    
    logger.info(`Feedback submitted for visit ${visitId}: ${ratingNum} stars, hash: ${feedbackHash}`);
    
    res.render('success', { 
      title: 'Feedback Submitted',
      visitId,
      rating: ratingNum,
      feedbackHash,
      backendSynced: backendResult.success
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    logger.error('Submit feedback error:', error);
    res.render('feedback', { 
      title: 'Visit Feedback',
      visitId: req.body?.visitId || '',
      phoneNumber: req.body?.phoneNumber || '',
      error: 'Failed to submit feedback. Please try again.'
    });
  }
});

// View feedback (for demo purposes)
app.get('/feedback/:visitId', (req, res) => {
  try {
    const { visitId } = req.params;
    const feedback = feedbackStorage.get(visitId);
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    
    res.json(feedback);
  } catch (error) {
    console.error('View feedback error:', error);
    logger.error('View feedback error:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Health Visit Feedback Portal running on port ${PORT}`);
  logger.info(`Health Visit Feedback Portal running on port ${PORT}`);
});

module.exports = app;
