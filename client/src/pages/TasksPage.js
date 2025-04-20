import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronDown,
  Loader,
} from 'lucide-react';
import Button from '../components/common/Button';
import {
  getTasks,
  getTask,
  resetTaskStatus,
  updateTask,
} from '../features/tasks/taskSlice';
import TaskList from '../components/tasks/TaskList';
import { getProjects } from '../features/projects/projectSlice';

const TasksPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { tasks, currentTask, isLoading, isError, message } = useSelector(
    (state) => state.tasks
  );
  const { projects } = useSelector((state) => state.projects);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('In Progress'); // Default to 'In Progress'
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false); // State for dropdown visibility
  const [isTaskDetailLoading, setIsTaskDetailLoading] = useState(false); // Separate loading state for task details

  // Add sorting state
  const [sortCriteria, setSortCriteria] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form state for editing the active task
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    project: '',
  });

  useEffect(() => {
    dispatch(getTasks());
    dispatch(getProjects());
    return () => {
      dispatch(resetTaskStatus());
    };
  }, [dispatch]);

  useEffect(() => {
    if (activeTaskId) {
      setIsTaskDetailLoading(true); // Set task detail loading to true
      dispatch(getTask(activeTaskId))
        .unwrap()
        .finally(() => {
          setIsTaskDetailLoading(false); // Set it back to false when done
        });
    }
  }, [dispatch, activeTaskId]);

  useEffect(() => {
    if (currentTask && activeTaskId === currentTask._id) {
      setForm({
        title: currentTask.title || '',
        description: currentTask.description || '',
        status: currentTask.status || 'Not Started',
        priority: currentTask.priority || 'Low',
        dueDate: currentTask.dueDate
          ? new Date(currentTask.dueDate).toISOString().substr(0, 10)
          : '',
        project: currentTask.project?._id || '',
      });
    }
  }, [currentTask, activeTaskId]);

  const handleTaskClick = (taskId) => {
    setActiveTaskId(taskId);
  };

  const closeTaskDetails = () => {
    setActiveTaskId(null);
  };

  // Form handling
  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsTaskDetailLoading(true);
    try {
      await dispatch(
        updateTask({
          taskId: activeTaskId,
          updates: form,
        })
      ).unwrap();

      // Instead of refreshing the entire task list, just get the updated task
      dispatch(getTask(activeTaskId));

      // Show a success message or toast notification here if you have one
    } catch (error) {
      console.error('Failed to update task:', error);
      // Show error notification if needed
    } finally {
      setIsTaskDetailLoading(false);
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

  // Only show loading state when initially loading task list, not when loading a single task
  const isInitialLoading = isLoading && tasks.length === 0;
  if (isInitialLoading)
    return <div className="container mx-auto p-4">Loading tasks...</div>;
  if (isError)
    return (
      <div className="container mx-auto p-4 text-red-600">Error: {message}</div>
    );

  // Get filtered and sorted tasks
  const filteredAndSortedTasks = getFilteredAndSortedTasks();

  return (
    <div className="flex flex-col h-full">
      {/* Header Row */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
        </div>
        <Button
          variant="primary"
          className="py-2 px-6 text-base font-bold shadow"
          onClick={() => navigate('/tasks/new')}
        >
          + New Task
        </Button>
      </div>

      {/* Combined Filter and Sort Controls */}
      {tasks.length > 0 && (
        <div className="px-4 mb-4">
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

      {/* Split View Container */}
      <div className="flex flex-1 overflow-hidden px-4 pb-4">
        {/* Task List - 1/3 width */}
        <div className="w-1/3 overflow-hidden border-r border-dark-700">
          <div className="h-full overflow-y-auto px-4 -mr-4 pr-8">
            {filteredAndSortedTasks && filteredAndSortedTasks.length > 0 ? (
              <TaskList
                tasks={filteredAndSortedTasks}
                onTaskClick={handleTaskClick}
                activeTaskId={activeTaskId}
                simplified={true}
              />
            ) : (
              <p className="py-4 text-center text-gray-400">
                {tasks.length > 0
                  ? `No ${
                      statusFilter !== 'All' ? statusFilter : ''
                    } tasks found.`
                  : 'No tasks found.'}
              </p>
            )}
          </div>
        </div>

        {/* Task Details - 2/3 width */}
        <div className="w-2/3 pl-4 overflow-y-auto">
          {isTaskDetailLoading ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <Loader size={32} className="animate-spin" />
            </div>
          ) : activeTaskId && currentTask ? (
            <div className="bg-card rounded-lg border border-dark-700 p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{currentTask.title}</h2>
                <button
                  onClick={closeTaskDetails}
                  className="p-1 rounded-full hover:bg-dark-700"
                  aria-label="Close task details"
                >
                  <X size={24} />
                </button>
              </div>

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
                  <label className="block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
                    rows={5}
                  />
                </div>

                {/* Project Selection */}
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
                    <label className="block text-sm font-medium">
                      Priority
                    </label>
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
                    <label className="block text-sm font-medium">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={form.dueDate}
                      onChange={onChange}
                      className="w-full p-2 border rounded bg-dark-700 text-foreground border-dark-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Select a task to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
