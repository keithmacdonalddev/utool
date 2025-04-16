import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // Import Redux hooks
import { useNavigate, Link } from 'react-router-dom'; // Import Link for navigation
import { loginUser, resetAuthStatus } from '../features/auth/authSlice'; // Import Redux actions

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  const { email, password } = formData;

  useEffect(() => {
    // Handle redirection or display messages after login attempt
    if (isError) {
      // Display error message handled by the UI
    }

    // Redirect on successful login (when user object is populated)
    if (isSuccess || user) {
      navigate('/dashboard'); // Redirect to dashboard (or home page) after login
    }
  }, [user, isError, isSuccess, message, navigate, dispatch]);

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

  return (
    <div className="container mx-auto p-4 max-w-md">
      {' '}
      {/* Added max-width */}
      <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>{' '}
      {/* Centered and styled */}
      {/* Display Loading State */}
      {isLoading && <p className="text-center text-blue-500">Loading...</p>}
      {/* Display API Errors from Redux State */}
      {isError && message && (
        <p className="text-center text-red-500 bg-red-100 p-2 rounded mb-4">
          {message}
        </p>
      )}
      <form
        onSubmit={onSubmit}
        className="bg-card text-text shadow-card rounded-xl px-8 pt-6 pb-8 mb-4"
      >
        <div className="mb-4">
          <label
            className="block text-[#F8FAFC] text-sm font-bold mb-2"
            htmlFor="email"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border border-dark-600 rounded w-full py-2 px-3 bg-dark-700 text-text leading-tight focus:outline-none focus:shadow-outline ${
              isError ? 'border-red-500' : ''
            } ${isLoading ? 'opacity-60' : ''}`}
            id="email"
            type="email"
            placeholder="your.email@example.com"
            name="email"
            value={email}
            onChange={onChange}
            required
            disabled={isLoading}
          />
        </div>
        <div className="mb-6">
          <label
            className="block text-[#F8FAFC] text-sm font-bold mb-2"
            htmlFor="password"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border border-dark-600 rounded w-full py-2 px-3 bg-dark-700 text-text mb-3 leading-tight focus:outline-none focus:shadow-outline ${
              isError ? 'border-red-500' : ''
            } ${isLoading ? 'opacity-60' : ''}`}
            id="password"
            type="password"
            placeholder="******************"
            name="password"
            value={password}
            onChange={onChange}
            required
            disabled={isLoading}
          />
          {/* TODO: Add link for "Forgot Password?" later */}
        </div>
        <div className="flex items-center justify-center">
          {' '}
          {/* Centered button */}
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            type="submit"
            disabled={isLoading} // Disable button when loading
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
        <p className="text-center text-[#C7C9D1] text-xs mt-4">
          Don't have an account?{' '}
          <Link
            className="text-accent-purple font-bold hover:text-accent-blue hover:underline"
            to="/register"
          >
            Register here
          </Link>
        </p>
      </form>{' '}
      {/* Correctly closes the form */}
    </div>
  );
};

export default LoginPage;
