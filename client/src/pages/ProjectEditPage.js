import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProject,
  updateProject,
  deleteProject,
  resetProjectStatus,
} from '../features/projects/projectSlice';
import FormInput from '../components/common/FormInput';
import FormTextarea from '../components/common/FormTextarea';
import FormSelect from '../components/common/FormSelect';
import api from '../utils/api'; // Import the api utility
import useFriends from '../hooks/useFriends'; // Import our custom hook

const ProjectEditPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentProject, isLoading, isError, isSuccess, message } =
    useSelector((state) => state.projects);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    priority: 'Medium', // Add priority with default
    startDate: '', // Add startDate
    endDate: '', // Add endDate
    members: [], // Add members array
  });

  // Use our custom hook to get friends list instead of all users
  const {
    friends,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriends();

  // We'll still need original members who may not be friends
  const [nonFriendMembers, setNonFriendMembers] = useState([]);

  // Fetch non-friend project members if needed
  useEffect(() => {
    const fetchNonFriendMembers = async () => {
      if (!currentProject || !currentProject.members || !friends) return;

      // Find members who aren't in the friends list and fetch their details
      const memberIds = currentProject.members
        .filter((member) => {
          // Keep members who aren't in the friends array
          return !friends.some(
            (friend) =>
              friend._id === (typeof member === 'object' ? member._id : member)
          );
        })
        .map((member) => (typeof member === 'object' ? member._id : member));

      if (memberIds.length === 0) {
        setNonFriendMembers([]);
        return;
      }

      try {
        // Only fetch non-friend members that are necessary
        const res = await api.post('/users/batch', { userIds: memberIds });
        if (res.data.success) {
          setNonFriendMembers(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch non-friend members:', err);
      }
    };

    fetchNonFriendMembers();
  }, [currentProject, friends]);

  // Fetch project data
  useEffect(() => {
    dispatch(getProject(id));
    return () => {
      dispatch(resetProjectStatus());
    };
  }, [dispatch, id]);

  // Format date for input type="date"
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      console.error('Error formatting date:', e);
      return '';
    }
  };

  // Populate form when project data is loaded
  useEffect(() => {
    if (currentProject) {
      setFormData({
        name: currentProject.name || '',
        description: currentProject.description || '',
        status: currentProject.status || '',
        priority: currentProject.priority || 'Medium',
        startDate: formatDateForInput(currentProject.startDate),
        endDate: formatDateForInput(currentProject.endDate),
        // Ensure members are stored as an array of IDs
        members:
          currentProject.members?.map((member) =>
            typeof member === 'object' ? member._id : member
          ) || [],
      });
    }
  }, [currentProject]);

  const onChange = (e) => {
    const { name, value, options, type } = e.target;

    // Special handling for multi-select
    if (type === 'select-multiple') {
      const selectedIds = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);
      setFormData((prevState) => ({
        ...prevState,
        [name]: selectedIds,
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        updateProject({ projectId: id, projectData: formData })
      ).unwrap();
      // Redirect to the project details page after successful update
      navigate(`/projects/${id}`);
    } catch (error) {
      // Handle potential errors from the update operation
      console.error('Failed to update project:', error);
      // Optionally, display an error message to the user
    }
  };

  const onDelete = async () => {
    if (window.confirm('Delete this project?')) {
      await dispatch(deleteProject(id)).unwrap();
      navigate('/projects');
    }
  };

  // Loading state
  if (isLoading || friendsLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-background text-foreground">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-primary">Edit Project</h1>
          <div className="animate-pulse flex-1 space-y-4">
            <div className="h-4 bg-dark-600 rounded w-3/4"></div>
            <div className="h-4 bg-dark-600 rounded"></div>
            <div className="h-4 bg-dark-600 rounded w-5/6"></div>
            <div className="h-10 bg-dark-600 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 bg-background text-foreground">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-primary">Edit Project</h1>
          <div className="bg-destructive/20 text-destructive p-4 rounded-md">
            <p>Error: {message}</p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If server responded but we don't have a project
  if (!currentProject) {
    return (
      <div className="container mx-auto px-4 py-8 bg-background text-foreground">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-primary">Edit Project</h1>
          <div className="bg-destructive/20 text-destructive p-4 rounded-md">
            <p>Project not found or you do not have permission to edit it.</p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Combine friends and non-friend members for the select dropdown
  const availableMembers = [...friends, ...nonFriendMembers];

  return (
    <div className="container mx-auto px-4 py-8 bg-background text-foreground">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-primary">Edit Project</h1>

        {/* Form with grid layout for fields */}
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <FormInput
              id="name"
              label="Project Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              required
            />
          </div>

          {/* Project Description */}
          <div>
            <FormTextarea
              id="description"
              label="Description"
              name="description"
              value={formData.description}
              onChange={onChange}
              rows={4}
            />
          </div>

          {/* Status, Priority, Start Date, End Date in a 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <FormSelect
                id="status"
                label="Status"
                name="status"
                value={formData.status}
                onChange={onChange}
                options={[
                  { value: 'Planning', label: 'Planning' },
                  { value: 'Active', label: 'Active' },
                  { value: 'On Hold', label: 'On Hold' },
                  { value: 'Completed', label: 'Completed' },
                  { value: 'Archived', label: 'Archived' },
                ]}
              />
            </div>
            {/* Priority */}
            <div>
              <FormSelect
                id="priority"
                label="Priority"
                name="priority"
                value={formData.priority}
                onChange={onChange}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                ]}
              />
            </div>
            {/* Start Date */}
            <div>
              <FormInput
                id="startDate"
                label="Start Date"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={onChange}
              />
            </div>
            {/* End Date */}
            <div>
              <FormInput
                id="endDate"
                label="Due Date"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={onChange}
              />
            </div>
          </div>

          {/* Members */}
          <div className="mb-6">
            <label
              htmlFor="members"
              className="block text-foreground text-sm font-medium mb-1.5"
            >
              Project Members (From Friends)
            </label>
            {friendsError && (
              <p className="text-red-500 text-sm mb-2">
                Error loading friends: {friendsError}
              </p>
            )}
            <select
              id="members"
              name="members"
              multiple
              value={formData.members} // Ensure this is an array of IDs
              onChange={onChange}
              className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200 h-32"
            >
              {availableMembers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <p className="text-text-muted text-xs mt-1.5">
              Hold Ctrl (or Cmd on Mac) to select multiple members from your
              friends list.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-md shadow-sm mr-2"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => navigate(`/projects/${id}`)}
                className="px-4 py-2 bg-card-alt hover:bg-dark-700 text-foreground rounded-md shadow-sm"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground rounded-md shadow-sm"
            >
              Delete Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectEditPage;
