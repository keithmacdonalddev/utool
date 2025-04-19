import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom'; // Import Link
import { updateTask, deleteTask } from '../../features/tasks/taskSlice';
import { Trash2, Edit } from 'lucide-react'; // Import icons

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

const TaskItem = ({
  task,
  showCheckbox = false, // Re-add showCheckbox prop
  selected = false, // Re-add selected prop
  onSelect, // Re-add onSelect prop
}) => {
  const dispatch = useDispatch();
  const { _id, title, status, priority, dueDate, project } = task; // Assuming task might have a project ID

  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent link navigation when clicking delete
    e.preventDefault();
    if (window.confirm('Delete this task?')) {
      dispatch(deleteTask(_id));
    }
  };

  // Placeholder for navigation to an edit view
  const handleEdit = (e) => {
    e.stopPropagation();
    e.preventDefault();
    // TODO: Implement navigation to edit page, e.g., navigate(`/tasks/${_id}/edit`)
    console.log('Navigate to edit task:', _id);
  };

  return (
    // Use Link to make the whole item clickable, leading to details/edit
    // Or keep as li and add specific click handlers/links
    <li className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-3 border border-dark-700 group">
      {/* Checkbox for selection */}
      {showCheckbox && (
        <div className="flex-shrink-0 pr-4">
          {' '}
          {/* Wrapper for spacing */}
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(_id)} // Call onSelect with task ID
            onClick={(e) => e.stopPropagation()} // Prevent li click when clicking checkbox
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 mr-4">
        <Link to={`/tasks/${_id}`} className="block">
          {' '}
          {/* Link the title */}
          <h3
            className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors"
            title={title}
          >
            {title}
          </h3>
        </Link>
        {/* Display project name if available */}
        <p className="text-xs text-gray-400 mt-1">
          {project?.name ? `Project: ${project.name}` : 'Standalone Task'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
          {/* Status Badge */}
          <span
            className={`inline-block px-2 py-0.5 rounded-full font-medium ${getStatusClasses(
              status
            )}`}
          >
            {status}
          </span>
          {/* Priority Badge */}
          <span
            className={`inline-block px-2 py-0.5 rounded-full font-medium ${getPriorityClasses(
              priority || 'Low' // Default to Low if undefined
            )}`}
          >
            {priority || 'Low'} Priority
          </span>
          {/* Due Date */}
          <span className="text-gray-400">{formatDate(dueDate)}</span>
        </div>
      </div>

      {/* Action Buttons - Show on hover using group-hover */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Edit Button Placeholder */}
        {/* <button
            onClick={handleEdit}
            title="Edit Task"
            className="text-blue-400 hover:text-blue-300 p-1"
         >
            <Edit size={16} />
         </button> */}
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
