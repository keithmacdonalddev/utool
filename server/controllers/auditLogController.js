import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middleware/async.js';
import { logger } from '../utils/logger.js';

/**
 * Get all audit logs with enhanced filtering options
 * Supports filtering by new fields: eventCategory, severityLevel, journeyId, etc.
 *
 * @route   GET /api/v1/audit-logs
 * @access  Private/Admin
 */
export const getAuditLogs = asyncHandler(async (req, res, next) => {
  logger.info('Audit Log Request Query:', { query: req.query });

  // Copy req.query
  const reqQuery = { ...req.query };

  // Convert timestamp[gte]/timestamp[lte] to MongoDB format
  if (reqQuery['timestamp[gte]'] || reqQuery['timestamp[lte]']) {
    reqQuery.timestamp = {};

    // Process start timestamp (>=)
    if (reqQuery['timestamp[gte]']) {
      const startDate = new Date(reqQuery['timestamp[gte]']);
      reqQuery.timestamp.$gte = startDate;
      logger.info(`Start date filter: ${startDate.toISOString()}`, {
        readableDate: startDate.toLocaleString(),
      });
      delete reqQuery['timestamp[gte]'];
    }

    // Process end timestamp (<=)
    if (reqQuery['timestamp[lte]']) {
      const endDate = new Date(reqQuery['timestamp[lte]']);
      reqQuery.timestamp.$lte = endDate;
      logger.info(`End date filter: ${endDate.toISOString()}`, {
        readableDate: endDate.toLocaleString(),
      });
      delete reqQuery['timestamp[lte]'];
    }
  }

  // Handle eventCategory filter
  if (reqQuery.eventCategory) {
    // Allow comma-separated values for multiple categories
    if (reqQuery.eventCategory.includes(',')) {
      reqQuery.eventCategory = { $in: reqQuery.eventCategory.split(',') };
    }
  }

  // Handle severityLevel filter
  if (reqQuery.severityLevel) {
    // Allow comma-separated values for multiple severity levels
    if (reqQuery.severityLevel.includes(',')) {
      reqQuery.severityLevel = { $in: reqQuery.severityLevel.split(',') };
    }
  }

  // Handle resourceType filter in stateChanges
  if (reqQuery.resourceType) {
    reqQuery['stateChanges.resourceType'] = reqQuery.resourceType;
    delete reqQuery.resourceType;
  }

  // Handle resourceId filter in stateChanges
  if (reqQuery.resourceId) {
    reqQuery['stateChanges.resourceId'] = reqQuery.resourceId;
    delete reqQuery.resourceId;
  }

  // Handle changedFields filter
  if (reqQuery.changedFields) {
    reqQuery['stateChanges.changedFields'] = {
      $in: reqQuery.changedFields.split(','),
    };
    delete reqQuery.changedFields;
  }

  // Fields to exclude from query string processing
  const removeFields = [
    'select',
    'sort',
    'page',
    'limit',
    'group',
    'journey',
    'report',
    'businessOperation',
  ];
  removeFields.forEach((param) => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);
  logger.info('MongoDB Query String:', { queryString: queryStr });

  // Parse back to object for logging
  const parsedQuery = JSON.parse(queryStr);
  logger.info('MongoDB Query Object:', { queryObject: parsedQuery });

  // Initialize query
  let query = AuditLog.find(JSON.parse(queryStr));

  // Business Operation Filters
  if (req.query.businessOperation) {
    switch (req.query.businessOperation) {
      case 'security':
        // Security-related events (login attempts, permission changes)
        query = query.find({
          $or: [
            { eventCategory: 'authentication' },
            { eventCategory: 'security' },
            { eventCategory: 'permission' },
            { severityLevel: 'critical' },
          ],
        });
        break;
      case 'userActivity':
        // User activity tracking
        query = query
          .find({
            eventCategory: { $in: ['data_access', 'data_modification'] },
          })
          .sort('-timestamp');
        break;
      case 'systemChanges':
        // System configuration and administration changes
        query = query.find({
          eventCategory: { $in: ['configuration', 'system'] },
        });
        break;
      case 'failedOperations':
        // All failed operations
        query = query.find({ status: 'failed' });
        break;
      case 'criticalEvents':
        // All critical severity events
        query = query.find({ severityLevel: 'critical' });
        break;
    }
  }

  // Group by journey if requested
  if (req.query.journey === 'true') {
    try {
      // First check if we have actual journeyId values in the database that are valid for grouping
      // (non-null, non-empty string values that appear on multiple logs)
      const journeyIdCheck = await AuditLog.aggregate([
        {
          $match: {
            journeyId: { $exists: true, $ne: null, $ne: '' },
          },
        },
        {
          $group: {
            _id: '$journeyId',
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 }, // Only consider journeyIds that appear in multiple logs
          },
        },
        { $limit: 1 },
      ]);

      const hasUsableJourneyIds = journeyIdCheck.length > 0;

      // Use the safeStringify for safer logging
      logger.info(
        `Journey view requested. Database has usable journeyId values: ${hasUsableJourneyIds}`
      );

      // If we don't have usable journeyId values, use userId + session-like grouping
      let journeyAggregation;
      let journeys = [];
      let usingSyntheticJourneys = false;

      // Try the explicit journeyId approach first
      if (hasUsableJourneyIds) {
        // Use existing journeyId field for grouping
        journeyAggregation = [
          { $match: JSON.parse(queryStr) },
          { $match: { journeyId: { $exists: true, $ne: null, $ne: '' } } }, // Ensure valid journeyIds
          { $sort: { timestamp: -1 } },
          {
            $group: {
              _id: '$journeyId',
              firstEvent: { $first: '$timestamp' },
              lastEvent: { $last: '$timestamp' },
              count: { $sum: 1 },
              sampleEvent: { $first: '$$ROOT' },
            },
          },
          { $sort: { firstEvent: -1 } },
        ];

        // Execute aggregation with try/catch for better error handling
        try {
          journeys = await AuditLog.aggregate(journeyAggregation);
          logger.info(
            `Found ${journeys.length} journeys using explicit journeyIds`
          );
        } catch (aggregateError) {
          logger.error(
            `Error during journey aggregation with explicit journeyIds: ${aggregateError.message}`,
            {
              error: logger.sanitizeForLogging(aggregateError),
            }
          );
          journeys = []; // Reset to trigger fallback method
        }
      }

      if (journeys.length === 0) {
        logger.info(
          'No journeys found with explicit journeyIds - using synthetic journey grouping by user+time'
        );
        usingSyntheticJourneys = true;

        // Alternative grouping: Group by userId and time proximity (session-like)
        // This approach avoids using $function which isn't available in some Atlas tiers
        // and implements optimizations for large datasets
        try {
          // Add time window enforcement to prevent excessive processing
          const MAX_TIME_WINDOW_DAYS = 7; // Maximum number of days to allow in a query
          const queryStartDate = parsedQuery.timestamp?.$gte
            ? new Date(parsedQuery.timestamp.$gte)
            : new Date(Date.now() - 24 * 60 * 60 * 1000);
          const queryEndDate = parsedQuery.timestamp?.$lte
            ? new Date(parsedQuery.timestamp.$lte)
            : new Date();

          // Calculate query time span in days
          const queryTimeSpanDays = Math.ceil(
            (queryEndDate - queryStartDate) / (24 * 60 * 60 * 1000)
          );

          // Initialize allEvents at the top level so it's available in all code paths
          let allEvents = [];

          // If time window is too large, either reject or constrain the query
          if (queryTimeSpanDays > MAX_TIME_WINDOW_DAYS) {
            logger.warn(
              `Requested time window (${queryTimeSpanDays} days) exceeds maximum allowed (${MAX_TIME_WINDOW_DAYS} days). Constraining to last ${MAX_TIME_WINDOW_DAYS} days.`
            );

            // Adjust the query to use the maximum allowed time window
            const constrainedQuery = { ...JSON.parse(queryStr) };
            constrainedQuery.timestamp = constrainedQuery.timestamp || {};
            constrainedQuery.timestamp.$gte = new Date(
              queryEndDate.getTime() -
                MAX_TIME_WINDOW_DAYS * 24 * 60 * 60 * 1000
            );
            constrainedQuery.timestamp.$lte = queryEndDate;

            // Fetch events with the constrained time window
            allEvents = await AuditLog.find(constrainedQuery)
              .sort({ userId: 1, timestamp: 1 })
              .select(
                '_id userId timestamp action status ipAddress eventCategory severityLevel'
              ) // Only select necessary fields
              .lean();

            logger.info(
              `Retrieved ${allEvents.length} events for journey analysis with constrained time window`
            );
          } else {
            // Original query can proceed as is within allowed time window
            // First fetch all matching events sorted by user and time, but with limited fields
            allEvents = await AuditLog.find(JSON.parse(queryStr))
              .sort({ userId: 1, timestamp: 1 })
              .select(
                '_id userId timestamp action status ipAddress eventCategory severityLevel'
              ) // Only select necessary fields
              .lean();

            logger.info(
              `Retrieved ${allEvents.length} events for journey analysis`
            );
          }

          // Event sampling for very large datasets
          const MAX_EVENTS_PER_USER = 500; // Maximum events to process per user

          // Group events by userId first
          const eventsByUser = {};
          allEvents.forEach((event) => {
            const userId = event.userId ? event.userId.toString() : 'anonymous';
            if (!eventsByUser[userId]) {
              eventsByUser[userId] = [];
            }
            eventsByUser[userId].push(event);
          });

          // For users with too many events, sample them
          Object.keys(eventsByUser).forEach((userId) => {
            const userEvents = eventsByUser[userId];
            if (userEvents.length > MAX_EVENTS_PER_USER) {
              logger.info(
                `User ${userId} has ${userEvents.length} events, exceeding the maximum of ${MAX_EVENTS_PER_USER}. Sampling events.`
              );

              // Keep first and last events to maintain journey boundaries
              const firstEvents = userEvents.slice(
                0,
                Math.floor(MAX_EVENTS_PER_USER * 0.1)
              );
              const lastEvents = userEvents.slice(
                -Math.floor(MAX_EVENTS_PER_USER * 0.1)
              );

              // Sample events from the middle
              const middleEventsCount =
                MAX_EVENTS_PER_USER - firstEvents.length - lastEvents.length;
              const stride = Math.ceil(
                (userEvents.length - firstEvents.length - lastEvents.length) /
                  middleEventsCount
              );

              const sampledMiddleEvents = [];
              for (
                let i = firstEvents.length;
                i < userEvents.length - lastEvents.length;
                i += stride
              ) {
                if (sampledMiddleEvents.length < middleEventsCount) {
                  sampledMiddleEvents.push(userEvents[i]);
                }
              }

              // Replace the user's events with the sampled version
              eventsByUser[userId] = [
                ...firstEvents,
                ...sampledMiddleEvents,
                ...lastEvents,
              ];

              logger.info(
                `Sampled ${eventsByUser[userId].length} events for user ${userId}`
              );
            }
          });

          // For each user, create synthetic journeys based on time gaps
          const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
          const syntheticJourneys = [];

          Object.keys(eventsByUser).forEach((userId) => {
            const userEvents = eventsByUser[userId];
            if (userEvents.length <= 1) return; // Skip users with only one event

            let currentJourney = [userEvents[0]];
            let previousTime = new Date(userEvents[0].timestamp);

            // Group events that are close in time
            for (let i = 1; i < userEvents.length; i++) {
              const event = userEvents[i];
              const eventTime = new Date(event.timestamp);

              if (eventTime - previousTime > SESSION_TIMEOUT_MS) {
                // If there's a significant time gap, end current journey and start a new one
                if (currentJourney.length > 1) {
                  // Only include journeys with multiple events
                  const journeyId = `${userId}-${currentJourney[0]._id}`;
                  const firstEvent = new Date(currentJourney[0].timestamp);
                  const lastEvent = new Date(
                    currentJourney[currentJourney.length - 1].timestamp
                  );

                  // Create journey summary statistics
                  const actionCounts = {};
                  const categoryCounts = {};
                  const severityCounts = {};

                  currentJourney.forEach((e) => {
                    // Count by action
                    if (e.action) {
                      actionCounts[e.action] =
                        (actionCounts[e.action] || 0) + 1;
                    }

                    // Count by category
                    if (e.eventCategory) {
                      categoryCounts[e.eventCategory] =
                        (categoryCounts[e.eventCategory] || 0) + 1;
                    }

                    // Count by severity
                    if (e.severityLevel) {
                      severityCounts[e.severityLevel] =
                        (severityCounts[e.severityLevel] || 0) + 1;
                    }
                  });

                  // Add summary data to journey
                  syntheticJourneys.push({
                    _id: journeyId,
                    userId,
                    firstEvent,
                    lastEvent,
                    count: currentJourney.length,
                    // Store only the first 10 event IDs initially to save memory
                    // The rest will be loaded on demand when viewing journey details
                    eventIds: currentJourney.slice(0, 10).map((e) => e._id),
                    // If journey is large, store total count but note that we're only keeping some IDs
                    hasMoreEvents: currentJourney.length > 10,
                    totalEventCount: currentJourney.length,
                    // Include summary data
                    summary: {
                      actionCounts,
                      categoryCounts,
                      severityCounts,
                      // Sample events for preview (first, last, and some middle ones)
                      sampleEvents: [
                        currentJourney[0],
                        ...(currentJourney.length > 2
                          ? [
                              currentJourney[
                                Math.floor(currentJourney.length / 2)
                              ],
                            ]
                          : []),
                        ...(currentJourney.length > 1
                          ? [currentJourney[currentJourney.length - 1]]
                          : []),
                      ],
                    },
                  });
                }
                currentJourney = [event];
              } else {
                currentJourney.push(event);
              }
              previousTime = eventTime;
            }

            // Don't forget to add the last journey
            if (currentJourney.length > 1) {
              const journeyId = `${userId}-${currentJourney[0]._id}`;
              const firstEvent = new Date(currentJourney[0].timestamp);
              const lastEvent = new Date(
                currentJourney[currentJourney.length - 1].timestamp
              );

              // Create journey summary statistics
              const actionCounts = {};
              const categoryCounts = {};
              const severityCounts = {};

              currentJourney.forEach((e) => {
                // Count by action
                if (e.action) {
                  actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
                }

                // Count by category
                if (e.eventCategory) {
                  categoryCounts[e.eventCategory] =
                    (categoryCounts[e.eventCategory] || 0) + 1;
                }

                // Count by severity
                if (e.severityLevel) {
                  severityCounts[e.severityLevel] =
                    (severityCounts[e.severityLevel] || 0) + 1;
                }
              });

              syntheticJourneys.push({
                _id: journeyId,
                userId,
                firstEvent,
                lastEvent,
                count: currentJourney.length,
                // Store only the first 10 event IDs initially to save memory
                eventIds: currentJourney.slice(0, 10).map((e) => e._id),
                // If journey is large, store total count but note that we're only keeping some IDs
                hasMoreEvents: currentJourney.length > 10,
                totalEventCount: currentJourney.length,
                // Include summary data
                summary: {
                  actionCounts,
                  categoryCounts,
                  severityCounts,
                  // Sample events for preview
                  sampleEvents: [
                    currentJourney[0],
                    ...(currentJourney.length > 2
                      ? [currentJourney[Math.floor(currentJourney.length / 2)]]
                      : []),
                    ...(currentJourney.length > 1
                      ? [currentJourney[currentJourney.length - 1]]
                      : []),
                  ],
                },
              });
            }
          });

          // Sort synthetic journeys by the most recent first
          journeys = syntheticJourneys.sort(
            (a, b) => b.firstEvent - a.firstEvent
          );

          logger.info(
            `Created ${journeys.length} synthetic journeys based on time proximity`
          );
        } catch (syntheticAggregateError) {
          // Enhanced error handling with safe logging
          const safeError = {
            message: syntheticAggregateError.message,
            name: syntheticAggregateError.name,
            stack: syntheticAggregateError.stack,
          };

          logger.error(
            `Error during synthetic journey aggregation: ${syntheticAggregateError.message}`,
            { safeError }
          );

          // Return an empty result as fallback if both methods fail
          journeys = [];
        }
      }

      // If we still have no journeys after trying both methods, return empty result
      if (journeys.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          message: 'No journeys found with the current filter criteria',
          data: [],
        });
      }

      // Paginate journeys
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      // Get paginated journey details
      const paginatedJourneys = journeys.slice(startIndex, endIndex);
      logger.info(
        `Returning ${paginatedJourneys.length} journeys after pagination`
      );

      // For each journey, get its events - try/catch added to handle errors during population
      const journeyDetails = await Promise.all(
        paginatedJourneys.map(async (journey) => {
          try {
            // Different query based on whether we're using real journeyIds or synthetic ones
            let events;

            if (!usingSyntheticJourneys) {
              events = await AuditLog.find({ journeyId: journey._id })
                .sort('timestamp')
                .populate('userId', 'name email role');
            } else {
              // For synthetic journeys, use the event IDs we saved
              events = await AuditLog.find({
                _id: { $in: journey.eventIds },
              })
                .sort('timestamp')
                .populate('userId', 'name email role');
            }

            return {
              journeyId: journey._id,
              firstEvent: journey.firstEvent,
              lastEvent: journey.lastEvent,
              duration:
                (new Date(journey.lastEvent) - new Date(journey.firstEvent)) /
                1000,
              count: journey.count,
              userId: events[0]?.userId || null,
              events,
            };
          } catch (journeyDetailError) {
            // If there's an error with an individual journey, return a placeholder with error info
            logger.error(
              `Error retrieving details for journey ${journey._id}: ${journeyDetailError.message}`
            );
            return {
              journeyId: journey._id,
              firstEvent: journey.firstEvent,
              lastEvent: journey.lastEvent,
              count: journey.count,
              error: 'Error retrieving journey details',
            };
          }
        })
      );

      // Pagination
      const pagination = {};
      if (endIndex < journeys.length) {
        pagination.next = { page: page + 1, limit };
      }
      if (startIndex > 0) {
        pagination.prev = { page: page - 1, limit };
      }

      return res.status(200).json({
        success: true,
        count: journeys.length,
        pagination,
        data: journeyDetails,
      });
    } catch (error) {
      // Handle errors gracefully with proper error logging
      logger.error(`Error processing journey view: ${error.message}`, {
        error: logger.sanitizeForLogging(error),
        query: logger.sanitizeForLogging(req.query),
      });
      return next(new ErrorResponse('Error processing journey view', 500));
    }
  }

  // Generate user activity reports if requested
  if (req.query.report === 'userActivity') {
    // Time range for the report (default: last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(
      startDate.getDate() - (parseInt(req.query.days, 10) || 30)
    );

    // Aggregate user activity
    const userActivity = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          userId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalActions: { $sum: 1 },
          firstAction: { $min: '$timestamp' },
          lastAction: { $max: '$timestamp' },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          // Count by category
          authCount: {
            $sum: {
              $cond: [{ $eq: ['$eventCategory', 'authentication'] }, 1, 0],
            },
          },
          dataAccessCount: {
            $sum: { $cond: [{ $eq: ['$eventCategory', 'data_access'] }, 1, 0] },
          },
          dataModCount: {
            $sum: {
              $cond: [{ $eq: ['$eventCategory', 'data_modification'] }, 1, 0],
            },
          },
          // Count by severity
          criticalCount: {
            $sum: { $cond: [{ $eq: ['$severityLevel', 'critical'] }, 1, 0] },
          },
          warningCount: {
            $sum: { $cond: [{ $eq: ['$severityLevel', 'warning'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalActions: -1 } },
    ]);

    // Populate user details
    const userIds = userActivity.map((item) => item._id);
    const users = await User.find({ _id: { $in: userIds } }).select(
      'username firstName lastName email role' // UPDATED
    );

    // Map user details to activity
    const reportData = userActivity.map((activity) => {
      const user = users.find(
        (u) => u._id.toString() === activity._id.toString()
      );
      return {
        user: user
          ? {
              _id: user._id,
              username: user.username, // UPDATED
              firstName: user.firstName, // ADDED
              lastName: user.lastName, // ADDED
              email: user.email,
              role: user.role,
            }
          : {
              _id: activity._id,
              username: 'Unknown User',
              firstName: 'Unknown',
              lastName: 'User',
            }, // UPDATED to include fallbacks
        stats: {
          totalActions: activity.totalActions,
          successRate:
            ((activity.successCount / activity.totalActions) * 100).toFixed(1) +
            '%',
          firstAction: activity.firstAction,
          lastAction: activity.lastAction,
          daysSinceLastAction: Math.floor(
            (new Date() - new Date(activity.lastAction)) / (1000 * 60 * 60 * 24)
          ),
          actionBreakdown: {
            authCount: activity.authCount,
            dataAccessCount: activity.dataAccessCount,
            dataModCount: activity.dataModCount,
          },
          severityBreakdown: {
            criticalCount: activity.criticalCount,
            warningCount: activity.warningCount,
            infoCount:
              activity.totalActions -
              activity.criticalCount -
              activity.warningCount,
          },
        },
      };
    });

    return res.status(200).json({
      success: true,
      reportType: 'userActivity',
      timeRange: {
        start: startDate,
        end: endDate,
        days: parseInt(req.query.days, 10) || 30,
      },
      count: reportData.length,
      data: reportData,
    });
  }

  // Normal query execution (when not using journey grouping or reports)
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
    query = query.sort('-timestamp'); // Default sort
  }

  // Populate user details - UPDATED
  query = query.populate('user', 'username firstName lastName email');

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // Count all matching documents first
  const total = await AuditLog.countDocuments(JSON.parse(queryStr));
  logger.info(`Total matching logs found: ${total}`);

  // Skip and limit for pagination
  query = query.skip(startIndex).limit(limit);

  // Execute query
  const auditLogs = await query;
  logger.info(`Retrieved ${auditLogs.length} audit logs`);

  // For debugging, show the time range of returned logs
  if (auditLogs.length > 0) {
    const oldestLog = new Date(
      Math.min(...auditLogs.map((log) => new Date(log.timestamp)))
    );
    const newestLog = new Date(
      Math.max(...auditLogs.map((log) => new Date(log.timestamp)))
    );

    logger.info(`Oldest log timestamp: ${oldestLog.toLocaleString()}`);
    logger.info(`Newest log timestamp: ${newestLog.toLocaleString()}`);

    if (parsedQuery.timestamp && parsedQuery.timestamp.$gte) {
      const startFilter = new Date(parsedQuery.timestamp.$gte);
      logger.info(
        `Oldest log is ${Math.round(
          (oldestLog - startFilter) / (1000 * 60)
        )} minutes after filter start`
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

/**
 * Advanced search for audit logs with improved text search
 *
 * @route   GET /api/v1/audit-logs/search
 * @access  Private/Admin
 */
export const searchAuditLogs = asyncHandler(async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return next(new ErrorResponse('Please provide a search term', 400));
  }

  // Enhanced text search including description and stateChanges.resourceType
  const logs = await AuditLog.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .populate('user', 'username firstName lastName email')
    .limit(50);

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

/**
 * Get available filter options for the audit log UI
 * This helps populate filter dropdowns and enables dynamic filtering
 *
 * @route   GET /api/v1/audit-logs/filters
 * @access  Private/Admin
 */
export const getAuditLogFilters = asyncHandler(async (req, res) => {
  // Get unique values for various fields to populate filter options
  const [eventCategories, severityLevels, actions, resourceTypes, userRoles] =
    await Promise.all([
      // Get distinct event categories
      AuditLog.distinct('eventCategory'),
      // Get distinct severity levels
      AuditLog.distinct('severityLevel'),
      // Get distinct actions
      AuditLog.distinct('action'),
      // Get distinct resource types
      AuditLog.distinct('stateChanges.resourceType'),
      // Get distinct user roles that performed actions
      AuditLog.distinct('userContext.role'),
    ]);

  // Define business operation filters for the UI
  const businessOperations = [
    {
      id: 'security',
      name: 'Security Events',
      description: 'Authentication and permission-related events',
    },
    {
      id: 'userActivity',
      name: 'User Activity',
      description: 'Data access and modification events',
    },
    {
      id: 'systemChanges',
      name: 'System Changes',
      description: 'Configuration and system-level changes',
    },
    {
      id: 'failedOperations',
      name: 'Failed Operations',
      description: 'All operations that failed',
    },
    {
      id: 'criticalEvents',
      name: 'Critical Events',
      description: 'All events with critical severity',
    },
  ];

  res.status(200).json({
    success: true,
    data: {
      eventCategories,
      severityLevels,
      actions,
      resourceTypes,
      userRoles,
      businessOperations,
    },
  });
});

/**
 * Delete audit logs by date range
 *
 * @route   DELETE /api/v1/audit-logs
 * @access  Private/Admin
 */
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

/**
 * Get activity summary for a specific user
 * Provides a detailed breakdown of user's actions over time
 *
 * @route   GET /api/v1/audit-logs/users/:userId/summary
 * @access  Private/Admin
 */
export const getUserActivitySummary = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { days = 30 } = req.query;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days, 10));

  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse(`User not found with id ${userId}`, 404));
  }

  // Get user's audit logs
  const userLogs = await AuditLog.find({
    userId,
    timestamp: { $gte: startDate, $lte: endDate },
  }).sort('timestamp');

  if (!userLogs.length) {
    return res.status(200).json({
      success: true,
      message: `No activity found for user ${userId} in the last ${days} days`,
      data: {
        user: {
          _id: user._id,
          username: user.username, // UPDATED
          firstName: user.firstName, // ADDED
          lastName: user.lastName, // ADDED
          email: user.email,
          role: user.role,
        },
        summary: {
          totalActions: 0,
          daysCovered: parseInt(days, 10),
          activityBreakdown: {},
        },
      },
    });
  }

  // Calculate activity metrics
  const activityByDay = {};
  const activityByCategory = {};
  const activityByAction = {};

  userLogs.forEach((log) => {
    // Group by day
    const day = new Date(log.timestamp).toISOString().split('T')[0];
    activityByDay[day] = (activityByDay[day] || 0) + 1;

    // Group by category
    const category = log.eventCategory || 'unknown';
    activityByCategory[category] = (activityByCategory[category] || 0) + 1;

    // Group by action
    const action = log.action || 'unknown';
    activityByAction[action] = (activityByAction[action] || 0) + 1;
  });

  // Calculate most active periods
  const mostActiveDay = Object.entries(activityByDay).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const mostFrequentAction = Object.entries(activityByAction).sort(
    (a, b) => b[1] - a[1]
  )[0];

  // Get first and last activity
  const firstActivity = userLogs[0];
  const lastActivity = userLogs[userLogs.length - 1];

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        username: user.username, // UPDATED
        firstName: user.firstName, // ADDED
        lastName: user.lastName, // ADDED
        email: user.email,
        role: user.role,
      },
      summary: {
        totalActions: userLogs.length,
        firstActivity: firstActivity.timestamp,
        lastActivity: lastActivity.timestamp,
        daysCovered: parseInt(days, 10),
        mostActiveDay: {
          date: mostActiveDay?.[0],
          count: mostActiveDay?.[1] || 0,
        },
        mostFrequentAction: {
          action: mostFrequentAction?.[0],
          count: mostFrequentAction?.[1] || 0,
        },
        activityBreakdown: {
          byDay: activityByDay,
          byCategory: activityByCategory,
          byAction: activityByAction,
          byStatus: {
            success: userLogs.filter((l) => l.status === 'success').length,
            failed: userLogs.filter((l) => l.status === 'failed').length,
            pending: userLogs.filter((l) => l.status === 'pending').length,
          },
          bySeverity: {
            info: userLogs.filter((l) => l.severityLevel === 'info').length,
            warning: userLogs.filter((l) => l.severityLevel === 'warning')
              .length,
            critical: userLogs.filter((l) => l.severityLevel === 'critical')
              .length,
          },
        },
      },
    },
  });
});

/**
 * Get related audit logs for a specific resource
 * Useful for viewing the complete history of changes to a resource
 *
 * @route   GET /api/v1/audit-logs/resources/:resourceType/:resourceId
 * @access  Private/Admin
 */
export const getResourceAuditLogs = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params;

  const logs = await AuditLog.find({
    'stateChanges.resourceType': resourceType,
    'stateChanges.resourceId': resourceId,
  })
    .sort('-timestamp')
    .populate('user', 'username firstName lastName email');

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

/**
 * Create a new audit log entry
 *
 * @route   POST /api/v1/audit-logs
 * @access  Private/Admin
 */
export const createAuditLogEntry = asyncHandler(async (req, res, next) => {
  const {
    action,
    resourceType,
    resourceId,
    status,
    ipAddress,
    userAgent,
    context,
    details,
    eventCategory,
    severityLevel,
    journeyId,
    clientInfo,
    performanceMetrics,
    stateChanges,
  } = req.body;

  try {
    // Validate required fields
    if (!action || !resourceType || !resourceId) {
      return next(
        new ErrorResponse(
          'Action, resourceType, and resourceId are required',
          400
        )
      );
    }

    // Create audit log entry
    const log = await AuditLog.create({
      action,
      resourceType,
      resourceId,
      status,
      ipAddress,
      userAgent,
      context,
      details,
      eventCategory: eventCategory || 'general',
      severityLevel: severityLevel || 'info',
      journeyId,
      clientInfo,
      performanceMetrics,
      stateChanges,
      timestamp: new Date(),
      // user: req.user ? req.user._id : null, // This was for the route handler, remove from helper
    });

    // Populate userDetails if userId or user object is available in logData for the helper
    if (logData.user) {
      log.userId = logData.user._id;
      log.userDetails = {
        username: logData.user.username,
        firstName: logData.user.firstName,
        lastName: logData.user.lastName,
        email: logData.user.email,
      };
    } else if (logData.userId) {
      log.userId = logData.userId;
      try {
        const foundUser = await User.findById(logData.userId).select(
          'username firstName lastName email'
        );
        if (foundUser) {
          log.userDetails = {
            username: foundUser.username,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            email: foundUser.email,
          };
        }
      } catch (error) {
        logger.warn(
          `Could not fetch userDetails for userId ${logData.userId} in audit log: ${error.message}`
        );
      }
    }
    await log.save(); // Save again to persist userDetails if added

    logger.info(
      `Audit log created: ${log.action} for ${log.resourceType}:${log.resourceId}`,
      { auditLogId: log._id }
    );
    return log;
  } catch (error) {
    logger.error('Error creating audit log entry:', error);
    return next(new ErrorResponse('Error creating audit log entry', 500));
  }
});

/**
 * Create a new audit log entry (ROUTE HANDLER - POST /api/v1/audit-logs)
 *
 * @route   POST /api/v1/audit-logs
 * @access  Private/Admin
 */
export const createAuditLog = asyncHandler(async (req, res, next) => {
  // Renamed from createAuditLogEntry to createAuditLog to avoid conflict
  const {
    action,
    resourceType,
    resourceId,
    status,
    ipAddress,
    userAgent,
    context,
    details,
    eventCategory,
    severityLevel,
    journeyId,
    clientInfo,
    performanceMetrics,
    stateChanges,
  } = req.body;

  try {
    // Validate required fields
    if (!action || !resourceType || !resourceId) {
      return next(
        new ErrorResponse(
          'Action, resourceType, and resourceId are required',
          400
        )
      );
    }

    const logData = {
      action,
      resourceType,
      resourceId,
      status,
      ipAddress,
      userAgent,
      context,
      details,
      eventCategory: eventCategory || 'general',
      severityLevel: severityLevel || 'info',
      journeyId,
      clientInfo,
      performanceMetrics,
      stateChanges,
      user: req.user, // Pass the full req.user object to the helper
    };

    // Use the helper function to create the entry
    const log = await createAuditLogEntry(logData);

    res.status(201).json({
      success: true,
      data: log,
    });
  } catch (error) {
    logger.error('Error creating audit log entry via route:', error);
    return next(new ErrorResponse('Error creating audit log entry', 500));
  }
});

/**
 * Get a specific audit log by ID
 *
 * @route   GET /api/v1/audit-logs/:id
 * @access  Private/Admin
 */
export const getAuditLogById = asyncHandler(async (req, res, next) => {
  const auditLog = await AuditLog.findById(req.params.id).populate(
    'user',
    'username firstName lastName email' // UPDATED
  );

  if (!auditLog) {
    return next(new ErrorResponse('Audit log not found', 404));
  }

  res.status(200).json({
    success: true,
    data: auditLog,
  });
});

/**
 * Get audit logs for a specific user
 *
 * @route   GET /api/v1/audit-logs/users/:userId
 * @access  Private/Admin
 */
export const getAuditLogsByUser = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;

  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
  }

  // Base query for audit logs by this user
  let query = AuditLog.find({ userId });

  // Populate user details - UPDATED
  query = query.populate('user', 'username firstName lastName email');

  // Sorting (default to newest first)
  query = query.sort(req.query.sort || '-timestamp');

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // Count total documents for this user
  const total = await query.countDocuments();

  // Paginate
  query = query.skip(startIndex).limit(limit);

  // Execute query
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

/**
 * Get audit logs for a specific journey
 *
 * @route   GET /api/v1/audit-logs/journeys/:journeyId
 * @access  Private/Admin
 */
export const getAuditLogJourney = asyncHandler(async (req, res, next) => {
  const journeyId = req.params.journeyId;

  const logs = await AuditLog.find({ journeyId })
    .sort('timestamp')
    .populate('user', 'username firstName lastName email'); // UPDATED

  if (!logs || logs.length === 0) {
    return next(new ErrorResponse('No logs found for this journey', 404));
  }

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

/**
 * Create a login audit log entry
 *
 * @route   POST /api/v1/audit-logs/login
 * @access  Private
 */
export const createAuditLogEntryForLogin = async (
  userId,
  status,
  ipAddress,
  userAgent,
  loginMethod = 'password',
  context = 'User login attempt',
  user, // Pass the full user object if available
  journeyId,
  clientInfo
) => {
  // userDetails will be populated by the main createAuditLogEntry helper
  return createAuditLogEntry({
    userId, // Keep userId for direct linking if user object is not yet populated
    user, // Pass the full user object
    action: 'login',
    resourceType: 'authentication',
    resourceId: userId,
    status,
    ipAddress,
    userAgent,
    context,
    details: { loginMethod },
    eventCategory: 'authentication',
    severityLevel: status === 'success' ? 'info' : 'warning',
    journeyId,
    clientInfo,
  });
};

/**
 * Create a logout audit log entry
 *
 * @route   POST /api/v1/audit-logs/logout
 * @access  Private
 */
export const createAuditLogEntryForLogout = async (
  req, // Pass the Express request object
  userId,
  status = 'success',
  context = 'User logout',
  journeyId,
  clientInfo
) => {
  // userDetails will be populated by the main createAuditLogEntry helper
  return createAuditLogEntry({
    user: req.user, // Pass the full req.user object
    action: 'logout',
    resourceType: 'authentication',
    resourceId: userId,
    status,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    context,
    eventCategory: 'authentication',
    severityLevel: 'info',
    journeyId,
    clientInfo,
  });
};

/**
 * Create a system event audit log entry
 *
 * @route   POST /api/v1/audit-logs/system
 * @access  Private/Admin
 */
export const createAuditLogEntryForSystemEvent = async (
  action,
  status,
  details,
  resourceType = 'System',
  resourceId = null,
  severityLevel = 'info',
  userId = null, // Optional: ID of user initiating or related to the system event
  context = 'System event',
  journeyId,
  clientInfo
) => {
  const logData = {
    action,
    resourceType,
    resourceId,
    status,
    details,
    eventCategory: 'system',
    severityLevel,
    context,
    journeyId,
    clientInfo,
    userId, // Pass userId, userDetails will be fetched by helper if needed
  };

  return createAuditLogEntry(logData);
};
