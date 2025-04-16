import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux'; // Import Redux hooks
import { useNavigate } from 'react-router-dom'; // For redirection
import { registerUser, resetAuthStatus } from '../features/auth/authSlice'; // Import Redux actions

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState(''); // For local form errors like password mismatch

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  const { name, email, password, confirmPassword } = formData;

  useEffect(() => {
    // Handle redirection or display messages after registration attempt
    if (isError) {
      // Display error message (e.g., using a toast library later)
      // Optionally reset status after showing message
      // dispatch(resetAuthStatus());
    }

    if (isSuccess) {
      // Display success message (e.g., "Check your email")
      // Optionally redirect or clear form
      // navigate('/login'); // Redirect to login after successful registration message
      // Reset form?
      // Reset status after handling
      // dispatch(resetAuthStatus());
    }

    // Reset status on component unmount or before next attempt
    // return () => {
    //     dispatch(resetAuthStatus());
    // };
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setLocalError(''); // Clear previous local errors
    dispatch(resetAuthStatus()); // Reset Redux status before new attempt

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
    } else {
      const userData = {
        name: name || undefined, // Send name only if provided
        email,
        password,
      };
      dispatch(registerUser(userData)); // Dispatch the register action
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      {' '}
      {/* Added max-width */}
      <h1 className="text-3xl font-bold mb-6 text-center">Register</h1>{' '}
      {/* Centered and styled */}
      {/* Display Loading State */}
      {isLoading && <p className="text-center text-blue-500">Loading...</p>}
      {/* Display Local Form Errors */}
      {localError && (
        <p className="text-center text-red-500 bg-red-100 p-2 rounded mb-4">
          {localError}
        </p>
      )}
      {/* Display API Errors from Redux State */}
      {isError && message && (
        <p className="text-center text-red-500 bg-red-100 p-2 rounded mb-4">
          {message}
        </p>
      )}
      {/* Display Success Message from Redux State */}
      {isSuccess && message && !isError && (
        <p className="text-center text-green-500 bg-green-100 p-2 rounded mb-4">
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
            htmlFor="name"
          >
            Name <span className="text-[#C7C9D1] text-sm">(Optional)</span>
          </label>
          <input
            className={`shadow appearance-none border border-dark-600 rounded w-full py-2 px-3 bg-dark-700 text-text leading-tight focus:outline-none focus:shadow-outline ${
              isLoading ? 'opacity-60' : ''
            }`}
            id="name"
            type="text"
            placeholder="Your Name"
            name="name"
            value={name}
            onChange={onChange}
            disabled={isLoading} // Disable input when loading
          />
        </div>
        {/* Removed duplicated/incorrect email input block above */}
        <div className="mb-4">
          <label
            className="block text-[#F8FAFC] text-sm font-bold mb-2"
            htmlFor="email"
          >
            Email
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] leading-tight focus:outline-none focus:shadow-outline"
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
        <div className="mb-4">
          <label
            className="block text-[#F8FAFC] text-sm font-bold mb-2"
            htmlFor="password"
          >
            Password <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] mb-3 leading-tight focus:outline-none focus:shadow-outline ${
              localError ||
              (isError && message.toLowerCase().includes('password'))
                ? 'border-red-500'
                : ''
            } ${isLoading ? 'bg-gray-200' : ''}`}
            id="password"
            type="password"
            placeholder="******************"
            name="password"
            value={password}
            onChange={onChange}
            required
            minLength="8"
            disabled={isLoading}
          />
          <p className="text-xs text-[#C7C9D1]">Minimum 8 characters.</p>
        </div>
        <div className="mb-6">
          <label
            className="block text-[#F8FAFC] text-sm font-bold mb-2"
            htmlFor="confirmPassword"
          >
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-[#F8FAFC] mb-3 leading-tight focus:outline-none focus:shadow-outline ${
              localError ? 'border-red-500' : ''
            } ${isLoading ? 'bg-gray-200' : ''}`}
            id="confirmPassword"
            type="password"
            placeholder="******************"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
            disabled={isLoading}
          />
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
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </div>
        {/* Login Link Paragraph - Moved inside form, after button div */}
        <p className="text-center text-[#C7C9D1] text-xs mt-4">
          Already have an account? {/* TODO: Replace with Link component */}
          <a
            className="text-accent-purple font-bold hover:text-accent-blue hover:underline"
            href="/login"
          >
            Login here
          </a>
        </p>
      </form>{' '}
      {/* Correctly closes the form */}
    </div>
  );
};

export default RegisterPage;
