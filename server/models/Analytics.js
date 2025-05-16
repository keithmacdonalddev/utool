import mongoose from 'mongoose';

/**
 * Schema for tracking guest user sessions and activities
 * Stores anonymous usage data for analysis and improving the guest experience
 */
const GuestSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    events: [
      {
        type: {
          type: String,
          enum: ['PAGE_VIEW', 'FEATURE_ATTEMPT', 'ERROR'],
          required: true,
        },
        path: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: mongoose.Schema.Types.Mixed,
      },
    ],
    userAgent: String,
    // Store anonymized/hashed IP for privacy
    ipAddressHash: String,
  },
  { timestamps: true }
);

const Analytics = mongoose.model('GuestSession', GuestSessionSchema);

export default Analytics;
