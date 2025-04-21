import User from '../models/User.js';
import { auditLog } from '../middleware/auditLogMiddleware.js';
import { logger } from '../utils/logger.js';

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

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
export const getUsers = async (req, res, next) => {
  try {
    logger.verbose('User requested to fetch all users', {
      userId: req.user?.id,
    });
    // TODO: Add pagination later
    const users = await User.find(); // Exclude sensitive fields if needed by default
    logger.logAccess('User successfully retrieved all users', {
      userId: req.user?.id,
      count: users.length,
    });
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    logger.error('Error fetching all users', {
      userId: req.user?.id,
      error: err.message,
    });
    res
      .status(500)
      .json({ success: false, message: 'Server error fetching users' });
  }
};

// @desc    Get single user by ID
// @route   GET /api/v1/users/:id
// @access  Private/Admin
export const getUser = async (req, res, next) => {
  try {
    logger.verbose(`User requested to fetch user with ID: ${req.params.id}`, {
      userId: req.user?.id,
      targetUserId: req.params.id,
    });

    const user = await User.findById(req.params.id);

    if (!user) {
      logger.warn(`User not found with ID: ${req.params.id}`, {
        userId: req.user?.id,
        targetUserId: req.params.id,
      });
      return res.status(404).json({
        success: false,
        message: `User not found with id of ${req.params.id}`,
      });
    }

    // Only include ipAddresses if requester is admin
    let userObj = user.toObject();
    if (!req.user || req.user.role !== 'Admin') {
      delete userObj.ipAddresses;
    } else {
      logger.info(`Admin retrieving user with IP addresses`, {
        userId: req.user.id,
        targetUserId: user._id,
        ipAddresses: userObj.ipAddresses,
      });
    }

    logger.logAccess(`User successfully retrieved user data`, {
      userId: req.user?.id,
      targetUserId: user._id,
    });

    res.status(200).json({ success: true, data: userObj });
  } catch (err) {
    logger.error(`Error fetching user with ID: ${req.params.id}`, {
      userId: req.user?.id,
      targetUserId: req.params.id,
      error: err.message,
    });

    // Handle invalid ObjectId format
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid user ID format: ${req.params.id}`,
      });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server error fetching user' });
  }
};

// @desc    Create user (Admin only - different from public registration)
// @route   POST /api/v1/users
// @access  Private/Admin
export const createUser = async (req, res, next) => {
  // Admin might set role, initial password, verification status, avatar directly
  const { name, email, password, role, isVerified, avatar } = req.body;

  try {
    logger.verbose('Admin attempted to create new user', {
      userId: req.user?.id,
      email,
    });

    // Basic validation
    if (!name || !email || !password || !role) {
      logger.warn('Invalid user creation request - missing required fields', {
        userId: req.user?.id,
        providedFields: Object.keys(req.body),
      });
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn('User creation failed - email already exists', {
        userId: req.user?.id,
        email,
      });
      return res.status(400).json({
        success: false,
        message: 'User with that email already exists',
      });
    }

    const user = await User.create({
      name,
      email,
      password, // Hashed by pre-save hook
      role,
      isVerified: isVerified !== undefined ? isVerified : false, // Default to false if not provided
      avatar: avatar || '', // Set avatar or default to empty
    });

    // Extract and save IP address
    user.ipAddress = getClientIp(req);
    await user.save({ validateBeforeSave: false });

    // Add IP to user profile if not present
    await addIpToUser(user, getClientIp(req));

    logger.logCreate('Admin successfully created new user', {
      userId: req.user?.id,
      createdUserId: user._id,
      role: user.role,
      isVerified: user.isVerified,
    });

    // Log user creation with more specific action type
    await auditLog(req, 'content_create', 'success', {
      contentType: 'user',
      targetUserId: user._id,
      role: user.role,
      isVerified: user.isVerified,
    });

    // After content create
    await auditLog(req, 'content_create', 'success', { userId: user._id });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    logger.error('Error creating new user', {
      userId: req.user?.id,
      email,
      error: err.message,
    });

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      const errorMessage = messages.join('. ');
      await auditLog(req, 'content_create', 'failed', {
        contentType: 'user',
        error: errorMessage,
        validationErrors: messages,
      });
      return res.status(400).json({ success: false, message: errorMessage });
    }
    await auditLog(req, 'content_create', 'failed', {
      contentType: 'user',
      error: err.message,
    });
    res
      .status(500)
      .json({ success: false, message: 'Server error creating user' });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
export const updateUser = async (req, res, next) => {
  logger.verbose(`Admin attempted to update user with ID: ${req.params.id}`, {
    userId: req.user?.id,
    targetUserId: req.params.id,
    updateFields: Object.keys(req.body),
  });

  try {
    // Find user first
    const user = await User.findById(req.params.id);
    if (!user) {
      logger.warn(`Update failed - user not found with ID: ${req.params.id}`, {
        userId: req.user?.id,
        targetUserId: req.params.id,
      });
      return res.status(404).json({
        success: false,
        message: `User not found with id of ${req.params.id}`,
      });
    }

    logger.debug('Current user data before update', {
      userId: req.user?.id,
      targetUserId: user._id,
      currentData: user.toObject(),
    });

    // Track changes for audit logs
    const oldValues = {};
    const changedValues = {};
    let hasRoleChanged = false;
    let hasProfileChanged = false;

    // Update fields
    const updatableFields = [
      'name',
      'email',
      'role',
      'isVerified',
      'avatar',
      'jobTitle',
      'country',
      'city',
      'website',
      'bio',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        logger.debug(`Updating ${field}`, {
          userId: req.user?.id,
          targetUserId: user._id,
          field,
          oldValue: user[field],
          newValue: req.body[field],
        });

        oldValues[field] = user[field];
        changedValues[field] = req.body[field];
        user[field] = req.body[field];

        // Check if this is a role change or a profile update
        if (field === 'role') {
          hasRoleChanged = true;
        } else {
          hasProfileChanged = true;
        }
      }
    });

    // Handle password reset
    if (req.body.resetPassword && req.body.newPassword) {
      logger.info('Admin resetting user password', {
        userId: req.user?.id,
        targetUserId: user._id,
      });
      user.password = req.body.newPassword;
      changedValues['passwordReset'] = true;
    }

    // Validate before saving
    try {
      await user.validate();
    } catch (validationError) {
      logger.error('User validation failed during update', {
        userId: req.user?.id,
        targetUserId: user._id,
        error: validationError.message,
      });
      throw validationError;
    }

    // Save with hooks
    const updatedUser = await user.save();
    logger.logUpdate('User successfully updated', {
      userId: req.user?.id,
      targetUserId: updatedUser._id,
      changedFields: Object.keys(changedValues),
    });

    // Extract and save IP address
    user.ipAddress = getClientIp(req);
    await user.save({ validateBeforeSave: false });

    // Add IP to user profile if not present
    if (user) {
      await addIpToUser(user, getClientIp(req));
    }

    // Log specific audit entries based on what changed
    if (hasRoleChanged) {
      // Log role change separately
      await auditLog(req, 'role_change', 'success', {
        targetUserId: updatedUser._id,
        oldRole: oldValues.role,
        newRole: updatedUser.role,
      });

      // After permission change
      await auditLog(req, 'permission_change', 'success', { userId: user._id });
    }

    if (hasProfileChanged) {
      // Log profile update
      await auditLog(req, 'profile_update', 'success', {
        targetUserId: updatedUser._id,
        changedFields: Object.keys(changedValues).filter(
          (field) => field !== 'role'
        ),
        oldValues: Object.keys(oldValues)
          .filter((field) => field !== 'role')
          .reduce((obj, key) => {
            obj[key] = oldValues[key];
            return obj;
          }, {}),
      });

      // After content update
      await auditLog(req, 'content_update', 'success', { userId: user._id });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    logger.error('Error updating user', {
      userId: req.user?.id,
      targetUserId: req.params.id,
      error: err.message,
    });

    if (
      err.code === 11000 ||
      (err.name === 'MongoServerError' && err.keyValue?.email)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Email address already in use.' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      const errorMessage = messages.join('. ');
      await auditLog(req, 'profile_update', 'failed', {
        targetUserId: req.params.id,
        error: errorMessage,
        validationErrors: messages,
      });
      return res.status(400).json({ success: false, message: errorMessage });
    }
    if (err.name === 'CastError') {
      const errorMessage = `Invalid user ID format: ${req.params.id}`;
      await auditLog(req, 'profile_update', 'failed', {
        targetUserId: req.params.id,
        error: errorMessage,
      });
      return res.status(400).json({ success: false, message: errorMessage });
    }
    await auditLog(req, 'profile_update', 'failed', {
      targetUserId: req.params.id,
      error: err.message,
    });
    res
      .status(500)
      .json({ success: false, message: 'Server error updating user' });
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    logger.verbose(`Admin attempted to delete user with ID: ${req.params.id}`, {
      userId: req.user?.id,
      targetUserId: req.params.id,
    });

    const user = await User.findById(req.params.id);

    if (!user) {
      logger.warn(`Delete failed - user not found with ID: ${req.params.id}`, {
        userId: req.user?.id,
        targetUserId: req.params.id,
      });
      return res.status(404).json({
        success: false,
        message: `User not found with id of ${req.params.id}`,
      });
    }

    // Store user info for audit log before deletion
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // TODO: Consider what happens to user's content (projects, tasks, etc.)
    // Options: Delete content, reassign content, anonymize content.
    // For now, just delete the user.
    await user.deleteOne();

    logger.logDelete('Admin successfully deleted user', {
      userId: req.user?.id,
      deletedUserId: userData.id,
      deletedUserInfo: userData,
    });

    // Log user deletion with specific action type
    await auditLog(req, 'content_delete', 'success', {
      contentType: 'user',
      targetUserId: userData.id,
      deletedUserInfo: userData,
    });

    // After content delete
    await auditLog(req, 'content_delete', 'success', { userId: user._id });

    res.status(200).json({ success: true, data: {} }); // Success, no data to return
  } catch (err) {
    logger.error('Error deleting user', {
      userId: req.user?.id,
      targetUserId: req.params.id,
      error: err.message,
    });

    if (err.name === 'CastError') {
      const errorMessage = `Invalid user ID format: ${req.params.id}`;
      await auditLog(req, 'content_delete', 'failed', {
        contentType: 'user',
        targetUserId: req.params.id,
        error: errorMessage,
      });
      return res.status(400).json({ success: false, message: errorMessage });
    }
    await auditLog(req, 'content_delete', 'failed', {
      contentType: 'user',
      targetUserId: req.params.id,
      error: err.message,
    });
    res
      .status(500)
      .json({ success: false, message: 'Server error deleting user' });
  }
};

// @desc    Get multiple users by IDs
// @route   POST /api/v1/users/batch
// @access  Private
export const getBatchUsers = async (req, res, next) => {
  try {
    logger.verbose('User requested to fetch batch users', {
      userId: req.user?.id,
      requestedIds: req.body.userIds,
    });

    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      logger.warn(
        'Invalid batch users request - missing or empty userIds array',
        {
          userId: req.user?.id,
        }
      );
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs',
      });
    }

    const users = await User.find({ _id: { $in: userIds } }).select(
      'name email avatar _id'
    );

    logger.logAccess('User successfully retrieved batch users', {
      userId: req.user?.id,
      requestedCount: userIds.length,
      retrievedCount: users.length,
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    logger.error('Error fetching batch users', {
      userId: req.user?.id,
      error: err.message,
    });

    res.status(500).json({
      success: false,
      message: 'Server error fetching batch users',
    });
  }
};
