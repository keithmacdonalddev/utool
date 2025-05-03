import React from 'react';
import { Link } from 'react-router-dom';
import useRecentTasks from '../../hooks/useRecentTasks';

/**
 * QuickTaskWidget Component
 *
 * Displays a widget with the user's most recent tasks across all projects.
 * Uses intelligent caching to prevent redundant API calls.
 *
 * @component
 * @returns {JSX.Element} The rendered QuickTaskWidget component
 */
const QuickTaskWidget = () => {
  // Use our custom hook with caching instead of direct Redux dispatches
  const { tasks, isLoading, error, refetchTasks } = useRecentTasks({
    cacheTimeout: 2 * 60 * 1000, // 2 minutes cache for tasks (change more frequently)
  });

  // Filter out completed tasks, then take the first 3
  const recentTasks = tasks
    ? [...tasks]
        .filter((task) => task.status !== 'Completed') // Exclude completed tasks
        .slice(0, 3)
    : [];

  /**
   * Handle manual refresh of task data
   * This provides a way for users to force refresh the data if needed
   */
  const handleRefresh = () => {
    refetchTasks(true); // Force a refresh regardless of cache
  };

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-app-card text-text">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-[#F8FAFC]">Recent Tasks</h3>

        {/* Add refresh button */}
        <button
          onClick={handleRefresh}
          className="text-sm text-gray-400 hover:text-white p-1 rounded-full hover:bg-dark-600"
          title="Refresh task data"
          aria-label="Refresh task data"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </button>
      </div>

      {/* Recent Tasks List */}
      {isLoading && <p className="text-[#C7C9D1]">Loading tasks...</p>}
      {error && (
        <p className="text-red-400 text-sm">
          {error || 'Error loading tasks.'}
        </p>
      )}
      {!isLoading && !error && (
        <ul className="space-y-2">
          {recentTasks.length > 0 ? (
            recentTasks.map((task) => (
              <li
                key={task._id}
                className="border-b border-dark-700 pb-1 last:border-b-0"
              >
                <Link
                  to={`/projects/${task.project}/tasks/${task._id}`}
                  className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline truncate block"
                >
                  {task.title}
                </Link>
                <div className="flex justify-between">
                  <p className="text-xs text-[#C7C9D1]">{task.status}</p>
                  <p className="text-xs text-[#C7C9D1]">
                    {task.projectName && (
                      <span className="bg-dark-600 px-1 rounded text-xs">
                        {task.projectName}
                      </span>
                    )}
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
          to="/projects"
          className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline"
        >
          View Projects
        </Link>
        <Link
          to="/projects"
          className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline"
        >
          + New Task
        </Link>
      </div>
    </div>
  );
};

export default QuickTaskWidget;
