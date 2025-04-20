// TaskItem.js - Component for rendering an individual task
// This component demonstrates:
// 1. Conditional rendering based on props
// 2. Event handling and propagation control
// 3. Using helper functions to generate dynamic styles
// 4. React-Redux integration with useDispatch
// 5. Destructuring props for cleaner code

import React from 'react';
import { useDispatch } from 'react-redux'; // Hook to dispatch actions to Redux store
import { Link } from 'react-router-dom'; // For navigation between routes
import { deleteTask } from '../../features/tasks/taskSlice'; // Redux action
import { Trash2, Calendar } from 'lucide-react'; // SVG icons from Lucide library

/**
 * Helper function for status badge styling
 * Maps different task statuses to appropriate color schemes
 * This pattern keeps UI styling logic separate from component rendering
 */
const getStatusClasses = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-600 text-green-100'; // Tailwind classes for completed status
    case 'In Progress':
      return 'bg-yellow-500 text-yellow-100'; // Classes for in-progress status
    case 'Not Started':
    default:
      return 'bg-gray-500 text-gray-100'; // Default/not-started classes
  }
};

/**
 * Helper function for priority badge styling
 * Uses same pattern as status styling but for priority levels
 */
const getPriorityClasses = (priority) => {
  switch (priority) {
    case 'High':
      return 'bg-red-600 text-red-100'; // High priority - red
    case 'Medium':
      return 'bg-orange-500 text-orange-100'; // Medium priority - orange
    case 'Low':
    default:
      return 'bg-blue-500 text-blue-100'; // Low priority - blue
  }
};

/**
 * Helper to format date in a user-friendly way
 * Uses JavaScript's Intl API for localization
 * @param {string} dateString - ISO date string from API
 * @returns {string} Formatted date string
 */
const formatDate = (dateString) => {
  if (!dateString) return 'No due date';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Helper to format created date
 * Similar to formatDate but with different formatting options
 */
const formatCreatedDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * TaskItem Component
 *
 * Renders a single task item with various UI elements based on props
 * Shows how to handle events, conditional rendering, and dynamic styling
 *
 * @param {Object} props - Component props
 * @param {Object} props.task - The task object with properties like _id, title, status, etc.
 * @param {boolean} props.showCheckbox - Whether to show a checkbox for selection
 * @param {boolean} props.selected - Whether this task is currently selected
 * @param {Function} props.onSelect - Callback when task is selected/deselected
 * @param {Function} props.onClick - Callback when task is clicked
 * @param {boolean} props.isActive - Whether this task is the active/focused one
 * @param {boolean} props.simplified - Whether to show a simplified view
 */
const TaskItem = ({
  task,
  showCheckbox = false,
  selected = false,
  onSelect,
  onClick,
  isActive = false,
  simplified = false,
}) => {
  // Get the dispatch function to send actions to Redux store
  const dispatch = useDispatch();

  // Destructure task properties for easier access
  // This avoids repetitive task.title, task.status, etc.
  const { _id, title, status, priority, dueDate, project, createdAt } = task;

  /**
   * Handle delete button click
   * Shows proper event handling patterns:
   * 1. stopPropagation to prevent parent click events
   * 2. preventDefault to prevent default link behavior
   */
  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent the click from bubbling up to parent elements
    e.preventDefault(); // Prevent default browser behavior

    // Confirm before deletion - good UX pattern for destructive actions
    if (window.confirm('Delete this task?')) {
      // Dispatch Redux action to delete the task
      dispatch(deleteTask(_id));
    }
  };

  // Define the base classes for the list item using template literals
  // This demonstrates dynamic class construction using conditional expressions
  // with Tailwind CSS utility classes
  const itemClasses = `flex items-center justify-between p-4 rounded-lg shadow-sm transition-all duration-200 mb-3 border cursor-pointer mx-0.5
    ${
      isActive
        ? 'bg-primary-900/30 border-primary outline outline-1 outline-primary' // Active styling
        : 'bg-card border-dark-700 hover:shadow-md hover:border-dark-500' // Default styling
    }`;

  /**
   * Handle task item click
   * Shows how to manage click events with proper propagation control
   */
  const handleClick = (e) => {
    // Always prevent default behavior to avoid page reloads
    e.preventDefault();
    // Stop propagation to prevent parent elements from triggering
    e.stopPropagation();

    // Only trigger click if not clicking on checkbox or delete button
    // This prevents conflicts between multiple click handlers
    if (e.target.type !== 'checkbox') {
      onClick(_id);
    }
  };

  return (
    // Main container for the task item
    <li className={itemClasses} onClick={handleClick}>
      <div className="flex items-center flex-1 min-w-0">
        {/* Conditional rendering with the && operator */}
        {/* Only renders the checkbox when showCheckbox is true */}
        {showCheckbox && (
          <div className="flex-shrink-0 pr-4">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(_id)} // Call the onSelect callback with task ID
              onClick={(e) => e.stopPropagation()} // Prevent event bubbling
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Task title with truncation for overflow */}
          <h3
            className="text-lg font-semibold text-foreground truncate"
            title={title} // Shows full title on hover
          >
            {title}
          </h3>

          {/* Project info - conditional rendering with logical OR */}
          {/* Shows either when in simplified mode OR when project name exists */}
          {(simplified || project?.name) && (
            <p className="text-xs text-gray-400 mt-1 truncate">
              {/* Optional chaining (?.) to safely access nested properties */}
              {project?.name ? `Project: ${project.name}` : 'Standalone Task'}
            </p>
          )}

          {/* Created Date and Priority in the same row */}
          <div className="flex items-center justify-between mt-1 text-xs">
            {/* Created Date with icon */}
            <div className="flex items-center text-gray-400">
              <Calendar size={12} className="mr-1" />
              <span>Created: {formatCreatedDate(createdAt)}</span>
            </div>

            {/* Priority Badge with dynamic styling */}
            <span
              className={`inline-block px-2 py-0.5 rounded-full font-medium ${getPriorityClasses(
                priority || 'Low' // Fallback to 'Low' if priority is undefined
              )}`}
            >
              {priority || 'Low'}
            </span>
          </div>

          {/* Conditional rendering of additional details */}
          {/* Uses negation (!) with the simplified prop */}
          {!simplified && (
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              {/* Status Badge with dynamic styling */}
              <span
                className={`inline-block px-2 py-0.5 rounded-full font-medium ${getStatusClasses(
                  status
                )}`}
              >
                {status}
              </span>

              {/* Due Date display */}
              <span className="text-gray-400">{formatDate(dueDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete button with hover effects */}
      <div className="flex items-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleDelete}
          title="Delete Task" // Accessibility attribute
          className="text-red-500 hover:text-red-400 p-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
};

export default TaskItem;
