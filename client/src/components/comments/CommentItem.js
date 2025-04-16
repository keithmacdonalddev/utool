import React, { useState } from 'react';
import { useSelector } from 'react-redux'; // Import useSelector
import { ThumbsUp, MessageSquare, Edit3, Trash2 } from 'lucide-react';
import api from '../../utils/api';

// Placeholder for the form to add/edit replies
const CommentForm = ({
  articleId,
  parentCommentId = null,
  existingComment = null,
  onSubmitSuccess,
  onCancel,
}) => {
  const [content, setContent] = useState(
    existingComment ? existingComment.content : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      if (existingComment) {
        // Update existing comment
        await api.put(`/comments/${existingComment._id}`, { content });
      } else {
        // Create new comment/reply
        await api.post(`/kb/${articleId}/comments`, {
          content,
          parentCommentId,
        });
      }
      onSubmitSuccess(); // Call parent callback on success
      setContent(''); // Clear form
      if (onCancel) onCancel(); // Close form if editing/replying
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError(err.response?.data?.message || 'Failed to submit comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`mt-2 ${
        parentCommentId || existingComment ? 'ml-8 pl-4 border-l-2' : ''
      }`}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          parentCommentId
            ? 'Write a reply...'
            : existingComment
            ? 'Edit comment...'
            : 'Add a comment...'
        }
        rows="2"
        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-sm"
        required
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <div className="flex justify-end gap-2 mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-600 hover:underline"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Submitting...'
            : existingComment
            ? 'Update'
            : parentCommentId
            ? 'Reply'
            : 'Comment'}
        </button>
      </div>
    </form>
  );
};

const CommentItem = ({ comment, articleId, onCommentAction }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  // Get current user from auth state
  const { user: currentUser } = useSelector((state) => state.auth);

  const currentUserId = currentUser?._id;
  const isAdmin = currentUser?.role === 'Admin';
  const isOwner = comment.author?._id === currentUserId;
  const canModify = isOwner || isAdmin; // User can modify if they are owner OR admin

  const handleReplySuccess = () => {
    setShowReplyForm(false);
    if (onCommentAction) onCommentAction(); // Notify parent to potentially refresh comments
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    if (onCommentAction) onCommentAction(); // Notify parent to potentially refresh comments
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        'Are you sure you want to delete this comment? This cannot be undone.'
      )
    ) {
      // Added emphasis
      try {
        await api.delete(`/comments/${comment._id}`); // API call added
        if (onCommentAction) onCommentAction(); // Notify parent to refresh
      } catch (error) {
        console.error('Delete comment error:', error);
        alert(error.response?.data?.message || 'Failed to delete comment.');
      }
    }
  };

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start space-x-3">
        {/* Display Avatar or Placeholder */}
        <img
          src={
            comment.author?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              comment.author?.name || '?'
            )}&background=random`
          }
          alt={comment.author?.name || 'Avatar'}
          className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full object-cover" // Added object-cover
        />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {comment.author?.name || 'Anonymous'}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(comment.createdAt).toLocaleString()}
              {/* TODO: Add (edited) marker */}
            </p>
          </div>
          {!showEditForm ? (
            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
              {comment.content}
            </p>
          ) : (
            <CommentForm
              articleId={articleId}
              existingComment={comment}
              onSubmitSuccess={handleEditSuccess}
              onCancel={() => setShowEditForm(false)}
            />
          )}

          {!showEditForm && (
            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
              {/* Actions */}
              <button
                className="hover:text-blue-600 flex items-center"
                title="Like (Not Implemented)"
              >
                <ThumbsUp size={14} className="mr-1" /> Like
              </button>
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="hover:text-blue-600 flex items-center"
                title="Reply"
              >
                <MessageSquare size={14} className="mr-1" /> Reply
              </button>
              {/* Show Edit/Delete if user is owner OR admin */}
              {canModify && (
                <>
                  <button
                    onClick={() => setShowEditForm(true)}
                    className="hover:text-green-600 flex items-center"
                    title="Edit"
                  >
                    <Edit3 size={14} className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="hover:text-red-600 flex items-center"
                    title="Delete"
                  >
                    <Trash2 size={14} className="mr-1" /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && !showEditForm && (
        <CommentForm
          articleId={articleId}
          parentCommentId={comment._id}
          onSubmitSuccess={handleReplySuccess}
          onCancel={() => setShowReplyForm(false)}
        />
      )}

      {/* TODO: Render Replies (Recursive or Fetched Separately) */}
      {/* Example: comment.replies?.map(reply => <CommentItem key={reply._id} comment={reply} ... />) */}
    </div>
  );
};

export default CommentItem;
