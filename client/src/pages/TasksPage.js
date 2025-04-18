import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getTasks,
  resetTaskStatus,
  bulkUpdateTasks,
} from '../features/tasks/taskSlice';
import TaskList from '../components/tasks/TaskList';

const TasksPage = () => {
  const dispatch = useDispatch();
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Tasks</h1>
      {tasks.length > 0 && (
        <div className="mb-4 flex items-center space-x-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 bg-gray-600 text-white rounded"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1 bg-gray-600 text-white rounded"
          >
            Clear
          </button>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="px-2 py-1 border rounded"
          >
            <option value="">-- Bulk Status --</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <button
            onClick={applyBulkStatus}
            disabled={!bulkStatus || selectedTasks.length === 0}
            className="px-3 py-1 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Update Selected
          </button>
        </div>
      )}
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
  );
};

export default TasksPage;
