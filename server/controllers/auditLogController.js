const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all audit logs
// @route   GET /api/v1/audit-logs
// @access  Private/Admin
exports.getAuditLogs = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach((param) => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  // Finding resource
  let query = AuditLog.find(JSON.parse(queryStr)).populate(
    'userId',
    'name email role'
  );

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-timestamp');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await AuditLog.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const auditLogs = await query;

  // Pagination result
  const pagination = {};
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: auditLogs.length,
    pagination,
    data: auditLogs,
  });
});

// @desc    Search audit logs
// @route   GET /api/v1/audit-logs/search
// @access  Private/Admin
exports.searchAuditLogs = asyncHandler(async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return next(new ErrorResponse('Please provide a search term', 400));
  }

  const logs = await AuditLog.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .populate('userId', 'name email role')
    .limit(50);

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

// @desc    Get all audit logs with filtering options
// @route   GET /api/v1/audit-logs/admin
// @access  Admin only
exports.getAdminLogs = async (req, res) => {
  try {
    // Extract filter parameters
    const {
      action,
      status,
      user,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sort = '-createdAt', // Default sort by newest first
    } = req.query;

    // Check admin permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admin privileges required to view logs',
      });
    }

    // Build query
    const query = {};

    if (action) query.action = action;
    if (status) query.status = status;
    if (user) query.user = user;

    // Date filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const logs = await AuditLog.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email role')
      .lean();

    // Get total count for pagination
    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      data: logs,
    });
  } catch (err) {
    console.error('Error fetching admin logs:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving logs',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// @desc    Get server health status with recent errors
// @route   GET /api/v1/audit-logs/admin/system-health
// @access  Admin only
exports.getSystemHealth = async (req, res) => {
  try {
    // Check admin permissions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message:
          'Access denied: Admin privileges required to view system health',
      });
    }

    // Get recent errors (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = await AuditLog.find({
      status: 'failed',
      createdAt: { $gte: oneDayAgo },
    })
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Get error count by type/category
    const errorsByAction = await AuditLog.aggregate([
      {
        $match: {
          status: 'failed',
          createdAt: { $gte: oneDayAgo },
        },
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get system stats
    const stats = {
      totalRequests: await AuditLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
      }),
      successfulRequests: await AuditLog.countDocuments({
        status: 'success',
        createdAt: { $gte: oneDayAgo },
      }),
      failedRequests: await AuditLog.countDocuments({
        status: 'failed',
        createdAt: { $gte: oneDayAgo },
      }),
      serverUptime: process.uptime(), // Server uptime in seconds
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date(),
    };

    res.json({
      success: true,
      stats,
      errorsByAction,
      recentErrors,
    });
  } catch (err) {
    console.error('Error fetching system health:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving system health',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
