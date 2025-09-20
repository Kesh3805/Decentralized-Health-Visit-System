const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const chwSchema = new mongoose.Schema({
  chwId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  registrationTime: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  organization: {
    type: String,
    trim: true
  },
  region: {
    type: String,
    trim: true
  },
  specialization: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String
  },
  verificationDocuments: [{
    documentType: String,
    documentUrl: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
chwSchema.index({ chwId: 1 });
chwSchema.index({ email: 1 });
chwSchema.index({ walletAddress: 1 });
chwSchema.index({ region: 1 });

// Hash password before saving
chwSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
chwSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
chwSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find active CHWs
chwSchema.statics.findActive = function() {
  return this.find({ isActive: true, isVerified: true });
};

// Static method to find CHWs by region
chwSchema.statics.findByRegion = function(region) {
  return this.find({ region, isActive: true, isVerified: true });
};

module.exports = mongoose.model('CHW', chwSchema);