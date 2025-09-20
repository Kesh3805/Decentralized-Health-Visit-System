const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  visitId: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true,
    trim: true
  },
  chwId: {
    type: String,
    required: true,
    ref: 'CHW'
  },
  chwAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  blockchainTxHash: {
    type: String,
    trim: true
  },
  visitHash: {
    type: String,
    required: true
  },
  location: {
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    },
    address: {
      type: String,
      trim: true
    },
    accuracy: {
      type: Number
    }
  },
  timestamp: {
    type: Date,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  visitType: {
    type: String,
    enum: ['routine_checkup', 'vaccination', 'emergency', 'follow_up', 'education', 'other'],
    default: 'routine_checkup'
  },
  services: [{
    type: String,
    enum: ['health_screening', 'medication_delivery', 'education', 'vaccination', 'consultation', 'emergency_care']
  }],
  duration: {
    type: Number, // in minutes
    min: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: String,
    trim: true
  },
  verifiedAt: {
    type: Date
  },
  hasFeedback: {
    type: Boolean,
    default: false
  },
  feedbackHash: {
    type: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  qrCode: {
    type: String, // QR code data that was scanned
    required: true
  },
  deviceInfo: {
    platform: String,
    version: String,
    userAgent: String
  },
  fraudScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  fraudFlags: [{
    type: String,
    reason: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'verified', 'flagged', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
visitSchema.index({ visitId: 1 });
visitSchema.index({ patientId: 1 });
visitSchema.index({ chwId: 1 });
visitSchema.index({ timestamp: -1 });
visitSchema.index({ 'location.coordinates.latitude': 1, 'location.coordinates.longitude': 1 });
visitSchema.index({ status: 1 });
visitSchema.index({ isVerified: 1 });
visitSchema.index({ fraudScore: -1 });

// GeoJSON index for location-based queries
visitSchema.index({ 'location.coordinates': '2dsphere' });

// Static method to find visits by CHW
visitSchema.statics.findByCHW = function(chwId, limit = 50, skip = 0) {
  return this.find({ chwId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('chwId', 'name chwId');
};

// Static method to find visits by date range
visitSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

// Static method to find suspicious visits
visitSchema.statics.findSuspicious = function(threshold = 70) {
  return this.find({
    $or: [
      { fraudScore: { $gte: threshold } },
      { 'fraudFlags.0': { $exists: true } }
    ]
  }).sort({ fraudScore: -1 });
};

// Instance method to calculate fraud score
visitSchema.methods.calculateFraudScore = function() {
  let score = 0;
  
  // Add score based on fraud flags
  if (this.fraudFlags && this.fraudFlags.length > 0) {
    this.fraudFlags.forEach(flag => {
      switch (flag.severity) {
        case 'critical': score += 40; break;
        case 'high': score += 25; break;
        case 'medium': score += 15; break;
        case 'low': score += 5; break;
      }
    });
  }
  
  // Cap at 100
  this.fraudScore = Math.min(score, 100);
  return this.fraudScore;
};

// Instance method to add fraud flag
visitSchema.methods.addFraudFlag = function(type, reason, severity = 'medium') {
  this.fraudFlags.push({
    type,
    reason,
    severity
  });
  this.calculateFraudScore();
  return this.save();
};

module.exports = mongoose.model('Visit', visitSchema);