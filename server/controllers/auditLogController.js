import AuditLog from '../models/AuditLog.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/async.js';
import { logger } from '../utils/logger.js';

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

    // Process start timestamp (>=)
    if (reqQuery['timestamp[gte]']) {
      const startDate = new Date(reqQuery['timestamp[gte]']);
      reqQuery.timestamp.$gte = startDate;
      console.log('Start date filter:', startDate.toISOString());
      console.log('Filtering logs after:', startDate.toLocaleString());
      delete reqQuery['timestamp[gte]'];
    }

    // Process end timestamp (<=)
    if (reqQuery['timestamp[lte]']) {
      const endDate = new Date(reqQuery['timestamp[lte]']);
      reqQuery.timestamp.$lte = endDate;
      console.log('End date filter:', endDate.toISOString());
      console.log('Filtering logs before:', endDate.toLocaleString());
      delete reqQuery['timestamp[lte]'];
    }

    // When using "Past Hour" filter, log the time range more explicitly
    if (reqQuery.timestamp.$gte && reqQuery.timestamp.$lte) {
      const startTime = reqQuery.timestamp.$gte;
      const endTime = reqQuery.timestamp.$lte;
      const diffMinutes = Math.round((endTime - startTime) / (1000 * 60));

      if (diffMinutes <= 60) {
        console.log(`Time range is approximately ${diffMinutes} minutes`);
        console.log(`This appears to be a "Past Hour" filter`);
      }
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

    // Add explicit readable time range for easier debugging
    if (parsedQuery.timestamp.$gte && parsedQuery.timestamp.$lte) {
      const start = new Date(parsedQuery.timestamp.$gte);
      const end = new Date(parsedQuery.timestamp.$lte);
      console.log(
        `Time Range: ${start.toLocaleString()} to ${end.toLocaleString()}`
      );
    }
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

  // For debugging, show the time range of returned logs
  if (auditLogs.length > 0) {
    const oldestLog = new Date(
      Math.min(...auditLogs.map((log) => new Date(log.timestamp)))
    );
    const newestLog = new Date(
      Math.max(...auditLogs.map((log) => new Date(log.timestamp)))
    );

    console.log('Oldest log timestamp:', oldestLog.toLocaleString());
    console.log('Newest log timestamp:', newestLog.toLocaleString());

    if (parsedQuery.timestamp && parsedQuery.timestamp.$gte) {
      const startFilter = new Date(parsedQuery.timestamp.$gte);
      console.log(
        'Oldest log is',
        Math.round((oldestLog - startFilter) / (1000 * 60)),
        'minutes after filter start'
      );
    }
  }

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

// @desc    Delete audit logs by date range
// @route   DELETE /api/v1/audit-logs
// @access  Private/Admin
export const deleteAuditLogsByDateRange = asyncHandler(
  async (req, res, next) => {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return next(
        new ErrorResponse('Please provide both start and end dates', 400)
      );
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return next(new ErrorResponse('Invalid date format', 400));
      }

      // Create filter object
      const filter = {
        timestamp: {
          $gte: start,
          $lte: end,
        },
      };

      // Count logs before deletion for reporting
      const count = await AuditLog.countDocuments(filter);

      // Delete logs matching the filter
      const result = await AuditLog.deleteMany(filter);

      logger.info(
        `Deleted ${
          result.deletedCount
        } audit logs from ${start.toISOString()} to ${end.toISOString()}`
      );

      res.status(200).json({
        success: true,
        count: result.deletedCount,
        message: `Successfully deleted ${result.deletedCount} audit logs`,
      });
    } catch (error) {
      logger.error('Error deleting audit logs:', error);
      return next(new ErrorResponse('Error deleting audit logs', 500));
    }
  }
);
