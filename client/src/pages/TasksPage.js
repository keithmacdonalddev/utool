import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import { ArrowLeft } from 'lucide-react'; // Import icon
import Button from '../components/common/Button'; // Import Button
import {
  getTasks,
  resetTaskStatus,
  bulkUpdateTasks,
} from '../features/tasks/taskSlice';
import TaskList from '../components/tasks/TaskList';

const TasksPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // Moved useNavigate hook to the top with other hooks
  const { tasks, isLoading, isError, message } = useSelector(
    (state) => state.tasks
  );
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');

  useEffect(() => {
    dispatch(getTasks());
    return () => {
      dispatch(resetTaskStatus());
    };
  }, [dispatch]);

  if (isLoading)
    return <div className="container mx-auto p-4">Loading tasks...</div>;
  if (isError)
    return (
      <div className="container mx-auto p-4 text-red-600">Error: {message}</div>
    );

  // Bulk handlers
  const toggleSelectTask = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };
  const selectAll = () => {
    setSelectedTasks(tasks.map((t) => t._id));
  };
  const clearSelection = () => {
    setSelectedTasks([]);
  };
  const applyBulkStatus = () => {
    if (bulkStatus && selectedTasks.length) {
      dispatch(
        bulkUpdateTasks({
          taskIds: selectedTasks,
          updates: { status: bulkStatus },
        })
      );
      clearSelection();
      setBulkStatus('');
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {' '}
      {/* Added flex, h-full, p-4 */}
      {/* Header Row */}
      <div className="flex justify-between items-center mb-4">
        {' '}
        {/* Header styling */}
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>{' '}
          {/* Changed text color */}
        </div>
        <Button
          variant="primary"
          className="py-2 px-6 text-base font-bold shadow"
          onClick={() => navigate('/tasks/new')} // Navigate to new task page
        >
          + New Task
        </Button>
      </div>
      {/* Bulk Actions - Conditionally render */}
      {tasks.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 p-3 bg-card border border-dark-700 rounded-md">
          {' '}
          {/* Added wrap, gap, card styling */}
          <span className="text-sm font-medium text-gray-300 mr-2">
            Bulk Actions:
          </span>
          <button
            onClick={selectAll}
            className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-gray-200 rounded text-sm"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            disabled={selectedTasks.length === 0}
            className="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear ({selectedTasks.length})
          </button>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="px-2 py-1 bg-dark-800 border border-dark-600 rounded text-sm text-foreground focus:ring-primary focus:border-primary"
          >
            <option value="">-- Set Status --</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <button
            onClick={applyBulkStatus}
            disabled={!bulkStatus || selectedTasks.length === 0}
            className="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update Selected
          </button>
        </div>
      )}
      {/* Task List Area - Scrollable */}
      <div className="flex-grow overflow-y-auto">
        {' '}
        {/* Added flex-grow and overflow */}
        {tasks && tasks.length > 0 ? (
          <TaskList
            tasks={tasks}
            showCheckbox
            selectedTasks={selectedTasks}
            onSelectTask={toggleSelectTask}
          />
        ) : (
          <p>No tasks found.</p>
        )}
      </div>
    </div>
  );
};

export default TasksPage;
