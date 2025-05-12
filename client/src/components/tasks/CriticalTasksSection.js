// components/tasks/CriticalTasksSection.js - Displays critical tasks list
//
// This component is responsible for rendering the section dedicated to
// critical tasks (overdue or due today). It displays a table view of
// these tasks and handles their loading, empty, and error states.
// It receives the list of critical tasks and necessary UI handlers as props.

import React from 'react';
import { PlusCircle, Tag } from 'lucide-react';
import { formatDateForDisplay } from '../../utils/dateUtils'; // Assuming this utility exists
import { isTaskOverdue, isTaskDueToday } from '../../utils/taskUtils'; // Use the utility functions

/**
 * CriticalTasksSection Component
 * Displays a list of critical tasks (overdue or due today) in a table format.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.criticalTasks - List of critical tasks to display.
 * @param {boolean} props.tasksLoading - Loading state for tasks.
 * @param {boolean} props.tasksError - Error state for tasks.
 * @param {string|null} props.tasksMessage - Error message for tasks.
 * @param {Function} props.onTaskClick - Callback when a task row is clicked.
 * @param {Function} props.onAddTaskClick - Callback to trigger adding a new task.
 * @param {Object} props.backgroundRefreshState - Background refresh state information.
 */
const CriticalTasksSection = ({
  criticalTasks,
  tasksLoading,
  tasksError,
  tasksMessage,
  onTaskClick,
  onAddTaskClick,
  backgroundRefreshState,
}) => {
  // Calculate count for display message
  const criticalTaskCount = criticalTasks ? criticalTasks.length : 0;
  return (
    <div className="bg-card rounded-lg p-4 shadow-md relative">
      {/* Section Header and Add Task Button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div>
            <h2 className="text-xl font-semibold text-primary">
              Critical Tasks
            </h2>
            <p className="text-sm text-muted-foreground">
              Tasks that are overdue or due today ({criticalTaskCount})
            </p>
          </div>

          {/* Background refresh indicator */}
          {backgroundRefreshState?.backgroundRefreshing && (
            <div className="ml-2 flex items-center text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse mr-1"></div>
              <span className="hidden sm:inline">Refreshing...</span>
            </div>
          )}
        </div>
        <button
          onClick={onAddTaskClick} // Use the callback prop
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded flex items-center gap-2 transition-colors shadow-sm"
        >
          <PlusCircle size={18} />
          Add Task
        </button>
      </div>

      {/* Critical Task List Table */}
      {!tasksLoading && !tasksError && criticalTasks.length > 0 && (
        <div className="overflow-hidden bg-dark-800 rounded-lg border border-dark-700 shadow-sm">
          <div className="overflow-y-auto" style={{ maxHeight: '18rem' }}>
            {/* Adjusted max height slightly */}
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="sticky top-0 bg-dark-800 bg-opacity-95 z-20 shadow-md backdrop-filter backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700 hidden md:table-cell">
                    {/* Hide desc on small screens */}
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
                {criticalTasks.map((task) => {
                  // Use the utility functions for date checks
                  const isOverdue = isTaskOverdue(task);
                  const isDueToday = isTaskDueToday(task);

                  return (
                    <tr
                      key={task._id}
                      className={`hover:bg-dark-700 transition-colors cursor-pointer ${
                        isOverdue
                          ? 'bg-red-900 bg-opacity-20'
                          : isDueToday
                          ? 'bg-yellow-900 bg-opacity-20' // Highlight tasks due today
                          : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTaskClick(task._id); // Use the callback prop
                      }}
                    >
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isOverdue
                            ? 'text-red-400 font-medium' // Red text for overdue
                            : isDueToday
                            ? 'text-yellow-400 font-medium' // Yellow text for due today
                            : 'text-[#C7C9D1]' // Default text color otherwise
                        } text-left`}
                      >
                        {formatDateForDisplay(task.dueDate)}{' '}
                        {/* Display formatted date */}
                        {isDueToday && (
                          <span className="ml-2 text-xs text-yellow-400 font-medium">
                            (today)
                          </span>
                        )}
                        {isOverdue && (
                          <span className="ml-2 text-xs text-red-400 font-medium">
                            (overdue)
                          </span>
                        )}
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
                        {/* Hide desc on small screens */}
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
                        {/* Display assigned member name or 'Unassigned' */}
                        {task.assignedTo
                          ? task.assignedTo.name || 'Assigned'
                          : 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                        {task.status}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                        {task.priority}
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

      {/* Empty state for when there are no critical tasks */}
      {!tasksLoading && !tasksError && criticalTasks.length === 0 && (
        <div className="text-center p-8 border border-dark-700 rounded-lg bg-dark-800">
          <div className="text-gray-400 mb-2">
            No critical tasks - you're all caught up!
          </div>
          <button
            onClick={onAddTaskClick} // Use the callback prop
            className="text-primary hover:underline text-sm"
          >
            + Add a task
          </button>
        </div>
      )}

      {/* Loading state for tasks */}
      {tasksLoading && (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-foreground text-sm">Loading tasks...</p>
        </div>
      )}

      {/* Error state for tasks */}
      {tasksError && (
        <div className="text-center p-8 text-red-500">
          <p>Error loading tasks: {tasksMessage}</p>
        </div>
      )}
    </div>
  );
};

export default CriticalTasksSection;
