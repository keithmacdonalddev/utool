import AuditLog from '../models/AuditLog.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/async.js';

// @desc    Get all audit logs
// @route   GET /api/v1/audit-logs
// @access  Private/Admin
export const getAuditLogs = asyncHandler(async (req, res, next) => {
  console.log('Audit Log Request Query:', req.query);

  // Copy req.query
  const reqQuery = { ...req.query };

  // Convert timestamp[gte]/timestamp[lte] to MongoDB format
  if (reqQuery['timestamp[gte]'] || reqQuery['timestamp[lte]']) {
    reqQuery.timestamp = {};
    if (reqQuery['timestamp[gte]']) {
      reqQuery.timestamp.$gte = new Date(reqQuery['timestamp[gte]']);
      delete reqQuery['timestamp[gte]'];
    }
    if (reqQuery['timestamp[lte]']) {
      reqQuery.timestamp.$lte = new Date(reqQuery['timestamp[lte]']);
      delete reqQuery['timestamp[lte]'];
    }
  }

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach((param) => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  console.log('MongoDB Query String:', queryStr);

  // Parse back to object for logging
  const parsedQuery = JSON.parse(queryStr);
  console.log('MongoDB Query Object:', parsedQuery);

  // Check if we have timestamp filters
  if (parsedQuery.timestamp) {
    console.log('Timestamp filters present:', parsedQuery.timestamp);
  }

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

  // Count all matching documents first
  const total = await AuditLog.countDocuments(JSON.parse(queryStr));
  console.log('Total matching logs found:', total);

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const auditLogs = await query;
  console.log(`Retrieved ${auditLogs.length} audit logs`);

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
    count: total,
    pagination,
    data: auditLogs,
  });
});

// @desc    Search audit logs
// @route   GET /api/v1/audit-logs/search
// @access  Private/Admin
export const searchAuditLogs = asyncHandler(async (req, res, next) => {
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
