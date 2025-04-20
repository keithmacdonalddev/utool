import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { deleteTask } from '../../features/tasks/taskSlice';
import { Trash2, Calendar } from 'lucide-react';

// Helper function for status badge styling
const getStatusClasses = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-600 text-green-100';
    case 'In Progress':
      return 'bg-yellow-500 text-yellow-100';
    case 'Not Started':
    default:
      return 'bg-gray-500 text-gray-100';
  }
};

// Helper function for priority badge styling
const getPriorityClasses = (priority) => {
  switch (priority) {
    case 'High':
      return 'bg-red-600 text-red-100';
    case 'Medium':
      return 'bg-orange-500 text-orange-100';
    case 'Low':
    default:
      return 'bg-blue-500 text-blue-100';
  }
};

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return 'No due date';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Helper to format created date
const formatCreatedDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const TaskItem = ({
  task,
  showCheckbox = false,
  selected = false,
  onSelect,
  onClick,
  isActive = false,
  simplified = false,
}) => {
  const dispatch = useDispatch();
  const { _id, title, status, priority, dueDate, project, createdAt } = task;

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('Delete this task?')) {
      dispatch(deleteTask(_id));
    }
  };

  // Define the base classes for the list item, with conditional active state
  const itemClasses = `flex items-center justify-between p-4 rounded-lg shadow-sm transition-all duration-200 mb-3 border cursor-pointer mx-0.5
    ${
      isActive
        ? 'bg-primary-900/30 border-primary outline outline-1 outline-primary'
        : 'bg-card border-dark-700 hover:shadow-md hover:border-dark-500'
    }`;

  // Handle task item click
  const handleClick = (e) => {
    // Always prevent default behavior to avoid page reloads
    e.preventDefault();
    // Stop propagation to prevent parent elements from triggering
    e.stopPropagation();

    // Only trigger click if not clicking on checkbox or delete button
    if (e.target.type !== 'checkbox') {
      onClick(_id);
    }
  };

  return (
    <li className={itemClasses} onClick={handleClick}>
      <div className="flex items-center flex-1 min-w-0">
        {/* Checkbox for selection */}
        {showCheckbox && (
          <div className="flex-shrink-0 pr-4">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(_id)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3
            className="text-lg font-semibold text-foreground truncate"
            title={title}
          >
            {title}
          </h3>

          {/* Project name info */}
          {(simplified || project?.name) && (
            <p className="text-xs text-gray-400 mt-1 truncate">
              {project?.name ? `Project: ${project.name}` : 'Standalone Task'}
            </p>
          )}

          {/* Created Date and Priority in the same row */}
          <div className="flex items-center justify-between mt-1 text-xs">
            {/* Created Date */}
            <div className="flex items-center text-gray-400">
              <Calendar size={12} className="mr-1" />
              <span>Created: {formatCreatedDate(createdAt)}</span>
            </div>

            {/* Priority Badge */}
            <span
              className={`inline-block px-2 py-0.5 rounded-full font-medium ${getPriorityClasses(
                priority || 'Low'
              )}`}
            >
              {priority || 'Low'}
            </span>
          </div>

          {/* Additional details if not in simplified view */}
          {!simplified && (
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              {/* Status Badge */}
              <span
                className={`inline-block px-2 py-0.5 rounded-full font-medium ${getStatusClasses(
                  status
                )}`}
              >
                {status}
              </span>

              {/* Due Date */}
              <span className="text-gray-400">{formatDate(dueDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Delete button - Keep this in both views */}
      <div className="flex items-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleDelete}
          title="Delete Task"
          className="text-red-500 hover:text-red-400 p-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
};

export default TaskItem;
