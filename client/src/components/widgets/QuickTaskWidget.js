import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getTasks } from '../../features/tasks/taskSlice';

const QuickTaskWidget = () => {
  const dispatch = useDispatch();
  const { tasks, isLoading, isError, message } = useSelector(
    (state) => state.tasks
  );

  useEffect(() => {
    // Fetch tasks when component mounts
    dispatch(getTasks());
  }, [dispatch]);

  // Filter out completed tasks, then sort by creation date (newest first) and take the first 3
  const recentTasks = tasks
    ? [...tasks]
        .filter((task) => task.status !== 'Completed') // Exclude completed tasks
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
    : [];

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-app-card text-text">
      <h3 className="text-lg font-bold mb-3 text-[#F8FAFC]">Recent Tasks</h3>

      {/* Recent Tasks List */}
      {isLoading && <p className="text-[#C7C9D1]">Loading tasks...</p>}
      {isError && (
        <p className="text-red-400 text-sm">
          {message || 'Error loading tasks.'}
        </p>
      )}
      {!isLoading && !isError && (
        <ul className="space-y-2">
          {recentTasks.length > 0 ? (
            recentTasks.map((task) => (
              <li
                key={task._id}
                className="border-b border-dark-700 pb-1 last:border-b-0"
              >
                <Link
                  to={`/tasks/${task._id}`}
                  className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline truncate block"
                >
                  {task.title}
                </Link>
                <div className="flex justify-between">
                  <p className="text-xs text-[#C7C9D1]">{task.status}</p>
                  <p className="text-xs text-[#C7C9D1]">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))
          ) : (
            <p className="text-sm text-[#C7C9D1]">No tasks found.</p>
          )}
        </ul>
      )}

      {/* Links for View All and New Task */}
      <div className="mt-3 flex justify-between items-center">
        <Link
          to="/tasks"
          className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline"
        >
          View All Tasks
        </Link>
        <Link
          to="/tasks/new"
          className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline"
        >
          + New Task
        </Link>
      </div>
    </div>
  );
};

export default QuickTaskWidget;
