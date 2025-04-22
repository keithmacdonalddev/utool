import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import { createTask } from '../features/tasks/taskSlice';
import { getProjects } from '../features/projects/projectSlice';

const TaskCreatePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'Not Started',
    priority: 'Low', // Changed default from Medium to Low
    dueDate: '',
    project: '', // This will store the project ID
  });

  // Get projects from Redux store
  const { projects, isLoading: projectsLoading } = useSelector(
    (state) => state.projects
  );

  // Fetch projects when component mounts
  useEffect(() => {
    dispatch(getProjects());
  }, [dispatch]);

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      // Use createTask thunk with all fields
      await dispatch(
        createTask({
          title: form.title,
          projectId: form.project || undefined,
          description: form.description,
          status: form.status,
          priority: form.priority,
          dueDate: form.dueDate,
        })
      ).unwrap();
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Error creating task: ' + error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      {/* Back Link */}
      <div className="mb-4">
        <Link
          to="/tasks"
          className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline transition duration-150 ease-in-out"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Task List
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">Create New Task</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            rows={3}
          />
        </div>
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={onChange}
              className="p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={onChange}
              className="p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            />
          </div>
        </div>

        {/* Project Selection - Replace text input with dropdown */}
        <div>
          <label className="block text-sm font-medium">
            Project (Optional)
          </label>
          <select
            name="project"
            value={form.project}
            onChange={onChange}
            className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
          >
            <option value="">-- No Project (Standalone Task) --</option>
            {projects &&
              projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Select a project or leave as standalone task
          </p>
        </div>

        {/* Button Row */}
        <div className="flex justify-between items-center pt-4">
          {/* Save and Cancel Buttons Group */}
          <div className="flex space-x-2">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded"
            >
              Create Task
            </button>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default TaskCreatePage;
