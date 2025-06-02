import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { updateUserInState, deleteUser } from '../features/auth/authSlice';
import { useNotifications } from '../context/NotificationContext';
import FormInput from '../components/common/FormInput';
import FormTextarea from '../components/common/FormTextarea';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Alert from '../components/common/Alert';
import { Trash2 } from 'lucide-react';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const store = useStore();
  const {
    user,
    isLoading: authLoading,
    isError: authError,
    message: authMessage,
  } = useSelector((state) => state.auth);
  // Initialize with all fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    avatar: '',
    jobTitle: '',
    country: '',
    city: '',
    website: '',
    bio: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showNotification } = useNotifications();
  // Populate form when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        avatar: user.avatar || '',
        jobTitle: user.jobTitle || '',
        country: user.country || '',
        city: user.city || '',
        website: user.website || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear messages on change
    setUpdateError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateError(''); // Basic validation
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim()
    ) {
      setUpdateError('First name, last name, and email cannot be empty.');
      setIsUpdating(false);
      return;
    }

    try {
      const res = await api.put('/auth/updateme', formData);
      if (res.data.success && res.data.data) {
        showNotification('Profile updated successfully!');
        // Dispatch action to update user state directly in Redux store
        dispatch(updateUserInState(res.data.data));
      } else {
        throw new Error(res.data.message || 'Update failed or missing data');
      }
    } catch (err) {
      console.error('Profile Update Error:', err);
      setUpdateError(
        err.response?.data?.message ||
          err.message ||
          'Failed to update profile.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteUser());
      const resultState = store.getState().auth;
      if (!resultState.isError) {
        showNotification('Your account has been deleted successfully.');
        navigate('/login');
      } else {
        throw new Error(resultState.message || 'Failed to delete account');
      }
    } catch (err) {
      setUpdateError(err.message || 'Failed to delete account');
      setShowDeleteConfirmation(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-4 text-center text-text">
        Loading profile...
      </div>
    );
  }

  if (authError && !user) {
    return (
      <div className="container mx-auto p-4 text-center text-red-500">
        Error loading profile: {authMessage}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4 text-center text-text">
        Could not load user profile.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <PageHeader title="Your Profile" backLink="/dashboard" />
      {updateError && (
        <Alert
          type="error"
          message={updateError}
          onClose={() => setUpdateError('')}
        />
      )}{' '}
      <Card>
        <form onSubmit={onSubmit} className="px-2">
          {' '}
          {/* Read-only User ID display */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text mb-1">
              User ID (Read-only)
            </label>
            <div className="p-2 bg-dark-700 border border-dark-600 rounded text-sm font-mono text-gray-400">
              {user._id || 'Not available'}
            </div>
          </div>
          {/* First Name and Last Name - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
              id="firstName"
              label="First Name"
              type="text"
              placeholder="Your First Name"
              name="firstName"
              value={formData.firstName}
              onChange={onChange}
              required
            />

            <FormInput
              id="lastName"
              label="Last Name"
              type="text"
              placeholder="Your Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              required
            />
          </div>
          <FormInput
            id="email"
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            name="email"
            value={formData.email}
            onChange={onChange}
            required
          />
          <FormInput
            id="avatar"
            label="Avatar URL (Optional)"
            type="url"
            placeholder="https://example.com/avatar.png"
            name="avatar"
            value={formData.avatar}
            onChange={onChange}
            helpText={formData.avatar ? 'Preview shown below' : null}
            className="mb-2"
          />
          {formData.avatar && (
            <div className="mt-2 mb-4 flex justify-center">
              <img
                src={formData.avatar}
                alt="Avatar Preview"
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) =>
                  (e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${formData.firstName || ''} ${
                      formData.lastName || ''
                    }`.trim() || 'User'
                  )}&background=random`)
                }
              />
            </div>
          )}
          <FormInput
            id="jobTitle"
            label="Job Title"
            type="text"
            placeholder="Your Job Title"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={onChange}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              id="country"
              label="Country"
              type="text"
              placeholder="Country"
              name="country"
              value={formData.country}
              onChange={onChange}
            />

            <FormInput
              id="city"
              label="City"
              type="text"
              placeholder="City"
              name="city"
              value={formData.city}
              onChange={onChange}
            />
          </div>
          <FormInput
            id="website"
            label="Website"
            type="url"
            placeholder="https://example.com"
            name="website"
            value={formData.website}
            onChange={onChange}
          />
          <FormTextarea
            id="bio"
            label="Bio"
            rows="3"
            placeholder="Tell us about yourself..."
            name="bio"
            value={formData.bio}
            onChange={onChange}
            maxLength="500"
            showCharCount={true}
            className="mb-6"
          />
          <div className="flex items-center justify-center mb-6">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>

        {/* Delete Account Section */}
        <div className="border-t border-dark-600 pt-6 mt-2">
          <h3 className="text-lg font-medium text-red-500 mb-2">Danger Zone</h3>
          <p className="text-sm text-text-muted mb-4">
            Deleting your account is permanent. All your data will be removed
            and cannot be recovered.
          </p>

          {!showDeleteConfirmation ? (
            <Button
              type="button"
              variant="danger"
              className="flex items-center gap-2"
              onClick={() => setShowDeleteConfirmation(true)}
            >
              <Trash2 size={16} />
              Delete Account
            </Button>
          ) : (
            <div className="bg-red-900/30 border border-red-700 rounded p-4">
              <p className="text-red-300 font-medium mb-4">
                Are you sure you want to delete your account? This action cannot
                be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeleteConfirmation(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
