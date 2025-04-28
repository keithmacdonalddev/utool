// archiveController.js - Controller for archive-related operations
// This file implements the business logic for archiving completed items and retrieving archive data

import Archive from '../models/Archive.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Note from '../models/Note.js';
import Bookmark from '../models/Bookmark.js';
import Snippet from '../models/Snippet.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Archive a completed item
 * @route   POST /api/v1/archive
 * @access  Private
 *
 * This function moves a completed item to the archive.
 * It's called when an item is marked as completed.
 */
export const archiveItem = async (req, res, next) => {
  const { itemType, itemId } = req.body;

  // Basic input validation
  if (!itemType || !itemId) {
    return next(new ErrorResponse('Item type and item ID are required', 400));
  }

  // Validate item type
  const validItemTypes = ['task', 'project', 'note', 'bookmark', 'snippet'];
  if (!validItemTypes.includes(itemType)) {
    return next(
      new ErrorResponse(
        `Invalid item type. Must be one of: ${validItemTypes.join(', ')}`,
        400
      )
    );
  }

  logger.verbose(`Attempting to archive ${itemType}`, {
    userId: req.user.id,
    itemId,
    itemType,
  });

  try {
    // Get the appropriate model based on item type
    let Model;
    switch (itemType) {
      case 'task':
        Model = Task;
        break;
      case 'project':
        Model = Project;
        break;
      case 'note':
        Model = Note;
        break;
      case 'bookmark':
        Model = Bookmark;
        break;
      case 'snippet':
        Model = Snippet;
        break;
      default:
        // This should never execute due to earlier validation
        return next(new ErrorResponse(`Invalid item type: ${itemType}`, 400));
    }

    // Find the item in its original collection
    const item = await Model.findById(itemId);

    // Handle case where item doesn't exist
    if (!item) {
      logger.warn(`${itemType} not found for archiving`, {
        userId: req.user.id,
        itemId,
        itemType,
      });
      return next(
        new ErrorResponse(`${itemType} not found with id ${itemId}`, 404)
      );
    }

    // Check if user is authorized to archive this item
    const isAuthorized = await isUserAuthorizedForItem(
      req.user.id,
      item,
      itemType
    );
    if (!isAuthorized) {
      logger.warn(`Unauthorized attempt to archive ${itemType}`, {
        userId: req.user.id,
        itemId,
        itemType,
      });
      return next(
        new ErrorResponse(`Not authorized to archive this ${itemType}`, 403)
      );
    }

    // Check if the item is already completed
    // Only tasks and projects have status field
    if (
      (itemType === 'task' || itemType === 'project') &&
      item.status !== 'Completed'
    ) {
      logger.warn(`Attempt to archive incomplete ${itemType}`, {
        userId: req.user.id,
        itemId,
        itemType,
        status: item.status,
      });
      return next(
        new ErrorResponse(
          `Cannot archive ${itemType} that is not completed`,
          400
        )
      );
    }

    // Calculate completion time if possible
    let completionTime = null;
    if (item.createdAt) {
      completionTime = Date.now() - new Date(item.createdAt).getTime();
    }

    // Create archive entry
    const archiveData = {
      user: req.user.id,
      itemType,
      originalId: item._id,
      title: item.title || item.name || 'Untitled',
      description: item.description || '',
      createdAt: item.createdAt || new Date(),
      completedAt: new Date(),
      completionTime,
      priority: item.priority || null,
    };

    // Add project reference if applicable and available
    if (item.project) {
      archiveData.project = item.project;
    }

    // Add any additional metadata that might be useful for analytics
    archiveData.metadata = {
      originalCollection: itemType + 's', // pluralize the collection name
    };

    // Add item-specific metadata
    switch (itemType) {
      case 'task':
        archiveData.metadata.assignee = item.assignee;
        archiveData.metadata.dueDate = item.dueDate;
        archiveData.metadata.estimatedTime = item.estimatedTime;
        break;
      case 'project':
        archiveData.metadata.owner = item.owner;
        archiveData.metadata.startDate = item.startDate;
        archiveData.metadata.endDate = item.endDate;
        archiveData.metadata.progress = item.progress;
        break;
      case 'bookmark':
        archiveData.metadata.url = item.url;
        archiveData.metadata.folder = item.folder;
        break;
      case 'snippet':
        archiveData.metadata.language = item.language;
        archiveData.metadata.tags = item.tags;
        break;
      default:
        // No additional metadata for other types
        break;
    }

    const archive = await Archive.create(archiveData);

    logger.info(`Successfully archived ${itemType}`, {
      userId: req.user.id,
      itemId,
      itemType,
      archiveId: archive._id,
    });

    // After successful archiving, delete the original item
    await Model.findByIdAndDelete(itemId);

    logger.info(`Deleted original ${itemType} after archiving`, {
      userId: req.user.id,
      itemId,
      itemType,
    });

    // Add audit log for the archiving
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, `${itemType}_archive`, 'success', {
      itemId,
      itemType,
      archiveId: archive._id,
    });

    // Return success response
    res.status(201).json({
      success: true,
      data: archive,
      message: `${itemType} archived successfully`,
    });
  } catch (err) {
    logger.error(`Failed to archive ${itemType}`, {
      error: err,
      userId: req.user.id,
      itemId,
      itemType,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, `${itemType}_archive`, 'failed', {
      itemId,
      itemType,
      error: err.message,
    });

    return next(
      new ErrorResponse(`Error archiving ${itemType}: ${err.message}`, 500)
    );
  }
};

/**
 * Helper function to check if a user is authorized to archive an item
 *
 * @param {string} userId - The ID of the user
 * @param {Object} item - The item to be archived
 * @param {string} itemType - The type of the item
 * @returns {boolean} - Whether the user is authorized
 */
const isUserAuthorizedForItem = async (userId, item, itemType) => {
  switch (itemType) {
    case 'task':
      // User is authorized if they are the assignee or the project owner/member
      if (item.assignee && item.assignee.toString() === userId) {
        return true;
      }
      if (item.project) {
        const Project = mongoose.model('Project');
        const project = await Project.findById(item.project);
        if (
          project &&
          (project.owner.toString() === userId ||
            project.members.some((member) => member.toString() === userId))
        ) {
          return true;
        }
      }
      return false;

    case 'project':
      // User is authorized if they are the owner or a member of the project
      return (
        item.owner.toString() === userId ||
        item.members.some((member) => member.toString() === userId)
      );

    case 'note':
    case 'bookmark':
    case 'snippet':
      // User is authorized if they are the owner of the item
      return item.user && item.user.toString() === userId;

    default:
      return false;
  }
};

/**
 * @desc    Get archived items for the authenticated user
 * @route   GET /api/v1/archive
 * @access  Private
 */
export const getArchiveItems = async (req, res, next) => {
  try {
    // Extract query parameters for filtering
    const {
      itemType,
      startDate,
      endDate,
      project,
      sort = '-completedAt',
    } = req.query;

    // Build the query object
    const query = { user: req.user.id };

    // Add type filter if specified
    if (itemType) {
      query.itemType = itemType;
    }

    // Add date range filter if specified
    if (startDate || endDate) {
      query.completedAt = {};
      if (startDate) {
        query.completedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.completedAt.$lte = new Date(endDate);
      }
    }

    // Add project filter if specified
    if (project) {
      query.project = project;
    }

    // Get archive items with filters
    const items = await Archive.find(query)
      .sort(sort)
      .populate('project', 'name description')
      .limit(req.query.limit ? parseInt(req.query.limit) : 100);

    logger.info('Retrieved archive items', {
      userId: req.user.id,
      count: items.length,
      filters: { itemType, startDate, endDate, project },
    });

    // Add audit log for the retrieval
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'archive_retrieve', 'success', {
      count: items.length,
      filters: { itemType, startDate, endDate, project },
    });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (err) {
    logger.error('Failed to retrieve archive items', {
      error: err,
      userId: req.user.id,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'archive_retrieve', 'failed', {
      error: err.message,
    });

    return next(
      new ErrorResponse(`Error retrieving archive: ${err.message}`, 500)
    );
  }
};

/**
 * @desc    Get productivity metrics from archived items
 * @route   GET /api/v1/archive/metrics
 * @access  Private
 */
export const getProductivityMetrics = async (req, res, next) => {
  try {
    // Extract query parameters
    const { period, startDate, endDate, project } = req.query;

    // Build the base query object to filter archive items
    const query = { user: req.user.id };

    // Add date range filter
    let dateQuery = {};
    const now = new Date();

    // Handle different period types
    if (period) {
      switch (period) {
        case 'day':
          // Today's items
          dateQuery = {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lt: new Date(now.setHours(23, 59, 59, 999)),
          };
          break;
        case 'week':
          // This week's items (starting Sunday)
          const firstDayOfWeek = new Date(now);
          firstDayOfWeek.setDate(now.getDate() - now.getDay());
          firstDayOfWeek.setHours(0, 0, 0, 0);

          const lastDayOfWeek = new Date(firstDayOfWeek);
          lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
          lastDayOfWeek.setHours(23, 59, 59, 999);

          dateQuery = {
            $gte: firstDayOfWeek,
            $lte: lastDayOfWeek,
          };
          break;
        case 'month':
          // This month's items
          const firstDayOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          );
          const lastDayOfMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          dateQuery = {
            $gte: firstDayOfMonth,
            $lte: lastDayOfMonth,
          };
          break;
        case 'year':
          // This year's items
          const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
          const lastDayOfYear = new Date(
            now.getFullYear(),
            11,
            31,
            23,
            59,
            59,
            999
          );
          dateQuery = {
            $gte: firstDayOfYear,
            $lte: lastDayOfYear,
          };
          break;
        default:
          // Default to all time if period is not recognized
          break;
      }
    } else if (startDate || endDate) {
      // Use custom date range if provided
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        dateQuery.$lte = new Date(endDate);
      }
    }

    // Add date query if it's not empty
    if (Object.keys(dateQuery).length > 0) {
      query.completedAt = dateQuery;
    }

    // Add project filter if specified
    if (project) {
      query.project = project;
    }

    // Get all archive items that match the query
    const items = await Archive.find(query);

    // Calculate productivity metrics
    const metrics = calculateProductivityMetrics(items, period);

    logger.info('Retrieved productivity metrics', {
      userId: req.user.id,
      period,
      metrics: {
        totalItems: metrics.totalItems,
        tasksByType: Object.keys(metrics.itemsByType)
          .map((type) => `${type}: ${metrics.itemsByType[type]}`)
          .join(', '),
      },
    });

    // Add audit log for metrics retrieval
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'productivity_metrics_retrieve', 'success', {
      period,
      startDate,
      endDate,
      project,
    });

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    logger.error('Failed to retrieve productivity metrics', {
      error: err,
      userId: req.user.id,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'productivity_metrics_retrieve', 'failed', {
      error: err.message,
    });

    return next(
      new ErrorResponse(`Error retrieving metrics: ${err.message}`, 500)
    );
  }
};

/**
 * Calculate productivity metrics from archived items
 *
 * @param {Array} items - Array of archive items
 * @param {string} period - Time period for the metrics
 * @returns {Object} - Object containing productivity metrics
 */
const calculateProductivityMetrics = (items, period) => {
  // Initialize metrics object
  const metrics = {
    totalItems: items.length,
    itemsByType: {},
    itemsByDay: {},
    averageCompletionTime: 0,
    mostProductiveDay: null,
    mostProductiveHour: null,
    priorityDistribution: {
      High: 0,
      Medium: 0,
      Low: 0,
      None: 0,
    },
  };

  // Count items by type
  items.forEach((item) => {
    // Count by item type
    metrics.itemsByType[item.itemType] =
      (metrics.itemsByType[item.itemType] || 0) + 1;

    // Format date as YYYY-MM-DD for grouping by day
    const dayKey = item.completedAt.toISOString().split('T')[0];
    metrics.itemsByDay[dayKey] = (metrics.itemsByDay[dayKey] || 0) + 1;

    // Count by priority
    const priority = item.priority || 'None';
    metrics.priorityDistribution[priority] += 1;
  });

  // Find most productive day
  let maxItems = 0;
  for (const [day, count] of Object.entries(metrics.itemsByDay)) {
    if (count > maxItems) {
      maxItems = count;
      metrics.mostProductiveDay = day;
    }
  }

  // Calculate average completion time (if available)
  const itemsWithCompletionTime = items.filter((item) => item.completionTime);
  if (itemsWithCompletionTime.length > 0) {
    const totalCompletionTime = itemsWithCompletionTime.reduce(
      (sum, item) => sum + item.completionTime,
      0
    );
    metrics.averageCompletionTime =
      totalCompletionTime / itemsWithCompletionTime.length;
  }

  // Calculate hourly productivity
  const hourlyActivity = Array(24).fill(0);
  items.forEach((item) => {
    const hour = item.completedAt.getHours();
    hourlyActivity[hour]++;
  });

  // Find most productive hour
  const mostProductiveHourIndex = hourlyActivity.indexOf(
    Math.max(...hourlyActivity)
  );
  if (hourlyActivity[mostProductiveHourIndex] > 0) {
    metrics.mostProductiveHour = mostProductiveHourIndex;
  }

  // Add period-specific metrics
  if (period) {
    switch (period) {
      case 'day':
        // For daily view, group by hour
        metrics.hourlyBreakdown = hourlyActivity;
        break;
      case 'week':
        // For weekly view, ensure we have entries for all days of the week
        const daysOfWeek = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];
        metrics.dayOfWeekBreakdown = Array(7).fill(0);

        items.forEach((item) => {
          const dayOfWeek = item.completedAt.getDay(); // 0 for Sunday, 6 for Saturday
          metrics.dayOfWeekBreakdown[dayOfWeek]++;
        });

        // Convert to named object for clarity
        metrics.dayOfWeekBreakdown = daysOfWeek.reduce((obj, day, index) => {
          obj[day] = metrics.dayOfWeekBreakdown[index];
          return obj;
        }, {});
        break;
      case 'month':
        // For monthly view, group by day of month
        const daysInMonth = {};
        items.forEach((item) => {
          const dayOfMonth = item.completedAt.getDate();
          daysInMonth[dayOfMonth] = (daysInMonth[dayOfMonth] || 0) + 1;
        });
        metrics.dayOfMonthBreakdown = daysInMonth;
        break;
      case 'year':
        // For yearly view, group by month
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const monthlyActivity = Array(12).fill(0);

        items.forEach((item) => {
          const month = item.completedAt.getMonth();
          monthlyActivity[month]++;
        });

        metrics.monthlyBreakdown = monthNames.reduce((obj, month, index) => {
          obj[month] = monthlyActivity[index];
          return obj;
        }, {});
        break;
    }
  }

  return metrics;
};

/**
 * @desc    Compare productivity metrics between two periods
 * @route   GET /api/v1/archive/compare
 * @access  Private
 */
export const compareProductivity = async (req, res, next) => {
  try {
    const { period1Start, period1End, period2Start, period2End } = req.query;

    // Validate that all required dates are provided
    if (!period1Start || !period1End || !period2Start || !period2End) {
      return next(
        new ErrorResponse('All period start and end dates are required', 400)
      );
    }

    // Query for first period
    const period1Items = await Archive.find({
      user: req.user.id,
      completedAt: {
        $gte: new Date(period1Start),
        $lte: new Date(period1End),
      },
    });

    // Query for second period
    const period2Items = await Archive.find({
      user: req.user.id,
      completedAt: {
        $gte: new Date(period2Start),
        $lte: new Date(period2End),
      },
    });

    // Calculate metrics for both periods
    const period1Metrics = calculateProductivityMetrics(period1Items);
    const period2Metrics = calculateProductivityMetrics(period2Items);

    // Calculate the differences between the two periods
    const comparison = {
      period1: {
        start: period1Start,
        end: period1End,
        metrics: period1Metrics,
      },
      period2: {
        start: period2Start,
        end: period2End,
        metrics: period2Metrics,
      },
      differences: {
        totalItems: period2Metrics.totalItems - period1Metrics.totalItems,
        percentageChange:
          period1Metrics.totalItems > 0
            ? ((period2Metrics.totalItems - period1Metrics.totalItems) /
                period1Metrics.totalItems) *
              100
            : null,
      },
    };

    // Calculate differences for each item type
    comparison.differences.itemsByType = {};
    const allItemTypes = new Set([
      ...Object.keys(period1Metrics.itemsByType),
      ...Object.keys(period2Metrics.itemsByType),
    ]);

    allItemTypes.forEach((type) => {
      const period1Count = period1Metrics.itemsByType[type] || 0;
      const period2Count = period2Metrics.itemsByType[type] || 0;
      comparison.differences.itemsByType[type] = period2Count - period1Count;
    });

    logger.info('Generated productivity comparison', {
      userId: req.user.id,
      period1: {
        start: period1Start,
        end: period1End,
        count: period1Items.length,
      },
      period2: {
        start: period2Start,
        end: period2End,
        count: period2Items.length,
      },
    });

    // Add audit log for comparison retrieval
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'productivity_comparison', 'success', {
      period1: {
        start: period1Start,
        end: period1End,
        count: period1Items.length,
      },
      period2: {
        start: period2Start,
        end: period2End,
        count: period2Items.length,
      },
    });

    res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (err) {
    logger.error('Failed to compare productivity periods', {
      error: err,
      userId: req.user.id,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'productivity_comparison', 'failed', {
      error: err.message,
    });

    return next(
      new ErrorResponse(`Error comparing periods: ${err.message}`, 500)
    );
  }
};

/**
 * @desc    Archive a task when it's marked as completed
 * @param   {Object} task - The completed task
 * @param   {Object} req - Express request object
 */
export const archiveCompletedTask = async (task, req) => {
  try {
    // Check if task is completed
    if (task.status !== 'Completed') {
      return;
    }

    // Calculate completion time
    let completionTime = null;
    if (task.createdAt) {
      completionTime = Date.now() - new Date(task.createdAt).getTime();
    }

    // Create archive entry
    await Archive.create({
      user: task.assignee,
      itemType: 'task',
      originalId: task._id,
      title: task.title,
      description: task.description || '',
      createdAt: task.createdAt,
      completedAt: new Date(),
      completionTime,
      project: task.project,
      priority: task.priority,
      metadata: {
        originalCollection: 'tasks',
        assignee: task.assignee,
        dueDate: task.dueDate,
        estimatedTime: task.estimatedTime,
      },
    });

    // Delete the original task after successful archiving
    await Task.findByIdAndDelete(task._id);

    logger.info(
      'Task automatically archived on completion and removed from tasks collection',
      {
        taskId: task._id,
        userId: req.user.id,
      }
    );

    // No need for audit log here as it's part of the task update process
    // which already creates an audit log
  } catch (err) {
    logger.error('Failed to automatically archive completed task', {
      error: err,
      taskId: task._id,
      userId: req.user.id,
    });
  }
};

/**
 * @desc    Restore an item from the archive back to its original collection
 * @route   POST /api/v1/archive/restore/:id
 * @access  Private
 *
 * This function takes an archived item and recreates it in its original collection.
 * It allows users to restore completed items they want to reopen or reconsider.
 *
 * @param {Object} req - Express request object with archive ID in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const restoreArchivedItem = async (req, res, next) => {
  try {
    // Get archive item ID from request params
    const { id } = req.params;

    // Find the archive item
    const archivedItem = await Archive.findById(id);

    // Handle case where archive item doesn't exist
    if (!archivedItem) {
      return next(
        new ErrorResponse(`Archived item not found with id ${id}`, 404)
      );
    }

    // Check if user is authorized to restore this item
    if (archivedItem.user.toString() !== req.user.id) {
      logger.warn('Unauthorized attempt to restore archived item', {
        userId: req.user.id,
        archiveItemId: id,
      });
      return next(
        new ErrorResponse('Not authorized to restore this item', 403)
      );
    }

    // Get the appropriate model based on item type
    let Model;
    switch (archivedItem.itemType) {
      case 'task':
        Model = Task;
        break;
      case 'project':
        Model = Project;
        break;
      case 'note':
        Model = Note;
        break;
      case 'bookmark':
        Model = Bookmark;
        break;
      case 'snippet':
        Model = Snippet;
        break;
      default:
        return next(
          new ErrorResponse(`Invalid item type: ${archivedItem.itemType}`, 400)
        );
    }

    // Check if the original item still exists (to avoid duplicates)
    const existingItem = await Model.findById(archivedItem.originalId);
    if (existingItem) {
      logger.warn(
        `Cannot restore ${archivedItem.itemType}, original already exists`,
        {
          userId: req.user.id,
          archiveItemId: id,
          originalItemId: archivedItem.originalId,
        }
      );
      return next(
        new ErrorResponse(
          `Cannot restore ${archivedItem.itemType}, the original item still exists`,
          400
        )
      );
    }

    // Create a new item in the original collection
    // Building the item data based on archived data
    let newItem = {};

    // Common fields for all item types
    if (archivedItem.itemType === 'project') {
      newItem.name = archivedItem.title;
    } else {
      newItem.title = archivedItem.title;
    }

    if (archivedItem.description) {
      newItem.description = archivedItem.description;
    }

    // Set priority if available
    if (archivedItem.priority) {
      newItem.priority = archivedItem.priority;
    }

    // Set creation date to original creation date
    newItem.createdAt = archivedItem.createdAt;

    // Handle item-specific fields
    switch (archivedItem.itemType) {
      case 'task':
        newItem.status = 'In Progress'; // Reset status to In Progress
        newItem.assignee = archivedItem.metadata.assignee || req.user.id;
        newItem.project = archivedItem.project;

        if (archivedItem.metadata.dueDate) {
          // If the original due date is in the past, set a new due date 1 week from now
          const dueDate = new Date(archivedItem.metadata.dueDate);
          if (dueDate < new Date()) {
            const newDueDate = new Date();
            newDueDate.setDate(newDueDate.getDate() + 7);
            newItem.dueDate = newDueDate;
          } else {
            newItem.dueDate = dueDate;
          }
        }

        if (archivedItem.metadata.estimatedTime) {
          newItem.estimatedTime = archivedItem.metadata.estimatedTime;
        }
        break;

      case 'project':
        newItem.owner = archivedItem.metadata.owner || req.user.id;
        newItem.members = archivedItem.metadata.members || [req.user.id];
        newItem.status = 'Active'; // Reset status to Active

        if (archivedItem.metadata.startDate) {
          newItem.startDate = new Date(archivedItem.metadata.startDate);
        }

        if (archivedItem.metadata.endDate) {
          // If the end date is in the past, set a new end date 1 month from now
          const endDate = new Date(archivedItem.metadata.endDate);
          if (endDate < new Date()) {
            const newEndDate = new Date();
            newEndDate.setMonth(newEndDate.getMonth() + 1);
            newItem.endDate = newEndDate;
          } else {
            newItem.endDate = endDate;
          }
        }
        break;

      case 'note':
        newItem.user = req.user.id;
        newItem.content = archivedItem.description;
        newItem.archived = false; // Reset archived status

        if (archivedItem.metadata.tags) {
          newItem.tags = archivedItem.metadata.tags;
        }

        if (archivedItem.metadata.color) {
          newItem.color = archivedItem.metadata.color;
        }
        break;

      case 'bookmark':
        newItem.user = req.user.id;

        if (archivedItem.metadata.url) {
          newItem.url = archivedItem.metadata.url;
        } else {
          // URL is required for bookmarks
          return next(
            new ErrorResponse('Cannot restore bookmark: missing URL', 400)
          );
        }

        if (archivedItem.metadata.folder) {
          newItem.folderId = archivedItem.metadata.folder;
        }
        break;

      case 'snippet':
        newItem.user = req.user.id;
        newItem.content = archivedItem.description;

        if (archivedItem.metadata.language) {
          newItem.language = archivedItem.metadata.language;
        } else {
          newItem.language = 'text'; // Default language
        }

        if (archivedItem.metadata.tags) {
          newItem.tags = archivedItem.metadata.tags;
        }
        break;
    }

    // Create the new item in its original collection
    // Use the original ID if possible to maintain references
    try {
      const restoredItem = new Model({
        _id: new mongoose.Types.ObjectId(archivedItem.originalId),
        ...newItem,
      });
      await restoredItem.save();
    } catch (err) {
      // If we can't use the original ID, create with a new ID
      if (err.code === 11000 || err.message.includes('duplicate key')) {
        const restoredItem = await Model.create(newItem);
        logger.info(`Item restored with new ID due to conflict`, {
          userId: req.user.id,
          archiveItemId: id,
          newItemId: restoredItem._id,
        });
      } else {
        throw err;
      }
    }

    // Add audit log for the restoration
    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, `${archivedItem.itemType}_restore`, 'success', {
      archiveItemId: id,
      originalItemId: archivedItem.originalId,
    });

    // Delete the archive item (optional - you could keep it with a 'restored' flag)
    await Archive.findByIdAndDelete(id);

    // Return success response
    res.status(200).json({
      success: true,
      message: `${
        archivedItem.itemType.charAt(0).toUpperCase() +
        archivedItem.itemType.slice(1)
      } restored successfully`,
    });
  } catch (err) {
    logger.error('Failed to restore archived item', {
      error: err,
      userId: req.user.id,
      archiveItemId: req.params.id,
    });

    const { auditLog } = await import('../middleware/auditLogMiddleware.js');
    await auditLog(req, 'item_restore', 'failed', {
      archiveItemId: req.params.id,
      error: err.message,
    });

    return next(new ErrorResponse(`Error restoring item: ${err.message}`, 500));
  }
};

// Export the controller functions
export default {
  archiveItem,
  getArchiveItems,
  getProductivityMetrics,
  compareProductivity,
  archiveCompletedTask,
  restoreArchivedItem,
};
