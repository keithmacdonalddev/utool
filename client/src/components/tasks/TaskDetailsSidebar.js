import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  X,
  Calendar,
  Trash2,
  Save,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader,
} from 'lucide-react';
import {
  updateTask,
  deleteTask,
  getTasksForProject,
} from '../../features/tasks/taskSlice';
import { getProjects } from '../../features/projects/projectSlice';
import Button from '../common/Button';
import TextareaAutosize from 'react-textarea-autosize';
import {
  formatDateForDisplay,
  formatDateForInput,
  normalizeDate,
} from '../../utils/dateUtils';

const TaskDetailsSidebar = ({
  projectId,
  taskId,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks); // tasks array from Redux
  const task = tasks.find((t) => t._id === taskId) || null;
  const { projects } = useSelector((state) => state.projects);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Not Started',
    priority: 'Medium',
    dueDate: '',
    project: '',
  });
  const [originalData, setOriginalData] = useState(null); // Store initial data to compare for changes
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Track if save operation is in progress
  const [hasChanges, setHasChanges] = useState(false); // Track if form data has changed

  // Fetch projects only once when the sidebar opens (not on every render)
  useEffect(() => {
    if (isOpen && projects.length === 0) {
      dispatch(getProjects());
    }
  }, [isOpen, dispatch, projects.length]);

  // Optimized form data update with debouncing
  useEffect(() => {
    if (!task) return;

    const updateForm = () => {
      const formattedData = {
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'Not Started',
        priority: task.priority || 'Medium',
        dueDate: task.dueDate ? formatDateForInput(task.dueDate) : '',
        project: task.project
          ? typeof task.project === 'object'
            ? task.project._id
            : task.project
          : '',
      };

      setFormData(formattedData);
      setOriginalData(formattedData); // Save the original data for comparison
      setHasChanges(false); // Reset changes flag when task data is loaded
    };

    const debounceTimer = setTimeout(updateForm, 200);
    return () => clearTimeout(debounceTimer);
  }, [task, taskId]);

  // Clear form when sidebar closes (This effect handles the isOpen change separately)
  useEffect(() => {
    if (!isOpen) {
      // Simplified: just check if it's closed
      setFormData({
        title: '',
        description: '',
        status: 'Not Started',
        priority: 'Medium',
        dueDate: '',
        project: '',
      });
      setIsEditing(false); // Also reset editing state
    }
  }, [isOpen]); // This effect now specifically handles cleanup when isOpen becomes false

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
    setHasChanges(true); // Mark form as having changes
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true); // Set saving state

    // Properly format the date for the API
    // If there's a date, make sure it's a valid ISO string that will be recognized by MongoDB
    // If the date is empty, send null (which will be properly stored in MongoDB)
    const updatedTask = {
      ...formData,
      dueDate: formData.dueDate
        ? normalizeDate(formData.dueDate) // Convert to ISO string for consistent API handling
        : null,
    };

    // Use the current projectId or the form's project value
    const taskProjectId = projectId || formData.project;

    // Make sure we have a valid project ID
    if (!taskProjectId) {
      alert('Error: A project is required to update this task.');
      setIsSaving(false); // Reset saving state
      return;
    }

    dispatch(
      updateTask({
        projectId: taskProjectId,
        taskId,
        updates: updatedTask,
      })
    )
      .unwrap()
      .then((updatedTaskData) => {
        setIsEditing(false);
        setIsSaving(false); // Reset saving state
        setHasChanges(false); // Reset changes flag
        if (onUpdate) onUpdate(updatedTaskData);
        // Auto-close the sidebar after successful update
        onClose();
      })
      .catch((error) => {
        // Show error message with more details if available
        const errorMsg = error ? error.toString() : 'Unknown error';
        alert(`Failed to update task: ${errorMsg}`);
        console.error('Task update error:', error);
        setIsSaving(false); // Reset saving state
      });
  };

  // Handle task deletion
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      // Use the current projectId or the form's project value
      const taskProjectId = projectId || formData.project;

      // Make sure we have a valid project ID
      if (!taskProjectId) {
        alert('Error: A project ID is required to delete this task.');
        return;
      }

      dispatch(
        deleteTask({
          projectId: taskProjectId,
          taskId,
        })
      )
        .unwrap()
        .then(() => {
          if (onDelete) onDelete();
        })
        .catch((error) => {
          alert(`Failed to delete task: ${error}`);
        });
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return formatDateForDisplay(dateString);
  };

  // Get priority color class
  const getPriorityColorClass = (priority) => {
    switch (priority) {
      case 'High':
        return 'text-red-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'Low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={18} className="text-green-400" />;
      case 'In Progress':
        return <Clock size={18} className="text-blue-400" />;
      case 'Not Started':
        return <AlertTriangle size={18} className="text-gray-400" />;
      default:
        return <AlertTriangle size={18} className="text-gray-400" />;
    }
  };

  // Get project name from project ID
  const getProjectName = (projectId) => {
    // First, check if the task itself has a populated project object
    if (task && typeof task.project === 'object' && task.project.name) {
      return task.project.name;
    }

    if (!projectId) return 'No Project';

    if (!projects || projects.length === 0) {
      return 'Unknown Project'; // don't show loading
    }

    const found = projects.find((p) => p._id === projectId);
    return found ? found.name : 'Unknown Project';
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-dark-800 border-l border-dark-700 shadow-xl transition-transform duration-300 ease-in-out z-50 overflow-y-auto ${
        isOpen ? 'transform translate-x-0' : 'transform translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="sticky top-0 bg-dark-800 border-b border-dark-700 p-4 flex justify-between items-center z-10">
        <h2 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit Task' : 'Task Details'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-dark-700"
          aria-label="Close"
        >
          <X size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {!task ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-400">Task not found</p>
          </div>
        ) : (
          <>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md bg-dark-700 border border-dark-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-white p-2"
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Description
                  </label>
                  <TextareaAutosize
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md bg-dark-700 border border-dark-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-white p-2 min-h-[100px]"
                    minRows={3}
                  />
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md bg-dark-700 border border-dark-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-white p-2"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md bg-dark-700 border border-dark-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-white p-2"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label
                    htmlFor="dueDate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md bg-dark-700 border border-dark-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-white p-2"
                  />
                </div>

                {/* Project */}
                <div>
                  <label
                    htmlFor="project"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Project
                  </label>
                  <select
                    id="project"
                    name="project"
                    value={formData.project}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md bg-dark-700 border border-dark-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-white p-2"
                  >
                    <option value="">No Project</option>
                    {projects &&
                      projects.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditing(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleDelete} type="button">
                    Delete
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    className="flex items-center gap-2"
                    disabled={isSaving || !hasChanges} // Disable button if saving or no changes
                  >
                    {isSaving ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <>
                {/* View Mode */}
                <div className="space-y-6">
                  {/* Title */}
                  <h1 className="text-xl font-bold text-white">{task.title}</h1>

                  {/* Status and Priority Badges */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center px-3 py-1 bg-dark-700 rounded-full text-sm">
                      {getStatusIcon(task.status)}
                      <span className="ml-1">{task.status}</span>
                    </div>
                    <div
                      className={`flex items-center px-3 py-1 bg-dark-700 rounded-full text-sm ${getPriorityColorClass(
                        task.priority
                      )}`}
                    >
                      {task.priority} Priority
                    </div>
                    {formData.dueDate && (
                      <div className="flex items-center px-3 py-1 bg-dark-700 rounded-full text-sm">
                        <Calendar size={16} className="mr-1" />
                        {formatDateForDisplay(formData.dueDate)}
                      </div>
                    )}
                  </div>

                  {/* Project */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Project
                    </h3>
                    <p className="mt-1 text-white">
                      {formData.project
                        ? getProjectName(formData.project)
                        : 'No Project'}
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">
                      Description
                    </h3>
                    <div className="mt-2 prose prose-sm max-w-none text-gray-200">
                      {task.description ? (
                        <p className="whitespace-pre-wrap">
                          {task.description}
                        </p>
                      ) : (
                        <p className="text-gray-500 italic">
                          No description provided
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Creation and Update Info */}
                  <div className="border-t border-dark-700 pt-4 text-xs text-gray-500">
                    <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
                    <p>
                      Last updated: {new Date(task.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end pt-6">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TaskDetailsSidebar;
