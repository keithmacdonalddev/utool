import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Grid,
  List,
  AlignJustify,
} from 'lucide-react';
import Button from '../components/common/Button';
import { getTasks, resetTaskStatus } from '../features/tasks/taskSlice';
import TaskCreateModal from '../components/tasks/TaskCreateModal';
import { getProjects } from '../features/projects/projectSlice';
import { useNotifications } from '../context/NotificationContext';

const TasksPage = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { showNotification } = useNotifications();
  const { tasks, isLoading, isError, message } = useSelector(
    (state) => state.tasks
  );
  const { projects } = useSelector((state) => state.projects);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('taskViewMode') || 'grid';
  });

  // Function to set view mode and save it to localStorage
  const setViewModeWithStorage = (mode) => {
    localStorage.setItem('taskViewMode', mode);
    setViewMode(mode);
  };

  // Add sorting state
  const [sortCriteria, setSortCriteria] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');

  // Check URL for query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('new') === 'true') {
      setIsCreateModalOpen(true);
    }
  }, [location]);

  useEffect(() => {
    dispatch(getTasks());
    dispatch(getProjects());
    return () => {
      dispatch(resetTaskStatus());
    };
  }, [dispatch]);

  // Open create task modal
  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  // Close create task modal
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Toggle sort order and update sort criteria
  const handleSortChange = (criteria) => {
    if (sortCriteria === criteria) {
      // If same criteria, toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If new criteria, set to ascending by default
      setSortCriteria(criteria);
      setSortOrder('asc');
    }
  };

  // Get project name from project ID
  const getProjectName = (projectId) => {
    if (!projectId) return 'No Project';
    const project = projects?.find((p) => p._id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get priority color class
  const getPriorityColorClass = (priority) => {
    switch (priority) {
      case 'High':
        return 'text-red-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'Low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get status color class
  const getStatusColorClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'text-green-400';
      case 'In Progress':
        return 'text-blue-400';
      case 'Not Started':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get status background color class for badges
  const getStatusBgColorClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500 text-green-100';
      case 'In Progress':
        return 'bg-blue-500 text-blue-100';
      case 'Not Started':
        return 'bg-gray-500 text-gray-100';
      default:
        return 'bg-gray-500 text-gray-100';
    }
  };

  // Get priority background color class for badges
  const getPriorityBgColorClass = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500 text-red-100';
      case 'Medium':
        return 'bg-yellow-500 text-yellow-100';
      case 'Low':
        return 'bg-green-500 text-green-100';
      default:
        return 'bg-gray-500 text-gray-100';
    }
  };

  // Filter and sort tasks
  const getFilteredAndSortedTasks = () => {
    // First filter by status
    const filtered = tasks.filter((task) =>
      statusFilter === 'All' ? true : task.status === statusFilter
    );

    // Then sort by the selected criteria
    return [...filtered].sort((a, b) => {
      switch (sortCriteria) {
        case 'dueDate':
          // Handle null dates by putting them at the end
          if (!a.dueDate) return sortOrder === 'asc' ? 1 : -1;
          if (!b.dueDate) return sortOrder === 'asc' ? -1 : 1;
          return sortOrder === 'asc'
            ? new Date(a.dueDate) - new Date(b.dueDate)
            : new Date(b.dueDate) - new Date(a.dueDate);
        case 'priority':
          const priorityOrder = { High: 3, Medium: 2, Low: 1 };
          return sortOrder === 'asc'
            ? priorityOrder[a.priority] - priorityOrder[b.priority]
            : priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'title':
          return sortOrder === 'asc'
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        case 'status':
          return sortOrder === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        case 'createdAt':
          return sortOrder === 'asc'
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt);
        case 'updatedAt':
          return sortOrder === 'asc'
            ? new Date(a.updatedAt) - new Date(b.updatedAt)
            : new Date(b.updatedAt) - new Date(a.updatedAt);
        default:
          return 0;
      }
    });
  };

  // Render task as a grid item
  const renderGridItem = (task) => {
    return (
      <Link
        to={`/tasks/${task._id}`}
        key={task._id}
        className="block bg-card border border-dark-700 rounded-lg shadow p-4 hover:bg-dark-700 transition"
      >
        <h3 className="text-xl font-semibold text-[#F8FAFC] truncate">
          {task.title}
        </h3>
        <div className="flex gap-2 mt-2">
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${getStatusBgColorClass(
              task.status
            )}`}
          >
            {task.status}
          </span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${getPriorityBgColorClass(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
        </div>
        <div className="mt-2 text-sm text-[#C7C9D1]">
          <p>{task.project ? getProjectName(task.project) : 'No Project'}</p>
          <p className="mt-1">{formatDate(task.dueDate)}</p>
        </div>
      </Link>
    );
  };

  // Render task as a list item
  const renderListItem = (task) => {
    return (
      <Link
        to={`/tasks/${task._id}`}
        key={task._id}
        className="block bg-card border border-dark-700 rounded-lg p-4 mb-3 hover:bg-dark-700 transition-colors"
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-[#F8FAFC]">
              {task.title}
            </h3>
            <p className="text-sm text-[#C7C9D1] mt-1">
              Project: {task.project ? getProjectName(task.project) : 'None'}
            </p>
            <div className="flex gap-2 mt-2">
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${getStatusBgColorClass(
                  task.status
                )}`}
              >
                {task.status}
              </span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${getPriorityBgColorClass(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm text-[#C7C9D1] mb-1">
              {formatDate(task.dueDate)}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  // Render task as a table row
  const renderTableItem = (task) => {
    return (
      <tr
        key={task._id}
        className="hover:bg-dark-700 transition-colors cursor-pointer"
        onClick={() => (window.location.href = `/tasks/${task._id}`)}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F8FAFC]">
          {task.title}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span
            className={`inline-flex px-2 py-0.5 text-xs rounded-full ${getStatusBgColorClass(
              task.status
            )}`}
          >
            {task.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span
            className={`inline-flex px-2 py-0.5 text-xs rounded-full ${getPriorityBgColorClass(
              task.priority
            )}`}
          >
            {task.priority}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1]">
          {task.project ? getProjectName(task.project) : 'None'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1]">
          {formatDate(task.dueDate)}
        </td>
      </tr>
    );
  };

  // Only show loading state when initially loading task list
  const isInitialLoading = isLoading && tasks.length === 0;
  if (isInitialLoading)
    return (
      <div className="container mx-auto p-4 text-center">Loading tasks...</div>
    );
  if (isError)
    return (
      <div className="container mx-auto p-4 text-red-600">Error: {message}</div>
    );

  // Get filtered and sorted tasks
  const filteredAndSortedTasks = getFilteredAndSortedTasks();

  return (
    <div className="flex flex-col h-full">
      {/* Task Create Modal */}
      <TaskCreateModal isOpen={isCreateModalOpen} onClose={closeCreateModal} />

      {/* Header Row: Back Link, Title, View Toggle, Create Button */}
      <div className="flex justify-between items-center mb-3 px-4 md:px-0 pt-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">All Tasks</h1>
        </div>

        <div className="flex items-center gap-3">
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
            onClick={openCreateModal}
          >
            + New Task
          </Button>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      {tasks.length > 0 && (
        <div className="px-4 md:px-0 mb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 bg-card border border-dark-700 rounded-md">
            {/* Status Filter Dropdown */}
            <div className="relative inline-block text-left">
              <div>
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-dark-600 shadow-sm px-4 py-2 bg-dark-700 text-sm font-medium text-gray-200 hover:bg-dark-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-800 focus:ring-primary"
                  id="options-menu"
                  aria-haspopup="true"
                  aria-expanded={isStatusDropdownOpen}
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                >
                  <Filter size={16} className="mr-2 -ml-1" />
                  Status: {statusFilter}
                  <ChevronDown size={16} className="ml-2 -mr-1" />
                </button>
              </div>

              {isStatusDropdownOpen && (
                <div
                  className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-dark-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="options-menu"
                >
                  <div className="py-1" role="none">
                    {['All', 'Not Started', 'In Progress', 'Completed'].map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setStatusFilter(status);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`${
                            statusFilter === status
                              ? 'bg-primary text-white'
                              : 'text-gray-200 hover:bg-dark-600 hover:text-white'
                          } block w-full text-left px-4 py-2 text-sm`}
                          role="menuitem"
                        >
                          {status}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sorting Controls */}
            <span className="text-sm font-medium text-gray-300 mr-2 hidden md:inline">
              Sort by:
            </span>
            <button
              onClick={() => handleSortChange('dueDate')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                sortCriteria === 'dueDate'
                  ? 'bg-primary text-white'
                  : 'bg-dark-700 hover:bg-dark-600 text-gray-200'
              }`}
            >
              Due Date
              {sortCriteria === 'dueDate' &&
                (sortOrder === 'asc' ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                ))}
            </button>
            <button
              onClick={() => handleSortChange('priority')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                sortCriteria === 'priority'
                  ? 'bg-primary text-white'
                  : 'bg-dark-700 hover:bg-dark-600 text-gray-200'
              }`}
            >
              Priority
              {sortCriteria === 'priority' &&
                (sortOrder === 'asc' ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                ))}
            </button>
            <button
              onClick={() => handleSortChange('title')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                sortCriteria === 'title'
                  ? 'bg-primary text-white'
                  : 'bg-dark-700 hover:bg-dark-600 text-gray-200'
              }`}
            >
              Title
              {sortCriteria === 'title' &&
                (sortOrder === 'asc' ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                ))}
            </button>
            <button
              onClick={() => handleSortChange('status')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                sortCriteria === 'status'
                  ? 'bg-primary text-white'
                  : 'bg-dark-700 hover:bg-dark-600 text-gray-200'
              }`}
            >
              Status
              {sortCriteria === 'status' &&
                (sortOrder === 'asc' ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                ))}
            </button>
            <button
              onClick={() => handleSortChange('updatedAt')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                sortCriteria === 'updatedAt'
                  ? 'bg-primary text-white'
                  : 'bg-dark-700 hover:bg-dark-600 text-gray-200'
              }`}
            >
              Recently Updated
              {sortCriteria === 'updatedAt' &&
                (sortOrder === 'asc' ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                ))}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-grow overflow-y-auto p-4 md:px-0">
        {filteredAndSortedTasks && filteredAndSortedTasks.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedTasks.map((task) => renderGridItem(task))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col overflow-hidden">
              {filteredAndSortedTasks.map((task) => renderListItem(task))}
            </div>
          ) : (
            <div className="overflow-x-auto bg-dark-800 rounded-lg border border-dark-700">
              <table className="min-w-full divide-y divide-dark-700">
                <thead>
                  <tr className="bg-primary bg-opacity-20">
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Priority
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Project
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-dark-700">
                  {filteredAndSortedTasks.map((task) => renderTableItem(task))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="py-4 text-center text-gray-400">
            {tasks.length > 0
              ? `No ${statusFilter !== 'All' ? statusFilter : ''} tasks found.`
              : 'No tasks found.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default TasksPage;
