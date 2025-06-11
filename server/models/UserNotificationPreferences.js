/**
 * User Notification Preferences Model
 *
 * Manages user preferences for notifications across different channels and contexts.
 * Supports project-specific settings, notification types, timing preferences, and channels.
 */

const mongoose = require('mongoose');

const userNotificationPreferencesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Global Notification Settings
    globalSettings: {
      enabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: true },
      pushEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },

      // Quiet Hours
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' }, // 24-hour format
        end: { type: String, default: '07:00' },
        timezone: { type: String, default: 'UTC' },
      },

      // Digest Settings
      digest: {
        enabled: { type: Boolean, default: true },
        frequency: {
          type: String,
          enum: ['immediate', 'hourly', 'daily', 'weekly'],
          default: 'daily',
        },
        time: { type: String, default: '09:00' }, // 24-hour format
      },
    },

    // Notification Type Preferences
    notificationTypes: {
      // Task-related notifications
      taskAssigned: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      taskCompleted: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      taskOverdue: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      taskCommented: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },

      // Project-related notifications
      projectInvited: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      projectUpdated: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
      },
      projectDeadline: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },

      // Collaboration notifications
      mentioned: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },
      commentReplied: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
      },

      // System notifications
      systemUpdates: {
        email: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true },
      },
    },

    // Project-specific overrides
    projectOverrides: [
      {
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Project',
          required: true,
        },
        settings: {
          // Override global settings for this specific project
          emailEnabled: Boolean,
          pushEnabled: Boolean,
          inAppEnabled: Boolean,

          // Override notification types for this project
          taskAssigned: {
            email: Boolean,
            push: Boolean,
            inApp: Boolean,
          },
          taskCompleted: {
            email: Boolean,
            push: Boolean,
            inApp: Boolean,
          },
          mentions: {
            email: Boolean,
            push: Boolean,
            inApp: Boolean,
          },
          comments: {
            email: Boolean,
            push: Boolean,
            inApp: Boolean,
          },
        },
      },
    ],

    // Device-specific settings
    devices: [
      {
        deviceId: String,
        type: { type: String, enum: ['web', 'mobile', 'desktop'] },
        pushToken: String,
        enabled: { type: Boolean, default: true },
        lastSeen: { type: Date, default: Date.now },
      },
    ],

    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
userNotificationPreferencesSchema.index({ user: 1 });
userNotificationPreferencesSchema.index({ 'projectOverrides.project': 1 });
userNotificationPreferencesSchema.index({ 'devices.deviceId': 1 });

// Helper method to get notification preference for a specific type and project
userNotificationPreferencesSchema.methods.getPreference = function (
  notificationType,
  channel,
  projectId = null
) {
  // Check project-specific override first
  if (projectId) {
    const projectOverride = this.projectOverrides.find(
      (override) => override.project.toString() === projectId.toString()
    );

    if (projectOverride && projectOverride.settings[notificationType]) {
      const typeSettings = projectOverride.settings[notificationType];
      if (
        typeof typeSettings === 'object' &&
        typeSettings[channel] !== undefined
      ) {
        return typeSettings[channel];
      }
    }
  }

  // Fall back to global type settings
  const typeSettings = this.notificationTypes[notificationType];
  if (typeSettings && typeSettings[channel] !== undefined) {
    return typeSettings[channel];
  }

  // Fall back to global channel settings
  const globalChannelEnabled = this.globalSettings[`${channel}Enabled`];
  if (globalChannelEnabled !== undefined) {
    return globalChannelEnabled;
  }

  // Default to enabled
  return true;
};

// Helper method to check if user is in quiet hours
userNotificationPreferencesSchema.methods.isInQuietHours = function () {
  if (!this.globalSettings.quietHours.enabled) return false;

  const now = new Date();
  const userTimezone = this.globalSettings.quietHours.timezone || 'UTC';

  try {
    // Convert current time to user's timezone
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    const currentTime = userTime.replace(':', '');
    const startTime = this.globalSettings.quietHours.start.replace(':', '');
    const endTime = this.globalSettings.quietHours.end.replace(':', '');

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
};

// Static method to get or create preferences for a user
userNotificationPreferencesSchema.statics.getOrCreateForUser = async function (
  userId
) {
  let preferences = await this.findOne({ user: userId });

  if (!preferences) {
    preferences = await this.create({ user: userId });
  }

  return preferences;
};

// Update timestamps on save
userNotificationPreferencesSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const UserNotificationPreferences = mongoose.model(
  'UserNotificationPreferences',
  userNotificationPreferencesSchema
);

module.exports = UserNotificationPreferences;
