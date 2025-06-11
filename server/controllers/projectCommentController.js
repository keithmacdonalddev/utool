/**
 * Project Comment Controller
 *
 * Handles comments for projects and tasks as part of the collaboration features.
 * Extends the existing comment system to support project/task entities while
 * maintaining the same comment threading and real-time features.
 *
 * Features:
 * - CRUD operations for project/task comments
 * - Threaded comment support with parent/child relationships
 * - Real-time updates via WebSocket integration
 * - Authorization checks for project/task access
 * - Integration with existing authentication middleware
 */

import Comment from '../models/Comment.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * @desc    Get all comments for a specific entity (project or task)
 * @route   GET /api/v1/comments/:entityType/:entityId
 * @access  Private - requires project/task access
 */
export const getCommentsForEntity = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate entity type
    if (!['Project', 'Task'].includes(entityType)) {
      return next(new ErrorResponse('Invalid entity type', 400));
    }

    // Verify entity exists and user has access
    await validateEntityAccess(entityType, entityId, req.user.id);

    // Fetch comments with threading structure
    const comments = await Comment.find({
      targetType: entityType,
      targetId: entityId,
    })
      .populate('author', 'name email avatar')
      .populate('parentComment', '_id')
      .sort({ createdAt: 1 })
      .lean();

    // Organize comments into threaded structure
    const threadedComments = organizeComments(comments);

    logger.info('Comments retrieved successfully', {
      entityType,
      entityId,
      commentCount: comments.length,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: threadedComments,
    });
  } catch (error) {
    logger.error('Error fetching comments', {
      error: error.message,
      entityType: req.params.entityType,
      entityId: req.params.entityId,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Create a new comment for a project or task
 * @route   POST /api/v1/comments/:entityType/:entityId
 * @access  Private - requires project/task access
 */
export const createCommentForEntity = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { content, parentComment } = req.body;

    // Validate input
    if (!content || content.trim() === '') {
      return next(new ErrorResponse('Comment content is required', 400));
    }

    if (!['Project', 'Task'].includes(entityType)) {
      return next(new ErrorResponse('Invalid entity type', 400));
    }

    // Verify entity exists and user has access
    const entity = await validateEntityAccess(
      entityType,
      entityId,
      req.user.id
    );

    // Validate parent comment if provided
    let parentCommentDoc = null;
    if (parentComment) {
      parentCommentDoc = await Comment.findOne({
        _id: parentComment,
        targetType: entityType,
        targetId: entityId,
      });

      if (!parentCommentDoc) {
        return next(new ErrorResponse('Invalid parent comment', 400));
      }
    }

    // Create the comment
    const newComment = await Comment.create({
      content: content.trim(),
      targetType: entityType,
      targetId: entityId,
      author: req.user.id,
      parentComment: parentCommentDoc ? parentCommentDoc._id : null,
    });

    // Populate the author details for response
    const populatedComment = await Comment.findById(newComment._id)
      .populate('author', 'name email avatar')
      .lean();

    // Emit real-time update via WebSocket
    if (req.app.get('socketManager')) {
      const socketManager = req.app.get('socketManager');
      const projectId = entityType === 'Project' ? entityId : entity.project;

      socketManager.emitToProject(projectId, 'comment:added', {
        entityType,
        entityId,
        comment: populatedComment,
      });
    }

    logger.info('Comment created successfully', {
      commentId: newComment._id,
      entityType,
      entityId,
      userId: req.user.id,
      hasParent: !!parentComment,
    });

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    logger.error('Error creating comment', {
      error: error.message,
      entityType: req.params.entityType,
      entityId: req.params.entityId,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Update a comment
 * @route   PUT /api/v1/comments/:commentId
 * @access  Private - requires comment ownership or admin
 */
export const updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return next(new ErrorResponse('Comment content is required', 400));
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new ErrorResponse('Comment not found', 404));
    }

    // Authorization: Allow update only if user is the author or admin
    if (
      comment.author.toString() !== req.user.id &&
      req.user.role !== 'Admin'
    ) {
      return next(
        new ErrorResponse('Not authorized to update this comment', 403)
      );
    }

    // Verify user still has access to the entity
    await validateEntityAccess(
      comment.targetType,
      comment.targetId,
      req.user.id
    );

    // Update the comment
    comment.content = content.trim();
    await comment.save();

    // Populate for response
    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'name email avatar')
      .lean();

    // Emit real-time update
    if (req.app.get('socketManager')) {
      const socketManager = req.app.get('socketManager');
      const projectId = await getProjectIdForEntity(
        comment.targetType,
        comment.targetId
      );

      socketManager.emitToProject(projectId, 'comment:updated', {
        commentId: comment._id,
        content: comment.content,
        updatedAt: comment.updatedAt,
      });
    }

    logger.info('Comment updated successfully', {
      commentId: comment._id,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    logger.error('Error updating comment', {
      error: error.message,
      commentId: req.params.commentId,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/v1/comments/:commentId
 * @access  Private - requires comment ownership or admin
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new ErrorResponse('Comment not found', 404));
    }

    // Authorization: Allow delete only if user is the author or admin
    if (
      comment.author.toString() !== req.user.id &&
      req.user.role !== 'Admin'
    ) {
      return next(
        new ErrorResponse('Not authorized to delete this comment', 403)
      );
    }

    // Verify user still has access to the entity
    await validateEntityAccess(
      comment.targetType,
      comment.targetId,
      req.user.id
    );

    // Delete the comment (orphan approach for replies)
    await comment.deleteOne();

    // Emit real-time update
    if (req.app.get('socketManager')) {
      const socketManager = req.app.get('socketManager');
      const projectId = await getProjectIdForEntity(
        comment.targetType,
        comment.targetId
      );

      socketManager.emitToProject(projectId, 'comment:deleted', {
        commentId: comment._id,
        entityType: comment.targetType,
        entityId: comment.targetId,
      });
    }

    logger.info('Comment deleted successfully', {
      commentId: comment._id,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting comment', {
      error: error.message,
      commentId: req.params.commentId,
      userId: req.user.id,
    });
    next(error);
  }
};

/**
 * Helper function to validate entity access
 * Ensures user has permission to access the project/task being commented on
 */
async function validateEntityAccess(entityType, entityId, userId) {
  let entity;
  let project;

  if (entityType === 'Project') {
    entity = await Project.findById(entityId);
    if (!entity) {
      throw new ErrorResponse('Project not found', 404);
    }
    project = entity;
  } else if (entityType === 'Task') {
    entity = await Task.findById(entityId).populate('project');
    if (!entity) {
      throw new ErrorResponse('Task not found', 404);
    }
    project = entity.project;
  }

  // Check if user has access to the project
  const isMember = project.members.some(
    (memberId) => memberId.toString() === userId
  );
  const isOwner = project.owner.toString() === userId;

  if (!isOwner && !isMember) {
    throw new ErrorResponse(
      `Not authorized to access comments for this ${entityType.toLowerCase()}`,
      403
    );
  }

  return entity;
}

/**
 * Helper function to get project ID for an entity
 * Used for WebSocket room targeting
 */
async function getProjectIdForEntity(entityType, entityId) {
  if (entityType === 'Project') {
    return entityId;
  } else if (entityType === 'Task') {
    const task = await Task.findById(entityId).select('project');
    return task ? task.project : null;
  }
  return null;
}

/**
 * Helper function to organize flat comments into threaded structure
 * Maintains parent-child relationships for proper UI rendering
 */
function organizeComments(comments) {
  const commentMap = new Map();
  const topLevelComments = [];

  // First pass: create comment map
  comments.forEach((comment) => {
    comment.replies = [];
    commentMap.set(comment._id.toString(), comment);
  });

  // Second pass: organize into threads
  comments.forEach((comment) => {
    if (comment.parentComment) {
      const parent = commentMap.get(comment.parentComment.toString());
      if (parent) {
        parent.replies.push(comment);
      } else {
        // Orphaned comment, treat as top-level
        topLevelComments.push(comment);
      }
    } else {
      topLevelComments.push(comment);
    }
  });

  return topLevelComments;
}
