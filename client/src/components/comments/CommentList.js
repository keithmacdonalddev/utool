import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api'; // Adjust path as needed
import CommentItem from './CommentItem'; // Import CommentItem
// Assuming CommentForm is defined within CommentItem for now, or import separately if needed

// Placeholder for the form to add new top-level comments
const NewCommentForm = ({ articleId, onSubmitSuccess }) => {
    const [content, setContent] = useState('');
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
            console.log('Submitting new top-level comment:', { articleId, content });
            await api.post(`/kb/${articleId}/comments`, { content }); // API call added
            onSubmitSuccess(); // Call parent callback on success
            setContent(''); // Clear form
        } catch (err) {
            console.error("Error submitting comment:", err);
            setError(err.response?.data?.message || 'Failed to submit comment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 mb-6 pt-4 border-t">
             <label htmlFor="new-comment" className="block text-sm font-medium text-gray-700 mb-1">Add a Comment</label>
            <textarea
                id="new-comment"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows="3"
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                required
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <div className="flex justify-end mt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50 shadow" disabled={isSubmitting}>
                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
            </div>
        </form>
    );
};


const CommentList = ({ articleId }) => {
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Function to fetch comments
    const fetchComments = useCallback(async () => {
        if (!articleId) return;
        setIsLoading(true);
        setError('');
        try {
            console.log(`Fetching comments for article: ${articleId}`);
            const response = await api.get(`/kb/${articleId}/comments`);
            if (response.data?.success && Array.isArray(response.data.data)) {
                setComments(response.data.data);
                if (response.data.data.length === 0) {
                    setError('No comments yet. Be the first!'); // Use error state for messages
                }
            } else {
                 throw new Error(response.data?.message || 'Invalid data received for comments');
            }
        } catch (err) {
            console.error("Error fetching comments:", err);
            setError(err.response?.data?.message || 'Failed to load comments.');
            setComments([]); // Clear comments on error
        } finally {
            setIsLoading(false);
        }
    }, [articleId]);

    // Fetch comments on mount and when articleId changes
    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    // Function to handle comment actions (create, update, delete) and refresh list
    const handleCommentAction = () => {
        // TODO: Implement more sophisticated update later (e.g., optimistic UI)
        // For now, just refetch all comments
        fetchComments();
    };

    // Basic threading logic: group comments by parentComment ID
    const organizeComments = (commentList) => {
        const commentMap = {};
        const rootComments = [];

        // Create a map of comments by ID
        commentList.forEach(comment => {
            commentMap[comment._id] = { ...comment, replies: [] };
        });

        // Populate replies and identify root comments
        commentList.forEach(comment => {
            if (comment.parentComment && commentMap[comment.parentComment]) {
                commentMap[comment.parentComment].replies.push(commentMap[comment._id]);
            } else {
                rootComments.push(commentMap[comment._id]);
            }
        });

        return rootComments;
    };

    const threadedComments = organizeComments(comments);

    // Recursive function to render comments and their replies
    const renderComment = (comment) => (
        <div key={comment._id} className={comment.parentComment ? 'ml-8 pl-4 border-l-2' : ''}>
            <CommentItem
                comment={comment}
                articleId={articleId}
                onCommentAction={handleCommentAction}
            />
            {/* Render replies recursively */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2">
                    {comment.replies.map(reply => renderComment(reply))}
                </div>
            )}
        </div>
    );


    return (
        <div className="mt-8 pt-6 border-t">
            <h3 className="text-xl font-semibold mb-4">Comments ({comments.length})</h3>

            {/* New Comment Form */}
            <NewCommentForm articleId={articleId} onSubmitSuccess={handleCommentAction} />

            {/* Comment List */}
            {isLoading && <p className="text-gray-500">Loading comments...</p>}
            {!isLoading && error && <p className="text-center text-gray-500 py-4">{error}</p>}
            {!isLoading && !error && comments.length > 0 && (
                <div className="space-y-4">
                    {threadedComments.map(comment => renderComment(comment))}
                </div>
            )}
        </div>
    );
};

export default CommentList;
