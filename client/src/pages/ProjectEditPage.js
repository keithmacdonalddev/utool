import React, { useState, useEffect, useMemo } from 'react';
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
import Card from '../components/common/Card'; // Import Card component
import PageHeader from '../components/common/PageHeader'; // Import PageHeader
import api from '../utils/api'; // Import the api utility
import useFriends from '../hooks/useFriends'; // Import our custom hook
import { useNotifications } from '../context/NotificationContext';
import Portal from '../components/common/Portal'; // Import Portal

const ProjectEditPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Memoized selectors to prevent Redux rerender warnings
  const selectProjects = useMemo(() => (state) => state.projects, []);
  const selectAuth = useMemo(() => (state) => state.auth, []);

  const { projects, currentProject, isLoading, isError, isSuccess, message } =
    useSelector(selectProjects);
  const { user } = useSelector(selectAuth); // Get current user
  const { showNotification } = useNotifications(); // Extract the showNotification function
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: '',
    priority: 'Medium', // Add priority with default
    startDate: '', // Add startDate
    endDate: '', // Add endDate
    members: [], // Add members array
  });

  // Store the initial form data to compare for changes
  const [initialFormData, setInitialFormData] = useState(null);

  // Add state for delete confirmation modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFinalDeleteModal, setShowFinalDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Use our custom hook to get friends list instead of all users
  const {
    friends,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriends();

  // We'll still need original members who may not be friends
  const [nonFriendMembers, setNonFriendMembers] = useState([]);

  // Store project owner ID to exclude from selectable members
  const [projectOwner, setProjectOwner] = useState(null);

  // Fetch non-friend project members if needed
  useEffect(() => {
    const fetchNonFriendMembers = async () => {
      if (!currentProject || !currentProject.members || !friends) return;

      // Store the project owner ID
      if (currentProject.owner) {
        const ownerId =
          typeof currentProject.owner === 'object'
            ? currentProject.owner._id
            : currentProject.owner;
        setProjectOwner(ownerId);
      }

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

        // If the API fails, create placeholder members from the IDs
        // This prevents the UI from breaking completely
        const placeholders = memberIds.map((id) => ({
          _id: id,
          // Updated to use username as a fallback
          username: `Member (${id.substring(0, 5)}...)`,
          firstName: 'Member',
          lastName: `(${id.substring(0, 5)}...)`,
          email: 'Unknown email',
        }));
        setNonFriendMembers(placeholders);
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
      // Store the project owner ID
      if (currentProject.owner) {
        const ownerId =
          typeof currentProject.owner === 'object'
            ? currentProject.owner._id
            : currentProject.owner;
        setProjectOwner(ownerId);
      }

      const formattedData = {
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
      };

      // Set both current and initial form data
      setFormData(formattedData);
      setInitialFormData(formattedData);
    }
  }, [currentProject]);

  const onChange = (e) => {
    const { name, value, options, type } = e.target;

    // Special handling for multi-select
    if (type === 'select-multiple') {
      const selectedIds = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);

      // Ensure project owner remains in the members list
      let updatedMembers = selectedIds;
      if (projectOwner && !selectedIds.includes(projectOwner)) {
        updatedMembers = [projectOwner, ...selectedIds];
      }

      setFormData((prevState) => ({
        ...prevState,
        [name]: updatedMembers,
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  // Determine if there are changes by comparing current form data with initial form data
  const hasChanges = useMemo(() => {
    if (!initialFormData) return false;

    // Compare simple fields
    if (
      formData.name !== initialFormData.name ||
      formData.description !== initialFormData.description ||
      formData.status !== initialFormData.status ||
      formData.priority !== initialFormData.priority ||
      formData.startDate !== initialFormData.startDate ||
      formData.endDate !== initialFormData.endDate
    ) {
      return true;
    }

    // Compare members arrays (excluding the owner who is always included)
    const currentMembersWithoutOwner = formData.members
      .filter((id) => id !== projectOwner)
      .sort();
    const initialMembersWithoutOwner = initialFormData.members
      .filter((id) => id !== projectOwner)
      .sort();

    // Different length means different members
    if (
      currentMembersWithoutOwner.length !== initialMembersWithoutOwner.length
    ) {
      return true;
    }

    // Check if every member in current is in initial
    for (let i = 0; i < currentMembersWithoutOwner.length; i++) {
      if (currentMembersWithoutOwner[i] !== initialMembersWithoutOwner[i]) {
        return true;
      }
    }

    // No changes detected
    return false;
  }, [formData, initialFormData, projectOwner]);

  const onSubmit = async (e) => {
    e.preventDefault();

    // Do nothing if there are no changes
    if (!hasChanges) return;

    // Ensure project owner is included in members array before submission
    let updatedMembers = [...formData.members];
    if (projectOwner && !updatedMembers.includes(projectOwner)) {
      updatedMembers = [projectOwner, ...updatedMembers];
    }

    const updatedFormData = {
      ...formData,
      members: updatedMembers,
    };

    try {
      await dispatch(
        updateProject({ projectId: id, projectData: updatedFormData })
      ).unwrap();
      // Redirect to the project details page after successful update
      navigate(`/projects/${id}`);
    } catch (error) {
      // Handle potential errors from the update operation
      console.error('Failed to update project:', error);
      // Optionally, display an error message to the user
    }
  };

  // --- Handle first delete modal confirmation ---
  const handleFirstDeleteConfirm = () => {
    setShowDeleteModal(false);
    setShowFinalDeleteModal(true);
    setDeleteConfirmText('');
  };

  // --- Handle text input change for the final delete confirmation ---
  const handleDeleteTextChange = (e) => {
    setDeleteConfirmText(e.target.value);
  };

  // --- Handle final Delete Project ---
  const handleFinalDelete = async () => {
    setIsDeleting(true);

    try {
      await dispatch(deleteProject(id)).unwrap();
      // Close modal and navigate to projects list after successful deletion
      setShowFinalDeleteModal(false);
      navigate('/projects'); // Navigate immediately
    } catch (error) {
      console.error('Failed to delete project:', error);
      // If errors aren't shown automatically, add the error notification back here.
      setIsDeleting(false);
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
          <PageHeader title="Edit Project" backLink={`/projects/${id}`} />
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
          <PageHeader title="Edit Project" backLink="/projects" />
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
  // Filter out the project owner from the selectable members list
  const availableMembers = [...friends, ...nonFriendMembers].filter(
    (member) => member._id !== projectOwner
  );

  // Find owner information for display
  // Updated to use firstName, lastName, and username
  const ownerInfo = [...friends, ...nonFriendMembers].find(
    (member) => member._id === projectOwner
  ) || { username: 'Unknown Owner', firstName: '', lastName: '' };

  return (
    <div className="container mx-auto px-4 py-8 bg-background text-foreground">
      <div className="max-w-2xl mx-auto">
        <PageHeader title="Edit Project" backLink={`/projects/${id}`} />

        <Card>
          {/* Form with grid layout for fields */}
          <form onSubmit={onSubmit} className="space-y-6 px-2">
            {/* Project Owner Display */}
            {projectOwner && (
              <div className="mb-4 p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium text-muted-foreground">
                  Project Owner
                </p>
                <p className="text-lg">
                  {ownerInfo.firstName
                    ? `${ownerInfo.firstName} ${
                        ownerInfo.lastName || ''
                      }`.trim()
                    : ownerInfo.username}
                </p>
              </div>
            )}

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
                Additional Project Members
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
                value={formData.members.filter((id) => id !== projectOwner)} // Exclude owner from selection display
                onChange={onChange}
                className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200 h-32"
              >
                {availableMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName
                      ? `${member.firstName} ${member.lastName || ''}`.trim()
                      : member.username}{' '}
                    ({member.email || 'No email'})
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
                  className={`px-4 py-2 rounded-md shadow-sm mr-2 ${
                    hasChanges
                      ? 'bg-primary hover:bg-primary/80 text-white'
                      : 'bg-primary/50 text-white/70 cursor-not-allowed'
                  }`}
                  disabled={!hasChanges}
                  title={hasChanges ? 'Save changes' : 'No changes to save'}
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
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm"
              >
                Delete Project
              </button>
            </div>
          </form>
        </Card>
      </div>

      {/* First Delete Confirmation Modal */}
      {showDeleteModal && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full border border-dark-700">
              <h3 className="text-xl font-bold text-white mb-4">
                Delete Project
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this project? This action will
                remove all project data, including tasks and comments.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="bg-dark-700 hover:bg-dark-600 text-gray-200 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFirstDeleteConfirm}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Final Delete Confirmation Modal with Text Verification */}
      {showFinalDeleteModal && (
        <Portal>
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full border border-dark-700">
              <h3 className="text-xl font-bold text-white mb-4">
                Final Confirmation
              </h3>
              <p className="text-gray-300 mb-4">
                To confirm deletion of project{' '}
                <span className="font-semibold text-white">
                  "{formData.name}"
                </span>
                , please type <strong className="text-red-500">delete</strong>{' '}
                in the field below.
              </p>
              <div className="mb-6">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={handleDeleteTextChange}
                  placeholder="Type 'delete' to confirm"
                  className="w-full px-3 py-2 rounded-md border bg-dark-700 text-white border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowFinalDeleteModal(false)}
                  className="bg-dark-700 hover:bg-dark-600 text-gray-200 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalDelete}
                  className={`bg-red-600 ${
                    isDeleting ? 'opacity-70' : 'hover:bg-red-700'
                  } text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center justify-center min-w-[160px]`}
                  disabled={
                    deleteConfirmText.toLowerCase() !== 'delete' || isDeleting
                  }
                >
                  {isDeleting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default ProjectEditPage;
