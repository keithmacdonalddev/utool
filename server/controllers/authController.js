import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';
import ErrorResponse from '../utils/errorResponse.js';

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
export const register = asyncHandler(async (req, res, next) => {
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
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = asyncHandler(async (req, res, next) => {
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
      // It's important to still log the attempt, even if the user doesn't exist.
      // The audit log function should be able to handle a null or undefined userId for 'login' actions.
      await auditLog(req, 'login', 'failed', {
        email,
        reason: 'User not found',
      });
      return res
        .status(401)
        .json({
          success: false,
          message:
            'User with this email does not exist. Please check your email or register.',
        }); // MODIFIED MESSAGE
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
      const remainingTime = Math.ceil(
        (user.accountLockedUntil - Date.now()) / 60000
      );
      // Log this specific type of failure as well
      const { auditLog } = await import('../middleware/auditLogMiddleware.js');
      await auditLog(req, 'login', 'failed', {
        userId: user._id, // User ID is known here
        email: user.email,
        reason: 'Account locked',
      });
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
        userId: user._id, // User ID is known here
        email: user.email,
        reason: 'Incorrect password',
        failedAttempts: user.failedLoginAttempts,
      });

      const MAX_FAILED_ATTEMPTS = 5; // Consider moving to config
      const LOCK_TIME = 15 * 60 * 1000; // 15 minutes, consider moving to config
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.accountLockedUntil = Date.now() + LOCK_TIME;
        // No need to validate before save here, as we are just updating lock status
        await user.save({ validateBeforeSave: false });
        const { auditLog: lockAuditLog } = await import(
          // Use a different alias to avoid conflict
          '../middleware/auditLogMiddleware.js'
        );
        await lockAuditLog(req, 'account_lock', 'success', {
          userId: user._id,
          email: user.email,
        });
        return res.status(403).json({
          success: false,
          message: `Account locked due to too many failed login attempts. Try again in 15 minutes.`,
        });
      }

      await user.save({ validateBeforeSave: false });
      return res
        .status(401)
        .json({
          success: false,
          message: 'Incorrect password. Please try again.',
        }); // MODIFIED MESSAGE
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
    // If credentials are valid, send token response
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
});

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
export const getMe = asyncHandler(async (req, res, next) => {
  // req.user is set by the protect middleware
  // We might want to re-fetch to ensure latest data, but req.user should be sufficient
  const user = await User.findById(req.user.id); // Re-fetch to be safe

  if (!user) {
    // Should not happen if protect middleware worked correctly
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Update user details (name, email - not password)
// @route   PUT /api/v1/auth/updateme
// @access  Private
export const updateMe = asyncHandler(async (req, res, next) => {
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
});

// TODO: Add updateMyPassword controller later

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private (but can be called by anyone with a token)
export const logout = asyncHandler(async (req, res, next) => {
  try {
    // Get user info from either the authenticated user or our preserved logout info
    const userInfo = req.user || req.logoutUserInfo;

    // No need for another log here - the route middleware already logged it

    // Make sure we have some kind of user identifier
    if (!userInfo) {
      logger.warn('Logout attempted without any user information', {
        ip: req.ip || req.connection.remoteAddress,
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication required for logout',
      });
    }

    // Extract the token from the request
    const token = req.headers.authorization?.split(' ')[1];

    // Import blacklist utility and add token to blacklist
    if (token) {
      try {
        const { blacklistToken } = await import('../utils/tokenBlacklist.js');
        const blacklisted = blacklistToken(token);

        // No need for another log here - the route middleware will log the response

        if (blacklisted) {
          logger.verbose(
            `Token blacklisted for user: ${userInfo.email || userInfo.id}`
          );
        } else {
          logger.warn(
            `Failed to blacklist token for user: ${
              userInfo.email || userInfo.id
            }`
          );
        }
      } catch (blacklistError) {
        // Log but continue - don't fail the logout if blacklisting fails
        logger.error('Error during token blacklisting', {
          error: blacklistError.message,
          stack: blacklistError.stack,
        });
      }
    } else {
      logger.warn('No token found to blacklist during logout');
    }

    logger.info(
      `User logged out: ${userInfo.email || 'unknown'} (${
        userInfo.id || 'unknown'
      })`,
      {
        userId: userInfo.id,
        email: userInfo.email || 'unknown',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
      }
    );

    try {
      const { auditLog } = await import('../middleware/auditLogMiddleware.js');

      // Only log the logout action because we have a valid userId
      await auditLog(req, 'logout', 'success', {
        userId: userInfo.id,
      });
    } catch (auditError) {
      // Log but continue - don't fail the logout if audit logging fails
      logger.error('Error during audit logging of logout', {
        error: auditError.message,
        stack: auditError.stack,
      });
    }

    // Clear the access token cookie (if you were setting one, though typically it's Bearer token)
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // expires in 10 seconds
      httpOnly: true,
    });

    // Clear the refresh token cookie
    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // expires in 10 seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    return res
      .status(200)
      .json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    logger.error('Logout error', {
      error: err.message,
      stack: err.stack,
      userId: req.logoutUserInfo?.id || req.user?._id,
    });

    // Still attempt to return a response
    return res
      .status(500)
      .json({ success: false, message: 'Server error during logout' });
  }
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh-token
// @access  Public (relies on HttpOnly cookie for refresh token)
export const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return next(new ErrorResponse('Refresh token not found', 401));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Find user by ID from decoded token
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorResponse('Invalid refresh token', 401));
    }

    // Issue a new access token
    const accessToken = getSignedJwtToken(user.id); // Assuming getSignedJwtToken only returns access token

    res.status(200).json({
      success: true,
      token: accessToken,
      // Optionally, send back user data if needed, but typically just the new access token
      // data: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    // Handle expired or invalid refresh token
    console.error('Refresh token error:', err.message);
    return next(new ErrorResponse('Invalid or expired refresh token', 403));
  }
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create access token
  const accessToken = getSignedJwtToken(user.id); // This should be the short-lived access token

  // Create refresh token
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    }
  );

  const accessTokenOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // Makes it inaccessible to JavaScript running in the browser
  };

  const refreshTokenOptions = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.REFRESH_TOKEN_COOKIE_EXPIRE_DAYS) *
          24 *
          60 *
          60 *
          1000
    ),
    httpOnly: true, // Crucial for security
    secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
    sameSite: 'Strict', // Mitigates CSRF attacks
  };

  if (process.env.NODE_ENV === 'production') {
    accessTokenOptions.secure = true; // Send only over HTTPS in production
  }

  // Set refresh token in an HTTP-only cookie
  res.cookie('refreshToken', refreshToken, refreshTokenOptions);

  // The access token is sent in the JSON response body
  // The client will store this (e.g., in memory/Redux) and send it as a Bearer token
  res.status(statusCode).json({
    success: true,
    token: accessToken, // Access token
    // user: { id: user._id, name: user.name, email: user.email, role: user.role } // Optionally send user data
  });
};
