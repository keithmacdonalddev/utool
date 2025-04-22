import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createTask } from '../../features/tasks/taskSlice';
import { X } from 'lucide-react';

const TaskCreateModal = ({ isOpen, onClose, projectId = null }) => {
  const dispatch = useDispatch();
  // Get projects from Redux store for project dropdown
  const { projects } = useSelector((state) => state.projects);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'Not Started',
    priority: 'Low', // Set default to Low
    dueDate: '',
    project: projectId || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when projectId prop changes
  useEffect(() => {
    setForm((prevForm) => ({
      ...prevForm,
      project: projectId || '',
    }));
  }, [projectId]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setIsSubmitting(true);
    try {
      // Use the selected project from form or the projectId prop
      const selectedProjectId = form.project || projectId || undefined;

      await dispatch(
        createTask({
          title: form.title,
          projectId: selectedProjectId,
          description: form.description,
          status: form.status,
          priority: form.priority,
          dueDate: form.dueDate,
        })
      ).unwrap();

      onClose(); // Close modal after successful creation
      // Reset form
      setForm({
        title: '',
        description: '',
        status: 'Not Started',
        priority: 'Low',
        dueDate: '',
        project: projectId || '',
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      // Could add error handling UI here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-dark-700 rounded-lg shadow-lg w-full max-w-md mx-auto">
        <div className="flex justify-between items-center p-4 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-foreground">
            Add New Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              className="w-full p-2 bg-dark-700 text-foreground border border-dark-600 rounded focus:outline-none focus:border-primary"
              placeholder="Task title"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 bg-dark-700 text-foreground border border-dark-600 rounded focus:outline-none focus:border-primary"
              placeholder="Task description"
            />
          </div>

          {/* Only show project field if no project was passed from parent component */}
          {!projectId && (
            <div>
              <label
                htmlFor="project"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Project (Optional)
              </label>
              <select
                id="project"
                name="project"
                value={form.project}
                onChange={handleChange}
                className="w-full p-2 bg-dark-700 text-foreground border border-dark-600 rounded focus:outline-none focus:border-primary"
              >
                <option value="">-- No Project (Standalone Task) --</option>
                {projects?.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full p-2 bg-dark-700 text-foreground border border-dark-600 rounded focus:outline-none focus:border-primary"
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full p-2 bg-dark-700 text-foreground border border-dark-600 rounded focus:outline-none focus:border-primary"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Due Date
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={handleChange}
              className="w-full p-2 bg-dark-700 text-foreground border border-dark-600 rounded focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-dark-600 text-foreground rounded hover:bg-dark-500 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
              disabled={isSubmitting || !form.title.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCreateModal;
