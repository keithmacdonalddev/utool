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
import { PlusCircle, X, Edit } from 'lucide-react';
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

  const handleTaskUpdate = async (updatedTask) => {
    console.log(`✏️ Task update requested: ${updatedTask._id}`);
    try {
      await dispatch(
        updateTask({
          projectId: id,
          taskId: updatedTask._id,
          updates: updatedTask,
        })
      ).unwrap();

      // Force a complete refresh of task data from the server
      // This ensures we get the latest data with correct date formats
      setTimeout(() => {
        console.log('🔄 Refreshing all tasks after update');
        dispatch(getTasksForProject(id));
      }, 100);

      showNotification('Task updated successfully', 'success');
    } catch (error) {
      showNotification(`Failed to update task: ${error.message}`, 'error');
      // Even on error, make sure we reload tasks to prevent them from disappearing
      dispatch(getTasksForProject(id));
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
            Created{' '}
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

      {/* Group Description, Details, and Progress in one row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Description Card */}
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

        {/* Project Details Card */}
        <div className="bg-card rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-4 text-primary">
            Project Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status, Priority, Due Date, Members as before */}
            <div>
              <span className="text-sm text-foreground opacity-80 block mb-1">
                Status
              </span>
              {/* DYNAMIC STYLING PATTERN: Classes determined by data */}
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
            {/* Members dropdown UI */}
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
        </div>

        {/* Progress Card */}
        <div className="bg-card rounded-lg p-4 shadow">
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

      {/* CHILD COMPONENT SECTION: Task List + Modal */}
      <div className="bg-card rounded-lg p-4 shadow">
        {/* SECTION HEADER WITH ACTION PATTERN */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary">Tasks</h2>
          {/* MODAL TRIGGER BUTTON */}
          <button
            onClick={() => setShowTaskModal(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <PlusCircle size={18} />
            Add Task
          </button>
        </div>

        {/*
         * MODAL COMPONENT PATTERN:
         * Pass isOpen state and onClose callback
         * onClose will be called by the modal when it should close
         */}
        <TaskCreateModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          projectId={id}
        />

        {/* TASK LIST WITH CONDITIONAL STATES */}
        {!tasksLoading && !tasksError && tasks.length > 0 && (
          <div className="overflow-hidden bg-dark-800 rounded-lg border border-dark-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-700">
                <thead>
                  <tr className="bg-primary bg-opacity-20">
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
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                      Due Date
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                        {formatDateForDisplay(task.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* End of tasks section */}
      </div>

      {/* Project Notes Section */}
      <div className="bg-card rounded-lg p-4 shadow">
        <ProjectNotes projectId={id} />
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
