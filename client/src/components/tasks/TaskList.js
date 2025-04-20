// TaskList.js - A reusable component that renders a list of tasks
// This component demonstrates several React best practices:
// 1. Composability - using smaller components (TaskItem) to build larger ones
// 2. Prop passing - passing data down to child components
// 3. Default props - providing reasonable defaults for optional props

import React from 'react'; // Import React library
import TaskItem from './TaskItem'; // Import the child component

/**
 * TaskList Component
 *
 * A presentational component that renders a list of task items
 * Follows the single responsibility principle by only handling the rendering
 * of multiple tasks, delegating individual task rendering to TaskItem
 *
 * @param {Object} props - Component props
 * @param {Array} props.tasks - Array of task objects to display
 * @param {boolean} props.showCheckbox - Whether to show checkboxes for task selection
 * @param {Array} props.selectedTasks - Array of IDs of selected tasks
 * @param {Function} props.onSelectTask - Callback when a task is selected/deselected
 * @param {Function} props.onTaskClick - Callback when a task is clicked
 * @param {string|null} props.activeTaskId - ID of the currently active task
 * @param {boolean} props.simplified - Whether to show tasks in simplified view
 */
const TaskList = ({
  tasks, // Array of task objects with properties like _id, title, status, etc.
  showCheckbox = false, // Default value using parameter destructuring
  selectedTasks = [], // Default to empty array if not provided
  onSelectTask = () => {}, // Default to no-op function if not provided
  onTaskClick = () => {}, // Default to no-op function if not provided
  activeTaskId = null, // Default to null (no active task) if not provided
  simplified = false, // Whether to show simplified version of tasks
}) => {
  return (
    <ul className="space-y-2 px-2">
      {' '}
      {/* Tailwind CSS classes for styling */}
      {tasks.map((task) => (
        // Key prop is crucial for React's reconciliation algorithm
        // It helps React identify which items have changed, been added, or removed
        // Always use a unique identifier from your data as the key
        <TaskItem
          key={task._id}
          task={task} // Pass the entire task object down to TaskItem
          showCheckbox={showCheckbox}
          // Check if this task's ID is in the selectedTasks array
          selected={selectedTasks.includes(task._id)}
          onSelect={onSelectTask} // Pass the selection handler down
          // Create a new function that calls onTaskClick with the task ID
          // This is a common pattern in React for passing data to event handlers
          onClick={() => onTaskClick(task._id)}
          // Compare IDs to determine if this task is the active one
          isActive={activeTaskId === task._id}
          simplified={simplified}
        />
      ))}
    </ul>
  );
};

// Export the component as the default export
// This allows importing with: import TaskList from './TaskList';
export default TaskList;
