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
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [showAddMemberDropdown, setShowAddMemberDropdown] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');

  // ... existing useEffect hooks for fetching users, project, and tasks ...
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await api.get('/users');
        if (res.data.success) {
          setUsers(res.data.data);
        } else {
          throw new Error(res.data.message || 'Failed to fetch users');
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setUsersError(err.message || 'Could not load users for selection.');
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

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

  // ... existing availableUsersToAdd calculation ...
  const availableUsersToAdd = users.filter(
    (user) => !project?.members?.some((member) => member._id === user._id)
  );

  // ... existing loading and error checks ...
  if (isLoading || tasksLoading || usersLoading)
    return (
      <div className="container mx-auto p-4">Loading project details...</div>
    );

  if (isError)
    return (
      <div className="container mx-auto p-4 text-red-600">Error: {message}</div>
    );

  if (usersError)
    return (
      <div className="container mx-auto p-4 text-red-600">
        Error loading users: {usersError}
      </div>
    );

  if (!project)
    return <div className="container mx-auto p-4">Project not found.</div>;

  // Calculate progress bar color
  const getProgressBarColor = (progress) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
        <Link
          to={`/projects/${project._id}/edit`}
          className="inline-flex items-center bg-accent-purple hover:bg-accent-blue text-white font-bold py-2 px-4 rounded transition-colors"
          title="Edit Project"
        >
          <Edit size={16} className="mr-2" />
          Edit Project
        </Link>
      </div>

      {/* Overview Card */}
      <div className="bg-card border border-dark-700 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-foreground mb-3">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {' '}
          {/* Changed to 4 columns on large screens */}
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
                        Add Member
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
                          <option value="">Select user...</option>
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
                        No more users to add.
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

        {/* Progress Bar (Remains below the grid) */}
        <div className="pt-2">{/* ... progress bar code ... */}</div>
      </div>

      {/* Description Section */}
      {project.description && (
        <div className="bg-card border border-dark-700 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Description
          </h2>
          <p className="text-foreground whitespace-pre-wrap">
            {project.description}
          </p>
        </div>
      )}

      {/* Tasks Section */}
      <div className="bg-app-card border border-dark-700 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Tasks</h2>
        {/* Task creation form */}
        <form
          className="mb-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskTitle.trim()) return; // Prevent empty tasks
            setNewTaskTitle(''); // Clear input immediately for better UX
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
        {!tasksLoading &&
          !tasksError &&
          (tasks.length > 0 ? (
            <TaskList tasks={tasks} />
          ) : (
            <p className="text-foreground opacity-70">No tasks added yet.</p>
          ))}
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
