import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import api from '../utils/api';
import { updateUserInState } from '../features/auth/authSlice';
import { useNotifications } from '../context/NotificationContext';
import FormInput from '../components/common/FormInput';
import FormTextarea from '../components/common/FormTextarea';
import Button from '../components/common/Button';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Alert from '../components/common/Alert';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const {
    user,
    isLoading: authLoading,
    isError: authError,
    message: authMessage,
  } = useSelector((state) => state.auth);

  // Initialize with all fields
  const [formData, setFormData] = useState({
    name: '',
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
  const { showNotification } = useNotifications();

  // Populate form when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
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
    setUpdateError('');

    // Basic validation
    if (!formData.name.trim() || !formData.email.trim()) {
      setUpdateError('Name and Email cannot be empty.');
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
      )}

      <Card>
        <form onSubmit={onSubmit} className="px-2">
          <FormInput
            id="name"
            label="Name"
            type="text"
            placeholder="Your Name"
            name="name"
            value={formData.name}
            onChange={onChange}
            required
          />

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
                    formData.name || 'User'
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

          <div className="flex items-center justify-center">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfilePage;
