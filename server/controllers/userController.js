import User from '../models/User.js';
import { auditLog } from '../middleware/auditLogMiddleware.js';

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
    // TODO: Add pagination later
    const users = await User.find(); // Exclude sensitive fields if needed by default
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    console.error('Get Users Error:', err);
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
    const user = await User.findById(req.params.id);

    if (!user) {
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
      console.log(
        '[ADMIN] Returning ipAddresses for user',
        user._id,
        userObj.ipAddresses
      );
    }

    res.status(200).json({ success: true, data: userObj });
  } catch (err) {
    console.error('Get User Error:', err);
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
    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
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
    console.error('Create User Error:', err);
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
  console.log('Update user request received:', req.params.id, req.body);

  try {
    // Find user first
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log('User not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: `User not found with id of ${req.params.id}`,
      });
    }

    console.log('Current user data:', user.toObject());

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
        console.log(
          `Updating ${field} from ${user[field]} to ${req.body[field]}`
        );
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
      console.log('Resetting password');
      user.password = req.body.newPassword;
      changedValues['passwordReset'] = true;
    }

    // Validate before saving
    try {
      await user.validate();
    } catch (validationError) {
      console.error('Validation failed:', validationError);
      throw validationError;
    }

    // Save with hooks
    const updatedUser = await user.save();
    console.log('User successfully updated:', updatedUser.toObject());

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
    console.error('Update User Error:', err);
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
    const user = await User.findById(req.params.id);

    if (!user) {
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
    console.error('Delete User Error:', err);
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
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs',
      });
    }

    const users = await User.find({ _id: { $in: userIds } }).select(
      'name email avatar _id'
    );

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    console.error('Batch Get Users Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching batch users',
    });
  }
};
