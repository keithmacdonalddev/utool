import React, { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeft } from 'lucide-react';

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
        bio: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(''); // For both fetch and update errors
    const { showNotification } = useNotification();

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
                    bio
                } = res.data.data;
                setFormData({ 
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
                    newPassword: ''
                });
            } else {
                throw new Error(res.data.message || 'Failed to fetch user data');
            }
            } catch (err) {
                console.error("Fetch User Error:", err);
                setError(err.response?.data?.message || err.message || 'Failed to load user data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [userId]);

    const onChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
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
            console.error("User Update Error:", err);
            setError(err.response?.data?.message || err.message || 'Failed to update user.');
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return <div className="container mx-auto p-4 text-center">Loading user data...</div>;
    }

    if (error && !isUpdating) { // Show fetch error if not currently trying to update
         return (
             <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                    <strong className="font-bold">Error!</strong> {error}
                </div>
                 <Link to="/admin/users" className="text-blue-600 hover:underline inline-flex items-center">
                     <ArrowLeft size={16} className="mr-1" /> Back to User List
                 </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 max-w-lg">
             <div className="mb-4">
                 <Link to="/admin/users" className="text-blue-600 hover:underline inline-flex items-center text-sm">
                     <ArrowLeft size={16} className="mr-1" /> Back to User List
                 </Link>
             </div>
            <h1 className="text-2xl font-bold mb-6 text-center">Edit User Profile</h1>

            {error && isUpdating && ( // Show update error
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <strong className="font-bold">Update Error!</strong> {error}
                </div>
            )}

            <form onSubmit={onSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                {/* Name */}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Name</label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" id="name" type="text" name="name" value={formData.name} onChange={onChange} required />
                </div>
                {/* Email */}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                    <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" id="email" type="email" name="email" value={formData.email} onChange={onChange} required />
                </div>
                {/* Role */}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">Role</label>
                    <select className="shadow border rounded w-full py-2 px-3 text-gray-700" id="role" name="role" value={formData.role} onChange={onChange} required>
                        <option value="Regular User">Regular User</option>
                        <option value="Pro User">Pro User</option>
                        <option value="Admin">Admin</option>
                    </select>
                </div>
                {/* Verified Status */}
                <div className="mb-6">
                     <label className="flex items-center">
                        <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600" id="isVerified" name="isVerified" checked={formData.isVerified} onChange={onChange} />
                        <span className="ml-2 text-sm text-gray-700">Account Verified</span>
                    </label>
                </div>
                {/* Password Reset Section */}
                <div className="mb-6 border-t pt-4">
                    <label className="flex items-center mb-2">
                        <input 
                            type="checkbox" 
                            className="form-checkbox h-5 w-5 text-blue-600" 
                            name="resetPassword" 
                            checked={formData.resetPassword} 
                            onChange={(e) => setFormData({...formData, resetPassword: e.target.checked})} 
                        />
                        <span className="ml-2 text-sm font-bold text-gray-700">Reset Password</span>
                    </label>
                    {formData.resetPassword && (
                        <div className="mt-2">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                                New Password
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                id="newPassword"
                                type="password"
                                placeholder="Enter new password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={onChange}
                                minLength="8"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                        </div>
                    )}
                </div>

                {/* Additional Metadata Fields */}
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="jobTitle">
                        Job Title
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="country">
                            Country
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            id="country"
                            type="text"
                            placeholder="Country"
                            name="country"
                            value={formData.country || ''}
                            onChange={onChange}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
                            City
                        </label>
                        <input
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="website">
                        Website
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="website"
                        type="url"
                        placeholder="https://example.com"
                        name="website"
                        value={formData.website || ''}
                        onChange={onChange}
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="bio">
                        Bio
                    </label>
                    <textarea
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        id="bio"
                        rows="3"
                        placeholder="Tell us about yourself..."
                        name="bio"
                        value={formData.bio || ''}
                        onChange={onChange}
                        maxLength="500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.bio?.length || 0}/500 characters</p>
                </div>

                {/* Avatar URL Input */}
                 <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="avatar">
                        Avatar URL (Optional)
                    </label>
                    <input
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                            <img src={formData.avatar} alt="Avatar Preview" className="h-16 w-16 rounded-full object-cover mx-auto" />
                        </div>
                     )}
                </div>

                <div className="flex items-center justify-center">
                    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50" type="submit" disabled={isUpdating}>
                        {isUpdating ? 'Updating...' : 'Update User'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserEditPage;
