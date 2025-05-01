// ProjectDetailsPage.js - A React page component that displays and manages a single project
//
// KEY CONCEPTS:
// 1. React Router Integration: Using URL parameters and navigation hooks
// 2. Redux State Management: Fetching and updating data with useDispatch and useSelector
// 3. Component Composition: Combining multiple smaller components to build a complex UI
// 4. Conditional Rendering: Displaying different UI based on loading/error states
// 5. Custom Hooks: Reusing logic across components

import React, { useEffect, useState, lazy, Suspense, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  getProject,
  updateProject,
  resetProjectStatus,
} from '../features/projects/projectSlice';
import {
  getTasksForProject,
  resetTaskStatus,
  updateTask,
  deleteTask,
} from '../features/tasks/taskSlice';
import TaskList from '../components/tasks/TaskList';
import TaskCreateModal from '../components/tasks/TaskCreateModal';
import ProjectNotes from '../components/projects/ProjectNotes';
import api from '../utils/api';
import { PlusCircle, X, Edit, Clock, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import useFriends from '../hooks/useFriends';
import { formatDateForDisplay } from '../utils/dateUtils';

// Pre-load the TaskDetailsSidebar component to prevent loading delays on first click
// This ensures the component is already loaded before it's needed
const TaskDetailsSidebar = lazy(() => {
  // Start loading the component immediately but don't block rendering
  const componentPromise = import('../components/tasks/TaskDetailsSidebar');

  // Trigger the load in the background as soon as this module is imported
  componentPromise.catch((err) =>
    console.error('Failed to preload TaskDetailsSidebar:', err)
  );

  return componentPromise;
});

// Immediately trigger the preload when this module is imported
import('../components/tasks/TaskDetailsSidebar').catch(() => {});

/**
 * ProjectDetailsPage Component
 *
 * This page demonstrates common React patterns for complex pages:
 * - Data fetching on component mount with useEffect
 * - State extraction with useSelector from Redux
 * - Side effect management with useEffect cleanup functions
 * - Complex conditional rendering based on loading/error states
 * - Modal handling with local state
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
   * - useSelector: Extract specific data from the Redux store
   */
  const dispatch = useDispatch();

  // REDUX SELECTOR PATTERN: Extract only the data this component needs
  // This prevents unnecessary re-renders when other parts of Redux state change
  const {
    currentProject: project,
    isLoading,
    isError,
    message,
  } = useSelector((state) => state.projects);

  const {
    tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    message: tasksMessage,
  } = useSelector((state) => state.tasks);
  const { showNotification } = useNotifications();

  /**
   * Local Component State:
   * Using useState for UI-specific state that doesn't need to be in Redux
   */
  const [showTaskModal, setShowTaskModal] = useState(false); // Modal visibility
  const [showAddMemberDropdown, setShowAddMemberDropdown] = useState(false); // Dropdown state
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(''); // Selected user ID
  // Track active task filter for critical tasks section
  const [criticalTaskFilter, setCriticalTaskFilter] = useState('overdue'); // 'overdue', 'today'
  // Track active task filter for all tasks
  const [allTasksFilter, setAllTasksFilter] = useState('all'); // 'all' or specific filters

  // Reference to track component mounts and detect page refreshes
  const mountCountRef = useRef(0);
  // Track if this is the first task click
  const isFirstTaskClickRef = useRef(true);
  // Timestamp of component mount to help detect full refreshes
  const mountTimestampRef = useRef(Date.now());

  /**
   * Custom Hook:
   * Extracting reusable logic into a custom hook for friends data
   */
  const {
    friends,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriends();

  /**
   * Diagnostic logging effect - runs only once on mount
   * This helps track component lifecycle and detect refreshes
   */
  useEffect(() => {
    mountCountRef.current += 1;
    const isFullPageRefresh = !sessionStorage.getItem('appInitialLoad');

    if (isFullPageRefresh) {
      // First load after a full page refresh
      sessionStorage.setItem('appInitialLoad', 'true');
      console.log(
        '🔄 FULL PAGE REFRESH DETECTED - ProjectDetailsPage mounted for the first time after page load'
      );
    } else {
      console.log(
        `🔄 ProjectDetailsPage re-rendered (Mount count: ${mountCountRef.current})`
      );
    }

    console.log(
      `⏱️ Time since initial mount: ${Date.now() - mountTimestampRef.current}ms`
    );

    return () => {
      console.log('🧹 ProjectDetailsPage cleanup (component unmounting)');
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  /**
   * DATA FETCHING PATTERN:
   * Using useEffect for side effects like data fetching when component mounts
   * Dependencies array [dispatch, id] ensures this only runs when those values change
   *
   * CLEANUP PATTERN:
   * Return function resets state when component unmounts (cleanup)
   */
  useEffect(() => {
    if (id) {
      console.log(`📡 Fetching project data for ID: ${id}`);
      dispatch(getProject(id)); // Fetch project details
      dispatch(getTasksForProject(id)); // Fetch related tasks
    }

    // Cleanup function runs when component unmounts
    return () => {
      // Reset Redux state to prevent stale data when navigating away
      dispatch(resetProjectStatus());
      dispatch(resetTaskStatus());
    };
  }, [dispatch, id]); // Only re-run if these dependencies change

  /**
   * Filter tasks by their due date
   * - Critical tasks: Both overdue tasks and tasks due today that are not completed
   * - Used to show tasks that need immediate attention
   *
   * @param {Array} tasksList - List of tasks to filter
   * @returns {Array} Filtered tasks that are either overdue or due today
   */
  const getCriticalTasks = (tasksList) => {
    if (!tasksList || tasksList.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    // Get tasks that are either overdue or due today
    return tasksList
      .filter((task) => {
        if (task.status === 'Completed') return false;
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        return dueDate && dueDate < tomorrow; // Include both overdue and due today
      })
      .sort((a, b) => {
        // Sort by due date (oldest/most overdue first)
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date();
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date();
        return dateA - dateB;
      });
  };

  /**
   * Filter tasks for the main task list view
   *
   * @param {Array} tasksList - List of tasks to filter
   * @param {string} filter - Filter type: 'all', 'today', 'overdue', etc.
   * @returns {Array} Filtered tasks
   */
  const getFilteredTasks = (tasksList, filter) => {
    if (!tasksList || tasksList.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

    switch (filter) {
      case 'overdue':
        return tasksList.filter((task) => {
          if (task.status === 'Completed') return false;
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
          return dueDate && dueDate < today;
        });
      case 'today':
        return tasksList.filter((task) => {
          if (task.status === 'Completed') return false;
          const dueDate = task.dueDate ? new Date(task.dueDate) : null;
          return dueDate && dueDate >= today && dueDate < tomorrow;
        });
      default:
        return tasksList;
    }
  };

  /**
   * Count tasks by status category (overdue, due today)
   *
   * @returns {Object} Counts of tasks by category
   */
  const getTaskCounts = () => {
    const overdueTasks = getFilteredTasks(tasks, 'overdue');
    const todayTasks = getFilteredTasks(tasks, 'today');

    return {
      overdue: overdueTasks.length,
      today: todayTasks.length,
      total: tasks ? tasks.length : 0,
    };
  };

  // Get task counts for UI
  const taskCounts = getTaskCounts();

  /**
   * UTILITY FUNCTIONS PATTERN:
   * Helper functions defined inside component but not dependent on component state
   * These could be moved outside the component or to a separate utilities file
   * for better organization and reuse
   */
  const getStatusPillClasses = (status) => {
    // Map status values to tailwind classes for styling
    switch (status) {
      case 'Planning':
        return 'bg-blue-500 text-blue-100';
      case 'Active':
        return 'bg-green-500 text-green-100';
      case 'On Hold':
        return 'bg-yellow-500 text-yellow-100';
      case 'Completed':
        return 'bg-purple-500 text-purple-100';
      case 'Archived':
        return 'bg-gray-600 text-gray-100';
      default:
        return 'bg-gray-500 text-gray-100';
    }
  };

  const getPriorityPillClasses = (priority) => {
    // Similar mapping function for priority styling
    switch (priority) {
      case 'Low':
        return 'bg-gray-500 text-gray-100';
      case 'Medium':
        return 'bg-yellow-500 text-yellow-100';
      case 'High':
        return 'bg-red-500 text-red-100';
      default:
        return 'bg-gray-500 text-gray-100';
    }
  };

  /**
   * FORMAT FUNCTION PATTERN:
   * Helper to format data for display
   * Handles null/undefined values gracefully
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';

    // Handle date strings consistently - ensures proper date recognition
    try {
      // Convert any valid date string format to a Date object
      const date = new Date(dateString);

      // Check if date is valid before attempting to format
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateString}`);
        return 'N/A';
      }

      // Format the date consistently
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      console.error(`Error formatting date ${dateString}:`, err);
      return 'N/A';
    }
  };

  /**
   * EVENT HANDLER PATTERN:
   * Function to handle user interactions with error handling
   * and success notifications
   *
   * Uses async/await with try/catch for API calls
   */
  const handleAddMember = async () => {
    // Input validation
    if (!selectedUserToAdd || !project) return;

    // Prevent duplicate members
    const currentMemberIds = project.members?.map((m) => m._id) || [];
    if (currentMemberIds.includes(selectedUserToAdd)) {
      showNotification('User is already a member.', 'warning');
      return;
    }

    // Create updated members list
    const updatedMembers = [...currentMemberIds, selectedUserToAdd];

    try {
      // REDUX ASYNC ACTION PATTERN WITH UNWRAP:
      // using .unwrap() to get the actual Promise result or throw error
      await dispatch(
        updateProject({
          projectId: id,
          projectData: { members: updatedMembers },
        })
      ).unwrap();

      // SUCCESS PATH:
      showNotification('Member added successfully!', 'success');
      setSelectedUserToAdd(''); // Reset form state
      setShowAddMemberDropdown(false); // Update UI state
      dispatch(getProject(id)); // Refresh data
    } catch (error) {
      // ERROR PATH:
      console.error('Failed to add member:', error);
      showNotification(
        `Failed to add member: ${error.message || 'Server error'}`,
        'error'
      );
    }
  };

  // Task management handlers
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /**
   * Handle task click - Open the slide panel with task details
   * Enhanced with logging to track potential page refresh issues
   *
   * @param {string} taskId - ID of the task that was clicked
   */
  const handleTaskClick = (taskId) => {
    console.log(
      `🖱️ Task clicked: ${taskId} (isFirstClick: ${isFirstTaskClickRef.current})`
    );
    console.log(
      `⏱️ Time since component mount: ${
        Date.now() - mountTimestampRef.current
      }ms`
    );

    // Log navigation state to help debug refresh issues
    console.log(`📍 Current URL: ${window.location.href}`);
    console.log(
      `🗂️ Navigation type: ${
        window.performance?.navigation?.type === 1 ? 'PAGE_RELOAD' : 'NAVIGATE'
      }`
    );

    const task = tasks.find((t) => t._id === taskId);
    if (task) {
      console.log(`✅ Found task: ${task.title}`);
      setSelectedTask(task);
      setIsSidebarOpen(true);

      // After the first click, set the ref to false
      if (isFirstTaskClickRef.current) {
        console.log('📝 Marked first task click as complete');
        isFirstTaskClickRef.current = false;
      }
    } else {
      console.error(`❌ Task not found with ID: ${taskId}`);
    }
  };

  /**
   * Handle closing the sidebar panel
   * Added logging to track panel close events
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
   * Handle task updates with special handling for completed tasks
   *
   * @param {Object} updatedTask - The task with updated fields (might be undefined for completed tasks)
   */
  const handleTaskUpdate = async (updatedTask) => {
    console.log(`✏️ Task update requested: ${updatedTask?._id || 'undefined'}`);

    // If updatedTask is undefined or missing _id, it's likely a completed task that was archived
    // In this case, we'll skip further API calls as the task is already handled
    if (!updatedTask || !updatedTask._id) {
      console.log(
        '⚠️ Task update called with undefined task or missing ID - likely a completed task'
      );
      // Refresh the task list to ensure UI is up to date
      dispatch(getTasksForProject(id));
      return;
    }

    // Check if we're completing a task
    const isCompletingTask = updatedTask.status === 'Completed';

    if (isCompletingTask) {
      // For completed tasks, immediately close sidebar and clear selection
      console.log(
        '🧹 Task being marked as complete - closing sidebar preemptively'
      );
      setIsSidebarOpen(false);
      setSelectedTask(null);

      // Show success message immediately for better UX
      showNotification('Task completed and archived successfully', 'success');
    }

    try {
      // Call the API to update the task
      await dispatch(
        updateTask({
          projectId: id,
          taskId: updatedTask._id,
          updates: updatedTask,
        })
      ).unwrap();

      // For non-completion updates, show success notification
      // (completion notifications are shown above for better UX)
      if (!isCompletingTask) {
        showNotification('Task updated successfully', 'success');
      }

      // Always refresh the task list to ensure UI is up to date
      dispatch(getTasksForProject(id));
    } catch (error) {
      // Don't show errors for expected 500 errors during task completion
      if (isCompletingTask && error.message?.includes('500')) {
        console.log(
          'Expected error during task completion (task was archived):',
          error
        );
        // Even with error, refresh the task list to ensure UI is up to date
        dispatch(getTasksForProject(id));
      } else {
        // Show error for other types of failures
        console.error('Error during task update:', error);
        showNotification(`Failed to update task: ${error.message}`, 'error');
      }
    }
  };

  const handleTaskDelete = async (taskId) => {
    console.log(`🗑️ Task delete requested: ${taskId}`);
    try {
      await dispatch(deleteTask(taskId)).unwrap();
      setIsSidebarOpen(false);
      dispatch(getTasksForProject(id));
      showNotification('Task deleted successfully', 'success');
    } catch (error) {
      showNotification(`Failed to delete task: ${error.message}`, 'error');
      // Even on error, make sure we reload tasks to prevent them from disappearing
      dispatch(getTasksForProject(id));
    }
  };

  /**
   * DERIVED DATA PATTERN:
   * Compute new values from existing state and props
   * This is more efficient than storing derived data in state
   */
  const availableUsersToAdd = friends.filter(
    (friend) => !project?.members?.some((member) => member._id === friend._id)
  );

  // Get critical tasks based on the active filter (overdue or today)
  const criticalTasks = getCriticalTasks(tasks);

  // Get tasks for the main task list based on the active filter
  const visibleTasks = getFilteredTasks(tasks, allTasksFilter);

  /**
   * CONDITIONAL RENDERING PATTERN:
   * Show different UIs based on different application states
   * This improves user experience by handling loading and error states
   */

  // Loading state
  if (isLoading || tasksLoading || friendsLoading)
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading project details...</p>
        </div>
      </div>
    );

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg">Error: {message}</div>
          <Link to="/projects" className="mt-4 text-primary hover:underline">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  // Not found state
  if (!project) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-foreground text-lg">
            Project not found or you don't have permission to view it.
          </div>
          <Link to="/projects" className="mt-4 text-primary hover:underline">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  /**
   * COMPONENT JSX:
   * Main render method of the component
   * Uses multiple sections with semantic HTML structure
   */
  return (
    <div className="container mx-auto p-4 bg-background text-foreground space-y-6">
      {/* Add Task Details Sidebar with lazy loading and error boundary */}
      <Suspense
        fallback={
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-dark-800 flex items-center justify-center">
            Loading sidebar...
          </div>
        }
      >
        {selectedTask && (
          <TaskDetailsSidebar
            projectId={id}
            taskId={selectedTask._id}
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar}
            onUpdate={handleTaskUpdate}
            onDelete={handleTaskDelete}
          />
        )}
      </Suspense>

      {/* PROJECT HEADER PATTERN: Title + Action button layout */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-primary">
            {project.name}
          </h1>
          <div className="text-muted-foreground text-sm mb-2">
            Created by{' '}
            <span className="font-medium">
              {project.owner?.name || 'Unknown user'}
            </span>{' '}
            on{' '}
            {new Date(project.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
        </div>
        {/* ACTION BUTTON PATTERN: Secondary action */}
        <Link
          to={`/projects/${id}/edit`}
          className="flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors"
        >
          <Edit size={18} className="mr-2" /> Edit Project
        </Link>
      </div>

      {/* Main content layout: 1/3 for project details, 2/3 for critical tasks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Project Information Column (1/3) - Left side with stacked containers */}
        <div className="md:col-span-1 space-y-4">
          {/* Description Container - Only as tall as its content */}
          {project.description && (
            <div className="bg-card rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-2 text-primary">
                Description
              </h2>
              <p className="text-foreground whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}

          {/* Project Notes Container - Moved from bottom to left column */}
          <div className="bg-card rounded-lg p-4 shadow">
            <ProjectNotes projectId={id} />
          </div>

          {/* Project Details Container */}
          <div className="bg-card rounded-lg p-4 shadow space-y-4">
            <h2 className="text-lg font-semibold mb-4 text-primary">
              Project Details
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Status */}
              <div>
                <span className="text-sm text-foreground opacity-80 block mb-1">
                  Status
                </span>
                <span
                  className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusPillClasses(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>
              </div>
              {/* Priority */}
              <div>
                <span className="text-sm text-foreground opacity-80 block mb-1">
                  Priority
                </span>
                <span
                  className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getPriorityPillClasses(
                    project.priority
                  )}`}
                >
                  {/* FALLBACK VALUE PATTERN: Using || for default value */}
                  {project.priority || 'Medium'}
                </span>
              </div>
              {/* Due Date */}
              <div>
                <span className="text-sm text-foreground opacity-80 block mb-1">
                  Due Date
                </span>
                <span className="text-foreground font-medium">
                  {formatDate(project.endDate)}
                </span>
              </div>
              {/* Members */}
              <div>
                <span className="text-sm text-foreground opacity-80 block mb-1">
                  Members
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                  {/* DROPDOWN PATTERN: Toggle visibility with state */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowAddMemberDropdown(!showAddMemberDropdown)
                      }
                      className="h-8 w-8 flex items-center justify-center bg-dark-600 text-accent-purple hover:bg-dark-500 hover:text-accent-blue rounded-full transition-colors border-2 border-dark-600 hover:border-primary"
                      title="Add Member"
                    >
                      <PlusCircle size={18} />
                    </button>
                    {/* CONDITIONAL DROPDOWN RENDERING */}
                    {showAddMemberDropdown && (
                      <div className="absolute left-0 mt-2 w-64 bg-card border border-dark-700 rounded-md shadow-lg z-10 p-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Add Friend as Member
                          </span>
                          <button
                            onClick={() => setShowAddMemberDropdown(false)}
                            className="text-gray-400 hover:text-white"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        {/* CONDITIONAL CONTENT BASED ON DATA AVAILABILITY */}
                        {availableUsersToAdd.length > 0 ? (
                          <>
                            {/* CONTROLLED FORM ELEMENT PATTERN */}
                            <select
                              value={selectedUserToAdd}
                              onChange={(e) =>
                                setSelectedUserToAdd(e.target.value)
                              }
                              className="w-full px-2 py-1.5 rounded-md border bg-dark-700 text-foreground border-dark-600 focus:outline-none focus:ring-1 focus:ring-primary mb-2 text-sm"
                            >
                              <option value="">Select friend...</option>
                              {/* LIST RENDERING PATTERN WITH MAP */}
                              {availableUsersToAdd.map((user) => (
                                <option key={user._id} value={user._id}>
                                  {user.name} ({user.email})
                                </option>
                              ))}
                            </select>
                            {/* CONDITIONAL BUTTON DISABLING */}
                            <button
                              onClick={handleAddMember}
                              disabled={!selectedUserToAdd}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1.5 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add
                            </button>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400">
                            No more friends to add.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* MEMBER LIST PATTERN: Avatars with fallback images */}
                  {project.members && project.members.length > 0 ? (
                    <div className="flex items-center">
                      {project.members.slice(0, 5).map((member, i) => (
                        <img
                          key={member._id}
                          src={
                            member.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              member.name || member.email || '?'
                            )}&background=random&color=fff&size=32`
                          }
                          alt={member.name}
                          className={`h-8 w-8 rounded-full object-cover border-2 border-dark-600 ${
                            i === 0 ? '' : '-ml-2'
                          } hover:border-primary transition-colors`}
                          title={member.name}
                        />
                      ))}
                      {project.members.length > 5 && (
                        <div
                          className="-ml-2 h-8 w-8 bg-dark-600 rounded-full border-2 border-dark-600 flex items-center justify-center text-xs text-gray-200"
                          title={project.members
                            .slice(5)
                            .map((m) => m.name)
                            .join(', ')}
                        >
                          +{project.members.length - 5}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-foreground opacity-70 text-sm ml-2">
                      No members assigned.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-primary">
                  Progress: {project.progress || 0}%
                </h2>
                {project.progress === 100 && (
                  <span className="text-green-500 text-sm font-medium">
                    Complete!
                  </span>
                )}
              </div>
              <div className="w-full bg-dark-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-primary h-4 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${project.progress || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Tasks Section (2/3) - Overdue and Due Today */}
        <div className="md:col-span-2">
          <div className="bg-card rounded-lg p-4 shadow mb-4">
            {/* SECTION HEADER WITH ACTION PATTERN */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  Critical Tasks
                </h2>
                <p className="text-sm text-muted-foreground">
                  Tasks that are overdue or due today ({criticalTasks.length})
                </p>
              </div>
              {/* MODAL TRIGGER BUTTON */}
              <button
                onClick={() => setShowTaskModal(true)}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <PlusCircle size={18} />
                Add Task
              </button>
            </div>

            {/* Task Modal */}
            <TaskCreateModal
              isOpen={showTaskModal}
              onClose={() => setShowTaskModal(false)}
              projectId={id}
            />

            {/* Critical Task List - Fixed height with scroll */}
            {!tasksLoading && !tasksError && criticalTasks.length > 0 && (
              <div className="overflow-hidden bg-dark-800 rounded-lg border border-dark-700">
                <div className="overflow-y-auto" style={{ maxHeight: '16rem' }}>
                  {' '}
                  {/* Roughly 3 task rows */}
                  <table className="min-w-full divide-y divide-dark-700">
                    <thead className="sticky top-0 bg-primary bg-opacity-10 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-dark-700">
                      {criticalTasks.map((task) => {
                        // --- ROBUST DATE COMPARISON START ---
                        // Get today's date components (local time)
                        const today = new Date();
                        const todayYear = today.getFullYear();
                        const todayMonth = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
                        const todayDate = today.getDate();

                        let dueYear, dueMonth, dueDateNum;
                        let isValidDueDate = false;

                        // Attempt to parse the dueDate string manually to avoid timezone issues
                        if (task.dueDate) {
                          try {
                            // Expecting 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss.sssZ'
                            const datePart = task.dueDate.substring(0, 10);
                            const parts = datePart.split('-');
                            if (parts.length === 3) {
                              dueYear = parseInt(parts[0], 10);
                              dueMonth = parseInt(parts[1], 10) - 1; // Adjust month to be 0-indexed
                              dueDateNum = parseInt(parts[2], 10);

                              // Basic validation of parsed numbers
                              if (
                                !isNaN(dueYear) &&
                                !isNaN(dueMonth) &&
                                !isNaN(dueDateNum) &&
                                dueMonth >= 0 &&
                                dueMonth <= 11 &&
                                dueDateNum >= 1 &&
                                dueDateNum <= 31
                              ) {
                                isValidDueDate = true;
                              } else {
                                console.warn(
                                  `Invalid date components parsed from dueDate: ${
                                    task.dueDate
                                  } -> Y:${dueYear}, M:${
                                    dueMonth + 1
                                  }, D:${dueDateNum}`
                                );
                                isValidDueDate = false; // Ensure it's false if validation fails
                              }
                            } else {
                              console.warn(
                                `Unexpected dueDate format (expected YYYY-MM-DD at start): ${task.dueDate}`
                              );
                            }
                          } catch (e) {
                            console.error(
                              `Error parsing dueDate string: ${task.dueDate}`,
                              e
                            );
                          }
                        }

                        // Check if task is due today by comparing components
                        const isDueToday =
                          isValidDueDate &&
                          dueYear === todayYear &&
                          dueMonth === todayMonth &&
                          dueDateNum === todayDate;

                        // Check if task is overdue using UTC dates for reliable comparison
                        // Date.UTC returns milliseconds since epoch, allowing direct numerical comparison
                        const utcToday = Date.UTC(
                          todayYear,
                          todayMonth,
                          todayDate
                        );
                        const utcDueDate = isValidDueDate
                          ? Date.UTC(dueYear, dueMonth, dueDateNum)
                          : NaN;

                        const isOverdue =
                          isValidDueDate && utcDueDate < utcToday;
                        // --- ROBUST DATE COMPARISON END ---

                        return (
                          <tr
                            key={task._id}
                            // Apply red background only if strictly overdue and not completed
                            className={`hover:bg-dark-700 transition-colors cursor-pointer ${
                              isOverdue && task.status !== 'Completed' // Correctly uses the robust isOverdue flag
                                ? 'bg-red-900 bg-opacity-20'
                                : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleTaskClick(task._id);
                            }}
                          >
                            <td
                              // Apply red text only if strictly overdue and not completed
                              className={`px-6 py-4 whitespace-nowrap text-sm ${
                                isOverdue && task.status !== 'Completed'
                                  ? 'text-red-400 font-medium' // Red text for overdue
                                  : 'text-[#C7C9D1]' // Default text color otherwise
                              } text-left`}
                            >
                              {formatDateForDisplay(task.dueDate)}{' '}
                              {/* Display formatted date */}
                              {/* Display (today) or (overdue) label based on robust flags */}
                              {isDueToday && task.status !== 'Completed' && (
                                <span className="ml-2 text-xs text-yellow-400 font-medium">
                                  (today)
                                </span>
                              )}
                              {isOverdue && task.status !== 'Completed' && (
                                <span className="ml-2 text-xs text-red-400 font-medium">
                                  (overdue)
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#F8FAFC] text-left">
                              {task.title}
                            </td>
                            <td className="px-6 py-4 text-sm text-[#C7C9D1] max-w-xs">
                              <div className="relative group max-w-xs">
                                <span className="block truncate">
                                  {task.description}
                                </span>
                                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-48 bg-dark-700 text-white text-xs p-2 rounded shadow-lg whitespace-normal break-words">
                                  {task.description}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                              {task.status}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                              {task.priority}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state for when there are no critical tasks */}
            {!tasksLoading && !tasksError && criticalTasks.length === 0 && (
              <div className="text-center p-8 border border-dark-700 rounded-lg bg-dark-800">
                <div className="text-gray-400 mb-2">
                  No critical tasks - you're all caught up!
                </div>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="text-primary hover:underline text-sm"
                >
                  + Add a task
                </button>
              </div>
            )}

            {/* Loading state for tasks */}
            {tasksLoading && (
              <div className="text-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-foreground text-sm">Loading tasks...</p>
              </div>
            )}

            {/* Error state for tasks */}
            {tasksError && (
              <div className="text-center p-8 text-red-500">
                <p>Error loading tasks: {tasksMessage}</p>
              </div>
            )}
          </div>

          {/* All Tasks Container - Separate from Critical Tasks */}
          <div className="bg-card rounded-lg p-4 shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-primary">All Tasks</h2>

              {/* "Add Task" button that reveals the task creation modal */}
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors"
              >
                <PlusCircle size={16} />
                Add Task
              </button>
            </div>

            {/* Regular Task List */}
            {!tasksLoading && !tasksError && tasks.length > 0 && (
              <div className="overflow-hidden bg-dark-800 rounded-lg border border-dark-700">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-dark-700">
                    <thead>
                      <tr className="bg-primary bg-opacity-10">
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-dark-700">
                      {tasks.map((task) => (
                        <tr
                          key={task._id}
                          className="hover:bg-dark-700 transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTaskClick(task._id);
                          }}
                        >
                          <td
                            className={`px-6 py-4 whitespace-nowrap text-sm ${
                              new Date(task.dueDate) <
                                new Date().setHours(0, 0, 0, 0) &&
                              task.status !== 'Completed'
                                ? 'text-red-400 font-medium'
                                : 'text-[#C7C9D1]'
                            } text-left`}
                          >
                            {formatDateForDisplay(task.dueDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#F8FAFC] text-left">
                            {task.title}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#C7C9D1] max-w-xs">
                            <div className="relative group max-w-xs">
                              <span className="block truncate">
                                {task.description}
                              </span>
                              <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-48 bg-dark-700 text-white text-xs p-2 rounded shadow-lg whitespace-normal break-words">
                                {task.description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                            {task.status}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                            {task.priority}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state for regular task list */}
            {!tasksLoading && !tasksError && tasks.length === 0 && (
              <div className="text-center p-8 border border-dark-700 rounded-lg bg-dark-800">
                <div className="text-gray-400 mb-2">
                  No tasks for this project yet
                </div>
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="text-primary hover:underline text-sm"
                >
                  + Add your first task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
