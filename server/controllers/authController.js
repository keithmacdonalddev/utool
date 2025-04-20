import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Helper function to generate JWT
const getSignedJwtToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d', // Default to 30 days
  });
};

// Helper to get real client IP (works with trust proxy)
function getClientIp(req) {
  // req.ip is reliable when trust proxy is set
  return (
    req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || ''
  );
}

// Helper to add IP to user profile if not present
async function addIpToUser(user, ip) {
  if (ip && !user.ipAddresses.includes(ip)) {
    user.ipAddresses.push(ip);
    await user.save({ validateBeforeSave: false });
  }
}

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const { auditLog } = await import('../middleware/auditLogMiddleware.js');
      await auditLog(req, 'register', 'failed', { email });
      return res
        .status(400)
        .json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password, // Password will be hashed by Mongoose pre-save hook
    });

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.ipAddress = getClientIp(req);
    await user.save({ validateBeforeSave: false });

    await addIpToUser(user, getClientIp(req));

    // Construct verification URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    // TODO: Send verification email
    const message = `You are receiving this email because you (or someone else) has registered an account on our platform. Please click on the following link, or paste this into your browser to complete the process within 24 hours:\n\n${verificationUrl}\n\nIf you did not request this, please ignore this email.`;
    console.log('Sending verification email:');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Account Verification`);
    console.log(`Message: ${message}`);

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'register', 'success', { userId: user._id });
    res.status(201).json({
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
    });
  } catch (err) {
    console.error('Registration error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email and password',
    });
  }

  try {
    console.log(`Login attempt for email: ${email}`);

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected during login attempt');
      return res.status(500).json({
        success: false,
        message: 'Database connection issue. Please try again later.',
      });
    }

    const user = await User.findOne({ email }).select(
      '+password +failedLoginAttempts +accountLockedUntil'
    );

    if (!user) {
      const { auditLog } = await import('../middleware/auditLogMiddleware.js');
      await auditLog(req, 'login', 'failed', { email });
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
      const remainingTime = Math.ceil(
        (user.accountLockedUntil - Date.now()) / 60000
      );
      return res.status(403).json({
        success: false,
        message: `Account locked. Try again in ${remainingTime} minutes.`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      const { auditLog } = await import('../middleware/auditLogMiddleware.js');
      await auditLog(req, 'login', 'failed', {
        email,
        failedAttempts: user.failedLoginAttempts,
      });

      const MAX_FAILED_ATTEMPTS = 5;
      const LOCK_TIME = 15 * 60 * 1000;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.accountLockedUntil = Date.now() + LOCK_TIME;
        await user.save({ validateBeforeSave: false });
        const { auditLog } = await import(
          '../middleware/auditLogMiddleware.js'
        );
        await auditLog(req, 'account_lock', 'success', { userId: user._id });
        return res.status(403).json({
          success: false,
          message: `Account locked due to too many failed login attempts. Try again in 15 minutes.`,
        });
      }

      await user.save({ validateBeforeSave: false });
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Account not verified. Please check your email.',
      });
    }

    // Reset failed login attempts
    if (user.failedLoginAttempts > 0 || user.accountLockedUntil) {
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = undefined;
      await user.save({ validateBeforeSave: false });
    }

    user.ipAddress = getClientIp(req);
    await user.save({ validateBeforeSave: false });

    await addIpToUser(user, getClientIp(req));

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'login', 'success', { userId: user._id });
    console.log(`Login successful for user: ${user.email} (${user._id})`);
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Login error detail:', err.message);
    console.error('Error stack:', err.stack);
    console.error('JWT_SECRET exists:', Boolean(process.env.JWT_SECRET));

    const errorDetails = {
      message: err.message,
      mongoConnectionState: mongoose.connection.readyState,
    };

    res.status(500).json({
      success: false,
      message: 'Server error during login',
      details:
        process.env.NODE_ENV === 'development' ? errorDetails : undefined,
    });
  }
};

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: 'Verification token missing' });
  }

  console.log(`Received token from URL: ${token}`);
  console.log(`Current Time: ${new Date(Date.now())}`);

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      const { auditLog } = await import('../middleware/auditLogMiddleware.js');
      await auditLog(req, 'email_verification', 'failed', { token });
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'email_verification', 'success', { userId: user._id });
    res
      .status(200)
      .json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Email verification error:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server error during verification' });
  }
};

// @desc    Resend verification link
// @route   POST /api/v1/auth/resend-verification
// @access  Public
export const resendVerificationLink = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: 'Please provide an email' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          'If an account with that email exists, a new verification link has been sent.',
      });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ success: false, message: 'Account is already verified' });
    }

    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;

    // TODO: Send verification email
    const message = `You requested a new verification link for your account. Please click on the following link, or paste this into your browser to complete the process within 24 hours:\n\n${verificationUrl}\n\nIf you did not request this, please ignore this email.`;
    console.log('Sending verification email:');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Account Verification Resend`);
    console.log(`Message: ${message}`);

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'email_verification', 'pending', { userId: user._id });
    res.status(200).json({
      success: true,
      message: 'New verification link sent to your email.',
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during resend verification',
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  // req.user is set by the protect middleware
  // We might want to re-fetch to ensure latest data, but req.user should be sufficient
  const user = await User.findById(req.user.id); // Re-fetch to be safe

  if (!user) {
    // Should not happen if protect middleware worked correctly
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({ success: true, data: user });
};

// @desc    Update user details (name, email - not password)
// @route   PUT /api/v1/auth/updateme
// @access  Private
export const updateMe = async (req, res, next) => {
  // Fields allowed to be updated by the user themselves
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    avatar: req.body.avatar,
    jobTitle: req.body.jobTitle,
    country: req.body.country,
    city: req.body.city,
    website: req.body.website,
    bio: req.body.bio,
  };

  // Remove undefined fields so they don't overwrite existing data
  Object.keys(fieldsToUpdate).forEach(
    (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  if (Object.keys(fieldsToUpdate).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'No fields provided for update' });
  }

  try {
    // Find user and update
    // Use findByIdAndUpdate with { new: true, runValidators: true }
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true, // Return the updated document
      runValidators: true, // Ensure schema validations run (e.g., email format)
    });

    if (!user) {
      // Should not happen if protect middleware worked correctly
      return res
        .status(404)
        .json({ success: false, message: 'User not found during update' });
    }

    user.ipAddress = getClientIp(req);
    await user.save({ validateBeforeSave: false });

    if (user) {
      await addIpToUser(user, getClientIp(req));
    }

    // Don't send back the token on update, just the updated user data
    const changedFields = Object.keys(fieldsToUpdate);
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'profile_update', 'success', {
      userId: user._id,
      changedFields,
    });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('Update Me error:', err);
    // Handle potential duplicate email error
    if (
      err.code === 11000 ||
      (err.name === 'MongoServerError' && err.keyValue?.email)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Email address already in use.' });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join('. ') });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server error updating user details' });
  }
};

// TODO: Add updateMyPassword controller later

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = getSignedJwtToken(user._id);

  const options = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRE_DAYS || '30', 10) *
          24 *
          60 *
          60 *
          1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  const userOutput = { ...user.toObject() };
  delete userOutput.password;
  delete userOutput.verificationToken;
  delete userOutput.verificationTokenExpires;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token, user: userOutput });
};
