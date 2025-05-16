// server/models/AppSettings.js
import mongoose from 'mongoose';

/**
 * AppSettings Schema
 *
 * Defines the structure for global application settings, such as feature flags.
 * This model will store settings that can be configured by administrators.
 *
 * Fields:
 * - guestAccessEnabled: Boolean flag to enable or disable guest access to the site.
 *                       Defaults to false, meaning guest access is off by default.
 * - settingName: A unique identifier for the settings document, ensuring only one exists.
 */
const AppSettingsSchema = new mongoose.Schema(
  {
    guestAccessEnabled: {
      type: Boolean,
      default: false,
    },
    // Using a fixed name to ensure only one document for app settings
    settingName: {
      type: String,
      default: 'GlobalAppSettings',
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt timestamps
  }
);

/**
 * Static method to get or create the app settings document.
 * Ensures that there is always a single AppSettings document in the database.
 * Uses atomic findOneAndUpdate with upsert to prevent race conditions.
 *
 * @returns {Promise<Document>} The AppSettings document.
 */
AppSettingsSchema.statics.getSettings = async function () {
  const settings = await this.findOneAndUpdate(
    { settingName: 'GlobalAppSettings' },
    { $setOnInsert: { guestAccessEnabled: false } },
    { upsert: true, new: true, runValidators: true }
  );
  return settings;
};

const AppSettings = mongoose.model('AppSettings', AppSettingsSchema);

export default AppSettings;
