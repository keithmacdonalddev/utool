import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  getProject,
  updateProject,
  resetProjectStatus,
} from '../features/projects/projectSlice';
import {
  getTasksForProject,
  resetTaskStatus,
  createTask,
} from '../features/tasks/taskSlice';
import TaskList from '../components/tasks/TaskList';
import api from '../utils/api';
import { PlusCircle, X, Edit } from 'lucide-react'; // Import Edit icon
import { useNotification } from '../context/NotificationContext';
import useFriends from '../hooks/useFriends'; // Import our custom hook

// ... existing helper functions (getStatusPillClasses, getPriorityPillClasses, formatDate) ...

const ProjectDetailsPage = () => {
  // ... existing state and hooks setup ...
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const {
    currentProject: project,
    isLoading,
    isError,
    message,
  } = useSelector((state) => state.projects);
  const {
    tasks,
    isLoading: tasksLoading,
    isError: tasksError,
    message: tasksMessage,
  } = useSelector((state) => state.tasks);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddMemberDropdown, setShowAddMemberDropdown] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

  // Use our custom hook to get friends list instead of all users
  const {
    friends,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriends();

  useEffect(() => {
    if (id) {
      dispatch(getProject(id));
      dispatch(getTasksForProject(id));
    }
    return () => {
      dispatch(resetProjectStatus());
      dispatch(resetTaskStatus());
    };
  }, [dispatch, id]);

  // ... existing helper functions (getStatusPillClasses, getPriorityPillClasses, formatDate) ...
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // ... existing handleAddMember function ...
  const handleAddMember = async () => {
    if (!selectedUserToAdd || !project) return;

    const currentMemberIds = project.members?.map((m) => m._id) || [];
    if (currentMemberIds.includes(selectedUserToAdd)) {
      showNotification('User is already a member.', 'warning');
      return;
    }

    const updatedMembers = [...currentMemberIds, selectedUserToAdd];

    try {
      await dispatch(
        updateProject({
          projectId: id,
          projectData: { members: updatedMembers },
        })
      ).unwrap();
      showNotification('Member added successfully!', 'success');
      setSelectedUserToAdd(''); // Reset selection
      setShowAddMemberDropdown(false); // Close dropdown
      dispatch(getProject(id)); // Re-fetch project data to update UI
    } catch (error) {
      console.error('Failed to add member:', error);
      showNotification(
        `Failed to add member: ${error.message || 'Server error'}`,
        'error'
      );
    }
  };

  // Get friends who aren't already project members
  const availableUsersToAdd = friends.filter(
    (friend) => !project?.members?.some((member) => member._id === friend._id)
  );

  // ... existing loading and error checks ...
  if (isLoading || tasksLoading || friendsLoading)
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading project details...</p>
        </div>
      </div>
    );

  if (isError) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg">Error: {message}</div>
          <Link to="/projects" className="mt-4 text-primary hover:underline">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-foreground text-lg">
            Project not found or you don't have permission to view it.
          </div>
          <Link to="/projects" className="mt-4 text-primary hover:underline">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-background text-foreground space-y-6">
      {/* Project Header Section with more comprehensive details */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-primary">
            {project.name}
          </h1>
          <div className="text-muted-foreground text-sm mb-2">
            Created{' '}
            {new Date(project.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
        </div>
        <Link
          to={`/projects/${id}/edit`}
          className="flex items-center justify-center bg-dark-700 hover:bg-dark-600 text-primary px-4 py-2 rounded-md transition-colors"
        >
          <Edit size={18} className="mr-2" /> Edit Project
        </Link>
      </div>

      {/* Project description if it exists */}
      {project.description && (
        <div className="bg-card rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-2 text-primary">
            Description
          </h2>
          <p className="text-foreground whitespace-pre-wrap">
            {project.description}
          </p>
        </div>
      )}

      {/* Key project metadata in a well-organized grid */}
      <div className="bg-card rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold mb-4 text-primary">
          Project Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
              {project.priority || 'Medium'}
            </span>
          </div>
          {/* Due Date */}
          <div>
            <span className="text-sm text-foreground opacity-80 block mb-1">
              Due Date
            </span>
            <span className="text-foreground font-medium">
              {formatDate(project.endDate)}
            </span>
          </div>
          {/* Members (Moved Here) */}
          <div>
            <span className="text-sm text-foreground opacity-80 block mb-1">
              Members
            </span>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Add Member Button & Dropdown */}
              <div className="relative">
                <button
                  onClick={() =>
                    setShowAddMemberDropdown(!showAddMemberDropdown)
                  }
                  className="h-8 w-8 flex items-center justify-center bg-dark-600 text-accent-purple hover:bg-dark-500 hover:text-accent-blue rounded-full transition-colors border-2 border-dark-600 hover:border-primary"
                  title="Add Member"
                >
                  <PlusCircle size={18} />
                </button>
                {showAddMemberDropdown && (
                  <div className="absolute left-0 mt-2 w-64 bg-card border border-dark-700 rounded-md shadow-lg z-10 p-2">
                    {/* ... dropdown content ... */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-foreground">
                        Add Friend as Member
                      </span>
                      <button
                        onClick={() => setShowAddMemberDropdown(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {availableUsersToAdd.length > 0 ? (
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
                          onClick={handleAddMember}
                          disabled={!selectedUserToAdd}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1.5 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">
                        No more friends to add.
                      </p>
                    )}
                  </div>
                )}
              </div>
              {/* Existing Member Avatars */}
              {project.members && project.members.length > 0 ? (
                project.members.map((member) => (
                  <div key={member._id} className="relative group">
                    <img
                      src={
                        member.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          member.name || member.email || '?'
                        )}&background=random&color=fff&size=32`
                      }
                      alt={member.name}
                      className="h-8 w-8 rounded-full object-cover border-2 border-dark-600 group-hover:border-primary transition-colors"
                      title={member.name}
                    />
                  </div>
                ))
              ) : (
                <span className="text-foreground opacity-70 text-sm ml-2">
                  No members assigned.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar with better styling */}
      <div className="bg-card rounded-lg p-4 shadow">
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

      {/* Tasks section with improved styling */}
      <div className="bg-card rounded-lg p-4 shadow">
        <h2 className="text-xl font-semibold mb-4 text-primary">Tasks</h2>

        {/* New task form */}
        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskTitle.trim()) return;

            setNewTaskTitle(''); // Clear input first for better UX
            dispatch(createTask({ title: newTaskTitle, project: id })) // Use 'project' instead of 'projectId'
              .unwrap()
              .catch((error) => {
                console.error('Failed to create task:', error);
                // Re-populate the input if task creation fails
                setNewTaskTitle(newTaskTitle.trim());
              });
          }}
        >
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New task title..."
            className="flex-grow p-2 border rounded bg-dark-700 text-foreground border-dark-600"
          />
          <button
            type="submit"
            className="bg-primary text-white px-4 py-2 rounded"
            disabled={!newTaskTitle.trim()}
          >
            Add Task
          </button>
        </form>

        {/* Task list */}
        {tasksLoading && (
          <p className="text-foreground opacity-70">Loading tasks...</p>
        )}
        {tasksError && (
          <p className="text-red-500">Error loading tasks: {tasksMessage}</p>
        )}
        {!tasksLoading && !tasksError && (
          <TaskList projectId={id} tasks={tasks} />
        )}
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
