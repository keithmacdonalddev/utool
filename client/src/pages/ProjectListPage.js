import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectCard from '../components/projects/ProjectCard';
import { ArrowLeft, Grid, List, AlignJustify } from 'lucide-react';
import Button from '../components/common/Button';
import { isTaskOverdue, isTaskDueToday } from '../utils/taskUtils';
import useProjects from '../hooks/useProjects';
import useRecentTasks from '../hooks/useRecentTasks';

/**
 * ProjectListPage Component
 *
 * Displays a list of projects in either grid, list, or table view.
 * Uses custom hooks with caching to prevent redundant API calls.
 *
 * @component
 * @returns {JSX.Element} The rendered ProjectListPage component
 */
const ProjectListPage = memo(() => {
  // Use our custom hooks with caching instead of direct Redux dispatches
  const {
    projects,
    isLoading,
    error: projectsError,
    refetchProjects,
    backgroundRefreshState,
  } = useProjects({
    cacheTimeout: 5 * 60 * 1000, // 5 minutes cache
    backgroundRefresh: true, // Enable background refresh for better UX
    smartRefresh: true, // Enable smart comparison to prevent unnecessary re-renders
  });
  const {
    tasks,
    isLoading: tasksLoading,
    error: tasksError,
    backgroundRefreshState: tasksBackgroundRefreshState,
  } = useRecentTasks({
    cacheTimeout: 3 * 60 * 1000, // 3 minutes cache for tasks (they change more frequently)
    backgroundRefresh: true, // Enable background refresh for better UX
    smartRefresh: true, // Enable smart comparison to prevent unnecessary re-renders
  });

  // Add view mode state with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('projectViewMode') || 'grid';
  });

  // Function to set view mode and save it to localStorage
  const setViewModeWithStorage = (mode) => {
    localStorage.setItem('projectViewMode', mode);
    setViewMode(mode);
  };
  /**
   * Calculates open and critical task counts for a specific project
   * Shows loading indicators within the cells rather than a global message
   *
   * @param {string} projectId - The ID of the project
   * @returns {Object} Object with open and critical task counts and loading/refreshing states
   */
  const getTaskCountsForProject = (projectId) => {
    // If we're still loading and don't have tasks data yet, return loading state
    if (tasksLoading && (!tasks || tasks.length === 0)) {
      return {
        open: null,
        critical: null,
        isLoading: true,
        isRefreshing: false,
      };
    }

    // Check if tasks are currently being refreshed in the background
    const isRefreshing =
      tasksBackgroundRefreshState?.backgroundRefreshing || false;

    // If we have tasks data, use it even if a refresh is happening in the background
    if (tasks && tasks.length > 0) {
      // Filter tasks that belong to this project
      const projectTasks = tasks.filter(
        (task) =>
          task.project === projectId ||
          (task.project && task.project._id === projectId)
      );

      // Count open tasks (not completed)
      const openTasks = projectTasks.filter(
        (task) => task.status !== 'Completed'
      );

      // Count critical tasks (overdue or due today)
      const criticalTasks = projectTasks.filter(
        (task) =>
          task.status !== 'Completed' &&
          (isTaskOverdue(task) || isTaskDueToday(task))
      );

      return {
        open: openTasks.length,
        critical: criticalTasks.length,
        isLoading: false,
        isRefreshing: isRefreshing,
      };
    }

    // Fallback for when no data is available and not loading
    return {
      open: 0,
      critical: 0,
      isLoading: false,
      isRefreshing: isRefreshing,
    };
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  }; // Render project as a list item
  const renderListItem = (project) => {
    const { open, critical, isLoading, isRefreshing } = getTaskCountsForProject(
      project._id
    );

    return (
      <Link
        to={`/projects/${project._id}`}
        key={project._id}
        className="block bg-card border border-dark-700 rounded-lg p-4 mb-3 hover:bg-dark-700 transition-colors"
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-[#F8FAFC]">
              {project.name}
            </h3>
            <p className="text-sm text-[#C7C9D1] mt-1">
              Status: {project.status}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm text-[#C7C9D1] mb-1">
              Progress: {project.progress || 0}%
            </div>
            <div className="w-32 bg-gray-600 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex mt-3 border-t border-dark-600 pt-3">
          <div className="flex items-center">
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
                  <span>Loading tasks...</span>{' '}
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
  }; // Render project as a table row
  const renderTableItem = (project) => {
    const { open, critical, isLoading, isRefreshing } = getTaskCountsForProject(
      project._id
    );

    return (
      <tr
        key={project._id}
        className="hover:bg-dark-700 transition-colors cursor-pointer"
        onClick={() => (window.location.href = `/projects/${project._id}`)}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F8FAFC] text-left">
          {project.name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
          {project.status}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
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
            </span>
          ) : (
            <div className="flex items-center">
              <div>
                <span className="font-medium text-blue-400">{open}</span>
                {critical > 0 && (
                  <span className="font-medium text-red-400 ml-1">
                    ({critical})
                  </span>
                )}
              </div>

              {/* Background refresh indicator */}
              {isRefreshing && (
                <div className="ml-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse"></div>
                </div>
              )}
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
          {formatDate(project.dueDate || project.endDate)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-left">
          <div className="flex items-center">
            <div className="w-full bg-gray-600 rounded-full h-2 mr-2 overflow-hidden">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${project.progress || 0}%` }}
              />
            </div>
            <span className="text-sm text-[#C7C9D1]">
              {project.progress || 0}%
            </span>
          </div>
        </td>
      </tr>
    );
  };
  // Add a function to handle manual refresh when needed
  const handleManualRefresh = () => {
    // If a background refresh is already in progress, don't trigger another
    if (backgroundRefreshState?.backgroundRefreshing) {
      console.log(
        'Background refresh already in progress, skipping manual refresh'
      );
      return;
    }

    // Use background refresh for a smoother UX
    refetchProjects({
      forceRefresh: true,
      backgroundRefresh: true,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-foreground">Loading projects...</p>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error!</strong> {projectsError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Row: Back Link, Title, View Toggle, Create Button */}
      <div className="flex justify-between items-center mb-3 px-4 md:px-0 pt-4">
        {' '}
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Projects</h1>

            {/* Background refresh indicator */}
            {backgroundRefreshState?.backgroundRefreshing && (
              <div className="ml-2 flex items-center text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse mr-1"></div>
                <span className="hidden sm:inline">
                  Refreshing in background...
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {' '}
          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className={`p-2 rounded-md ${
              backgroundRefreshState?.backgroundRefreshing
                ? 'text-blue-400 bg-blue-400 bg-opacity-10'
                : 'text-gray-400 hover:text-white hover:bg-dark-600'
            }`}
            title={
              backgroundRefreshState?.backgroundRefreshing
                ? 'Refreshing Projects...'
                : 'Refresh Projects'
            }
            disabled={backgroundRefreshState?.backgroundRefreshing}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={
                backgroundRefreshState?.backgroundRefreshing
                  ? 'animate-spin'
                  : ''
              }
            >
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </button>
          {/* View Toggle Buttons */}
          <div className="bg-dark-700 rounded-lg p-1 flex">
            <button
              onClick={() => setViewModeWithStorage('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewModeWithStorage('list')}
              className={`p-2 rounded-md ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewModeWithStorage('table')}
              className={`p-2 rounded-md ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Table View"
            >
              <AlignJustify size={18} />
            </button>
          </div>
          <Button
            variant="primary"
            className="py-2 px-6 text-base font-bold shadow"
            style={{ color: '#F8FAFC' }}
            onClick={() => (window.location.href = '/projects/new')}
          >
            + New Project
          </Button>
        </div>{' '}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-grow overflow-y-auto p-4 md:px-0">
        {projects && projects.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  taskCounts={getTaskCountsForProject(project._id)}
                />
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col overflow-hidden">
              {projects.map((project) => renderListItem(project))}
            </div>
          ) : (
            <div className="overflow-x-auto bg-dark-800 rounded-lg border border-dark-700">
              <table className="min-w-full divide-y divide-dark-700">
                <thead>
                  <tr className="bg-primary bg-opacity-20">
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      OPEN TASKS{' '}
                      <span className="text-red-400">(critical)</span>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Due Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider"
                    >
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-dark-700">
                  {projects.map((project) => renderTableItem(project))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="text-center text-gray-500 py-10">
            No projects found. Create a new project to get started.
          </p>
        )}
      </div>
    </div>
  );
});

export default ProjectListPage;
