import Comment from '../models/Comment.js';
import KnowledgeBaseArticle from '../models/KnowledgeBaseArticle.js';
import { ACCESS_LEVELS } from '../config/permissions.js';

// @desc    Get all comments for a specific KB article
// @route   GET /api/v1/kb/:articleId/comments
// @access  Private (Requires READ access to KB)
export const getCommentsForArticle = async (req, res, next) => {
  try {
    // Use req.params.id because the route is mounted under /kb/:id/comments
    const articleId = req.params.id;

    // Optional: Check if article exists first
    const articleExists = await KnowledgeBaseArticle.findById(articleId);
    if (!articleExists) {
      return res
        .status(404)
        .json({ success: false, message: 'Knowledge base article not found' });
    }

    // Fetch comments, populate author details (e.g., name)
    // Sort by creation date (oldest first for typical comment threads)
    const comments = await Comment.find({ article: articleId })
      .populate('author', 'name email') // Select fields you want from User model
      .sort({ createdAt: 1 });

    res
      .status(200)
      .json({ success: true, count: comments.length, data: comments });
  } catch (err) {
    console.error('Error fetching comments:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server error fetching comments' });
  }
};

// @desc    Create a new comment for a KB article
// @route   POST /api/v1/kb/:articleId/comments
// @access  Private (Requires READ access to KB, implicitly allows commenting)
export const createComment = async (req, res, next) => {
  try {
    // Use req.params.id because the route is mounted under /kb/:id/comments
    const articleId = req.params.id;
    const { content, parentCommentId } = req.body;
    const authorId = req.user._id; // From protect middleware

    // 1. Check if article exists
    const article = await KnowledgeBaseArticle.findById(articleId);
    if (!article) {
      return res
        .status(404)
        .json({ success: false, message: 'Knowledge base article not found' });
    }

    // 2. Validate parent comment if provided
    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findById(parentCommentId);
      if (!parentComment || parentComment.article.toString() !== articleId) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Invalid parent comment ID for this article',
          });
      }
    }

    // 3. Create the comment
    const newComment = await Comment.create({
      content,
      article: articleId,
      author: authorId,
      parentComment: parentComment ? parentComment._id : null,
    });

    // 4. Populate author details for the response
    const populatedComment = await Comment.findById(newComment._id).populate(
      'author',
      'name email'
    );

    // TODO: Emit socket event for real-time comment update
    // Example: req.app.get('io').to(articleId).emit('new_comment', populatedComment);

    res.status(201).json({ success: true, data: populatedComment });
  } catch (err) {
    console.error('Error creating comment:', err);
    // Handle validation errors specifically if needed
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join('. ') });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server error creating comment' });
  }
};

// @desc    Update a comment
// @route   PUT /api/v1/comments/:commentId
// @access  Private (Requires ownership or Admin/Moderator role)
export const updateComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    const { content } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role; // Assuming role is attached by protect middleware

    if (!content || content.trim() === '') {
      return res
        .status(400)
        .json({ success: false, message: 'Comment content cannot be empty' });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: 'Comment not found' });
    }

    // Authorization Check: Allow update only if user is the author OR an Admin
    if (
      comment.author.toString() !== userId.toString() &&
      userRole !== 'Admin'
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'Not authorized to update this comment',
        });
    }
    // If we reach here, the user is either the author or an Admin

    comment.content = content;
    // Optionally mark as edited
    // comment.isEdited = true;
    // comment.editedAt = Date.now();
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'name email'
    );

    // TODO: Emit socket event for real-time comment update
    // Example: req.app.get('io').to(comment.article.toString()).emit('update_comment', populatedComment);

    res.status(200).json({ success: true, data: populatedComment });
  } catch (err) {
    console.error('Error updating comment:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join('. ') });
    }
    res
      .status(500)
      .json({ success: false, message: 'Server error updating comment' });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/v1/comments/:commentId
// @access  Private (Requires ownership or Admin/Moderator role)
export const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user._id;
    const userRole = req.user.role;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: 'Comment not found' });
    }

    // Authorization Check: Allow delete only if user is the author OR an Admin
    if (
      comment.author.toString() !== userId.toString() &&
      userRole !== 'Admin'
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: 'Not authorized to delete this comment',
        });
    }
    // If we reach here, the user is either the author or an Admin

    // Optional: Handle replies - decide whether to delete replies or orphan them.
    // Simple approach: Delete the comment itself. Replies will still have parentComment ID but parent won't exist.
    // Complex approach: Find and delete all replies recursively (can be heavy).
    // Orphan approach: Set parentComment to null for direct replies (might break threading display).
    // For now, just delete the comment:
    await comment.deleteOne(); // Use deleteOne() or remove()

    // TODO: Emit socket event for real-time comment deletion
    // Example: req.app.get('io').to(comment.article.toString()).emit('delete_comment', { commentId });

    res.status(200).json({ success: true, data: {} }); // Return empty object on successful delete
  } catch (err) {
    console.error('Error deleting comment:', err);
    res
      .status(500)
      .json({ success: false, message: 'Server error deleting comment' });
  }
};
