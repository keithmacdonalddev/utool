import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../features/projects/projectSlice';
import FormInput from '../components/common/FormInput';
import FormTextarea from '../components/common/FormTextarea';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Alert from '../components/common/Alert';
import Loading from '../components/common/Loading';
import useFriends from '../hooks/useFriends'; // Import our custom hook
import { useNotifications } from '../context/NotificationContext'; // Import useNotifications

const ProjectCreatePage = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [], // Add members array
  });
  const [error, setError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, isError, message } = useSelector(
    (state) => state.projects
  );

  // Use our custom hook to get friends list
  const {
    friends,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriends();

  const { showNotification } = useNotifications(); // Extract showNotification

  const { name, description, members } = formData;

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
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!name.trim()) {
      setError('Project name is required');
      showNotification('Project name is required', 'error'); // Keep error notification for client-side validation
      return;
    }

    const newProject = {
      name,
      description,
      members, // Include selected friends as members
    };

    try {
      const resultAction = await dispatch(createProject(newProject));
      if (createProject.fulfilled.match(resultAction)) {
        // REMOVED: showNotification(`Project "${resultAction.payload.name}" created successfully`, 'success');
        navigate('/projects'); // Navigate immediately
      } else {
        // Handle rejected case from createProject thunk
        const errorMessage = resultAction.payload || 'Failed to create project';
        setError(errorMessage);
        // Assume the automatic handler will show the error based on server response
        // If not, we might need to add showNotification(errorMessage, 'error') back here.
      }
    } catch (err) {
      // Catch any unexpected errors during dispatch
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      showNotification(errorMessage, 'error'); // Keep for unexpected client-side errors
    }
  };

  return (
    <div className="container mx-auto p-4">
      <PageHeader title="Create Project" backLink="/projects" />

      {(isLoading || friendsLoading) && (
        <Loading message="Preparing project creation..." />
      )}

      {(error || isError || friendsError) && (
        <Alert
          type="error"
          message={error || message || friendsError}
          onClose={() => setError('')}
        />
      )}

      <Card>
        <form onSubmit={onSubmit} className="px-2">
          <FormInput
            id="name"
            label="Project Name"
            type="text"
            placeholder="Enter project name"
            name="name"
            value={name}
            onChange={onChange}
            required
            error={error && !name.trim() ? 'Project name is required' : null}
            disabled={isLoading}
          />

          <FormTextarea
            id="description"
            label="Description"
            placeholder="Describe your project"
            name="description"
            value={description}
            onChange={onChange}
            rows="4"
            disabled={isLoading}
            className="mb-6"
          />

          {/* Members selection from friends list */}
          <div className="mb-6">
            <label
              htmlFor="members"
              className="block text-foreground text-sm font-medium mb-1.5"
            >
              Project Members (From Friends)
            </label>
            <select
              id="members"
              name="members"
              multiple
              value={members}
              onChange={onChange}
              disabled={isLoading || friendsLoading}
              className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200 h-32"
            >
              {friends && friends.length > 0 ? (
                friends.map((friend) => (
                  <option key={friend._id} value={friend._id}>
                    {friend.name} ({friend.email})
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  {friendsLoading
                    ? 'Loading friends...'
                    : friends && friends.length === 0
                    ? 'No friends available'
                    : 'Unable to load friends'}
                </option>
              )}
            </select>
            <p className="text-text-muted text-xs mt-1.5">
              Hold Ctrl (or Cmd on Mac) to select multiple friends as members.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <Button type="submit" variant="primary" disabled={isLoading}>
              Create Project
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProjectCreatePage;
