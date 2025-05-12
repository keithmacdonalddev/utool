// ProjectDetailsPage.js - A React page component that displays and manages a single project
//
// KEY CONCEPTS:
// 1. React Router Integration: Using URL parameters and navigation hooks
// 2. Efficient Data Fetching: Using custom hooks with intelligent caching to prevent redundant API calls
// 3. Component Composition: Orchestrating smaller components to build the page UI
// 4. Conditional Rendering: Displaying different UI based on loading/error states
// 5. Custom Hooks: Reusing logic across components (useProjects, useProjectTasks, useFriends)
// 6. Improved Code Readability: Delegated rendering of sections to child components

import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateProject, // Keep updateProject for adding members via handler
  resetProjectStatus,
  getProject,
} from '../features/projects/projectSlice';
import {
  resetTaskStatus,
  updateTask, // Keep updateTask for task details sidebar
  deleteTask, // Keep deleteTask for task details sidebar
} from '../features/tasks/taskSlice';

// Import custom hooks with caching
import useProjects from '../hooks/useProjects';
import useProjectTasks from '../hooks/useProjectTasks';

// Import the section components
import ProjectDetailsInfo from '../components/projects/ProjectDetailsInfo';
import CriticalTasksSection from '../components/tasks/CriticalTasksSection';
import AllTasksSection from '../components/tasks/AllTasksSection';

// Import components that were already separate
import TaskCreateModal from '../components/tasks/TaskCreateModal';
import ProjectNotes from '../components/projects/ProjectNotes';

// Import utility functions for task filtering and processing
import {
  getCriticalTasks,
  getTagFilteredTasks,
  getFilteredTasks,
} from '../utils/taskUtils';

import { Edit, ArrowLeft } from 'lucide-react';

import { useNotifications } from '../context/NotificationContext';
import useFriends from '../hooks/useFriends';

// Pre-load the TaskDetailsSidebar component
const TaskDetailsSidebar = lazy(() =>
  import('../components/tasks/TaskDetailsSidebar')
);

// Immediately trigger the preload
import('../components/tasks/TaskDetailsSidebar').catch(() => {});

/**
 * ProjectDetailsPage Component
 *
 * This page serves as an orchestrator:
 * - Fetches primary data (project, tasks, friends) using custom hooks with caching.
 * - Manages top-level UI state (modal, sidebar, main filters like tags).
 * - Provides handlers that interact with Redux/API.
 * - Renders structural layout and delegates rendering of distinct sections
 * to smaller, focused child components.
 *
 * Uses intelligent caching to prevent redundant API calls.
 */
const ProjectDetailsPage = () => {
  /**
   * React Router Hooks:
   * - useParams: Extract route parameters from the current URL
   * - useNavigate: Programmatic navigation between routes
   */
  const { id } = useParams(); // Extract project ID from URL
  const navigate = useNavigate(); // For programmatic navigation

  /**
   * Redux Hooks:
   * - useDispatch: Get the dispatch function to send actions
   */
  const dispatch = useDispatch();

  /**
   * Custom Hooks with Caching:
   * - useProjects: Gets project data with caching
   * - useProjectTasks: Gets tasks for the project with caching
   * - useFriends: Gets friends data for member management
   */ const {
    projects,
    isLoading: projectsLoading,
    error: projectsErrorHook, // Renamed to avoid conflict with projectError from useProjects single fetch
    refetchProjects,
    backgroundRefreshState: projectsListBackgroundState,
  } = useProjects({
    skipInitialFetch: true, // We'll fetch the individual project instead
    backgroundRefresh: true, // Enable background refresh for the projects list
    smartRefresh: true, // Enable smart comparison to prevent unnecessary re-renders
  }); // Get the current project data with intelligent caching
  // Note: Using the enhanced useProjects hook specifically for single project
  const {
    data: project,
    isLoading,
    error: projectError, // This is the primary error state for the current project
    refetch: refetchProject,
    backgroundRefreshState: projectBackgroundState,
  } = useProjects({
    selector: (state) => state.projects.currentProject,
    actionCreator: 'getProject',
    actionParams: {
      projectId: id,
      forceRefresh: false, // Use cached data for initial load if available
    },
    cacheTimeout: 5 * 60 * 1000, // 5 minutes cache (project details change infrequently)
    backgroundRefresh: true, // Enable background refresh for seamless updates
    smartRefresh: true, // Enable smart comparison to prevent unnecessary re-renders
  });
  // Get tasks for this project with intelligent caching
  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetchTasks,
    backgroundRefreshState: tasksBackgroundRefreshState,
  } = useProjectTasks(id, {
    cacheTimeout: 2 * 60 * 1000, // 2 minutes cache (tasks change more frequently)
    backgroundRefresh: true, // Enable background refresh for smoother UX
    smartRefresh: true, // Enable smart comparison to prevent unnecessary re-renders
  });
  const { showNotification } = useNotifications();

  /**
   * Custom Hook:
   * Fetching friends data for adding members and potentially assigning tasks
   */
  const {
    friends,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriends();

  // Check if the project exists in Redux store
  const projectInReduxStore = useSelector((state) => {
    // Check if the current project matches the requested ID
    const currentProjectMatches = state.projects.currentProject?._id === id;
    // Check if the project exists in the projects list
    const existsInProjectsList = state.projects.projects.some(
      (p) => p._id === id
    );

    // Debug info
    console.log(`Project ${id} cache status check:`, {
      currentProjectMatches,
      existsInProjectsList,
      currentProjectId: state.projects.currentProject?._id,
      projectsCount: state.projects.projects.length,
    });

    return currentProjectMatches || existsInProjectsList;
  });

  // const effectFetchAttemptedRef = useRef(false); // No longer needed

  // Enhanced data loading strategy with smart caching
  useEffect(() => {
    if (!id) {
      // effectFetchAttemptedRef.current = false; // No longer needed
      return;
    }

    // if (project || projectError) { // No longer needed here as the problematic block is removed
    //   effectFetchAttemptedRef.current = false;
    // }

    // Cache validation state for background refresh
    const lastCheckedKey = `project_${id}_last_checked`;
    const lastCheckedTime = sessionStorage.getItem(lastCheckedKey);
    const now = Date.now();
    const recentlyValidated =
      lastCheckedTime && now - parseInt(lastCheckedTime) < 30000; // 30 second throttle

    // Case 1: Project data IS loaded AND we are not currently loading AND no error
    // This is primarily for background validation.
    if (project && !isLoading && !projectError) {
      if (recentlyValidated) {
        console.log(
          `Skipping background validation for project ${id} - validated recently`
        );
        return; // Skip background validation if done recently
      }
      // Schedule background validation
      console.log(`Scheduling background validation for project ${id}`);
      const timeoutId = setTimeout(() => {
        console.log(`Running background validation for project ${id}`);
        refetchProject(false); // Background refresh
        sessionStorage.setItem(lastCheckedKey, now.toString());
      }, 300); // Existing 300ms delay, consider increasing if too frequent
      return () => clearTimeout(timeoutId);
    }
    // Case 2: (REMOVED) No project data, not currently loading, AND no project error reported by useProjects yet
    // The useProjects hook is now solely responsible for the initial fetch.
    // else if (!project && !isLoading && !projectError) {
    //   if (!effectFetchAttemptedRef.current) {
    //     console.log(
    //       `ProjectDetailsPage effect: Project ${id} not loaded, no error from useProjects, and not loading. Attempting effect-driven fetch.`
    //     );
    //     const forceThisFetch = !projectInReduxStore;
    //     dispatch(getProject({ projectId: id, forceRefresh: forceThisFetch }));
    //     effectFetchAttemptedRef.current = true;
    //   }
    // }

    // Optional: React to projectError (e.g., for additional logging or side effects beyond UI rendering)
    if (projectError) {
      console.error(
        `ProjectDetailsPage useEffect: Encountered projectError for ${id}:`,
        projectError
      );
      // Be cautious about dispatching or setting state here to avoid new loops.
      // UI rendering for errors is handled in the return statement of the component.
    }

    // General cleanup when component unmounts or id changes
    return () => {
      dispatch(resetProjectStatus());
    };
  }, [
    id,
    project,
    isLoading,
    projectError, // Keep projectError for logging and conditional logic
    // projectInReduxStore, // Removed as it's no longer used in this simplified effect
    dispatch,
    refetchProject,
  ]);

  /**
   * Local Component State:
   * Managing UI state for modals, sidebars, and main filters.
   */
  const [showTaskModal, setShowTaskModal] = useState(false); // Task creation modal visibility
  const [selectedTask, setSelectedTask] = useState(null); // Task selected for sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Task details sidebar visibility
  // State for tag filters applied to the 'All Tasks' section
  const [selectedTags, setSelectedTags] = useState([]);

  /**
   * HANDLERS - These interact with Redux actions, manage top-level state.
   * Pass these down as props to child components.
   */

  /**
   * Handles adding a member to the project.
   * This handler stays here because it dispatches a project update action.
   * @param {string} userId - The ID of the user to add.
   */
  const handleAddMember = async (userId) => {
    // Input validation done in child component before calling this
    // Prevent duplicate members (also checked in child component)
    const currentMemberIds = project.members?.map((m) => m._id) || [];
    if (currentMemberIds.includes(userId)) {
      showNotification('User is already a member.', 'warning');
      return;
    }
    const updatedMembers = [...currentMemberIds, userId];

    try {
      // First get the member details from friends list
      const memberToAdd = friends.find((friend) => friend._id === userId);

      if (memberToAdd) {
        // Create an optimistic update version of the project
        const optimisticProject = {
          ...project,
          members: [
            ...(project.members || []),
            memberToAdd, // Add the complete member object
          ],
        };

        // Apply optimistic update immediately for better UX
        await dispatch(
          updateProject({
            projectId: id,
            projectData: optimisticProject,
            optimistic: true,
          })
        ).unwrap();
      }

      // Now actually send the update to the server
      await dispatch(
        updateProject({
          projectId: id,
          projectData: { members: updatedMembers },
        })
      ).unwrap();
      showNotification('Member added successfully!', 'success');

      // We don't need to force refresh since we have optimistic updates
      // and background refresh will catch any server-side changes
    } catch (error) {
      console.error('Failed to add member:', error);
      showNotification(
        `Failed to add member: ${error.message || 'Server error'}`,
        'error'
      );
    }
  };

  /**
   * Handle task click - Open the slide panel with task details
   * Manages sidebar state (selectedTask, isSidebarOpen).
   * Stays here as it controls top-level UI state.
   * @param {string} taskId - ID of the task that was clicked
   */
  const handleTaskClick = (taskId) => {
    console.log(`🖱️ Task clicked: ${taskId}`);
    // Find the task from the current tasks state
    const task = tasks.find((t) => t._id === taskId);
    if (task) {
      console.log(`✅ Found task: ${task.title}`);
      setSelectedTask(task);
      setIsSidebarOpen(true);
    } else {
      console.error(`❌ Task not found with ID: ${taskId}`);
    }
  };

  /**
   * Handle closing the sidebar panel
   * Manages sidebar state (selectedTask, isSidebarOpen).
   * Stays here as it controls top-level UI state.
   */
  const handleCloseSidebar = () => {
    console.log('🚪 Closing task sidebar');
    setIsSidebarOpen(false);
    // Use a timeout to prevent UI flashing when changing task
    setTimeout(() => {
      setSelectedTask(null);
      console.log('🧹 Task selection cleared after panel close');
    }, 300);
  };

  /**
   * Handle task updates from the sidebar.
   * Dispatches Redux action to update a task.
   * Stays here as it interacts with Redux and tasks state.
   * @param {Object} updatedTask - The task with updated fields.
   */
  const handleTaskUpdate = async (updatedTask) => {
    console.log(`✏️ Task update requested for ID: ${updatedTask?._id}`);

    // Handle case where task might be undefined (e.g., completed/archived)
    if (!updatedTask || !updatedTask._id) {
      console.log('⚠️ Task update called with invalid task object.');
      // Refresh tasks to reflect potential backend changes (like archiving)
      refetchTasks(true);
      return;
    }

    const isCompletingTask = updatedTask.status === 'Completed';

    if (isCompletingTask) {
      // Close sidebar and show success preemptively for better UX
      setIsSidebarOpen(false);
      setSelectedTask(null);
      showNotification('Task completed and archived successfully', 'success');
    }

    try {
      await dispatch(
        updateTask({
          projectId: id,
          taskId: updatedTask._id,
          updates: updatedTask,
        })
      ).unwrap();
      if (!isCompletingTask) {
        showNotification('Task updated successfully', 'success');
      }

      // Only force refresh for task completion (which causes archiving) or significant state changes
      // Otherwise, rely on the Redux update which is already optimized
      if (isCompletingTask || updatedTask.status !== 'Completed') {
        refetchTasks(true);
      }
    } catch (error) {
      console.error('Error during task update:', error);
      // Handle expected archiving error on completion
      if (isCompletingTask && error.message?.includes('500')) {
        console.log('Expected error during task completion (likely archived).');
        refetchTasks(true); // Still refresh to be sure
      } else {
        showNotification(`Failed to update task: ${error.message}`, 'error');
        refetchTasks(true); // Refresh even on error to attempt state sync
      }
    }
  };

  /**
   * Handle task deletion from the sidebar.
   * Dispatches Redux action to delete a task.
   * Stays here as it interacts with Redux and tasks state, and sidebar state.
   * @param {string} taskId - The ID of the task to delete.
   */
  const handleTaskDelete = async (taskId) => {
    console.log(`🗑️ Task delete requested: ${taskId}`);
    try {
      await dispatch(deleteTask(taskId)).unwrap();
      // Close sidebar only if the deleted task was the one currently selected
      if (selectedTask?._id === taskId) {
        setIsSidebarOpen(false);
        setSelectedTask(null);
      }
      refetchTasks(true);
      showNotification('Task deleted successfully', 'success');
    } catch (error) {
      console.error('Error during task delete:', error);
      showNotification(`Failed to delete task: ${error.message}`, 'error');
      refetchTasks(true); // Refresh tasks even on error
    }
  };

  /**
   * Handler to show the Task Creation Modal.
   * Passed down to child components that have "Add Task" buttons.
   */
  const handleShowTaskModal = () => {
    setShowTaskModal(true);
  };

  /**
   * Handle tag selection for filtering in AllTasksSection.
   * Updates local state `selectedTags`.
   * Stays here as `selectedTags` is a top-level filter state.
   * @param {string} tag - The tag to select
   */
  const handleTagSelect = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  /**
   * Handle tag deselection for filtering in AllTasksSection.
   * Updates local state `selectedTags`.
   * Stays here as `selectedTags` is a top-level filter state.
   * @param {string} tag - The tag to deselect
   */
  const handleTagDeselect = (tag) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  /**
   * Clear all selected tags filter in AllTasksSection.
   * Updates local state `selectedTags`.
   * Stays here as `selectedTags` is a top-level filter state.
   */
  const handleClearAllTags = () => {
    setSelectedTags([]);
  };

  /**
   * DERIVED DATA:
   * Prepare data to be passed down to child components.
   * Uses utility functions from taskUtils.js.
   */
  // Get critical tasks (overdue or due today) using the utility function
  const criticalTasks = getCriticalTasks(tasks);

  // Apply date filtering first, then tag filtering to get the final list for 'All Tasks'
  const dateFilteredTasks = getFilteredTasks(tasks, 'all'); // Assuming 'all' filter by default for the main list
  const filteredTasks = getTagFilteredTasks(dateFilteredTasks, selectedTags);

  /**
   * CONDITIONAL RENDERING PATTERN:
   * Show different UIs based on different application states (loading, error, not found).
   * These are top-level states, so this logic stays here.
   */

  // Overall Loading state for the page (isLoading is from the single project useProjects hook)
  if (isLoading || tasksLoading || friendsLoading)
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading project details...</p>
        </div>
      </div>
    );

  // Overall Error state for the project fetch (projectError is from the single project useProjects hook)
  if (projectError) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg">Error: {projectError}</div>
          <Link to="/projects" className="mt-4 text-primary hover:underline">
            Back to projects
          </Link>
        </div>
      </div>
    );
  } // Project Not Found state (and no error reported by useProjects yet, and not loading)
  if (!project && !isLoading && !projectError) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-foreground text-lg">
            Project not found or you don't have permission to view it.
          </div>
          <div className="mt-4 flex justify-center space-x-4">
            <Link to="/projects" className="text-primary hover:underline">
              Back to projects
            </Link>
            <button
              onClick={() => {
                // Force refresh the project data from the API
                console.log('Forcing fresh project fetch for ID:', id);
                dispatch(getProject({ projectId: id, forceRefresh: true }));
                showNotification('Refreshing project data...', 'info');
              }}
              className="text-accent-blue hover:underline cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
          {projectError && (
            <div className="mt-4 p-3 bg-red-900/20 text-red-400 rounded-md max-w-md mx-auto text-sm">
              Error details: {projectError}
            </div>
          )}
          {/* Show cache status for debugging */}
          <div className="mt-4 text-xs text-gray-500">
            Cache Status:{' '}
            {projectInReduxStore
              ? 'Project exists in Redux store but could not be loaded'
              : 'Project not found in Redux store'}
          </div>
        </div>
      </div>
    );
  }
  // Remove the second useEffect that's causing problems
  // We're already using the initialization parameters to force a refresh on initial load

  /**
   * MAIN PAGE STRUCTURE RENDERING:
   * Render the main layout and the child section components, passing them
   * the necessary data and handlers.
   */
  return (
    <div className="container mx-auto p-4 bg-background text-foreground space-y-6">
      {/* Task Creation Modal - Controlled by local state */}
      <TaskCreateModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          // Refresh tasks after creating a new task
          refetchTasks(true);
        }}
        projectId={id}
        // Pass friends/members data if needed for task assignment in the modal
        projectMembers={project?.members || []}
        allFriends={friends}
      />

      {/* Task Details Sidebar - Lazy loaded and controlled by local state */}
      <Suspense
        fallback={
          isSidebarOpen && ( // Only show fallback if sidebar is expected to be open
            <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-dark-800 flex items-center justify-center border-l border-dark-700 shadow-xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-foreground text-sm">
                  Loading task details...
                </p>
              </div>
            </div>
          )
        }
      >
        {/* Render the sidebar only when a task is selected and the sidebar is open */}
        {selectedTask && isSidebarOpen && (
          <TaskDetailsSidebar
            projectId={id}
            taskId={selectedTask._id} // Pass the task ID, sidebar fetches full details internally
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar} // Pass the close handler
            onUpdate={handleTaskUpdate} // Pass the update handler
            onDelete={handleTaskDelete} // Pass the delete handler
            // Pass friends data if sidebar needs to display or assign members
            friends={friends}
          />
        )}
      </Suspense>

      {/* PROJECT HEADER: Title, Refresh Button and Edit Button */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center p-4 bg-card rounded-lg shadow-md">
        <div className="flex items-center gap-4">
          <Link
            to="/projects"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            aria-label="Back to projects"
            title="Back to projects"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          {' '}
          {/* Refresh Button */}
          <button
            onClick={() => {
              // Clear the "last checked" entry from session storage to force a fresh check
              sessionStorage.removeItem(`project_${id}_last_checked`);
              // Use direct dispatch for the most reliable refresh
              dispatch(getProject({ projectId: id, forceRefresh: true }));
              refetchTasks(true);
              showNotification('Refreshing project data...', 'info');
            }}
            className={`p-2 rounded-md ${
              projectBackgroundState?.backgroundRefreshingSingle
                ? 'text-blue-400 bg-blue-400 bg-opacity-10'
                : 'text-gray-400 hover:text-white hover:bg-dark-600'
            }`}
            title="Refresh Project Data"
            aria-label="Refresh project data"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={
                projectBackgroundState?.backgroundRefreshingSingle
                  ? 'animate-spin'
                  : ''
              }
            >
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </button>
          {/* Edit Project Button */}
          <Link
            to={`/projects/${id}/edit`}
            className="flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors shadow-sm"
          >
            <Edit size={18} className="mr-2" /> Edit Project
          </Link>
        </div>
      </div>

      {/* Main content grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column (Project Info & Notes) */}
        <div className="md:col-span-1 space-y-4">
          {/* Description Container (remains here as it's simple) */}
          {project.description && (
            <div className="bg-card rounded-lg p-4 shadow-md">
              <h2 className="text-lg font-semibold mb-2 text-primary">
                Description
              </h2>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}
          {/* Project Notes Component (already separate) */}
          <div className="bg-card rounded-lg p-4 shadow-md">
            <ProjectNotes projectId={id} />
          </div>{' '}
          {/* Project Details Info Component - Replaces the large details block */}
          {/* Pass necessary data and the handler for adding members */}
          <ProjectDetailsInfo
            project={project}
            friends={friends}
            friendsLoading={friendsLoading}
            friendsError={friendsError}
            onAddMember={handleAddMember} // Pass the handler down
            backgroundRefreshState={projectBackgroundState} // Pass background refresh state
          />
        </div>

        {/* Right Column (Tasks Sections) */}
        <div className="md:col-span-2 space-y-6">
          {' '}
          {/* Added space-y-6 for separation */}
          {/* Critical Tasks Section Component */}
          {/* Pass the derived critical tasks data and relevant handlers */}{' '}
          <CriticalTasksSection
            criticalTasks={criticalTasks}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            onTaskClick={handleTaskClick} // Pass the task click handler
            onAddTaskClick={handleShowTaskModal} // Pass the handler to show the modal
            backgroundRefreshState={tasksBackgroundRefreshState} // Pass background refresh state
          />
          {/* All Tasks Section Component */}
          {/* Pass task data, derived filtered tasks, filters, and handlers */}
          <AllTasksSection
            tasks={tasks} // Pass full tasks for TagFilter
            filteredTasks={filteredTasks}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            selectedTags={selectedTags} // Pass current filter state
            onTaskClick={handleTaskClick} // Pass the task click handler
            onAddTaskClick={handleShowTaskModal} // Pass the handler to show the modal
            onTagSelect={handleTagSelect} // Pass tag filter handlers
            onTagDeselect={handleTagDeselect}
            onClearAllTags={handleClearAllTags}
            backgroundRefreshState={tasksBackgroundRefreshState} // Pass background refresh state
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
