import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft } from 'lucide-react';
import {
  getTask,
  updateTask,
  deleteTask,
  resetTaskStatus,
} from '../features/tasks/taskSlice';
import {
  getProjects,
  resetProjectStatus,
} from '../features/projects/projectSlice';

const TaskDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Memoized selectors to prevent Redux rerender warnings
  const selectTasks = useMemo(() => (state) => state.tasks, []);
  const selectProjects = useMemo(() => (state) => state.projects, []);

  const {
    currentTask,
    isLoading: taskLoading,
    isError: taskError,
    message: taskMessage,
  } = useSelector(selectTasks);

  const {
    projects,
    isLoading: projectsLoading,
    isError: projectsError,
    message: projectsMessage,
  } = useSelector(selectProjects);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    project: '', // Add project field
  });

  useEffect(() => {
    // Fetch the task and all available projects
    dispatch(getTask(id));
    dispatch(getProjects());

    // Cleanup functions
    return () => {
      dispatch(resetTaskStatus());
      dispatch(resetProjectStatus());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (currentTask) {
      setForm({
        title: currentTask.title || '',
        description: currentTask.description || '',
        status: currentTask.status || '',
        priority: currentTask.priority || '',
        dueDate: currentTask.dueDate
          ? new Date(currentTask.dueDate).toISOString().substr(0, 10)
          : '',
        project: currentTask.project?._id || '', // Set the project ID if it exists
      });
    }
  }, [currentTask]);

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    await dispatch(
      updateTask({
        taskId: id,
        updates: form,
      })
    ).unwrap();
    navigate('/tasks');
  };

  const onDelete = async () => {
    if (window.confirm('Delete this task?')) {
      await dispatch(deleteTask(id)).unwrap();
      navigate('/tasks');
    }
  };

  if (taskLoading || projectsLoading)
    return <div className="container mx-auto p-4">Loading...</div>;
  if (taskError)
    return (
      <div className="container mx-auto p-4 text-red-600">
        Error: {taskMessage}
      </div>
    );
  if (!currentTask)
    return <div className="container mx-auto p-4">Task not found.</div>;

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

      <h1 className="text-2xl font-bold mb-4">Edit Task</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
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

        {/* Project Selection - New field */}
        <div>
          <label className="block text-sm font-medium">Project</label>
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
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-auto flex-1">
            <label className="block text-sm font-medium">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={onChange}
              className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div className="w-full sm:w-auto flex-1">
            <label className="block text-sm font-medium">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={onChange}
              className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="w-full sm:w-auto flex-1">
            <label className="block text-sm font-medium">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={onChange}
              className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
            />
          </div>
        </div>

        {/* Button Row */}
        <div className="flex justify-between items-center pt-4">
          {/* Save and Cancel Buttons Group */}
          <div className="flex space-x-2">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
          {/* Delete Button (aligned to the right) */}
          <button
            type="button"
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </form>

      {/* Project Context Information */}
      {currentTask.project && (
        <div className="mt-8 p-4 bg-card rounded-lg border border-dark-700">
          <h3 className="text-lg font-medium mb-2">Project Information</h3>
          <p>
            This task is part of project:{' '}
            <span className="font-semibold text-primary">
              {currentTask.project.name}
            </span>
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Change the project using the dropdown above or click
            <Link
              to={`/projects/${currentTask.project._id}`}
              className="text-accent-purple hover:text-accent-blue ml-1"
            >
              here
            </Link>{' '}
            to view the project details.
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskDetailsPage;
