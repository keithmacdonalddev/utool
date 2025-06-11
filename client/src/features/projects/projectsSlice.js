import {
  createSlice,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import api from '../../utils/api';

/**
 * Projects Redux Slice using existing Redux Toolkit patterns
 *
 * This slice manages all project-related state and follows the
 * established patterns in the codebase for consistency
 */

// ===== ASYNC THUNKS =====
/**
 * Fetch all projects accessible to the current user
 * Supports filtering, sorting, and pagination
 */
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (
    { filters = {}, sort = '-updatedAt', page = 1, limit = 20 } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams({
        ...filters,
        sort,
        page,
        limit,
      });

      const response = await api.get(`/projects?${params}`);
      return response.data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || 'Failed to fetch projects',
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  }
);

/**
 * Fetch a single project by ID with full details
 */
export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  }
);

/**
 * Create a new project
 */
export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
  }
);

/**
 * Update an existing project
 */
export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, updates }) => {
    const response = await api.put(`/projects/${projectId}`, updates);
    return response.data;
  }
);

/**
 * Delete (archive) a project
 */
export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  }
);

/**
 * Add a member to a project
 */
export const addProjectMember = createAsyncThunk(
  'projects/addMember',
  async ({ projectId, memberData }) => {
    const response = await api.post(
      `/projects/${projectId}/members`,
      memberData
    );
    return response.data;
  }
);

/**
 * Update a project member's role or permissions
 */
export const updateProjectMember = createAsyncThunk(
  'projects/updateMember',
  async ({ projectId, userId, updates }) => {
    const response = await api.put(
      `/projects/${projectId}/members/${userId}`,
      updates
    );
    return response.data;
  }
);

/**
 * Remove a member from a project
 */
export const removeProjectMember = createAsyncThunk(
  'projects/removeMember',
  async ({ projectId, userId }) => {
    const response = await api.delete(
      `/projects/${projectId}/members/${userId}`
    );
    return response.data;
  }
);

/**
 * Fetch project statistics
 */
export const fetchProjectStats = createAsyncThunk(
  'projects/fetchStats',
  async (projectId) => {
    const response = await api.get(`/projects/${projectId}/stats`);
    return response.data;
  }
);

// ===== INITIAL STATE =====
const initialState = {
  // Projects data
  projects: [],
  currentProject: null,
  projectStats: null,

  // UI state
  loading: false,
  creating: false,
  updating: false,
  error: null,

  // Pagination
  totalProjects: 0,
  currentPage: 1,
  totalPages: 1,

  // Filters and sorting
  filters: {
    search: '',
    status: '',
    category: '',
    priority: '',
  },
  sortBy: '-updatedAt',
  // Real-time updates tracking
  lastSync: null,
  pendingUpdates: [],

  // Collaboration features (Milestone 3)
  activities: {}, // projectId -> array of activities
  presence: {}, // projectId -> { userId: presenceData }
  notifications: [], // array of notifications
};

// ===== SLICE =====
const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    // Set current project (useful for navigation)
    setCurrentProject: (state, action) => {
      state.currentProject = action.payload;
    },

    // Clear current project
    clearCurrentProject: (state) => {
      state.currentProject = null;
      state.projectStats = null;
    },

    // Update filters
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Clear all filters
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },

    // Set sort order
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
    },

    // Handle real-time project update
    projectUpdated: (state, action) => {
      const updatedProject = action.payload;

      // Update in projects list
      const index = state.projects.findIndex(
        (p) => p._id === updatedProject._id
      );
      if (index !== -1) {
        state.projects[index] = updatedProject;
      }

      // Update current project if it's the one being viewed
      if (state.currentProject?._id === updatedProject._id) {
        state.currentProject = updatedProject;
      }
    },

    // Handle real-time project deletion
    projectDeleted: (state, action) => {
      const projectId = action.payload;

      // Remove from projects list
      state.projects = state.projects.filter((p) => p._id !== projectId);

      // Clear current project if it was deleted
      if (state.currentProject?._id === projectId) {
        state.currentProject = null;
        state.projectStats = null;
      }

      // Update total count
      state.totalProjects = Math.max(0, state.totalProjects - 1);
    },

    // Handle real-time member update
    memberUpdated: (state, action) => {
      const { projectId, member } = action.payload;

      // Find and update the project
      const project = state.projects.find((p) => p._id === projectId);
      if (project) {
        const memberIndex = project.members.findIndex(
          (m) => m.user === member.user
        );
        if (memberIndex !== -1) {
          project.members[memberIndex] = member;
        } else {
          project.members.push(member);
        }
      }

      // Update current project if needed
      if (state.currentProject?._id === projectId) {
        const memberIndex = state.currentProject.members.findIndex(
          (m) => m.user === member.user
        );
        if (memberIndex !== -1) {
          state.currentProject.members[memberIndex] = member;
        } else {
          state.currentProject.members.push(member);
        }
      }
    }, // Clear any errors
    clearError: (state) => {
      state.error = null;
    },

    // Collaboration-related actions (Milestone 3)
    updateProjectActivity: (state, action) => {
      const { projectId, activity } = action.payload;

      // Initialize activity arrays if they don't exist
      if (!state.activities) {
        state.activities = {};
      }
      if (!state.activities[projectId]) {
        state.activities[projectId] = [];
      }

      // Add new activity to the front of the array
      state.activities[projectId].unshift(activity);

      // Keep only the last 50 activities per project
      if (state.activities[projectId].length > 50) {
        state.activities[projectId] = state.activities[projectId].slice(0, 50);
      }
    },

    updateProjectPresence: (state, action) => {
      const { projectId, userId, presence } = action.payload;

      // Initialize presence tracking if it doesn't exist
      if (!state.presence) {
        state.presence = {};
      }
      if (!state.presence[projectId]) {
        state.presence[projectId] = {};
      }

      // Update user presence
      if (presence) {
        state.presence[projectId][userId] = {
          ...state.presence[projectId][userId],
          ...presence,
        };
      } else {
        // Remove user presence if presence is null
        delete state.presence[projectId][userId];
      }
    },

    markNotificationAsRead: (state, action) => {
      const notificationId = action.payload;

      // Initialize notifications if they don't exist
      if (!state.notifications) {
        state.notifications = [];
      }

      // Find and mark notification as read
      const notification = state.notifications.find(
        (n) => n.id === notificationId
      );
      if (notification) {
        notification.isRead = true;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        // Handle the API response structure: {success: true, count: 1, data: Array(1)}
        const projectsArray =
          action.payload.data || action.payload.projects || action.payload;
        state.projects = projectsArray;
        state.totalProjects =
          action.payload.count ||
          action.payload.total ||
          projectsArray?.length ||
          0;
        state.currentPage = action.payload.page || 1;
        state.totalPages =
          action.payload.totalPages ||
          Math.ceil((action.payload.count || 0) / 20) ||
          1;
        state.lastSync = new Date().toISOString();
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Fetch single project
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.loading = false;
        // Handle potential response structure: {success: true, data: project} or direct project
        const project = action.payload.data || action.payload;
        state.currentProject = project;

        // Also update in projects list if present
        const index = state.projects.findIndex((p) => p._id === project._id);
        if (index !== -1) {
          state.projects[index] = project;
        }
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });

    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.creating = false;
        state.projects.unshift(action.payload);
        state.totalProjects += 1;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message;
      });

    // Update project
    builder
      .addCase(updateProject.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.updating = false;
        const updatedProject = action.payload;

        // Update in projects list
        const index = state.projects.findIndex(
          (p) => p._id === updatedProject._id
        );
        if (index !== -1) {
          state.projects[index] = updatedProject;
        }

        // Update current project if it's the one being updated
        if (state.currentProject?._id === updatedProject._id) {
          state.currentProject = updatedProject;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message;
      });

    // Delete project
    builder
      .addCase(deleteProject.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.updating = false;
        const deletedId = action.meta.arg;

        // Remove from projects list
        state.projects = state.projects.filter((p) => p._id !== deletedId);
        state.totalProjects = Math.max(0, state.totalProjects - 1);

        // Clear current project if it was deleted
        if (state.currentProject?._id === deletedId) {
          state.currentProject = null;
          state.projectStats = null;
        }
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message;
      });

    // Fetch project stats
    builder.addCase(fetchProjectStats.fulfilled, (state, action) => {
      state.projectStats = action.payload;
    });

    // Member operations
    builder.addCase(addProjectMember.fulfilled, (state, action) => {
      const project = action.payload;

      // Update in projects list
      const index = state.projects.findIndex((p) => p._id === project._id);
      if (index !== -1) {
        state.projects[index] = project;
      }

      // Update current project
      if (state.currentProject?._id === project._id) {
        state.currentProject = project;
      }
    });

    builder.addCase(updateProjectMember.fulfilled, (state, action) => {
      const project = action.payload;

      // Update in projects list
      const index = state.projects.findIndex((p) => p._id === project._id);
      if (index !== -1) {
        state.projects[index] = project;
      }

      // Update current project
      if (state.currentProject?._id === project._id) {
        state.currentProject = project;
      }
    });

    builder.addCase(removeProjectMember.fulfilled, (state, action) => {
      const project = action.payload;

      // Update in projects list
      const index = state.projects.findIndex((p) => p._id === project._id);
      if (index !== -1) {
        state.projects[index] = project;
      }

      // Update current project
      if (state.currentProject?._id === project._id) {
        state.currentProject = project;
      }
    });
  },
});

// Export actions
export const {
  setCurrentProject,
  clearCurrentProject,
  setFilters,
  clearFilters,
  setSortBy,
  projectUpdated,
  projectDeleted,
  memberUpdated,
  clearError,
  updateProjectActivity,
  updateProjectPresence,
  markNotificationAsRead,
} = projectsSlice.actions;

// ===== SELECTORS =====
export const selectAllProjects = (state) => state.projects.projects;
export const selectCurrentProject = (state) => state.projects.currentProject;
export const selectProjectStats = (state) => state.projects.projectStats;
export const selectProjectsLoading = (state) => state.projects.loading;
export const selectProjectsCreating = (state) => state.projects.creating;
export const selectProjectsUpdating = (state) => state.projects.updating;
export const selectProjectsError = (state) => state.projects.error;
export const selectProjectsFilters = (state) => state.projects.filters;
export const selectProjectsSortBy = (state) => state.projects.sortBy;
export const selectProjectsPagination = (state) => ({
  currentPage: state.projects.currentPage,
  totalPages: state.projects.totalPages,
  totalProjects: state.projects.totalProjects,
});

// Enhanced memoized selectors using createSelector
export const selectFilteredProjects = createSelector(
  [selectAllProjects, selectProjectsFilters],
  (projects, filters) => {
    return projects.filter((project) => {
      // Search filter
      if (
        filters.search &&
        !project.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filters.status && project.status !== filters.status) {
        return false;
      }

      // Category filter
      if (filters.category && project.category !== filters.category) {
        return false;
      }

      // Priority filter
      if (filters.priority && project.priority !== filters.priority) {
        return false;
      }

      return true;
    });
  }
);

export const selectProjectsByStatus = createSelector(
  [selectAllProjects],
  (projects) => {
    return projects.reduce((acc, project) => {
      const status = project.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(project);
      return acc;
    }, {});
  }
);

export const selectActiveProjects = createSelector(
  [selectAllProjects],
  (projects) => {
    return projects.filter((project) => project.status === 'Active');
  }
);

export const selectMyProjects = createSelector(
  [selectAllProjects, (state) => state.auth?.user?.id],
  (projects, currentUserId) => {
    return projects.filter(
      (project) =>
        project.owner === currentUserId ||
        project.members?.some((member) => member.user === currentUserId)
    );
  }
);

export default projectsSlice.reducer;
