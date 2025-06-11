/**
 * Activity Redux Slice
 *
 * Manages project activity state including:
 * - Real-time activity feed updates
 * - Activity filtering and pagination
 * - User presence and activity tracking
 * - Integration with socket.io for real-time updates
 */

import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import api from '../../utils/api';

// Async thunks for activity management
export const fetchProjectActivity = createAsyncThunk(
  'activity/fetchProjectActivity',
  async (
    { projectId, filter = 'all', timeRange = 'week', page = 1 },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        filter,
        timeRange,
        page: page.toString(),
        limit: '20',
      });

      const response = await api.get(
        `/projects/${projectId}/activity?${params}`
      );
      return {
        activities: response.data.activities,
        hasMore: response.data.hasMore,
        totalCount: response.data.totalCount,
        page: page,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch activity'
      );
    }
  }
);

export const fetchMoreActivity = createAsyncThunk(
  'activity/fetchMoreActivity',
  async (
    { projectId, filter = 'all', timeRange = 'week', page },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        filter,
        timeRange,
        page: page.toString(),
        limit: '20',
      });

      const response = await api.get(
        `/projects/${projectId}/activity?${params}`
      );
      return {
        activities: response.data.activities,
        hasMore: response.data.hasMore,
        page: page,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch more activity'
      );
    }
  }
);

export const createActivity = createAsyncThunk(
  'activity/createActivity',
  async (activityData, { rejectWithValue }) => {
    try {
      const response = await api.post('/activity', activityData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create activity'
      );
    }
  }
);

// Initial state
const initialState = {
  // Activity data by project
  byProject: {},

  // Current activity filters
  filters: {
    projectId: null,
    type: 'all',
    timeRange: 'week',
  },

  // Pagination state
  pagination: {
    page: 1,
    hasMore: true,
    totalCount: 0,
  },

  // Loading states
  loading: {
    initial: false,
    more: false,
    creating: false,
  },

  // Error states
  error: null,

  // Real-time activity cache (for immediate updates)
  realtimeCache: [],

  // Activity statistics
  stats: {
    totalActivities: 0,
    todayActivities: 0,
    weekActivities: 0,
  },
};

// Activity slice
const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    // Real-time activity updates
    addRealtimeActivity: (state, action) => {
      const activity = action.payload;
      const projectId = activity.projectId;

      // Add to realtime cache
      state.realtimeCache.unshift(activity);

      // Keep cache size manageable
      if (state.realtimeCache.length > 100) {
        state.realtimeCache = state.realtimeCache.slice(0, 100);
      }

      // Add to project-specific activity if that project is loaded
      if (state.byProject[projectId]) {
        state.byProject[projectId].activities.unshift(activity);

        // Keep project activity list manageable
        if (state.byProject[projectId].activities.length > 200) {
          state.byProject[projectId].activities = state.byProject[
            projectId
          ].activities.slice(0, 200);
        }
      }

      // Update statistics
      state.stats.totalActivities += 1;

      const activityDate = new Date(activity.createdAt);
      const today = new Date();
      const isToday = activityDate.toDateString() === today.toDateString();
      const isThisWeek = today - activityDate < 7 * 24 * 60 * 60 * 1000;

      if (isToday) {
        state.stats.todayActivities += 1;
      }
      if (isThisWeek) {
        state.stats.weekActivities += 1;
      }
    },

    // Update activity filters
    setActivityFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };

      // Reset pagination when filters change
      state.pagination.page = 1;
    },

    // Clear activity data for a project
    clearProjectActivity: (state, action) => {
      const projectId = action.payload;
      delete state.byProject[projectId];
    },

    // Update activity item (for edits, status changes, etc.)
    updateActivity: (state, action) => {
      const { activityId, updates } = action.payload;

      // Update in realtime cache
      const realtimeIndex = state.realtimeCache.findIndex(
        (a) => a._id === activityId
      );
      if (realtimeIndex !== -1) {
        state.realtimeCache[realtimeIndex] = {
          ...state.realtimeCache[realtimeIndex],
          ...updates,
        };
      }

      // Update in project-specific data
      Object.keys(state.byProject).forEach((projectId) => {
        const activityIndex = state.byProject[projectId].activities.findIndex(
          (a) => a._id === activityId
        );
        if (activityIndex !== -1) {
          state.byProject[projectId].activities[activityIndex] = {
            ...state.byProject[projectId].activities[activityIndex],
            ...updates,
          };
        }
      });
    },

    // Remove activity (for deletions)
    removeActivity: (state, action) => {
      const activityId = action.payload;

      // Remove from realtime cache
      state.realtimeCache = state.realtimeCache.filter(
        (a) => a._id !== activityId
      );

      // Remove from project-specific data
      Object.keys(state.byProject).forEach((projectId) => {
        state.byProject[projectId].activities = state.byProject[
          projectId
        ].activities.filter((a) => a._id !== activityId);
      });
    },

    // Reset error state
    clearError: (state) => {
      state.error = null;
    },

    // Reset entire activity state
    resetActivityState: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      // Fetch project activity
      .addCase(fetchProjectActivity.pending, (state) => {
        state.loading.initial = true;
        state.error = null;
      })
      .addCase(fetchProjectActivity.fulfilled, (state, action) => {
        const { activities, hasMore, totalCount, page } = action.payload;
        const projectId = action.meta.arg.projectId;

        state.loading.initial = false;
        state.byProject[projectId] = {
          activities: activities,
          lastFetched: Date.now(),
        };
        state.pagination = {
          page: page,
          hasMore: hasMore,
          totalCount: totalCount,
        };
      })
      .addCase(fetchProjectActivity.rejected, (state, action) => {
        state.loading.initial = false;
        state.error = action.payload;
      })

      // Fetch more activity (pagination)
      .addCase(fetchMoreActivity.pending, (state) => {
        state.loading.more = true;
      })
      .addCase(fetchMoreActivity.fulfilled, (state, action) => {
        const { activities, hasMore, page } = action.payload;
        const projectId = action.meta.arg.projectId;

        state.loading.more = false;

        if (state.byProject[projectId]) {
          state.byProject[projectId].activities.push(...activities);
        }

        state.pagination = {
          ...state.pagination,
          page: page,
          hasMore: hasMore,
        };
      })
      .addCase(fetchMoreActivity.rejected, (state, action) => {
        state.loading.more = false;
        state.error = action.payload;
      })

      // Create activity
      .addCase(createActivity.pending, (state) => {
        state.loading.creating = true;
      })
      .addCase(createActivity.fulfilled, (state, action) => {
        state.loading.creating = false;
        // Activity will be added via real-time update
      })
      .addCase(createActivity.rejected, (state, action) => {
        state.loading.creating = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  addRealtimeActivity,
  setActivityFilters,
  clearProjectActivity,
  updateActivity,
  removeActivity,
  clearError,
  resetActivityState,
} = activitySlice.actions;

// Selectors
export const selectActivityState = (state) => state.activity;

export const selectProjectActivity = createSelector(
  [selectActivityState, (state, projectId) => projectId],
  (activityState, projectId) => {
    return activityState.byProject[projectId]?.activities || [];
  }
);

export const selectActivityLoading = createSelector(
  [selectActivityState],
  (activityState) => activityState.loading
);

export const selectActivityError = createSelector(
  [selectActivityState],
  (activityState) => activityState.error
);

export const selectActivityPagination = createSelector(
  [selectActivityState],
  (activityState) => activityState.pagination
);

export const selectActivityFilters = createSelector(
  [selectActivityState],
  (activityState) => activityState.filters
);

export const selectRealtimeActivity = createSelector(
  [selectActivityState],
  (activityState) => activityState.realtimeCache
);

export const selectActivityStats = createSelector(
  [selectActivityState],
  (activityState) => activityState.stats
);

// Filtered activity selector
export const selectFilteredActivity = createSelector(
  [selectProjectActivity, selectActivityFilters],
  (activities, filters) => {
    if (!activities || activities.length === 0) return [];

    let filtered = activities;

    // Filter by type
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter((activity) => activity.type === filters.type);
    }

    // Filter by time range
    if (filters.timeRange && filters.timeRange !== 'all') {
      const now = new Date();
      const timeRanges = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };

      const cutoff = now - timeRanges[filters.timeRange];
      filtered = filtered.filter(
        (activity) => new Date(activity.createdAt) > cutoff
      );
    }

    return filtered;
  }
);

export default activitySlice.reducer;
