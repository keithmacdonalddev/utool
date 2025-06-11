import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  CheckSquare,
  X,
  Trash2,
  Archive,
  Edit3,
  Copy,
  Move,
  Tag,
  User,
  Calendar,
  Flag,
  MoreHorizontal,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * @component BulkTaskActions
 * @description Molecular component for bulk operations on selected tasks.
 * Provides batch actions like status changes, assignments, deletions, and more.
 * Uses Tailwind CSS and follows the project's design system.
 *
 * @param {Array} selectedTasks - Array of selected task IDs
 * @param {Array} allTasks - Array of all available tasks for context
 * @param {function} onBulkAction - Callback for bulk operations
 * @param {function} onClearSelection - Callback to clear selection
 * @param {Array} teamMembers - Available team members for assignment
 * @param {Array} availableStatuses - Available status options
 * @param {Array} availablePriorities - Available priority options
 * @param {Array} projects - Available projects for moving tasks
 * @param {boolean} isLoading - Whether a bulk operation is in progress
 * @param {string} className - Additional CSS classes
 */
const BulkTaskActions = ({
  selectedTasks = [],
  allTasks = [],
  onBulkAction,
  onClearSelection,
  teamMembers = [],
  availableStatuses = [],
  availablePriorities = [],
  projects = [],
  isLoading = false,
  className = '',
  ...props
}) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const dropdownRef = useRef(null);

  // Default options if not provided
  const defaultStatuses = [
    {
      value: 'todo',
      label: 'To Do',
      color: 'text-gray-600',
      bg: 'bg-gray-100',
    },
    {
      value: 'in-progress',
      label: 'In Progress',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      value: 'review',
      label: 'Review',
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      value: 'done',
      label: 'Done',
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      value: 'blocked',
      label: 'Blocked',
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ];

  const defaultPriorities = [
    { value: 'low', label: 'Low', color: 'text-green-600', bg: 'bg-green-100' },
    {
      value: 'medium',
      label: 'Medium',
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      value: 'high',
      label: 'High',
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      value: 'critical',
      label: 'Critical',
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ];

  const statuses =
    availableStatuses.length > 0 ? availableStatuses : defaultStatuses;
  const priorities =
    availablePriorities.length > 0 ? availablePriorities : defaultPriorities;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle bulk action execution
   */
  const handleBulkAction = async (action, data = {}) => {
    if (onBulkAction) {
      try {
        await onBulkAction({
          action,
          taskIds: selectedTasks,
          data,
        });
        setActiveDropdown(null);
        setConfirmAction(null);
      } catch (error) {
        console.error('Bulk action failed:', error);
      }
    }
  };

  /**
   * Handle actions that require confirmation
   */
  const handleConfirmationAction = (action, data = {}) => {
    setConfirmAction({ action, data });
  };

  /**
   * Execute confirmed action
   */
  const executeConfirmedAction = () => {
    if (confirmAction) {
      handleBulkAction(confirmAction.action, confirmAction.data);
    }
  };

  /**
   * Toggle dropdown visibility
   */
  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  if (selectedTasks.length === 0) {
    return null;
  }

  const selectedCount = selectedTasks.length;
  const selectedTasksData = allTasks.filter((task) =>
    selectedTasks.includes(task.id || task._id)
  );

  return (
    <div className={cn('relative', className)} ref={dropdownRef} {...props}>
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-medium text-gray-900">
                Confirm Action
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to {confirmAction.action.replace('_', ' ')}{' '}
              {selectedCount} selected task{selectedCount !== 1 ? 's' : ''}?
              {confirmAction.action === 'delete' &&
                ' This action cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                  confirmAction.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                )}
              >
                {confirmAction.action === 'delete' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bulk Actions Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            {/* Mark as Done */}
            <button
              onClick={() =>
                handleBulkAction('update_status', { status: 'done' })
              }
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              title="Mark as done"
            >
              <CheckSquare className="h-3 w-3" />
              Done
            </button>

            {/* Archive */}
            <button
              onClick={() => handleBulkAction('archive')}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              title="Archive tasks"
            >
              <Archive className="h-3 w-3" />
              Archive
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('status')}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Edit3 className="h-3 w-3" />
              Status
              <ChevronDown className="h-3 w-3" />
            </button>

            {activeDropdown === 'status' && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  {statuses.map((status) => (
                    <button
                      key={status.value}
                      onClick={() =>
                        handleBulkAction('update_status', {
                          status: status.value,
                        })
                      }
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      <span className={cn('w-2 h-2 rounded-full', status.bg)} />
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('priority')}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Flag className="h-3 w-3" />
              Priority
              <ChevronDown className="h-3 w-3" />
            </button>

            {activeDropdown === 'priority' && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  {priorities.map((priority) => (
                    <button
                      key={priority.value}
                      onClick={() =>
                        handleBulkAction('update_priority', {
                          priority: priority.value,
                        })
                      }
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      <span
                        className={cn('w-2 h-2 rounded-full', priority.bg)}
                      />
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assignee Dropdown */}
          {teamMembers.length > 0 && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown('assignee')}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <User className="h-3 w-3" />
                Assign
                <ChevronDown className="h-3 w-3" />
              </button>

              {activeDropdown === 'assignee' && (
                <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <div className="py-1 max-h-48 overflow-y-auto">
                    <button
                      onClick={() =>
                        handleBulkAction('update_assignee', { assignee: null })
                      }
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      <X className="h-3 w-3 text-gray-400" />
                      Unassign
                    </button>
                    {teamMembers.map((member) => (
                      <button
                        key={member.id || member._id}
                        onClick={() =>
                          handleBulkAction('update_assignee', {
                            assignee: member.id || member._id,
                          })
                        }
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                      >
                        {member.avatar && (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span>{member.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('more')}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <MoreHorizontal className="h-3 w-3" />
              More
              <ChevronDown className="h-3 w-3" />
            </button>

            {activeDropdown === 'more' && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleBulkAction('duplicate')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </button>

                  {projects.length > 0 && (
                    <button
                      onClick={() => toggleDropdown('move')}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      <Move className="h-3 w-3" />
                      Move to...
                    </button>
                  )}

                  <button
                    onClick={() => handleBulkAction('add_tags')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <Tag className="h-3 w-3" />
                    Add Tags
                  </button>

                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={() => handleConfirmationAction('delete')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close Selection */}
          <button
            onClick={onClearSelection}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded disabled:opacity-50"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Loading Indicator */}
          {isLoading && (
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          )}
        </div>
      </div>

      {/* Move to Project Submenu */}
      {activeDropdown === 'move' && projects.length > 0 && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
          <div className="py-1 max-h-48 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id || project._id}
                onClick={() =>
                  handleBulkAction('move_to_project', {
                    projectId: project.id || project._id,
                  })
                }
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

BulkTaskActions.propTypes = {
  selectedTasks: PropTypes.array.isRequired,
  allTasks: PropTypes.array,
  onBulkAction: PropTypes.func.isRequired,
  onClearSelection: PropTypes.func.isRequired,
  teamMembers: PropTypes.array,
  availableStatuses: PropTypes.array,
  availablePriorities: PropTypes.array,
  projects: PropTypes.array,
  isLoading: PropTypes.bool,
  className: PropTypes.string,
};

export default BulkTaskActions;
