// components/tasks/AllTasksSection.js - Displays the main task list
//
// This component is responsible for rendering the main section containing
// all tasks for the project, including filter options like the TagFilter.
// It displays the filtered list of tasks in a table and handles their
// loading, empty, and error states.
// It receives task data, filter state, and necessary handlers as props.

import React from 'react';
import { PlusCircle, Tag } from 'lucide-react';
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
 * @param {boolean} props.tasksError - Error state for tasks.
 * @param {string|null} props.tasksMessage - Error message for tasks.
 * @param {Array<string>} props.selectedTags - Currently selected tags for filtering.
 * @param {Function} props.onTaskClick - Callback when a task row is clicked.
 * @param {Function} props.onAddTaskClick - Callback to trigger adding a new task.
 * @param {Function} props.onTagSelect - Callback when a tag is selected in the filter.
 * @param {Function} props.onTagDeselect - Callback when a tag is deselected in the filter.
 * @param {Function} props.onClearAllTags - Callback to clear all tag filters.
 */
const AllTasksSection = ({
  tasks, // Full list needed for TagFilter
  filteredTasks,
  tasksLoading,
  tasksError,
  tasksMessage,
  selectedTags,
  onTaskClick,
  onAddTaskClick,
  onTagSelect,
  onTagDeselect,
  onClearAllTags,
}) => {
  // Determine if tasks exist at all, regardless of filter
  const hasTasks = tasks && tasks.length > 0;
  // Determine if tasks exist AND match the current filter
  const hasFilteredTasks = filteredTasks && filteredTasks.length > 0;

  return (
    <div className="bg-card rounded-lg p-4 shadow-md">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4 sm:gap-0">
        <h2 className="text-xl font-semibold text-primary">All Tasks</h2>

        {/* "Add Task" button that reveals the task creation modal */}
        <button
          onClick={onAddTaskClick} // Use the callback prop
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition-colors self-start sm:self-auto shadow-sm"
        >
          <PlusCircle size={16} />
          Add Task
        </button>
      </div>

      {/* Tag Filter Component - Pass relevant task data and handlers */}
      {/* Only render TagFilter if there are any tasks to get tags from */}
      {!tasksLoading && !tasksError && hasTasks && (
        <div className="mb-4">
          <TagFilter
            tasks={tasks} // Pass the full task list to extract all tags
            selectedTags={selectedTags}
            onTagSelect={onTagSelect} // Use callback prop
            onTagDeselect={onTagDeselect} // Use callback prop
            onClearAll={onClearAllTags} // Use callback prop
          />
        </div>
      )}

      {/* Regular Task List Table */}
      {!tasksLoading && !tasksError && hasFilteredTasks && (
        <div className="overflow-hidden bg-dark-800 rounded-lg border border-dark-700 shadow-sm">
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
                {filteredTasks.map((task) => {
                  // Use utility functions for styling
                  const isOverdue = isTaskOverdue(task);
                  const isDueToday = isTaskDueToday(task); // Check if it's due *today* even if not strictly overdue yet

                  return (
                    <tr
                      key={task._id}
                      className={`hover:bg-dark-700 transition-colors cursor-pointer ${
                        isOverdue
                          ? 'bg-red-900 bg-opacity-20' // Red background for overdue
                          : isDueToday
                          ? 'bg-yellow-900 bg-opacity-20' // Yellow background for due today
                          : '' // No special background otherwise
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

      {/* Empty states for tasks */}
      {!tasksLoading && !tasksError && !hasFilteredTasks && (
        <div className="text-center p-8 border border-dark-700 rounded-lg bg-dark-800">
          {hasTasks ? (
            // Message if tasks exist but none match the filter
            <div className="text-gray-400 mb-2">
              No tasks match the current filters.
            </div>
          ) : (
            // Message if no tasks exist at all
            <div className="text-gray-400 mb-2">
              No tasks for this project yet
            </div>
          )}

          {/* Show clear filters button only if tasks exist but none match */}
          {hasTasks && !hasFilteredTasks && (
            <button
              onClick={onClearAllTags} // Use callback prop
              className="text-primary hover:underline text-sm mr-4" // Added mr-4
            >
              Clear filters
            </button>
          )}

          {/* Show Add task button */}
          <button
            onClick={onAddTaskClick} // Use callback prop
            className="text-primary hover:underline text-sm"
          >
            {hasTasks ? '+ Add a task' : '+ Add your first task'}
          </button>
        </div>
      )}

      {/* Loading state for tasks (could also show combined loading if tasksLoading is global) */}
      {tasksLoading && (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-foreground text-sm">Loading tasks...</p>
        </div>
      )}

      {/* Error state for tasks (could also show combined error if tasksError is global) */}
      {tasksError && (
        <div className="text-center p-8 text-red-500">
          <p>Error loading tasks: {tasksMessage}</p>
        </div>
      )}
    </div>
  );
};

export default AllTasksSection;
