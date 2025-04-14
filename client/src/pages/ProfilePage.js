import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { updateUserInState } from '../features/auth/authSlice';
import { ArrowLeft } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const ProfilePage = () => {
    const dispatch = useDispatch();
    const { user, isLoading: authLoading, isError: authError, message: authMessage } = useSelector((state) => state.auth);

    // Initialize with all fields
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        avatar: '',
        jobTitle: '',
        country: '',
        city: '',
        website: '',
        bio: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState('');
    const { showNotification } = useNotification();

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
                bio: user.bio || ''
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
                dispatch(updateUserInState(res.data.data)); // Pass the updated user data
            } else {
                throw new Error(res.data.message || 'Update failed or missing data');
            }
        } catch (err) {
            console.error("Profile Update Error:", err);
            setUpdateError(err.response?.data?.message || err.message || 'Failed to update profile.');
        } finally {
            setIsUpdating(false);
        }
    };

    if (authLoading) {
        return <div className="container mx-auto p-4 text-center">Loading profile...</div>;
    }

    if (authError && !user) {
         return <div className="container mx-auto p-4 text-center text-red-500">Error loading profile: {authMessage}</div>;
    }

    if (!user) {
         return <div className="container mx-auto p-4 text-center">Could not load user profile.</div>;
    }


    return (
        <div className="container mx-auto p-4 max-w-lg">
            {/* Header Row: Back Link and Title */}
            <div className="flex items-center gap-4 mb-6">
                 <Link
                    to="/dashboard"
                    className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline flex-shrink-0"
                    title="Back to Dashboard"
                 >
                    <ArrowLeft size={18} />
                 </Link>
                 <h1 className="text-2xl font-bold text-[#F8FAFC] text-center flex-grow">Your Profile</h1> {/* Added flex-grow */}
                 {/* Add a placeholder div to balance flexbox if needed */}
                 <div className="w-6 flex-shrink-0"></div> {/* Placeholder to balance */}
            </div>


            {updateError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Error!</strong> {updateError}
                </div>
            )}

            <form onSubmit={onSubmit} className="bg-card text-text shadow-card rounded-xl px-8 pt-6 pb-8 mb-4">
                <div className="mb-4">
                    <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="name">
                        Name
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                        id="name"
                        type="text"
                        placeholder="Your Name"
                        name="name"
                        value={formData.name}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        name="email"
                        value={formData.email}
                        onChange={onChange}
                        required
                    />
                </div>
                {/* Avatar URL Input */}
                <div className="mb-6">
                    <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="avatar">
                        Avatar URL (Optional)
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                        id="avatar"
                        type="url" // Use type="url" for better semantics/validation
                        placeholder="https://example.com/avatar.png"
                        name="avatar"
                        value={formData.avatar}
                        onChange={onChange}
                    />
                     {/* Optional: Display current avatar preview */}
                     {formData.avatar && (
                        <div className="mt-2">
                            <img src={formData.avatar} alt="Avatar Preview" className="h-16 w-16 rounded-full object-cover mx-auto" />
                        </div>
                     )}
                </div>
                {/* TODO: Add password change section later */}
                {/* Additional Metadata Fields */}
                <div className="mb-6">
                    <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="jobTitle">
                        Job Title
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                        id="jobTitle"
                        type="text"
                        placeholder="Your Job Title"
                        name="jobTitle"
                        value={formData.jobTitle}
                        onChange={onChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="country">
                            Country
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                            id="country"
                            type="text"
                            placeholder="Country"
                            name="country"
                            value={formData.country}
                            onChange={onChange}
                        />
                    </div>
                    <div>
                        <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="city">
                            City
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                            id="city"
                            type="text"
                            placeholder="City"
                            name="city"
                            value={formData.city}
                            onChange={onChange}
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="website">
                        Website
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                        id="website"
                        type="url"
                        placeholder="https://example.com"
                        name="website"
                        value={formData.website}
                        onChange={onChange}
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-[#F8FAFC] text-sm font-bold mb-2" htmlFor="bio">
                        Bio
                    </label>
                    <textarea
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
                        id="bio"
                        rows="3"
                        placeholder="Tell us about yourself..."
                        name="bio"
                        value={formData.bio}
                        onChange={onChange}
                        maxLength="500"
                    />
                    <p className="text-xs text-[#C7C9D1] mt-1">{formData.bio?.length || 0}/500 characters</p>
                </div>

                <div className="flex items-center justify-center">
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                        type="submit"
                        disabled={isUpdating}
                    >
                        {isUpdating ? 'Updating...' : 'Update Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfilePage;
