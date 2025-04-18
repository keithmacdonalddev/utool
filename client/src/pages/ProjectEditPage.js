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
  const [users, setUsers] = useState([]); // State to hold the list of users
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');

  // Fetch users for the members select
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const res = await api.get('/users'); // Assuming '/api/v1/users' endpoint
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
        members: currentProject.members?.map((member) => member._id) || [],
      });
    }
  }, [currentProject]);

  const onChange = (e) => {
    const { name, value, options, type } = e.target;
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

  if (isLoading || usersLoading)
    // Check both loading states
    return <div className="container mx-auto p-4">Loading...</div>;

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Project</h1>
      <form
        onSubmit={onSubmit}
        className="bg-dark-800 shadow-md rounded px-8 pt-6 pb-8 mb-4 border border-dark-700"
      >
        {/* Name */}
        <div className="mb-4">
          <FormInput
            id="name"
            label="Project Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder="Project Name"
            required
          />
        </div>
        {/* Description */}
        <div className="mb-4">
          <FormTextarea
            id="description"
            label="Description"
            name="description"
            value={formData.description}
            onChange={onChange}
            placeholder="Project Description"
            rows={3}
          />
        </div>

        {/* Grid for Status, Priority, Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            Members
          </label>
          <select
            id="members"
            name="members"
            multiple
            value={formData.members} // Ensure this is an array of IDs
            onChange={onChange}
            className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200 h-32"
          >
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          <p className="text-text-muted text-xs mt-1.5">
            Hold Ctrl (or Cmd on Mac) to select multiple members.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2"
            >
              Update
            </button>
            <button
              type="button" // Important: Set type to button to prevent form submission
              onClick={() => navigate(`/projects/${id}`)} // Navigate back to project details
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancel
            </button>
          </div>
          <button
            type="button" // Important: Set type to button
            onClick={onDelete}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Delete Project
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectEditPage;
