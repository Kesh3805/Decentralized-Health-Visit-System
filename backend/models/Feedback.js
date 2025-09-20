const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  feedbackId: {
    type: String,
    required: true,
    unique: true
  },
  visitId: {
    type: String,
    required: true,
    ref: 'Visit'
  },
  patientId: {
    type: String,
    required: true
  },
  feedbackHash: {
    type: String,
    required: true,
    unique: true
  },
  rating: {
    overall: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    categories: {
      professionalism: {
        type: Number,
        min: 1,
        max: 5
      },
      communication: {
        type: Number,
        min: 1,
        max: 5
      },
      serviceQuality: {
        type: Number,
        min: 1,
        max: 5
      },
      timeliness: {
        type: Number,
        min: 1,
        max: 5
      },
      satisfaction: {
        type: Number,
        min: 1,
        max: 5
      }
    }
  },
  comments: {
    positive: {
      type: String,
      trim: true,
      maxlength: 500
    },
    improvement: {
      type: String,
      trim: true,
      maxlength: 500
    },
    general: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  serviceReceived: [{
    type: String,
    enum: ['health_screening', 'medication_delivery', 'education', 'vaccination', 'consultation', 'emergency_care', 'other']
  }],
  visitConfirmation: {
    wasVisitMade: {
      type: Boolean,
      required: true
    },
    visitDuration: {
      type: String,
      enum: ['under_15_min', '15_30_min', '30_60_min', 'over_60_min']
    },
    servicesMatched: {
      type: Boolean // Did received services match what was planned
    }
  },
  chwPerformance: {
    arrivalTime: {
      type: String,
      enum: ['early', 'on_time', 'slightly_late', 'very_late']
    },
    preparedness: {
      type: Number,
      min: 1,
      max: 5
    },
    followUpNeeded: {
      type: Boolean
    },
    followUpProvided: {
      type: Boolean
    }
  },
  reportIssues: {
    hasComplaint: {
      type: Boolean,
      default: false
    },
    complaintType: {
      type: String,
      enum: ['service_quality', 'unprofessional_behavior', 'missing_services', 'safety_concern', 'billing', 'other']
    },
    complaintDetails: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  },
  demographics: {
    ageGroup: {
      type: String,
      enum: ['under_18', '18_35', '36_50', '51_65', 'over_65']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    educationLevel: {
      type: String,
      enum: ['no_formal', 'primary', 'secondary', 'tertiary', 'prefer_not_to_say']
    }
  },
  submissionMethod: {
    type: String,
    enum: ['web', 'sms', 'call', 'in_person'],
    default: 'web'
  },
  deviceInfo: {
    platform: String,
    browser: String,
    userAgent: String
  },
  otpVerification: {
    phoneNumber: {
      type: String,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date
    },
    attempts: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'resolved'],
    default: 'draft'
  },
  reviewedBy: {
    type: String
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    trim: true
  },
  flagged: {
    isFlagged: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String
    },
    flaggedBy: {
      type: String
    },
    flaggedAt: {
      type: Date
    }
  },
  followUp: {
    required: {
      type: Boolean,
      default: false
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes
feedbackSchema.index({ feedbackId: 1 });
feedbackSchema.index({ visitId: 1 });
feedbackSchema.index({ patientId: 1 });
feedbackSchema.index({ feedbackHash: 1 });
feedbackSchema.index({ 'rating.overall': -1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ 'otpVerification.phoneNumber': 1 });

// Static method to find by visit
feedbackSchema.statics.findByVisit = function(visitId) {
  return this.findOne({ visitId });
};

// Static method to find feedback by rating range
feedbackSchema.statics.findByRatingRange = function(minRating, maxRating) {
  return this.find({
    'rating.overall': {
      $gte: minRating,
      $lte: maxRating
    }
  }).sort({ createdAt: -1 });
};

// Static method to find feedback with complaints
feedbackSchema.statics.findWithComplaints = function() {
  return this.find({
    'reportIssues.hasComplaint': true
  }).sort({ createdAt: -1 });
};

// Static method to get average ratings
feedbackSchema.statics.getAverageRatings = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        avgOverall: { $avg: '$rating.overall' },
        avgProfessionalism: { $avg: '$rating.categories.professionalism' },
        avgCommunication: { $avg: '$rating.categories.communication' },
        avgServiceQuality: { $avg: '$rating.categories.serviceQuality' },
        avgTimeliness: { $avg: '$rating.categories.timeliness' },
        avgSatisfaction: { $avg: '$rating.categories.satisfaction' },
        totalFeedbacks: { $sum: 1 }
      }
    }
  ]);
};

// Instance method to calculate sentiment score
feedbackSchema.methods.calculateSentimentScore = function() {
  let score = this.rating.overall * 20; // Convert 1-5 to 20-100 scale
  
  // Adjust based on complaints
  if (this.reportIssues.hasComplaint) {
    switch (this.reportIssues.severity) {
      case 'critical': score -= 40; break;
      case 'high': score -= 25; break;
      case 'medium': score -= 15; break;
      case 'low': score -= 5; break;
    }
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
};

// Instance method to flag for review
feedbackSchema.methods.flagForReview = function(reason, flaggedBy) {
  this.flagged = {
    isFlagged: true,
    reason,
    flaggedBy,
    flaggedAt: new Date()
  };
  return this.save();
};

// Instance method to mark as reviewed
feedbackSchema.methods.markAsReviewed = function(reviewedBy, notes) {
  this.status = 'reviewed';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  if (notes) this.reviewNotes = notes;
  return this.save();
};

module.exports = mongoose.model('Feedback', feedbackSchema);