import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  loginUser,
  resetAuthStatus,
  fetchGuestAccessStatus, // Added to fetch guest status
  loginAsGuest, // Added to log in as guest
} from '../features/auth/authSlice';
import FormInput from '../components/common/FormInput';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    user,
    isLoading,
    isLoggingInUser,
    isLoggingInGuest,
    isError,
    isSuccess,
    message,
    guestAccessFeatureEnabled, // Added from auth state
    isGuest, // Added to check if current user is guest
  } = useSelector((state) => state.auth);

  const { email, password } = formData;

  useEffect(() => {
    // Fetch guest access status when the component mounts
    dispatch(fetchGuestAccessStatus());
  }, [dispatch]);

  useEffect(() => {
    console.log('LoginPage useEffect triggered:', {
      isError,
      isSuccess,
      user,
      isGuest,
      message,
    });
    if (isError) {
      // Enhanced error logging for debugging
      console.error('LOGIN ERROR DETAILS:', {
        message,
        timestamp: new Date().toISOString(),
        errorFlag: isError,
        userState: user,
      });
      toast.error(message); // Display error to user
      dispatch(resetAuthStatus()); // Reset error state
    }
    if (isSuccess && user) {
      console.log('Login successful. Redirecting to dashboard...');
      navigate('/dashboard'); // All users go to the same dashboard
      dispatch(resetAuthStatus()); // Prevent redirection loop
    }
  }, [user, isError, isSuccess, isGuest, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(resetAuthStatus()); // Reset status before new attempt
    const userData = { email, password };
    dispatch(loginUser(userData)); // Dispatch the login action
  };

  const handleGuestLogin = () => {
    console.log('Attempting guest login...');
    dispatch(resetAuthStatus()); // Reset status before new attempt
    dispatch(loginAsGuest()); // Dispatch the action to log in as guest
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center text-text">Login</h1>

      {isLoading && <p className="text-center text-blue-500">Loading...</p>}

      {isError && message && (
        <div className="text-center text-red-500 bg-red-100 p-2 rounded mb-4">
          {message}
        </div>
      )}

      <Card>
        <form onSubmit={onSubmit} className="px-2">
          <FormInput
            id="email"
            label="Email"
            type="email"
            placeholder="your.email@example.com"
            name="email"
            value={email}
            onChange={onChange}
            required
            disabled={isLoading}
            error={isError ? message : null}
          />

          <FormInput
            id="password"
            label="Password"
            type="password"
            placeholder="******************"
            name="password"
            value={password}
            onChange={onChange}
            required
            disabled={isLoading}
            className="mb-6"
            autoComplete="current-password"
          />

          <div className="flex items-center justify-center">
            {' '}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoggingInUser ? 'Logging in...' : 'Login'}{' '}
              {/* Show 'Logging in...' only for actual login attempts */}
            </Button>
          </div>

          {/* Conditionally render the "Continue as Guest" button */}
          {guestAccessFeatureEnabled && (
            <div className="mt-4 text-center">
              <p className="text-text-muted text-sm mb-2">Or</p>{' '}
              <Button
                onClick={handleGuestLogin}
                disabled={isLoading} // Disable if any auth operation is in progress
                variant="secondary" // Changed from "outline" to "secondary"
                className="w-full"
              >
                {isLoggingInGuest
                  ? 'Entering Guest Mode...'
                  : 'Continue as Guest'}{' '}
                {/* Show specific loading for guest mode */}
              </Button>
            </div>
          )}

          <p className="text-center text-text-muted text-xs mt-4">
            Don't have an account?{' '}
            <Link
              className="text-accent-purple font-bold hover:text-accent-blue hover:underline"
              to="/register"
            >
              Register here
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
