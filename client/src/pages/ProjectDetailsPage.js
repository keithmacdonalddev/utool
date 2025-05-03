// ProjectDetailsPage.js - A React page component that displays and manages a single project
//
// KEY CONCEPTS:
// 1. React Router Integration: Using URL parameters and navigation hooks
// 2. Redux State Management: Fetching and updating data with useDispatch and useSelector
// 3. Component Composition: Orchestrating smaller components to build the page UI
// 4. Conditional Rendering: Displaying different UI based on loading/error states
// 5. Custom Hooks: Reusing logic across components (useFriends)
// 6. Improved Code Readability: Delegated rendering of sections to child components

import React, { useEffect, useState, lazy, Suspense, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  getProject,
  updateProject, // Keep updateProject here for adding members via handler
  resetProjectStatus,
} from '../features/projects/projectSlice';
import {
  getTasksForProject, // Keep fetching tasks here
  resetTaskStatus,
  updateTask, // Keep updateTask here for task details sidebar
  deleteTask, // Keep deleteTask here for task details sidebar
} from '../features/tasks/taskSlice';

// Import the new section components
import ProjectDetailsInfo from '../components/projects/ProjectDetailsInfo';
import CriticalTasksSection from '../components/tasks/CriticalTasksSection';
import AllTasksSection from '../components/tasks/AllTasksSection';

// Import components that were already separate
import TaskCreateModal from '../components/tasks/TaskCreateModal';
import ProjectNotes from '../components/projects/ProjectNotes';
// No longer need TagFilter import here, it's in AllTasksSection

// Import utility functions for task filtering and processing
import {
  getCriticalTasks, // Used here to prepare data for CriticalTasksSection
  getTagFilteredTasks, // Used here to prepare data for AllTasksSection
  getFilteredTasks, // Used here for main date filtering before tag filtering
  // No longer need getTaskCounts here if CriticalTasksSection calculates its own count
} from '../utils/taskUtils';

// api import is not used in this component, can be removed
// import api from '../utils/api';

import { Edit, ArrowLeft } from 'lucide-react'; // Keep Edit for project header button
// No longer need PlusCircle, X, Clock, AlertTriangle here

import { useNotifications } from '../context/NotificationContext';
import useFriends from '../hooks/useFriends';
// formatDateForDisplay is used in child components now, no longer needed here unless for project endDate header (which is gone)

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
 * - Fetches primary data (project, tasks, friends).
 * - Manages top-level UI state (modal, sidebar, main filters like tags).
 * - Provides handlers that interact with Redux/API.
 * - Renders structural layout and delegates rendering of distinct sections
 * to smaller, focused child components.
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

  // Extract project and task data from Redux store
  const {
    currentProject: project,
    isLoading, // Overall project loading
    isError, // Overall project error
    message,
  } = useSelector((state) => state.projects);

  const {
    tasks,
    isLoading: tasksLoading, // Task-specific loading
    isError: tasksError, // Task-specific error
    message: tasksMessage,
  } = useSelector((state) => state.tasks);
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

  /**
   * Local Component State:
   * Managing UI state for modals, sidebars, and main filters.
   */
  const [showTaskModal, setShowTaskModal] = useState(false); // Task creation modal visibility
  const [selectedTask, setSelectedTask] = useState(null); // Task selected for sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Task details sidebar visibility
  // State for tag filters applied to the 'All Tasks' section
  const [selectedTags, setSelectedTags] = useState([]);
  // State for date filter applied to the 'All Tasks' section (optional, if needed)
  // const [allTasksFilter, setAllTasksFilter] = useState('all'); // 'all' or specific filters

  // --- Diagnostic logging removed for brevity in refactored version ---
  // --- Keep these if they are genuinely useful for debugging in dev ---
  // const mountCountRef = useRef(0);
  // const isFirstTaskClickRef = useRef(true);
  // const mountTimestampRef = useRef(Date.now());
  // useEffect(() => { /* ... logging logic ... */ }, []);

  /**
   * DATA FETCHING AND CLEANUP SIDE EFFECT:
   * Fetch project and task data when the component mounts or ID changes.
   * Reset state on unmount.
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
      // Also close sidebar if open when navigating away
      setIsSidebarOpen(false);
      setSelectedTask(null);
    };
  }, [dispatch, id]); // Only re-run if these dependencies change

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
      await dispatch(
        updateProject({
          projectId: id,
          projectData: { members: updatedMembers },
        })
      ).unwrap();
      showNotification('Member added successfully!', 'success');
      // No need to manually update state here, Redux slice should handle fetching/updating project
      // dispatch(getProject(id)); // Can re-fetch project to ensure state is fully updated
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
    // Find the task from the current Redux state
    const task = tasks.find((t) => t._id === taskId);
    if (task) {
      console.log(`✅ Found task: ${task.title}`);
      setSelectedTask(task);
      setIsSidebarOpen(true);
      // isFirstTaskClickRef logic removed for simplicity unless critical for specific bug
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
      dispatch(getTasksForProject(id));
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

      // Refresh the task list after update
      dispatch(getTasksForProject(id));
    } catch (error) {
      console.error('Error during task update:', error);
      // Handle expected archiving error on completion
      if (isCompletingTask && error.message?.includes('500')) {
        console.log('Expected error during task completion (likely archived).');
        dispatch(getTasksForProject(id)); // Still refresh to be sure
      } else {
        showNotification(`Failed to update task: ${error.message}`, 'error');
        dispatch(getTasksForProject(id)); // Refresh even on error to attempt state sync
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
      dispatch(getTasksForProject(id));
      showNotification('Task deleted successfully', 'success');
    } catch (error) {
      console.error('Error during task delete:', error);
      showNotification(`Failed to delete task: ${error.message}`, 'error');
      dispatch(getTasksForProject(id)); // Refresh tasks even on error
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
  // Note: If you add a date filter UI for "All Tasks", use `allTasksFilter` state here
  const dateFilteredTasks = getFilteredTasks(tasks, 'all'); // Assuming 'all' filter by default for the main list
  const filteredTasks = getTagFilteredTasks(dateFilteredTasks, selectedTags);

  /**
   * CONDITIONAL RENDERING PATTERN:
   * Show different UIs based on different application states (loading, error, not found).
   * These are top-level states, so this logic stays here.
   */

  // Overall Loading state for the page
  if (isLoading || tasksLoading || friendsLoading)
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading project details...</p>
        </div>
      </div>
    );

  // Overall Error state for the project fetch
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

  // Project Not Found state
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
   * MAIN PAGE STRUCTURE RENDERING:
   * Render the main layout and the child section components, passing them
   * the necessary data and handlers.
   */
  return (
    <div className="container mx-auto p-4 bg-background text-foreground space-y-6">
      {/* Task Creation Modal - Controlled by local state */}
      <TaskCreateModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        projectId={id}
        // Pass friends/members data if needed for task assignment in the modal
        projectMembers={project?.members || []}
        allFriends={friends}
      />

      {/* Task Details Sidebar - Lazy loaded and controlled by local state */}
      <Suspense
        fallback={
          isSidebarOpen && ( // Only show fallback if sidebar is expected to be open
            <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-dark-800 flex items-center justify-center border-l border-dark-700 shadow-lg">
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

      {/* PROJECT HEADER: Title and Edit Button */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
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
        {/* Edit Project Button */}
        {/* Assuming user is authorized to edit */}
        <Link
          to={`/projects/${id}/edit`}
          className="flex items-center justify-center bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors mt-4 md:mt-0"
        >
          <Edit size={18} className="mr-2" /> Edit Project
        </Link>
      </div>

      {/* Main content grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column (Project Info & Notes) */}
        <div className="md:col-span-1 space-y-4">
          {/* Description Container (remains here as it's simple) */}
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

          {/* Project Notes Component (already separate) */}
          <div className="bg-card rounded-lg p-4 shadow">
            <ProjectNotes projectId={id} />
          </div>

          {/* Project Details Info Component - Replaces the large details block */}
          {/* Pass necessary data and the handler for adding members */}
          <ProjectDetailsInfo
            project={project}
            friends={friends}
            friendsLoading={friendsLoading}
            friendsError={friendsError}
            onAddMember={handleAddMember} // Pass the handler down
          />
        </div>

        {/* Right Column (Tasks Sections) */}
        <div className="md:col-span-2 space-y-6">
          {' '}
          {/* Added space-y-6 for separation */}
          {/* Critical Tasks Section Component */}
          {/* Pass the derived critical tasks data and relevant handlers */}
          <CriticalTasksSection
            criticalTasks={criticalTasks}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            tasksMessage={tasksMessage}
            onTaskClick={handleTaskClick} // Pass the task click handler
            onAddTaskClick={handleShowTaskModal} // Pass the handler to show the modal
          />
          {/* All Tasks Section Component */}
          {/* Pass task data, derived filtered tasks, filters, and handlers */}
          <AllTasksSection
            tasks={tasks} // Pass full tasks for TagFilter
            filteredTasks={filteredTasks}
            tasksLoading={tasksLoading}
            tasksError={tasksError}
            tasksMessage={tasksMessage}
            selectedTags={selectedTags} // Pass current filter state
            onTaskClick={handleTaskClick} // Pass the task click handler
            onAddTaskClick={handleShowTaskModal} // Pass the handler to show the modal
            onTagSelect={handleTagSelect} // Pass tag filter handlers
            onTagDeselect={handleTagDeselect}
            onClearAllTags={handleClearAllTags}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
