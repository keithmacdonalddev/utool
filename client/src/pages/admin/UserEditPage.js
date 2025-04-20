import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft } from 'lucide-react';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';
import FormCheckbox from '../../components/common/FormCheckbox';

const UserEditPage = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();

  // Initialize with avatar field
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    isVerified: false,
    avatar: '',
    resetPassword: false,
    newPassword: '',
    jobTitle: '',
    country: '',
    city: '',
    website: '',
    bio: '',
  });

  // Add state to track original user data for detecting changes
  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(''); // For both fetch and update errors
  const { handleNotificationClick } = useNotifications();

  // Track if there are form changes
  const hasChanges = () => {
    if (!originalData) return false;

    // Check for changes in all fields except resetPassword and newPassword
    return (
      originalData.name !== formData.name ||
      originalData.email !== formData.email ||
      originalData.role !== formData.role ||
      originalData.isVerified !== formData.isVerified ||
      originalData.avatar !== formData.avatar ||
      originalData.jobTitle !== formData.jobTitle ||
      originalData.country !== formData.country ||
      originalData.city !== formData.city ||
      originalData.website !== formData.website ||
      originalData.bio !== formData.bio ||
      (formData.resetPassword && formData.newPassword) // Consider password reset as a change only if new password is provided
    );
  };

  // Using handleNotificationClick as a replacement for showNotification
  const showNotification = (message, type = 'info') => {
    const notificationObj = {
      _id: Date.now().toString(),
      title: type === 'error' ? 'Error' : 'Success',
      message,
      type,
    };
    handleNotificationClick(notificationObj);
  };

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await api.get(`/users/${userId}`);
        if (res.data.success) {
          // Include avatar in destructuring and state update
          const {
            name,
            email,
            role,
            isVerified,
            avatar,
            jobTitle,
            country,
            city,
            website,
            bio,
          } = res.data.data;

          const userData = {
            name,
            email,
            role,
            isVerified,
            avatar: avatar || '',
            jobTitle: jobTitle || '',
            country: country || '',
            city: city || '',
            website: website || '',
            bio: bio || '',
            resetPassword: false,
            newPassword: '',
          };

          setFormData(userData);
          setOriginalData({ ...userData }); // Store original data for comparison
        } else {
          throw new Error(res.data.message || 'Failed to fetch user data');
        }
      } catch (err) {
        console.error('Fetch User Error:', err);
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load user data.'
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const onChange = (e) => {
    const value =
      e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    setError(''); // Clear errors on change
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      setError('Name, Email, and Role cannot be empty.');
      setIsUpdating(false);
      return;
    }

    try {
      const res = await api.put(`/users/${userId}`, formData); // Use admin update endpoint
      if (res.data.success) {
        showNotification('User updated successfully!');
        // Optionally navigate back to list after a delay or keep form
        // navigate('/admin/users');
      } else {
        throw new Error(res.data.message || 'Update failed');
      }
    } catch (err) {
      console.error('User Update Error:', err);
      setError(
        err.response?.data?.message || err.message || 'Failed to update user.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center text-foreground">
        Loading user data...
      </div>
    );
  }

  if (error && !isUpdating) {
    // Show fetch error if not currently trying to update
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-bold">Error!</strong> {error}
        </div>
        <Link
          to="/admin/users"
          className="text-accent-purple hover:text-accent-blue hover:underline inline-flex items-center"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to User List
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <div className="mb-4">
        <Link
          to="/admin/users"
          className="text-accent-purple hover:text-accent-blue hover:underline inline-flex items-center text-sm"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to User List
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
        Edit User Profile
      </h1>

      {error &&
        isUpdating && ( // Show update error
          <div
            className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Update Error!</strong> {error}
          </div>
        )}

      <form
        onSubmit={onSubmit}
        className="bg-card border border-dark-700 shadow-md rounded px-8 pt-6 pb-8 mb-4"
      >
        {/* Name */}
        <FormInput
          id="name"
          label="Name"
          type="text"
          name="name"
          value={formData.name}
          onChange={onChange}
          required
        />
        {/* Email */}
        <FormInput
          id="email"
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          required
        />
        {/* Role */}
        <FormSelect
          id="role"
          label="Role"
          name="role"
          value={formData.role}
          onChange={onChange}
          required
          options={[
            { value: 'Regular User', label: 'Regular User' },
            { value: 'Pro User', label: 'Pro User' },
            { value: 'Admin', label: 'Admin' },
          ]}
        />
        {/* Verified Status */}
        <FormCheckbox
          id="isVerified"
          name="isVerified"
          label="Account Verified"
          checked={formData.isVerified}
          onChange={onChange}
        />
        {/* Password Reset Section */}
        <div className="mb-6 border-t border-dark-600 pt-4">
          <FormCheckbox
            id="resetPassword"
            name="resetPassword"
            label="Reset Password"
            checked={formData.resetPassword}
            onChange={(e) =>
              setFormData({ ...formData, resetPassword: e.target.checked })
            }
            labelClassName="font-bold"
          />
          {formData.resetPassword && (
            <div className="mt-2">
              <label
                className="block text-foreground text-sm font-medium mb-2"
                htmlFor="newPassword"
              >
                New Password
              </label>
              <input
                className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                name="newPassword"
                value={formData.newPassword}
                onChange={onChange}
                minLength="8"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
            </div>
          )}
        </div>

        {/* Additional Metadata Fields */}
        <div className="mb-6">
          <label
            className="block text-foreground text-sm font-medium mb-2"
            htmlFor="jobTitle"
          >
            Job Title
          </label>
          <input
            className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
            id="jobTitle"
            type="text"
            placeholder="Enter job title"
            name="jobTitle"
            value={formData.jobTitle || ''}
            onChange={onChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label
              className="block text-foreground text-sm font-medium mb-2"
              htmlFor="country"
            >
              Country
            </label>
            <input
              className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
              id="country"
              type="text"
              placeholder="Country"
              name="country"
              value={formData.country || ''}
              onChange={onChange}
            />
          </div>
          <div>
            <label
              className="block text-foreground text-sm font-medium mb-2"
              htmlFor="city"
            >
              City
            </label>
            <input
              className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
              id="city"
              type="text"
              placeholder="City"
              name="city"
              value={formData.city || ''}
              onChange={onChange}
            />
          </div>
        </div>

        <div className="mb-6">
          <label
            className="block text-foreground text-sm font-medium mb-2"
            htmlFor="website"
          >
            Website
          </label>
          <input
            className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
            id="website"
            type="url"
            placeholder="https://example.com"
            name="website"
            value={formData.website || ''}
            onChange={onChange}
          />
        </div>

        <div className="mb-6">
          <label
            className="block text-foreground text-sm font-medium mb-2"
            htmlFor="bio"
          >
            Bio
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
            id="bio"
            rows="3"
            placeholder="Tell us about yourself..."
            name="bio"
            value={formData.bio || ''}
            onChange={onChange}
            maxLength="500"
          />
          <p className="text-xs text-gray-400 mt-1">
            {formData.bio?.length || 0}/500 characters
          </p>
        </div>

        {/* Avatar URL Input */}
        <div className="mb-6">
          <label
            className="block text-foreground text-sm font-medium mb-2"
            htmlFor="avatar"
          >
            Avatar URL (Optional)
          </label>
          <input
            className="w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200"
            id="avatar"
            type="url"
            placeholder="https://example.com/avatar.png"
            name="avatar"
            value={formData.avatar}
            onChange={onChange}
          />
          {/* Optional: Display current avatar preview */}
          {formData.avatar && (
            <div className="mt-2">
              <img
                src={formData.avatar}
                alt="Avatar Preview"
                className="h-16 w-16 rounded-full object-cover mx-auto"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            className="px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 disabled:opacity-50 transition-colors duration-200"
            type="submit"
            disabled={isUpdating || !hasChanges()}
          >
            {isUpdating ? 'Updating...' : 'Update User'}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-dark-500 focus:ring-opacity-50 transition-colors duration-200"
            onClick={() => navigate('/admin/users')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEditPage;
