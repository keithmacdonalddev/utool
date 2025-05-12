import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ProjectCard Component
 * Displays a project card with status, progress, and task counts
 *
 * @param {Object} props - Component props
 * @param {Object} props.project - Project data object
 * @param {Object} props.taskCounts - Object containing task count information
 * @param {number} props.taskCounts.open - Number of open tasks
 * @param {number} props.taskCounts.critical - Number of critical tasks
 * @param {boolean} props.taskCounts.isLoading - Whether task counts are loading
 * @param {boolean} props.taskCounts.isRefreshing - Whether task counts are refreshing in background
 * @returns {JSX.Element} Rendered component
 */
const ProjectCard = ({
  project,
  taskCounts = { open: 0, critical: 0, isLoading: false, isRefreshing: false },
}) => {
  const { _id, name, status, progress } = project;
  const { open, critical, isLoading, isRefreshing } = taskCounts;

  return (
    <Link
      to={`/projects/${_id}`}
      className="block bg-card rounded-lg shadow p-4 hover:shadow-lg transition"
    >
      <h3 className="text-xl font-semibold text-[#F8FAFC] truncate">{name}</h3>
      <div className="h-2 bg-gray-600 rounded-full mt-2 overflow-hidden">
        <div
          className="bg-green-500 h-2 rounded-full"
          style={{ width: `${progress}%` }}
          title={`${progress}%`}
        />
      </div>
      <div className="flex justify-between items-center mt-2 text-sm text-[#C7C9D1]">
        <span>Status: {status}</span>
        <span>{progress}%</span>
      </div>{' '}
      {/* Task counts section with border for visual separation */}
      <div className="mt-3 pt-3 border-t border-dark-600">
        <div className="flex">
          <span className="text-sm font-medium text-[#C7C9D1]">
            {isLoading ? (
              <span className="inline-flex items-center">
                <svg
                  className="animate-spin h-4 w-4 text-blue-400 mr-1"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Loading tasks...</span>
              </span>
            ) : (
              <div className="flex items-center">
                <span>
                  Open tasks: <span className="text-blue-400">{open}</span>
                  {critical > 0 && (
                    <span className="text-red-400 ml-1">
                      ({critical} Critical)
                    </span>
                  )}
                </span>

                {/* Background refresh indicator */}
                {isRefreshing && (
                  <div className="ml-2">
                    <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
                  </div>
                )}
              </div>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
