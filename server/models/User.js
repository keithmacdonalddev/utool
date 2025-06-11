// User.js - Mongoose schema definition for the User model
// This defines the structure of user documents in MongoDB and related functionality

import mongoose from 'mongoose'; // MongoDB object modeling library
import bcrypt from 'bcryptjs'; // Library for hashing passwords

// Define the User schema using Mongoose's schema constructor
// Each field specifies the type of data and additional validation/options
const UserSchema = new mongoose.Schema({
  // User's first name - separated from the original 'name' field for better data granularity
  firstName: {
    type: String, // Data type for storing the user's first name
    required: [true, 'Please provide a first name'], // Field is mandatory with custom error message
    trim: true, // Removes whitespace from both ends of the string
    maxlength: [50, 'First name cannot be longer than 50 characters'], // Prevent extremely long names
  },

  // User's last name - separated from the original 'name' field for better data granularity
  lastName: {
    type: String, // Data type for storing the user's last name
    required: [true, 'Please provide a last name'], // Field is mandatory with custom error message
    trim: true, // Removes whitespace from both ends of the string
    maxlength: [50, 'Last name cannot be longer than 50 characters'], // Prevent extremely long names
  },

  // New username field
  username: {
    type: String,
    required: false, // Changed: Username is now optional, will be auto-generated if not provided
    unique: true,
    sparse: true, // This ensures unique constraint only applies to non-null values
    trim: true,
    lowercase: true, // Optional: enforce lowercase usernames
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot be longer than 30 characters'],
    // Optional: Add a regex for allowed characters if needed
    // match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
  },

  // User's email address - used as the unique identifier for authentication
  email: {
    type: String,
    required: [true, 'Please provide an email'], // Field is mandatory with custom error message
    unique: true, // Creates a database index for faster queries and ensures uniqueness
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, // Regular expression for email validation
      'Please add a valid email', // Error message if validation fails
    ],
    lowercase: true, // Converts email to lowercase before saving
    trim: true, // Removes whitespace from both ends
  },

  // User's password - stored as a hashed value, not plaintext
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [8, 'Password must be at least 8 characters'], // Minimum length validation
    select: false, // Important security feature: password won't be returned in queries by default
  },

  // User role for access control/permissions
  role: {
    type: String,
    enum: ['Admin', 'Pro User', 'Regular User'], // Only these values are allowed
    default: 'Regular User', // Default value if not specified
  },

  // Email verification status
  isVerified: {
    type: Boolean,
    default: false, // Users start as unverified
  },

  // Fields for email verification process
  verificationToken: String, // Token sent to user's email
  verificationTokenExpires: Date, // Expiration date for security

  // Security fields for rate limiting login attempts
  failedLoginAttempts: {
    type: Number,
    default: 0, // Start with zero failed attempts
  },
  accountLockedUntil: Date, // Timestamp until when the account is locked after too many failed attempts

  // User profile fields
  avatar: {
    type: String, // URL to profile image
    default: '', // Empty string if no avatar is set
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be longer than 500 characters'],
    default: '',
  },
  country: {
    type: String,
    default: '',
  },
  city: {
    type: String,
    default: '',
  },
  website: {
    type: String,
    match: [
      // Regular expression to validate URL format
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      'Please use a valid URL with HTTP or HTTPS',
    ],
    default: '',
  },
  jobTitle: {
    type: String,
    default: '',
  },

  // Track all IPs ever used by the user
  ipAddresses: {
    type: [String],
    default: [],
  },

  // Timestamps for user activity and record-keeping
  lastActive: {
    type: Date,
    default: Date.now, // Current timestamp as default
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  // Social connections - arrays of references to other User documents
  // Using MongoDB's ObjectId reference system for relational data
  friends: [
    {
      type: mongoose.Schema.ObjectId, // Reference to another User document
      ref: 'User', // The model to use when populating the reference
    },
  ],
  friendRequestsSent: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  ],
  friendRequestsReceived: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  ],
});

// Middleware (Mongoose "pre" hook) - runs before a document is saved
// This automatically hashes passwords before storing them in the database
UserSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  // This prevents rehashing on other updates to the user document
  if (!this.isModified('password')) {
    return next(); // Skip to the next middleware
  }

  // Hash the password with cost of 10 (work factor for bcrypt)
  // Higher numbers are more secure but slower
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next(); // Continue with the save operation
});

// Instance method added to all User documents
// This compares a plaintext password with the hashed version stored in the database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // Need to select password explicitly as it's not selected by default (because of select: false)
  const user = await this.constructor.findById(this._id).select('+password');
  if (!user) return false; // Should not happen if called on an existing user instance

  // bcrypt.compare safely compares the plaintext password with the hash
  // Returns true if they match, false otherwise
  return await bcrypt.compare(enteredPassword, user.password);
};

// Create and export the User model based on the schema
// This allows us to create and query User documents elsewhere in the app
export default mongoose.model('User', UserSchema);
