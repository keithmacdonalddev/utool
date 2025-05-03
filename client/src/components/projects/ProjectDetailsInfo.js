// components/projects/ProjectDetailsInfo.js - Displays project details and members list
//
// This component is a presentational component responsible for rendering the
// project's core information, including status, priority, dates, and members.
// It also contains the UI and state logic for adding new members.
// It receives project data, friends data, and necessary handlers as props.

import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { formatDateForDisplay } from '../../utils/dateUtils'; // Assuming this utility exists and is correct

/**
 * Helper function to determine Tailwind classes for status pills.
 * Could be moved to a shared utilities file if used elsewhere.
 * @param {string} status - The project status string.
 * @returns {string} - Tailwind CSS classes.
 */
const getStatusPillClasses = (status) => {
  switch (status) {
    case 'Planning':
      return 'bg-blue-500 text-blue-100';
    case 'Active':
      return 'bg-green-500 text-green-100';
    case 'On Hold':
      return 'bg-yellow-500 text-yellow-100';
    case 'Completed':
      return 'bg-purple-500 text-purple-100';
    case 'Archived':
      return 'bg-gray-600 text-gray-100';
    default:
      return 'bg-gray-500 text-gray-100';
  }
};

/**
 * Helper function to determine Tailwind classes for priority pills.
 * Could be moved to a shared utilities file if used elsewhere.
 * @param {string} priority - The project priority string.
 * @returns {string} - Tailwind CSS classes.
 */
const getPriorityPillClasses = (priority) => {
  switch (priority) {
    case 'Low':
      return 'bg-gray-500 text-gray-100';
    case 'Medium':
      return 'bg-yellow-500 text-yellow-100';
    case 'High':
      return 'bg-red-500 text-red-100';
    default:
      return 'bg-gray-500 text-gray-100';
  }
};

/**
 * ProjectDetailsInfo Component
 * Displays project details and manages the "Add Member" functionality UI.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.project - The project data object.
 * @param {Array<Object>} props.friends - List of available friends.
 * @param {boolean} props.friendsLoading - Loading state for friends.
 * @param {boolean} props.friendsError - Error state for friends.
 * @param {Function} props.onAddMember - Callback function to add a member.
 */
const ProjectDetailsInfo = ({
  project,
  friends,
  friendsLoading,
  friendsError,
  onAddMember,
}) => {
  // State for the "Add Member" dropdown visibility
  const [showAddMemberDropdown, setShowAddMemberDropdown] = useState(false);
  // State for the selected user from the dropdown
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

  // Filter friends to find users who are not already members of the project
  const availableUsersToAdd = friends.filter(
    (friend) => !project?.members?.some((member) => member._id === friend._id)
  );

  /**
   * Handles the click event for the "Add Member" button within the dropdown.
   * Calls the parent's onAddMember callback with the selected user ID.
   */
  const handleAddMemberClick = () => {
    if (selectedUserToAdd) {
      onAddMember(selectedUserToAdd);
      // Reset dropdown state after adding (assuming parent callback handles success/error)
      setSelectedUserToAdd('');
      setShowAddMemberDropdown(false);
    }
  };

  // Ensure project object exists before rendering details
  if (!project) {
    return null; // Or some placeholder/error state if project prop is expected but missing
  }

  return (
    <div className="bg-card rounded-lg p-4 shadow space-y-4">
      <h2 className="text-lg font-semibold mb-4 text-primary">
        Project Details
      </h2>

      {/* Creator info */}
      <div className="text-muted-foreground text-sm mb-4">
        <span className="text-sm text-foreground opacity-80 block mb-1">
          Created by
        </span>
        <span className="font-medium">
          {project.owner?.name || 'Unknown user'}
        </span>{' '}
        on {project.createdAt ? formatDateForDisplay(project.createdAt) : 'N/A'}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Status */}
        <div>
          <span className="text-sm text-foreground opacity-80 block mb-1">
            Status
          </span>
          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusPillClasses(
              project.status
            )}`}
          >
            {project.status}
          </span>
        </div>
        {/* Priority */}
        <div>
          <span className="text-sm text-foreground opacity-80 block mb-1">
            Priority
          </span>
          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getPriorityPillClasses(
              project.priority
            )}`}
          >
            {project.priority || 'Medium'} {/* Fallback value */}
          </span>
        </div>
        {/* Due Date */}
        <div>
          <span className="text-sm text-foreground opacity-80 block mb-1">
            Due Date
          </span>
          <span className="text-foreground font-medium">
            {formatDateForDisplay(project.endDate)}
          </span>
        </div>
        {/* Members */}
        <div>
          <span className="text-sm text-foreground opacity-80 block mb-1">
            Members
          </span>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Add Member Dropdown Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowAddMemberDropdown(!showAddMemberDropdown)}
                className="h-8 w-8 flex items-center justify-center bg-dark-600 text-accent-purple hover:bg-dark-500 hover:text-accent-blue rounded-full transition-colors border-2 border-dark-600 hover:border-primary"
                title="Add Member"
                aria-expanded={showAddMemberDropdown}
                aria-haspopup="true"
              >
                <PlusCircle size={18} />
              </button>
              {/* Add Member Dropdown Content */}
              {showAddMemberDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-card border border-dark-700 rounded-md shadow-lg z-10 p-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Add Friend as Member
                    </span>
                    <button
                      onClick={() => setShowAddMemberDropdown(false)}
                      className="text-gray-400 hover:text-white"
                      aria-label="Close add member dropdown"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {/* Conditional Content: Loading, Error, List of Friends, No Friends */}
                  {friendsLoading ? (
                    <p className="text-xs text-gray-400 text-center">
                      Loading friends...
                    </p>
                  ) : friendsError ? (
                    <p className="text-xs text-red-400 text-center">
                      Error loading friends.
                    </p>
                  ) : availableUsersToAdd.length > 0 ? (
                    <>
                      <select
                        value={selectedUserToAdd}
                        onChange={(e) => setSelectedUserToAdd(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-md border bg-dark-700 text-foreground border-dark-600 focus:outline-none focus:ring-1 focus:ring-primary mb-2 text-sm"
                      >
                        <option value="">Select friend...</option>
                        {availableUsersToAdd.map((user) => (
                          <option key={user._id} value={user._id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddMemberClick}
                        disabled={!selectedUserToAdd}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1.5 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 text-center">
                      No more friends to add.
                    </p>
                  )}
                </div>
              )}
            </div>
            {/* Member Avatars List */}
            {project.members && project.members.length > 0 ? (
              <div className="flex items-center">
                {project.members.slice(0, 5).map((member, i) => (
                  <img
                    key={member._id}
                    src={
                      member.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        member.name || member.email || '?'
                      )}&background=random&color=fff&size=32`
                    }
                    alt={member.name || member.email || 'Member'}
                    className={`h-8 w-8 rounded-full object-cover border-2 border-dark-600 ${
                      i === 0 ? '' : '-ml-2'
                    } hover:border-primary transition-colors`}
                    title={member.name || member.email}
                  />
                ))}
                {project.members.length > 5 && (
                  <div
                    className="-ml-2 h-8 w-8 bg-dark-600 rounded-full border-2 border-dark-600 flex items-center justify-center text-xs text-gray-200"
                    title={project.members
                      .slice(5)
                      .map((m) => m.name || m.email)
                      .join(', ')}
                  >
                    +{project.members.length - 5}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-foreground opacity-70 text-sm ml-2">
                No members assigned.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section - Could also be a separate small component if complex */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-primary">
            Progress: {project.progress || 0}%
          </h2>
          {project.progress === 100 && (
            <span className="text-green-500 text-sm font-medium">
              Complete!
            </span>
          )}
        </div>
        <div className="w-full bg-dark-700 rounded-full h-4 overflow-hidden">
          <div
            className="bg-primary h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${project.progress || 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsInfo;
