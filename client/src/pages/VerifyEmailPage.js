import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api'; // Assuming you have an api.js for making requests

const VerifyEmailPage = () => {
    const { token } = useParams();
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setMessage('Verification token missing.');
                setLoading(false);
                return;
            }

            try {
                const response = await api.get(`/auth/verify-email/${token}`);
                setMessage(response.data.message);
                setSuccess(response.data.success);
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'Failed to verify email.';
                setMessage(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [token]);

    useEffect(() => {
        if (success) {
            // Redirect to login page after 3 seconds
            const timeoutId = setTimeout(() => {
                navigate('/login');
            }, 3000);

            return () => clearTimeout(timeoutId); // Cleanup on unmount
        }
    }, [success, navigate]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto py-10">
            <div className="max-w-md mx-auto bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <h2 className="text-2xl font-bold mb-4">Email Verification</h2>
                <p className={success ? 'text-green-500' : 'text-red-500'}>{message}</p>
                {success && (
                    <p>Redirecting to login...</p>
                )}
            </div>
        </div>
    );
};

export default VerifyEmailPage;
