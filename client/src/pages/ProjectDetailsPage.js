// ProjectDetailsPage.js - A React page component that displays and manages a single project
//
// KEY CONCEPTS:
// 1. React Router Integration: Using URL parameters and navigation hooks
// 2. Efficient Data Fetching: Using custom hooks with intelligent caching and conditional execution
// 3. Component Composition: Orchestrating smaller components to build the page UI
// 4. Conditional Rendering: Displaying different UI based on loading/error states (global and per-section)
// 5. Custom Hooks: Reusing logic across components (useProjects, useProjectTasks, useFriends)
// 6. Improved Code Readability: Delegated rendering of sections to child components
// 7. Accessibility: ARIA attributes and focus management for dynamic content and error states.

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
   * Custom Hooks with Caching & Conditional Execution:
   * - useProjects: Gets project data with caching. `enabled: !!id` ensures it only runs if 'id' is present.
   * - useProjectTasks: Gets tasks for the project. `enabled: !!project && !projectError` ensures it only runs if project data is loaded successfully.
   * - useFriends: Gets friends data. `enabled: !!project && !projectError` similar to tasks.
   */
  const {
    data: project,
    isLoading: projectLoading, // Renamed from isLoading for clarity
    error: projectError,
    refetch: refetchProject,
    // backgroundRefreshState: projectBackgroundState, // May not be needed if hooks handle this internally
  } = useProjects({
    selector: (state) => state.projects.currentProject,
    actionCreator: 'getProject',
    actionParams: {
      projectId: id,
      forceRefresh: false,
    },
    cacheTimeout: 5 * 60 * 1000,
    backgroundRefresh: true,
    smartRefresh: true,
    enabled: !!id, // Ensures hook only runs if 'id' is present
  });

  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    refetchTasks,
    // backgroundRefreshState: tasksBackgroundRefreshState,
  } = useProjectTasks(id, {
    cacheTimeout: 2 * 60 * 1000,
    backgroundRefresh: true,
    smartRefresh: true,
    enabled: !!project && !projectError, // Only fetch tasks if project loaded successfully
  });

  const {
    friends,
    isLoading: friendsLoading,
    error: friendsError,
    refetch: refetchFriends, // Assuming useFriends hook exposes a refetch function
  } = useFriends({
    enabled: !!project && !projectError, // Only fetch friends if project loaded successfully
  });

  const { showNotification } = useNotifications();

  // Removed projectInReduxStore and effectFetchAttemptedRef as they are no longer needed with the new useEffect and hook strategy

  /**
   * Page-level useEffect for Global State Cleanup.
   * This effect ensures that when the ProjectDetailsPage for a specific 'id'
   * is no longer relevant (e.g., user navigates to a different project or away),
   * we clean up the global Redux state associated with 'currentProject'.
   *
   * The custom hooks (useProjects, useProjectTasks, useFriends) are responsible
   * for fetching data when 'id' is valid and they are mounted/enabled.
   */
  useEffect(() => {
    // The custom hooks (useProjects, useProjectTasks, useFriends)
    // are expected to handle their own data fetching, caching,
    // and background refresh logic based on the provided 'id'
    // and their internal configurations (including the 'enabled' option).

    // This page-level useEffect is now primarily for cleaning up
    // global state (like `currentProject` in Redux) when this specific
    // project details view is no longer active (either unmounted
    // or the 'id' has changed).

    if (!id) {
      // If there's no ID, dispatch reset immediately.
      // This might occur if the route is optional or id becomes undefined.
      dispatch(resetProjectStatus());
      return;
    }

    // The hooks themselves will fetch data based on their 'enabled' status.
    // No explicit fetch calls (e.g., refetchProject()) are needed here for initial load.

    return () => {
      // This cleanup function runs when:
      // 1. The component unmounts.
      // 2. The 'id' prop changes (this runs *before* the effect for the new 'id').
      // This is the correct place to reset global state tied to the *previous* 'id'.
      console.log(
        `ProjectDetailsPage: Cleaning up Redux state for project ID context (previous ID or unmount).`
      );
      // dispatch(resetProjectStatus()); // Temporarily commented out for diagnosis

      // Temporarily commenting out these lines to diagnose premature sidebar closure.
      // If the sidebar now stays open, it means this cleanup was being triggered
      // at an unexpected time (e.g., due to a transient change in 'id' prop
      // or an interaction with the state updates in handleTaskClick).
      // A more robust solution will be needed if this is the case.
      // setIsSidebarOpen(false);
      // setSelectedTask(null);
    };
  }, [id, dispatch]); // Dependencies: only 'id' and 'dispatch'

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
    if (!project) {
      showNotification('Project data not available.', 'error');
      return;
    }
    // Input validation done in child component before calling this
    // Prevent duplicate members (also checked in child component)
    const currentMemberIds = project.members?.map((m) => m._id) || [];
    if (currentMemberIds.includes(userId)) {
      showNotification('User is already a member.', 'warning');
      return;
    }
    const updatedMembers = [...currentMemberIds, userId];

    try {
      const memberToAdd = friends.find((friend) => friend._id === userId);

      if (memberToAdd) {
        const optimisticProject = {
          ...project,
          members: [...(project.members || []), memberToAdd],
        };
        await dispatch(
          updateProject({
            projectId: id,
            projectData: optimisticProject,
            optimistic: true,
          })
        ).unwrap();
      }

      await dispatch(
        updateProject({
          projectId: id,
          projectData: { members: updatedMembers },
        })
      ).unwrap();
      showNotification('Member added successfully!', 'success');
      // No explicit refetchProject needed if optimistic update + background refresh in hook is sufficient
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
   * @param {object} event - The click event.
   * @param {string} taskId - ID of the task that was clicked
   */
  const handleTaskClick = (event, taskId) => {
    // Added event parameter
    event.stopPropagation(); // Prevent event from bubbling up
    console.log(`🖱️ Task clicked: ${taskId}`);
    const task = tasks?.find((t) => t._id === taskId); // Use optional chaining for tasks
    if (task) {
      console.log(`✅ Found task: ${task.title}`);
      setSelectedTask(task);
      setIsSidebarOpen(true);
    } else {
      console.error(`❌ Task not found with ID: ${taskId}`);
      showNotification('Task details could not be loaded.', 'error');
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
  const criticalTasks = tasks ? getCriticalTasks(tasks) : []; // Handle tasks possibly being undefined
  const dateFilteredTasks = tasks ? getFilteredTasks(tasks, 'all') : [];
  const filteredTasksForDisplay = tasks // Renamed to avoid conflict and ensure tasks exist
    ? getTagFilteredTasks(dateFilteredTasks, selectedTags)
    : [];

  /**
   * CONDITIONAL RENDERING PATTERN (REVISED):
   * Layered approach:
   * 1. Global loading (for initial project fetch if project data isn't available yet).
   * 2. Critical project error (if main project data fails to load).
   * 3. Project not found (if API returns no project for the ID).
   * 4. Main content with inline loading/error handling for dependent data (tasks, friends).
   */

  // 1. Global Loading State (primarily for the main project data, if not yet available)
  // projectLoading is from useProjects. Show global loader only if project data isn't yet available from cache or fetch.
  if (projectLoading && !project) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="container mx-auto p-4 flex items-center justify-center h-screen"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading project details...</p>
        </div>
      </div>
    );
  }

  // 2. Handle Critical Project Error (main project data failed to load)
  if (projectError) {
    return (
      <div
        role="alert"
        className="container mx-auto p-4 flex items-center justify-center h-screen"
      >
        <div className="text-center">
          <h2
            id="error-title"
            className="text-xl font-semibold text-red-500 mb-3"
          >
            Error Loading Project
          </h2>
          <p className="text-foreground mb-4" aria-describedby="error-title">
            {projectError.message ||
              'An unexpected error occurred while fetching project details.'}
          </p>
          <button
            onClick={() => refetchProject(true)} // Assuming refetchProject(true) forces a refresh
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-focus"
          >
            Retry
          </button>
          <Link
            to="/projects"
            className="ml-4 text-accent-blue hover:underline"
          >
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  // 3. Handle Project Not Found (after loading, no error, but no project data)
  // This condition means useProjects finished, didn't error, but project is still null/undefined.
  if (!project && !projectLoading && !projectError) {
    return (
      <div
        role="alert"
        className="container mx-auto p-4 flex items-center justify-center h-screen"
      >
        <div className="text-center">
          <h2
            id="notfound-title"
            className="text-xl font-semibold text-foreground mb-3"
          >
            Project Not Found
          </h2>
          <p className="text-foreground mb-4" aria-describedby="notfound-title">
            The project with ID "{id}" could not be found, or you may not have
            permission to view it.
          </p>
          <button
            onClick={() => refetchProject(true)} // Force refresh
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-focus"
          >
            Try Again
          </button>
          <Link
            to="/projects"
            className="ml-4 text-accent-blue hover:underline"
          >
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  // 4. Project data IS available. Render page content.
  // Child components will handle their own loading/error states for tasks and friends.
  // Ensure `project` is not null before proceeding to render dependent UI.
  if (!project) {
    // This case should ideally be caught by the above conditions, but as a fallback:
    return (
      <div
        role="alert"
        className="container mx-auto p-4 flex items-center justify-center h-screen"
      >
        <p className="text-foreground">
          Project data is unexpectedly unavailable. Please try refreshing.
        </p>
        <Link to="/projects" className="ml-4 text-accent-blue hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

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
            <div
              role="status"
              aria-live="polite"
              className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-dark-800 flex items-center justify-center border-l border-dark-700 shadow-xl"
            >
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
              // sessionStorage.removeItem(`project_${id}_last_checked`); // No longer needed
              // dispatch(getProject({ projectId: id, forceRefresh: true })); // Prefer hook's refetch
              refetchProject(true); // Force refresh project
              refetchTasks(true); // Force refresh tasks
              // refetchFriends(true); // Optionally refresh friends too
              showNotification('Refreshing project data...', 'info');
            }}
            className={`p-2 rounded-md ${
              projectLoading // Use projectLoading from useProjects
                ? 'text-blue-400 bg-blue-400 bg-opacity-10 animate-spin_custom' // Use a custom spin if needed or rely on SVG's
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
                projectLoading // Use projectLoading for spin animation
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
            project={project} // project is guaranteed to be loaded here
            friends={friends} // Pass friends data
            friendsLoading={friendsLoading} // Pass friends loading state
            friendsError={friendsError} // Pass friends error state
            onAddMember={handleAddMember}
            onRetryFriends={() => refetchFriends(true)} // Pass retry function for friends
            // backgroundRefreshState={projectBackgroundState} // This might be removed or handled internally by useProjects
          />
        </div>

        {/* Right Column (Tasks Sections) */}
        <div className="md:col-span-2 space-y-6">
          {' '}
          {/* Added space-y-6 for separation */}
          {/* Critical Tasks Section Component */}
          {/* Pass the derived critical tasks data and relevant handlers */}{' '}
          <CriticalTasksSection
            projectId={id} // Pass projectId
            criticalTasks={criticalTasks} // Pass derived critical tasks - CORRECTED PROP NAME
            tasksLoading={tasksLoading} // Pass tasks loading state
            tasksError={tasksError} // Pass tasks error state
            onTaskClick={handleTaskClick}
            onAddTaskClick={handleShowTaskModal}
            onRetryTasks={() => refetchTasks(true)} // Pass retry function for tasks
            // backgroundRefreshState={tasksBackgroundRefreshState} // This might be removed or handled internally by useProjectTasks
          />
          {/* All Tasks Section Component */}
          {/* Pass task data, derived filtered tasks, filters, and handlers */}
          <AllTasksSection
            projectId={id} // Pass projectId
            tasks={tasks} // Pass full tasks for TagFilter and list
            filteredTasks={filteredTasksForDisplay} // Pass derived filtered tasks
            tasksLoading={tasksLoading} // Pass tasks loading state
            tasksError={tasksError} // Pass tasks error state
            selectedTags={selectedTags}
            onTaskClick={handleTaskClick}
            onAddTaskClick={handleShowTaskModal}
            onTagSelect={handleTagSelect}
            onTagDeselect={handleTagDeselect}
            onClearAllTags={handleClearAllTags}
            onRetryTasks={() => refetchTasks(true)} // Pass retry function for tasks
            // backgroundRefreshState={tasksBackgroundRefreshState} // This might be removed or handled internally by useProjectTasks
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
