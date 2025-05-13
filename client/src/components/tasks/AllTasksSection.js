// components/tasks/AllTasksSection.js - Displays the main task list
//
// This component is responsible for rendering the main section containing
// all tasks for the project, including filter options like the TagFilter.
// It displays the filtered list of tasks in a table and handles their
// loading, empty, and error states.
// It receives task data, filter state, and necessary handlers as props.

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { PlusCircle, Tag, ChevronUp, ChevronDown } from 'lucide-react';
import { FaSpinner, FaTriangleExclamation } from 'react-icons/fa6'; // Changed from FaExclamationTriangle
import { updateTask } from '../../features/tasks/taskSlice';
import TagFilter from './TagFilter'; // Assuming TagFilter is in the same directory
import { formatDateForDisplay } from '../../utils/dateUtils'; // Assuming this utility exists
import { isTaskOverdue, isTaskDueToday } from '../../utils/taskUtils'; // Use utility functions for styling

/**
 * AllTasksSection Component
 * Displays the main list of tasks with filtering options.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.tasks - The full list of tasks (needed for TagFilter to get all tags).
 * @param {Array<Object>} props.filteredTasks - The list of tasks after applying filters.
 * @param {boolean} props.tasksLoading - Loading state for tasks.
 * @param {Object|string|null} props.tasksError - Error object or message for tasks. Changed from boolean & removed tasksMessage.
 * @param {Array<string>} props.selectedTags - Currently selected tags for filtering.
 * @param {Function} props.onTaskClick - Callback when a task row is clicked.
 * @param {Function} props.onAddTaskClick - Callback to trigger adding a new task.
 * @param {Function} props.onTagSelect - Callback when a tag is selected in the filter.
 * @param {Function} props.onTagDeselect - Callback when a tag is deselected in the filter.
 * @param {Function} props.onClearAllTags - Callback to clear all tag filters.
 * @param {Function} props.onRetryTasks - Callback to retry fetching tasks. Added.
 * @param {Object} props.backgroundRefreshState - Background refresh state information.
 */
const AllTasksSection = ({
  tasks, // Full list needed for TagFilter
  filteredTasks,
  tasksLoading,
  tasksError, // tasksMessage prop removed
  selectedTags,
  onTaskClick,
  onAddTaskClick,
  onTagSelect,
  onTagDeselect,
  onClearAllTags,
  onRetryTasks, // Added onRetryTasks
  backgroundRefreshState,
}) => {
  const dispatch = useDispatch();
  const [optimisticTasks, setOptimisticTasks] = useState(filteredTasks);

  // Update optimistic tasks when filteredTasks change
  useEffect(() => {
    setOptimisticTasks(filteredTasks);
  }, [filteredTasks]);

  /**
   * Handle task priority change with optimistic UI updates
   *
   * @param {string} taskId - ID of the task to change
   * @param {string} newPriority - New priority value
   */
  const handlePriorityChange = (taskId, newPriority) => {
    // First apply optimistic update to local state
    setOptimisticTasks((prevTasks) =>
      prevTasks.map((task) =>
        task._id === taskId ? { ...task, priority: newPriority } : task
      )
    );

    // Find the task in the state to get its project ID
    const taskToUpdate = tasks.find((t) => t._id === taskId); // Use `tasks` (full list) or `filteredTasks`
    if (!taskToUpdate) {
      console.error('Task not found for priority update:', taskId);
      // Optionally revert optimistic update if task isn't found in a consistent source
      // For now, we assume it should be in `tasks` if it was displayed
      setOptimisticTasks(filteredTasks); // Revert to original filtered list if unsure
      return;
    }

    // Get the project ID - handle both object reference and string ID
    const projectId =
      taskToUpdate.project && typeof taskToUpdate.project === 'object'
        ? taskToUpdate.project._id
        : taskToUpdate.project;

    if (!projectId) {
      console.error('Could not determine project ID for task', taskId);
      // Revert optimistic update
      setOptimisticTasks(filteredTasks);
      return;
    }

    // Dispatch optimistic update to Redux store first
    dispatch(
      updateTask({
        projectId,
        taskId,
        updates: { priority: newPriority },
        optimistic: true, // Indicate this is an optimistic update
      })
    );

    // Then dispatch the actual API update
    dispatch(
      updateTask({
        projectId,
        taskId,
        updates: { priority: newPriority },
      })
    )
      .unwrap()
      .catch((error) => {
        console.error('Failed to update task priority:', error);
        // Revert optimistic UI if API call fails
        // The reducer should handle reverting the optimistic update in Redux state.
        // For local optimisticTasks, we might need to revert here if not relying solely on Redux for the view.
        setOptimisticTasks(filteredTasks); // Revert local optimistic state
        // Optionally, show a toast notification for the error
      });
  };

  // Loading state
  if (tasksLoading) {
    return (
      <div className="bg-card rounded-lg p-4 shadow-md relative">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 sm:gap-0">
          <h2 className="text-xl font-semibold text-primary">All Tasks</h2>
          {/* Minimal header during load */}
        </div>
        <div className="text-center p-8" role="status" aria-live="polite">
          <FaSpinner className="animate-spin h-8 w-8 text-primary mx-auto" />
          <p className="mt-2 text-foreground text-sm">Loading all tasks...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (tasksError && !tasksLoading) {
    return (
      <div className="bg-card rounded-lg p-4 shadow-md relative">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 sm:gap-0">
          <h2 className="text-xl font-semibold text-primary">All Tasks</h2>
          {/* Minimal header during error */}
        </div>
        <div
          className="text-center p-8 text-red-400 bg-red-900 bg-opacity-20 rounded-lg"
          role="alert"
        >
          <FaTriangleExclamation className="inline mr-2 mb-1 h-5 w-5" />
          <p className="inline">
            Error loading tasks:{' '}
            {typeof tasksError === 'string'
              ? tasksError
              : tasksError.message || 'An unknown error occurred.'}
          </p>
          {onRetryTasks && (
            <button
              onClick={onRetryTasks}
              className="mt-3 ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Determine if tasks exist at all, regardless of filter
  const hasTasks = tasks && tasks.length > 0;
  // Determine if tasks exist AND match the current filter
  const hasFilteredTasks = optimisticTasks && optimisticTasks.length > 0; // Use optimisticTasks here

  return (
    <div className="bg-card rounded-lg p-4 shadow-md relative">
      {/* ... (header section remains the same) ... */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 sm:gap-0">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold text-primary">All Tasks</h2>

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

        {/* "Add Task" button that reveals the task creation modal */}
        <button
          onClick={onAddTaskClick} // Use the callback prop
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors self-start sm:self-auto shadow-sm"
          disabled={tasksLoading || !!tasksError} // Disable if loading or error
        >
          <PlusCircle size={16} />
          Add Task
        </button>
      </div>

      {/* Tag Filter Component - Only render if there are tasks and not loading/error */}
      {!tasksLoading && !tasksError && hasTasks && (
        <div className="mb-4">
          <TagFilter
            tasks={tasks} // Pass the full task list to extract all tags
            selectedTags={selectedTags}
            onTagSelect={onTagSelect}
            onTagDeselect={onTagDeselect}
            onClearAll={onClearAllTags}
            disabled={tasksLoading || !!tasksError} // Disable filter controls if loading or error
          />
        </div>
      )}

      {/* Regular Task List Table - Only render if not loading/error and has filtered tasks */}
      {!tasksLoading && !tasksError && hasFilteredTasks && (
        <div className="overflow-hidden bg-dark-800 rounded-lg border border-dark-700 shadow-sm">
          {/* ... (table structure remains the same, ensure optimisticTasks is used for mapping) ... */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-700">
              <thead>
                <tr className="bg-primary bg-opacity-10">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700 hidden md:table-cell">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-dark-700">
                {optimisticTasks.map((task) => {
                  const isOverdue = isTaskOverdue(task);
                  const isDueToday = isTaskDueToday(task);

                  return (
                    <tr
                      key={task._id}
                      className={`hover:bg-dark-700 transition-colors cursor-pointer ${
                        isOverdue
                          ? 'bg-red-900 bg-opacity-20'
                          : isDueToday
                          ? 'bg-yellow-900 bg-opacity-20'
                          : ''
                      }`}
                      onClick={(e) => {
                        // Prevent click if a button inside the row was clicked (e.g., priority change)
                        if (e.target.closest('button')) return;
                        e.preventDefault();
                        e.stopPropagation(); // Keep this to prevent internal row clicks from misbehaving
                        onTaskClick(e, task._id); // Pass the event 'e' as the first argument
                      }}
                    >
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isOverdue
                            ? 'text-red-400 font-medium'
                            : isDueToday
                            ? 'text-yellow-400 font-medium'
                            : 'text-[#C7C9D1]'
                        } text-left`}
                      >
                        {formatDateForDisplay(task.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#F8FAFC] text-left">
                        <div className="relative group">
                          <div className="w-[170px] overflow-hidden">
                            <span className="block truncate">{task.title}</span>
                          </div>
                          {task.title && (
                            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-64 bg-dark-700 text-white text-xs p-2 rounded shadow-lg whitespace-normal break-words">
                              {task.title}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#C7C9D1] max-w-xs hidden md:table-cell">
                        <div className="relative group max-w-xs">
                          <span className="block truncate">
                            {task.description}
                          </span>
                          {task.description && (
                            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-48 bg-dark-700 text-white text-xs p-2 rounded shadow-lg whitespace-normal break-words">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                        {task.assignedTo
                          ? task.assignedTo.name || 'Assigned'
                          : 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                        {task.status}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              task.priority === 'High'
                                ? 'text-red-400'
                                : task.priority === 'Medium'
                                ? 'text-yellow-400'
                                : 'text-blue-400'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <div className="flex flex-col">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (task.priority !== 'High') {
                                  const newPriority =
                                    task.priority === 'Low' ? 'Medium' : 'High';
                                  handlePriorityChange(task._id, newPriority);
                                }
                              }}
                              className={`text-gray-400 hover:text-white p-0.5 rounded-sm ${
                                task.priority === 'High'
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-dark-600'
                              }`}
                              disabled={task.priority === 'High'}
                              title={
                                task.priority === 'High'
                                  ? 'Already highest'
                                  : 'Increase priority'
                              }
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (task.priority !== 'Low') {
                                  const newPriority =
                                    task.priority === 'High' ? 'Medium' : 'Low';
                                  handlePriorityChange(task._id, newPriority);
                                }
                              }}
                              className={`text-gray-400 hover:text-white p-0.5 rounded-sm ${
                                task.priority === 'Low'
                                  ? 'opacity-30 cursor-not-allowed'
                                  : 'hover:bg-dark-600'
                              }`}
                              disabled={task.priority === 'Low'}
                              title={
                                task.priority === 'Low'
                                  ? 'Already lowest'
                                  : 'Decrease priority'
                              }
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                        {task.tags && task.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex items-center"
                              >
                                <Tag size={10} className="mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">No tags</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty states for tasks - Only render if not loading/error and no filtered tasks */}
      {!tasksLoading && !tasksError && !hasFilteredTasks && (
        <div className="text-center p-8 border border-dark-700 rounded-lg bg-dark-800">
          {hasTasks ? (
            <div className="text-gray-400 mb-2">
              No tasks match the current filters.
            </div>
          ) : (
            <div className="text-gray-400 mb-2">
              No tasks for this project yet.
            </div>
          )}
          {hasTasks &&
            !hasFilteredTasks &&
            selectedTags &&
            selectedTags.length > 0 && (
              <button
                onClick={onClearAllTags}
                className="text-primary hover:underline text-sm mr-4"
                disabled={tasksLoading || !!tasksError} // Disable if loading or error
              >
                Clear filters
              </button>
            )}
          <button
            onClick={onAddTaskClick}
            className="text-primary hover:underline text-sm"
            disabled={tasksLoading || !!tasksError} // Disable if loading or error
          >
            {hasTasks ? '+ Add a task' : '+ Add your first task'}
          </button>
        </div>
      )}

      {/* Loading and Error states are now handled at the top of the component */}
    </div>
  );
};

export default AllTasksSection;
