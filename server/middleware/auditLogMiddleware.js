import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';
import { isShuttingDown } from '../server.js';

const auditLog = async (req, action, status, metadata = {}) => {
  try {
    // Prevent logging if shutting down or DB is not connected
    if (isShuttingDown || mongoose.connection.readyState !== 1) {
      return;
    }
    // For login/register/verification actions, userId might be passed in metadata
    // This handles the case where req.user is not set yet (during login/register)
    const userId = metadata.userId || req.user?._id;

    // Skip logging if we can't determine the user (except for auth actions that provide userId in metadata)
    if (!userId && !['login', 'register', 'verify-email'].includes(action)) {
      return;
    }

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // For login/register, allow creating audit logs without userId (use metadata.userId instead)
    await AuditLog.create({
      // Use userId from metadata or req.user if available
      ...(userId && { userId }),
      action,
      status,
      ipAddress: ip,
      userAgent,
      metadata: {
        ...metadata,
        endpoint: req.originalUrl,
        method: req.method,
      },
    });
  } catch (err) {
    // Suppress PoolClosedError on shutdown
    if (
      err?.name === 'MongoPoolClosedError' ||
      err?.message?.includes('PoolClosedError')
    ) {
      return;
    }
    console.error('Failed to create audit log:', err);
  }
};

// Middleware to wrap routes and auto-log success/error
const withAuditLog = (action) => {
  return async (req, res, next) => {
    try {
      await next();

      // Log successful completion
      if (res.statusCode < 400) {
        await auditLog(req, action, 'success');
      }
    } catch (err) {
      // Log error case
      await auditLog(req, action, 'failed', {
        error: err.message,
        statusCode: err.statusCode || 500,
      });
      throw err; // Re-throw for error handler
    }
  };
};

export { auditLog, withAuditLog };
