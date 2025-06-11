import React, { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Spinner from '../common/Spinner';
import useProjects from '../../hooks/useProjects';

/**
 * ProjectProgressWidget Component
 *
 * Displays a widget with the progress of the user's most urgent projects.
 * Uses intelligent caching to prevent redundant API calls.
 *
 * @component
 * @returns {JSX.Element} The rendered ProjectProgressWidget component
 */
const ProjectProgressWidget = () => {
  // Use our custom hook with caching instead of direct Redux dispatches
  const { projects, isLoading, error, refetchProjects } = useProjects({
    cacheTimeout: 5 * 60 * 1000, // 5 minutes cache for projects (change less frequently)
    backgroundRefresh: true, // Enable background refresh for better UX
    smartRefresh: true, // Enable smart comparison to prevent unnecessary re-renders
  });

  // Memoize sortedProjects to prevent Redux selector warnings
  // Previously, this array was being recreated on every render with the spread operator
  const sortedProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];

    return projects
      .filter((project) => project.dueDate) // Only include projects with due dates
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3); // Only show 3 most immediate projects
  }, [projects]);

  /**
   * Handle manual refresh of project data
   * This provides a way for users to force refresh the data if needed
   */
  const handleRefresh = () => {
    refetchProjects(true); // Force a refresh regardless of cache
  };

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-app-card text-text">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Project Progress</h3>
        <div className="flex items-center gap-2">
          {/* Add refresh button */}
          <button
            onClick={handleRefresh}
            className="text-sm text-gray-400 hover:text-white p-1 rounded-full hover:bg-dark-600"
            title="Refresh project data"
            aria-label="Refresh project data"
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
          <Link
            to="/projects"
            className="text-sm text-primary hover:text-primary-light"
          >
            View All
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-error">Error loading projects: {error}</p>
      ) : sortedProjects.length > 0 ? (
        <div className="space-y-4">
          {sortedProjects.map((project) => (
            <div key={project._id} className="border-b border-dark-600 pb-3">
              <div className="flex justify-between items-center mb-1">
                <Link
                  to={`/projects/${project._id}`}
                  className="font-medium text-text hover:text-primary"
                >
                  {project.name}
                </Link>
                <span className="text-xs text-muted">
                  {project.progress || 0}%
                </span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2.5 mt-1 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${project.progress || 0}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-text-muted py-4">No projects found</p>
      )}
    </div>
  );
};

export default memo(ProjectProgressWidget);
