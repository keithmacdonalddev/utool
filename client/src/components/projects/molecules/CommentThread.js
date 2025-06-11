import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MessageCircle,
  Send,
  MoreVertical,
  Edit,
  Trash,
  Reply,
} from 'lucide-react';
import {
  fetchComments,
  addComment,
  updateComment,
  deleteComment,
} from '../../../features/comments/commentsSlice';

/**
 * CommentThread Component
 *
 * Displays a threaded conversation for projects, tasks, or other entities.
 * Supports nested replies, editing, deletion, and real-time updates.
 *
 * Features:
 * - Nested comment threading with visual indentation
 * - Real-time comment updates via Redux state
 * - Edit and delete functionality for comment authors
 * - Reply system with visual threading
 * - Loading states and error handling
 * - Responsive design with proper accessibility
 *
 * @param {string} entityType - Type of entity being commented on ('project', 'task', etc.)
 * @param {string} entityId - ID of the entity being commented on
 * @param {string} projectId - ID of the project (for authorization and real-time updates)
 */
const CommentThread = ({ entityType, entityId, projectId }) => {
  const dispatch = useDispatch();
  const { comments, loading } = useSelector((state) => state.comments);
  const { user } = useSelector((state) => state.auth);

  // Local state for UI management
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);

  /**
   * Effect to fetch comments when component mounts or entityId changes
   * This ensures comments are always up to date when viewing different entities
   */
  useEffect(() => {
    dispatch(fetchComments({ entityType, entityId }));
  }, [dispatch, entityType, entityId]);

  /**
   * Handles submission of new comments or replies
   * Integrates with Redux state management and clears form on success
   */
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await dispatch(
        addComment({
          entityType,
          entityId,
          projectId,
          content: newComment,
          parentComment: replyingTo,
        })
      );
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  /**
   * Handles editing existing comments
   * Updates comment content and exits edit mode on success
   */
  const handleEditComment = async (commentId, newContent) => {
    try {
      await dispatch(updateComment({ commentId, content: newContent }));
      setEditingComment(null);
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  /**
   * Handles deletion of comments with confirmation
   * Only allows deletion by comment author or project admins
   */
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await dispatch(deleteComment(commentId));
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };

  /**
   * Recursive rendering function for comments and their replies
   * Provides visual threading with indentation and proper nesting
   *
   * @param {Object} comment - Comment object to render
   * @param {number} depth - Current nesting depth for indentation
   */
  const renderComment = (comment, depth = 0) => (
    <div
      key={comment._id}
      className={`${
        depth > 0 ? 'ml-8 mt-4' : 'mt-4'
      } border-l-2 border-gray-100 pl-4`}
    >
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Comment Header - Author info and timestamp */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-blue-600">
                {comment.author.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {comment.author.name}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                {new Date(comment.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Comment actions dropdown for comment author */}
          {comment.author._id === user.id && (
            <div className="relative">
              <button className="text-gray-400 hover:text-gray-600 p-1">
                <MoreVertical className="w-4 h-4" />
              </button>
              {/* TODO: Implement dropdown menu for edit/delete */}
            </div>
          )}
        </div>

        {/* Comment Content - Editable if in edit mode */}
        {editingComment === comment._id ? (
          <CommentEditor
            initialContent={comment.content}
            onSave={(content) => handleEditComment(comment._id, content)}
            onCancel={() => setEditingComment(null)}
          />
        ) : (
          <div className="prose prose-sm text-gray-700 mb-3">
            {comment.content}
          </div>
        )}

        {/* Comment Actions - Reply, Edit, Delete */}
        <div className="flex items-center space-x-4 text-sm">
          <button
            onClick={() =>
              setReplyingTo(replyingTo === comment._id ? null : comment._id)
            }
            className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>

          {/* Show edit/delete options only for comment author */}
          {comment.author._id === user.id && (
            <>
              <button
                onClick={() => setEditingComment(comment._id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDeleteComment(comment._id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-red-600"
              >
                <Trash className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>

        {/* Reply Form - Shows when replying to this comment */}
        {replyingTo === comment._id && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <CommentForm
              onSubmit={handleSubmitComment}
              value={newComment}
              onChange={setNewComment}
              placeholder={`Reply to ${comment.author.name}...`}
              submitLabel="Reply"
            />
          </div>
        )}
      </div>

      {/* Nested Replies - Recursively render child comments */}
      {comment.replies &&
        comment.replies.map((reply) => renderComment(reply, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Add Comment Form - Always visible at top for new comments */}
      <div className="bg-gray-50 rounded-lg p-4">
        <CommentForm
          onSubmit={handleSubmitComment}
          value={newComment}
          onChange={setNewComment}
          placeholder="Add a comment..."
          submitLabel="Comment"
        />
      </div>

      {/* Comments List with Loading and Empty States */}
      {loading ? (
        // Loading skeleton
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Actual comments or empty state
        <div className="space-y-4">
          {comments.map((comment) => renderComment(comment))}
          {comments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No comments yet. Start the conversation!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * CommentForm Component
 *
 * Reusable form component for adding new comments or replies
 * Handles submission, validation, and provides proper accessibility
 */
const CommentForm = ({
  onSubmit,
  value,
  onChange,
  placeholder,
  submitLabel,
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
      rows={3}
    />
    <div className="flex justify-end">
      <button
        type="submit"
        disabled={!value.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
      >
        <Send className="w-4 h-4" />
        <span>{submitLabel}</span>
      </button>
    </div>
  </form>
);

/**
 * CommentEditor Component
 *
 * Inline editor for existing comments with save/cancel actions
 * Used when editing comments to provide a smooth editing experience
 */
const CommentEditor = ({ initialContent, onSave, onCancel }) => {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
        rows={3}
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(content)}
          disabled={!content.trim()}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default CommentThread;
