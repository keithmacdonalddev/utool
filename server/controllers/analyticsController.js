import asyncHandler from '../middleware/async.js';
import Analytics from '../models/Analytics.js';

/**
 * Get a summary of guest usage analytics
 * Accessible only by admins with analytics permission
 */
export const getGuestAnalyticsSummary = asyncHandler(async (req, res) => {
  // Get counts of sessions by date
  const sessionsByDate = await Analytics.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$startTime' },
          month: { $month: '$startTime' },
          day: { $dayOfMonth: '$startTime' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
    { $limit: 30 }, // Last 30 days
  ]);

  // Get most viewed pages
  const topPages = await Analytics.aggregate([
    { $unwind: '$events' },
    { $match: { 'events.type': 'PAGE_VIEW' } },
    {
      $group: {
        _id: '$events.path',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Get most attempted write operations
  const topWriteAttempts = await Analytics.aggregate([
    { $unwind: '$events' },
    { $match: { 'events.type': 'FEATURE_ATTEMPT' } },
    {
      $group: {
        _id: '$events.details.feature',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Total guest sessions
  const totalSessions = await Analytics.countDocuments();

  // Average session duration (for completed sessions)
  const avgDuration = await Analytics.aggregate([
    { $match: { endTime: { $exists: true } } },
    {
      $group: {
        _id: null,
        avgDuration: {
          $avg: { $subtract: ['$endTime', '$startTime'] },
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalSessions,
      avgDuration: avgDuration.length > 0 ? avgDuration[0].avgDuration : 0,
      sessionsByDate,
      topPages,
      topWriteAttempts,
    },
  });
});

/**
 * Record the end of a guest session
 * Called when guest logs out or their session times out
 */
export const endGuestSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  await Analytics.findOneAndUpdate(
    { sessionId },
    { $set: { endTime: new Date() } }
  );

  res.status(200).json({
    success: true,
    message: 'Guest session ended successfully',
  });
});

/**
 * Deletes analytics data older than the specified retention period
 * This function is meant to be called from a scheduled task, not an API endpoint
 *
 * @param {number} days - Number of days to retain data (default 90)
 * @returns {Promise<{deleted: number, error: Error | null}>} Result of the cleanup operation
 */
export const cleanupOldAnalytics = async (days = 90) => {
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Delete old sessions
    const result = await Analytics.deleteMany({
      // Delete either sessions that ended before cutoff date
      $or: [
        { endTime: { $lt: cutoffDate } },
        // Or sessions that started before cutoff date AND never ended
        // (these are likely abandoned or crashed sessions)
        {
          startTime: { $lt: cutoffDate },
          endTime: { $exists: false },
        },
      ],
    });

    return { deleted: result.deletedCount, error: null };
  } catch (error) {
    console.error('Error cleaning up old analytics data:', error);
    return { deleted: 0, error };
  }
};
