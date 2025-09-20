const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  hashedPatientId: {
    type: String,
    required: true,
    unique: true
  },
  demographics: {
    ageGroup: {
      type: String,
      enum: ['0-5', '6-17', '18-35', '36-50', '51-65', '65+']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    }
  },
  location: {
    region: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contactInfo: {
    phone: {
      type: String,
      trim: true
    },
    alternateContact: {
      type: String,
      trim: true
    }
  },
  qrCode: {
    data: {
      type: String,
      required: true,
      unique: true
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  nfcTag: {
    uid: {
      type: String,
      unique: true,
      sparse: true
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  lastVisitDate: {
    type: Date
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  consentGiven: {
    type: Boolean,
    required: true,
    default: false
  },
  consentDate: {
    type: Date
  },
  emergencyContacts: [{
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  }],
  medicalHistory: {
    chronicConditions: [{
      condition: String,
      diagnosedDate: Date,
      status: {
        type: String,
        enum: ['active', 'resolved', 'controlled']
      }
    }],
    allergies: [{
      allergen: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe']
      }
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date,
      isActive: {
        type: Boolean,
        default: true
      }
    }]
  },
  preferences: {
    preferredLanguage: {
      type: String,
      default: 'english'
    },
    communicationMethod: {
      type: String,
      enum: ['sms', 'call', 'in_person'],
      default: 'sms'
    },
    reminderFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'as_needed'],
      default: 'weekly'
    }
  }
}, {
  timestamps: true
});

// Indexes
patientSchema.index({ patientId: 1 });
patientSchema.index({ hashedPatientId: 1 });
patientSchema.index({ 'qrCode.data': 1 });
patientSchema.index({ 'nfcTag.uid': 1 });
patientSchema.index({ 'location.region': 1 });
patientSchema.index({ lastVisitDate: -1 });
patientSchema.index({ enrollmentDate: -1 });

// Static method to find by QR code
patientSchema.statics.findByQRCode = function(qrData) {
  return this.findOne({ 
    'qrCode.data': qrData, 
    'qrCode.isActive': true,
    isActive: true 
  });
};

// Static method to find by NFC
patientSchema.statics.findByNFC = function(nfcUid) {
  return this.findOne({ 
    'nfcTag.uid': nfcUid, 
    'nfcTag.isActive': true,
    isActive: true 
  });
};

// Static method to find patients due for visit
patientSchema.statics.findDueForVisit = function(daysSinceLastVisit = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastVisit);
  
  return this.find({
    $or: [
      { lastVisitDate: { $lt: cutoffDate } },
      { lastVisitDate: { $exists: false } }
    ],
    isActive: true
  });
};

// Instance method to update visit count
patientSchema.methods.recordVisit = function() {
  this.totalVisits += 1;
  this.lastVisitDate = new Date();
  return this.save();
};

// Instance method to generate new QR code
patientSchema.methods.generateNewQRCode = function() {
  const crypto = require('crypto');
  
  // Generate new QR code data
  const qrData = crypto.randomBytes(32).toString('hex');
  
  this.qrCode = {
    data: qrData,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    isActive: true
  };
  
  return this.save();
};

// Instance method to deactivate old QR code
patientSchema.methods.deactivateQRCode = function() {
  this.qrCode.isActive = false;
  return this.save();
};

// Virtual for anonymized patient data
patientSchema.virtual('anonymizedData').get(function() {
  return {
    hashedId: this.hashedPatientId,
    demographics: this.demographics,
    location: {
      region: this.location.region,
      district: this.location.district
    },
    totalVisits: this.totalVisits,
    lastVisitDate: this.lastVisitDate,
    enrollmentDate: this.enrollmentDate
  };
});

module.exports = mongoose.model('Patient', patientSchema);