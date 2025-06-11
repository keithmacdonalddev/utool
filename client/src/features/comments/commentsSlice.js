import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

/**
 * Comments Redux Slice for Project Collaboration
 *
 * Manages comment state for projects, tasks, and other entities.
 * Supports threaded discussions, real-time updates, and optimistic UI updates.
 *
 * Features:
 * - CRUD operations for comments
 * - Threading support with nested replies
 * - Real-time updates via WebSocket integration
 * - Optimistic updates for better UX
 * - Entity-based comment organization
 */

/**
 * Fetch comments for a specific entity (project, task, etc.)
 *
 * @param {Object} payload - The request parameters
 * @param {string} payload.entityType - Type of entity ('project', 'task', etc.)
 * @param {string} payload.entityId - ID of the entity
 */
export const fetchComments = createAsyncThunk(
  'comments/fetchComments',
  async ({ entityType, entityId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/comments/${entityType}/${entityId}`);
      return {
        entityType,
        entityId,
        comments: response.data.data || response.data.comments || [],
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch comments'
      );
    }
  }
);

/**
 * Add a new comment or reply to an entity
 *
 * @param {Object} payload - The comment data
 * @param {string} payload.entityType - Type of entity ('project', 'task', etc.)
 * @param {string} payload.entityId - ID of the entity
 * @param {string} payload.projectId - ID of the project (for authorization)
 * @param {string} payload.content - Comment content
 * @param {string} payload.parentComment - ID of parent comment (for replies)
 */
export const addComment = createAsyncThunk(
  'comments/addComment',
  async (
    { entityType, entityId, projectId, content, parentComment },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post(`/comments/${entityType}/${entityId}`, {
        content,
        parentComment,
        projectId,
      });
      return response.data.data || response.data.comment;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to add comment'
      );
    }
  }
);

/**
 * Update an existing comment
 *
 * @param {Object} payload - The update data
 * @param {string} payload.commentId - ID of the comment to update
 * @param {string} payload.content - New comment content
 */
export const updateComment = createAsyncThunk(
  'comments/updateComment',
  async ({ commentId, content }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/comments/${commentId}`, { content });
      return response.data.data || response.data.comment;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update comment'
      );
    }
  }
);

/**
 * Delete a comment
 *
 * @param {string} commentId - ID of the comment to delete
 */
export const deleteComment = createAsyncThunk(
  'comments/deleteComment',
  async (commentId, { rejectWithValue }) => {
    try {
      await api.delete(`/comments/${commentId}`);
      return commentId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete comment'
      );
    }
  }
);

/**
 * Initial state for comments slice
 */
const initialState = {
  // Comments organized by entity
  commentsByEntity: {}, // { 'project_123': [...comments], 'task_456': [...comments] }

  // Current entity's comments (for easy access by components)
  comments: [],

  // Current entity being viewed
  currentEntity: {
    type: null,
    id: null,
  },

  // Loading states
  loading: false,
  addingComment: false,
  updatingComment: false,
  deletingComment: false,

  // Error states
  error: null,
  addError: null,
  updateError: null,
  deleteError: null,

  // Success states for user feedback
  isSuccess: false,
  message: '',
};

/**
 * Comments slice definition with reducers and extra reducers
 */
const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    /**
     * Reset all error states
     */
    clearErrors: (state) => {
      state.error = null;
      state.addError = null;
      state.updateError = null;
      state.deleteError = null;
    },

    /**
     * Reset success state
     */
    clearSuccess: (state) => {
      state.isSuccess = false;
      state.message = '';
    },

    /**
     * Set current entity being viewed
     */
    setCurrentEntity: (state, action) => {
      const { entityType, entityId } = action.payload;
      state.currentEntity = { type: entityType, id: entityId };

      // Update current comments array from entity cache
      const entityKey = `${entityType}_${entityId}`;
      state.comments = state.commentsByEntity[entityKey] || [];
    },

    /**
     * Add comment optimistically (for real-time updates)
     */
    addCommentOptimistic: (state, action) => {
      const comment = action.payload;
      state.comments.push(comment);

      // Also add to entity cache
      const entityKey = `${state.currentEntity.type}_${state.currentEntity.id}`;
      if (state.commentsByEntity[entityKey]) {
        state.commentsByEntity[entityKey].push(comment);
      }
    },

    /**
     * Update comment optimistically (for real-time updates)
     */
    updateCommentOptimistic: (state, action) => {
      const { commentId, updates } = action.payload;

      // Update in current comments
      const commentIndex = state.comments.findIndex((c) => c._id === commentId);
      if (commentIndex !== -1) {
        state.comments[commentIndex] = {
          ...state.comments[commentIndex],
          ...updates,
        };
      }

      // Update in entity cache
      const entityKey = `${state.currentEntity.type}_${state.currentEntity.id}`;
      if (state.commentsByEntity[entityKey]) {
        const cacheIndex = state.commentsByEntity[entityKey].findIndex(
          (c) => c._id === commentId
        );
        if (cacheIndex !== -1) {
          state.commentsByEntity[entityKey][cacheIndex] = {
            ...state.commentsByEntity[entityKey][cacheIndex],
            ...updates,
          };
        }
      }
    },

    /**
     * Delete comment optimistically (for real-time updates)
     */
    deleteCommentOptimistic: (state, action) => {
      const commentId = action.payload;

      // Remove from current comments
      state.comments = state.comments.filter((c) => c._id !== commentId);

      // Remove from entity cache
      const entityKey = `${state.currentEntity.type}_${state.currentEntity.id}`;
      if (state.commentsByEntity[entityKey]) {
        state.commentsByEntity[entityKey] = state.commentsByEntity[
          entityKey
        ].filter((c) => c._id !== commentId);
      }
    },
  },

  /**
   * Handle async thunk actions
   */
  extraReducers: (builder) => {
    builder
      // Fetch Comments
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const { entityType, entityId, comments } = action.payload;
        const entityKey = `${entityType}_${entityId}`;

        // Store comments in entity cache
        state.commentsByEntity[entityKey] = comments;

        // Update current comments if this matches current entity
        if (
          state.currentEntity.type === entityType &&
          state.currentEntity.id === entityId
        ) {
          state.comments = comments;
        }
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Add Comment
      .addCase(addComment.pending, (state) => {
        state.addingComment = true;
        state.addError = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.addingComment = false;
        state.addError = null;
        state.isSuccess = true;
        state.message = 'Comment added successfully';

        const newComment = action.payload;

        // Add to current comments
        state.comments.push(newComment);

        // Add to entity cache
        const entityKey = `${state.currentEntity.type}_${state.currentEntity.id}`;
        if (state.commentsByEntity[entityKey]) {
          state.commentsByEntity[entityKey].push(newComment);
        }
      })
      .addCase(addComment.rejected, (state, action) => {
        state.addingComment = false;
        state.addError = action.payload;
      })

      // Update Comment
      .addCase(updateComment.pending, (state) => {
        state.updatingComment = true;
        state.updateError = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        state.updatingComment = false;
        state.updateError = null;
        state.isSuccess = true;
        state.message = 'Comment updated successfully';

        const updatedComment = action.payload;

        // Update in current comments
        const commentIndex = state.comments.findIndex(
          (c) => c._id === updatedComment._id
        );
        if (commentIndex !== -1) {
          state.comments[commentIndex] = updatedComment;
        }

        // Update in entity cache
        const entityKey = `${state.currentEntity.type}_${state.currentEntity.id}`;
        if (state.commentsByEntity[entityKey]) {
          const cacheIndex = state.commentsByEntity[entityKey].findIndex(
            (c) => c._id === updatedComment._id
          );
          if (cacheIndex !== -1) {
            state.commentsByEntity[entityKey][cacheIndex] = updatedComment;
          }
        }
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.updatingComment = false;
        state.updateError = action.payload;
      })

      // Delete Comment
      .addCase(deleteComment.pending, (state) => {
        state.deletingComment = true;
        state.deleteError = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.deletingComment = false;
        state.deleteError = null;
        state.isSuccess = true;
        state.message = 'Comment deleted successfully';

        const commentId = action.payload;

        // Remove from current comments
        state.comments = state.comments.filter((c) => c._id !== commentId);

        // Remove from entity cache
        const entityKey = `${state.currentEntity.type}_${state.currentEntity.id}`;
        if (state.commentsByEntity[entityKey]) {
          state.commentsByEntity[entityKey] = state.commentsByEntity[
            entityKey
          ].filter((c) => c._id !== commentId);
        }
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.deletingComment = false;
        state.deleteError = action.payload;
      });
  },
});

// Export actions for use in components
export const {
  clearErrors,
  clearSuccess,
  setCurrentEntity,
  addCommentOptimistic,
  updateCommentOptimistic,
  deleteCommentOptimistic,
} = commentsSlice.actions;

// Export selectors for easy access to state
export const selectComments = (state) => state.comments.comments;
export const selectCommentsLoading = (state) => state.comments.loading;
export const selectCommentsError = (state) => state.comments.error;
export const selectCurrentEntity = (state) => state.comments.currentEntity;
export const selectCommentsByEntity = (entityType, entityId) => (state) => {
  const entityKey = `${entityType}_${entityId}`;
  return state.comments.commentsByEntity[entityKey] || [];
};

// Export the reducer
export default commentsSlice.reducer;
