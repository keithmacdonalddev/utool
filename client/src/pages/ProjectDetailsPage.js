// ProjectDetailsPage.js - A React page component that displays and manages a single project
//
// KEY CONCEPTS:
// 1. React Router Integration: Using URL parameters and navigation hooks
// 2. Direct API calls with fallback logic for reliability
// 3. Component Composition: Orchestrating smaller components to build the page UI
// 4. Conditional Rendering: Displaying different UI based on loading/error states
// 5. Simplified state management for stability

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Edit } from 'lucide-react';
import api from '../utils/api';
import {
  getProject,
  resetProjectStatus,
} from '../features/projects/projectSlice';

// Phase 3: Add custom hooks for intelligent data fetching
import useProjects from '../hooks/useProjects';
import useProjectTasks from '../hooks/useProjectTasks';

// Phase 1: ProjectDetailsInfo component ✅
import ProjectDetailsInfo from '../components/projects/molecules/ProjectDetailsInfo';

// Phase 2: Add task section components
import CriticalTasksSection from '../components/tasks/CriticalTasksSection';
import AllTasksSection from '../components/tasks/AllTasksSection';

// Phase 2: Add task utility functions
import { getCriticalTasks, getTagFilteredTasks } from '../utils/taskUtils';

// Milestone 3: Real-time collaboration integration
import RealTimeCollaborationInterface from '../components/projects/organisms/RealTimeCollaborationInterface';

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ENHANCED DEBUG: Critical ID parameter logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [ProjectDetailsPage] Component Mount/Render:`, {
      projectId: id,
      hasId: !!id,
      idType: typeof id,
      urlPath: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  }

  // PERFORMANCE FIX: Go back to individual memoized selectors - the consolidated approach created new objects
  const selectCurrentProject = useMemo(
    () => (state) => state.projects.currentProject,
    []
  );
  const selectIsLoading = useMemo(
    () => (state) => state.projects.isLoading,
    []
  );
  const selectIsError = useMemo(() => (state) => state.projects.isError, []);
  const selectMessage = useMemo(() => (state) => state.projects.message, []);

  // CRITICAL: Add auth state selectors to check for restoration status
  const selectAuthState = useMemo(() => (state) => state.auth, []);

  // Redux state (keep as backup) - back to individual selectors for stability
  const currentProject = useSelector(selectCurrentProject);
  const isLoading = useSelector(selectIsLoading);
  const isError = useSelector(selectIsError);
  const message = useSelector(selectMessage);

  // Auth state for preventing race conditions
  const authState = useSelector(selectAuthState);
  const { isAuthRestored, authRestorationAttempted, user, token } = authState; // user is currentUser

  // Local state as primary source
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phase 2: Add task UI state
  const [selectedTags, setSelectedTags] = useState([]);

  // Phase 1: Keep friends as placeholder (Phase 3 will implement)
  // const [friends, setFriends] = useState([]); // Empty for now, will populate in Phase 3+
  // const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  // const [showRemoveFriendModal, setShowRemoveFriendModal] = useState(false);

  // DEBUG: Development-only logging for hook configuration
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `🔍 useProjects Debug: actionCreator=getProject, id=${id}, enabled=${!!id}`
    );
  }

  // PERFORMANCE FIX: Memoize actionParams to prevent cache misses
  const actionParams = useMemo(() => {
    const params = { projectId: id };
    // ENHANCED DEBUG: Comprehensive logging for bug investigation
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [ProjectDetailsPage] ActionParams created:`, {
        projectId: id,
        params,
        timestamp: new Date().toISOString(),
      });
    }
    return params;
  }, [id]);

  const {
    data: hookProject,
    isLoading: hookLoading,
    error: hookError,
    refetch: refetchProject,
    // Phase 3 Step 2: Enhanced features
    backgroundRefreshState,
    updateProjectOptimistically,
    triggerBackgroundRefresh,
    pendingOperations,
    hasOptimisticUpdates,
    rollbackOptimisticUpdate,
  } = useProjects({
    actionCreator: 'getProject',
    actionParams,
    backgroundRefresh: false, // PERFORMANCE FIX: Temporarily disable to isolate re-render issue
    smartRefresh: false, // PERFORMANCE FIX: Temporarily disable to isolate re-render issue
    enabled: !!id, // ENABLED: Re-enable to ensure data fetching works
  });

  // ENHANCED DEBUG: Comprehensive logging for bug investigation
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 [ProjectDetailsPage] useProjects Result:`, {
      hookProject: hookProject
        ? { id: hookProject._id || hookProject.id, name: hookProject.name }
        : null,
      hookLoading,
      hookError: hookError ? hookError.message || hookError : null,
      timestamp: new Date().toISOString(),
      projectId: id,
      isAuthRestored,
      authRestorationAttempted,
      hasToken: !!token,
      hasUser: !!user,
    });
  }

  // DEBUG: Development-only logging for useProjects results
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `🔍 useProjects Result: hookProject=${
        hookProject ? 'exists' : 'null'
      }, loading=${hookLoading}, error=${!!hookError}`
    );
  }

  // DEBUG: Development-only Redux state logging
  if (process.env.NODE_ENV === 'development') {
    // Consider reducing the frequency or verbosity of these logs for cleaner console output
    console.log(
      `🔍 Redux Debug: currentProject=${
        currentProject ? 'exists' : 'null'
      }, isLoading=${isLoading}, isError=${isError}`
    );
  }

  const {
    tasks: hookTasks,
    isLoading: hookTasksLoading,
    error: hookTasksError,
    refetchTasks,
  } = useProjectTasks(id, {
    backgroundRefresh: false, // PERFORMANCE FIX: Disable background refresh to prevent re-renders
    smartRefresh: false, // PERFORMANCE FIX: Disable smart refresh to prevent re-renders
    skipInitialFetch: !id, // Only require project ID
  });

  // Phase 3: Combined state logic - prioritize hooks, fallback to local state, then Redux
  const finalProject = hookProject || project || currentProject;
  const finalLoading = hookLoading || loading || isLoading;
  const finalError = hookError || (isError ? message : null) || error; // Prioritize hook error, then Redux, then local

  // DERIVE props for ProjectDetailsInfo
  const projectManager =
    finalProject?.projectManager || finalProject?.createdBy;
  const teamMembers = finalProject?.teamMembers || finalProject?.members || [];

  // Determine currentUserRole (simplified version)
  let currentUserRole = 'viewer';
  if (user && finalProject) {
    if (projectManager && projectManager._id === user._id) {
      currentUserRole = 'manager';
    } else if (teamMembers.some((member) => member._id === user._id)) {
      currentUserRole = 'member';
    }
  }

  // ENHANCED DEBUG: Critical state logging for bug investigation
  if (process.env.NODE_ENV === 'development') {
    // Consider reducing the frequency or verbosity of these logs for cleaner console output
    console.log(`🔍 [ProjectDetailsPage] Final State:`, {
      finalProject: finalProject
        ? { id: finalProject._id || finalProject.id, name: finalProject.name }
        : null,
      finalLoading,
      finalError: finalError ? finalError.message || finalError : null,
      sources: {
        hookProject: !!hookProject,
        localProject: !!project,
        reduxProject: !!currentProject,
      },
      auth: {
        isAuthRestored,
        authRestorationAttempted,
        hasToken: !!token,
        hasUser: !!user,
      },
      projectId: id,
      timestamp: new Date().toISOString(),
    });
  }

  // Phase 3: Use hook tasks as primary source, with data normalization
  const rawTasks = hookTasks; // Directly use hookTasks, local `tasks` state will be removed
  const finalTasks = useMemo(() => {
    if (!rawTasks) return rawTasks; // Return undefined or null if no tasks from hook

    // PERFORMANCE FIX: Avoid creating new objects if data hasn't changed
    // Check if normalization is actually needed
    const needsNormalization = rawTasks.some((task) => {
      return (
        (task.priority && task.priority !== task.priority?.toLowerCase()) ||
        (task.assignee &&
          !task.assignee.name &&
          (task.assignee.email || task.assignee.username))
      );
    });

    // If no normalization needed, return the original array to prevent re-renders
    if (!needsNormalization) {
      return rawTasks;
    }

    // Only normalize when actually needed
    return rawTasks.map((task) => ({
      ...task,
      // Normalize priority to lowercase to match TaskCard PropTypes
      priority: task.priority ? task.priority.toLowerCase() : undefined,
      // Ensure assignee has a name for UserAvatar
      assignee: task.assignee
        ? {
            ...task.assignee,
            name:
              task.assignee.name ||
              task.assignee.email ||
              task.assignee.username ||
              'Unknown User',
          }
        : undefined,
    }));
  }, [rawTasks]);

  const finalTasksLoading = hookTasksLoading;
  const finalTasksError = hookTasksError;

  // Phase 3: Memoize filtered task lists using final task data
  const criticalTasks = useMemo(
    () => getCriticalTasks(finalTasks || []),
    [finalTasks]
  );
  const tagFilteredTasks = useMemo(() => {
    // PERFORMANCE FIX: Removed complex debug logging inside useMemo to prevent re-renders
    const filtered = getTagFilteredTasks(finalTasks || [], selectedTags);

    // DEBUG: Development-only task filtering logs
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🔍 Task filtering: ${finalTasks?.length || 0} total, ${
          filtered.length
        } filtered, ${selectedTags.length} tags selected`
      );
    }

    return filtered;
  }, [finalTasks, selectedTags]);

  // DEBUG: Development-only project state logging
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `🔍 Project State (Phase 3 Step 2): ProjectID=${id}, TasksCount=${
        finalTasks?.length || 0
      }, ProjectLoaded=${!!finalProject}`
    );
  }

  // ENHANCED DEBUG: Direct API test to isolate the issue
  useEffect(() => {
    if (id && isAuthRestored && token) {
      const testDirectAPICall = async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `🧪 [ProjectDetailsPage] Testing direct API call for project ${id}`
            );
          }
          const response = await api.get(`/projects/${id}`);
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [ProjectDetailsPage] Direct API call successful:`, {
              projectId: id,
              projectName: response.data?.data?.name || response.data?.name,
              responseData: response.data,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`❌ [ProjectDetailsPage] Direct API call failed:`, {
            projectId: id,
            error: error.response?.data || error.message,
            status: error.response?.status,
            timestamp: new Date().toISOString(),
          });
        }
      };

      // Delay the test slightly to ensure auth is fully set up
      setTimeout(testDirectAPICall, 1000);
    }
  }, [id, isAuthRestored, token]);

  // Phase 3: Let hooks handle data fetching completely
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Consider reducing general logs like this one if console is too noisy
      console.log(
        `🔄 Phase 3: Hooks are handling all data fetching for project ${id}`
      );
    }

    // PERFORMANCE FIX: Only update state when actually needed to prevent re-renders
    setLoading((prev) => {
      if (prev !== false) {
        return false; // Only update if it was true
      }
      return prev; // Don't trigger re-render if already false
    });

    // Just set basic error state if no ID
    if (!id) {
      setError((prev) => {
        const newError = 'No project ID provided';
        if (prev !== newError) {
          return newError; // Only update if different
        }
        return prev; // Don't trigger re-render if same
      });
    } else {
      // Clear error if ID exists
      setError((prev) => {
        if (prev !== null) {
          return null; // Only clear if there was an error
        }
        return prev; // Don't trigger re-render if already null
      });
    }

    // The hooks will handle the rest!
  }, [id]);

  // PERFORMANCE FIX: Optimized cleanup to prevent unnecessary re-renders during navigation
  useEffect(() => {
    // Store the id at the time of effect setup, to use in cleanup.
    // This ensures that if the id changes and the component re-renders
    // before unmounting, the cleanup function uses the id from its own closure.
    const projectIdForCleanup = id;
    return () => {
      // Defer cleanup to avoid triggering re-renders during navigation
      // and to ensure it runs after other potential updates.
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🧹 ProjectDetailsPage cleanup initiated for project ID: ${projectIdForCleanup}`
        );
      }
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `⏰ ProjectDetailsPage: Deferred Redux reset for project ID: ${projectIdForCleanup}`
          );
        }
        // Dispatch resetProjectStatus to clear the current project from Redux state.
        // This is important to prevent showing stale data when navigating
        // to another project or back to a list view.
        dispatch(resetProjectStatus());
      }, 0);
    };
  }, [dispatch, id]); // Add dispatch and id to dependencies, as dispatch is used and id defines the context of cleanup
  // Ensure that if local state `project`, `loading`, `error` are removed, their setters are also removed
  // and any logic relying on them is updated to use hook-provided state.

  // Phase 1: Placeholder handler for member management (will implement in Phase 4)
  const handleAddMember = async (userId) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🚧 Phase 2: handleAddMember called with userId: ${userId} (not implemented yet)`
      );
    }
    // TODO: Implement in Phase 4
  };

  // Phase 2: Add task click handler (placeholder for Phase 4)
  const handleTaskClick = (event, taskId) => {
    event.stopPropagation();
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🚧 Phase 2: handleTaskClick called with taskId: ${taskId} (not implemented yet)`
      );
    }
    // TODO: Implement task sidebar in Phase 4
  };

  // Phase 2: Add tag filter handlers
  const handleTagSelect = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏷️ Phase 2: Tag selected: ${tag}`);
      }
    }
  };

  const handleTagDeselect = (tag) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
    if (process.env.NODE_ENV === 'development') {
      console.log(`🏷️ Phase 2: Tag deselected: ${tag}`);
    }
  };

  const handleClearAllTags = () => {
    setSelectedTags([]);
    if (process.env.NODE_ENV === 'development') {
      console.log(`🏷️ Phase 2: All tags cleared`);
    }
  };

  // Loading state - Enhanced with auth restoration awareness
  if (!isAuthRestored) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-300">
            Restoring authentication...
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Ensuring secure access to project data
          </p>
        </div>
      </div>
    );
  }

  // Continue with normal loading if auth is restored but data is still loading
  if (finalLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-300">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (finalError) {
    return (
      <div className="flex items-center justify-center h-screen text-center">
        <div>
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{finalError}</p>
          <Link
            to="/projects/dashboard"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // No project found
  if (!finalProject) {
    return (
      <div className="flex items-center justify-center h-screen text-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-400 mb-4">
            No Project Found
          </h2>
          <p className="text-gray-300 mb-6">
            Project not found or you don't have permission to view it.
          </p>
          <Link
            to="/projects/dashboard"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Main project display
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-dark-900 min-h-screen text-white">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <Link
            to="/projects/dashboard"
            className="text-gray-400 hover:text-white transition-colors flex items-center"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Dashboard
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">
              {finalProject.name}
            </h1>
            {/* Phase 3 Step 2: Visual indicators for enhanced features */}
            {hasOptimisticUpdates && (
              <span className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center">
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse mr-1"></div>
                Updating...
              </span>
            )}
            {backgroundRefreshState?.isRefreshing && (
              <span className="bg-green-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-spin mr-1"></div>
                Syncing...
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-2 sm:mt-0">
            {/* Phase 3 Step 2: Demo optimistic update button */}
            <button
              onClick={() => {
                const timestamp = new Date().toLocaleTimeString();
                if (process.env.NODE_ENV === 'development') {
                  console.log(`🚀 Testing optimistic update at ${timestamp}`);
                }
                updateProjectOptimistically(id, {
                  name: `${finalProject.name} (Updated ${timestamp})`,
                  description: `Optimistically updated at ${timestamp}`,
                });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
              title="Demo optimistic update"
            >
              🚀 Demo Update
            </button>

            <button
              onClick={() => {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`🔄 Triggering background refresh`);
                }
                triggerBackgroundRefresh();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
              title="Trigger background refresh"
            >
              🔄 Refresh
            </button>

            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="bg-dark-700 hover:bg-dark-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <Edit size={16} className="mr-2" />
              Edit Project
            </button>
          </div>
        </div>
      </div>

      {/* Phase 2: Updated layout to include task sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - project details and tasks */}
        <div className="lg:col-span-2 space-y-8">
          {/* Phase 3: ProjectDetailsInfo component with hook data */}
          <ProjectDetailsInfo
            project={finalProject} // Use finalProject
            projectManager={projectManager} // Pass derived projectManager
            teamMembers={teamMembers} // Pass derived teamMembers
            currentUser={user} // Pass the full currentUser object from authState
            currentUserRole={currentUserRole} // Pass derived currentUserRole
            loading={finalLoading} // Use finalLoading
            error={finalError} // Use the consolidated error
            // onEditClick={() => setShowEditModal(true)} // Placeholder, assuming modals are not yet implemented or managed differently
            // onDeleteClick={() => setShowDeleteModal(true)} // Placeholder
            // onAddMemberClick={() => setShowAddMemberModal(true)} // Placeholder
            // onRemoveMemberClick={handleOpenRemoveMemberModal} // Placeholder
            // onAddFriendClick={() => setShowAddFriendModal(true)} // TODO: Implement friend functionality
            // onRemoveFriendClick={() => setShowRemoveFriendModal(true)} // TODO: Implement friend functionality
            friends={[]} // Pass an empty array to prevent ReferenceError
            // --- The following props seem to be from useProjectPresence, ensure they are correctly passed if needed ---
            // presenceData={projectPresence} // Pass presence data - This needs to be sourced if used by ProjectDetailsInfo
            // presenceStats={presenceStats} // Pass presence stats - This needs to be sourced if used by ProjectDetailsInfo
            // isUserOnline={isUserOnline} // Pass isUserOnline utility - This needs to be sourced
            // getUserStatus={getUserStatus} // Pass getUserStatus utility - This needs to be sourced
            // getStatusColor={getStatusColor} // Pass getStatusColor utility - This needs to be sourced
            // getStatusIcon={getStatusIcon} // Pass getStatusIcon utility - This needs to be sourced
            // formatPresenceText={formatPresenceText} // Pass formatPresenceText utility - This needs to be sourced
            // getLastSeenText={getLastSeenText} // Pass getLastSeenText utility - This needs to be sourced
          />

          {/* Phase 3: Critical Tasks Section with hook data */}
          <CriticalTasksSection
            tasks={criticalTasks}
            isLoading={finalTasksLoading}
            onTaskClick={handleTaskClick}
            error={finalTasksError}
          />

          {/* Phase 3: Enhanced All Tasks Section with advanced features */}
          <AllTasksSection
            tasks={finalTasks} // Pass all tasks (from hooks or fallback)
            filteredTasks={tagFilteredTasks} // Pass filtered tasks for display
            tasksLoading={finalTasksLoading}
            tasksError={finalTasksError}
            onTaskClick={handleTaskClick}
            selectedTags={selectedTags}
            onTagSelect={handleTagSelect}
            onTagDeselect={handleTagDeselect}
            onClearAllTags={handleClearAllTags}
            projectId={id}
            teamMembers={teamMembers} // Pass team members for advanced features
            backgroundRefreshState={backgroundRefreshState}
          />

          {/* Phase 3: Enhanced debug props */}
          <div className="mt-4 bg-blue-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">
              🚀 Phase 3: Hook Integration Debug
            </h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>
                finalTasks.length:{' '}
                {finalTasks ? finalTasks.length : 'null/undefined'}
              </p>
              <p>Source: {finalTasks === hookTasks ? 'HOOKS' : 'UNKNOWN'}</p>
              <p>
                filteredTasks.length:{' '}
                {tagFilteredTasks ? tagFilteredTasks.length : 'null/undefined'}
              </p>
              <p>finalTasksLoading: {finalTasksLoading ? 'true' : 'false'}</p>
              <p>
                finalTasksError: {finalTasksError ? finalTasksError : 'null'}
              </p>
              <p>selectedTags.length: {selectedTags.length}</p>
              <p>
                Sample task:{' '}
                {finalTasks && finalTasks[0]
                  ? `${finalTasks[0].title} (${finalTasks[0]._id})`
                  : 'No tasks'}
              </p>
              <p>Hook status: {hookTasks ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>

        {/* Right column - Real-time collaboration interface */}
        <div className="lg:col-span-1">
          {finalProject && (
            <RealTimeCollaborationInterface
              projectId={id}
              isMinimized={false}
            />
          )}
          {!finalProject && (
            <div className="bg-dark-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Team Collaboration</h3>
              <p className="text-gray-400 text-sm">
                Loading collaboration features...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Phase 3: Hook Integration debug info */}
      <div className="mt-8 bg-dark-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Debug Info (Phase 3)</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Project ID: {id}</p>
          <p>Project loaded: {finalProject ? 'Yes' : 'No'}</p>
          <p>
            Project source:{' '}
            {finalProject === hookProject
              ? 'Custom Hook (useProjects)'
              : finalProject === project
              ? 'Direct API/Redux payload'
              : 'Redux currentProject'}
          </p>
          <p>
            Tasks source:{' '}
            {finalTasks === hookTasks
              ? 'Custom Hook (useProjectTasks)'
              : 'Unknown'}
          </p>
          <p>
            Tasks: {finalTasks?.length || 0} total, {criticalTasks.length}{' '}
            critical, {tagFilteredTasks.length} filtered
          </p>
          <p>Tasks loading: {finalTasksLoading ? 'Yes' : 'No'}</p>
          <p>Tasks error: {finalTasksError || 'None'}</p>
          <p>
            Selected tags:{' '}
            {selectedTags.length > 0 ? selectedTags.join(', ') : 'None'}
          </p>
          <p>Friends count: {0} (Phase 3+ will populate)</p>
          <p>Phase: 3 - Custom hooks with intelligent caching integrated</p>
          <p>Timestamp: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
