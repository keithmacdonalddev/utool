import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, resetAuthStatus } from '../features/auth/authSlice';
import FormInput from '../components/common/FormInput';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  const { firstName, lastName, username, email, password, confirmPassword } =
    formData;

  useEffect(() => {
    // Handle redirection or display messages after registration attempt
    if (isError) {
      // Display error message handled by UI
    }

    if (isSuccess) {
      // Display success message (handled by UI)
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
    setLocalError('');
    dispatch(resetAuthStatus());

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
    } else {
      const userData = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username || undefined,
        email,
        password,
      };
      dispatch(registerUser(userData));
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6 text-center text-text">
        Register
      </h1>
      {isLoading && <p className="text-center text-blue-500">Loading...</p>}
      {localError && (
        <div className="text-center text-red-500 bg-red-100 p-2 rounded mb-4">
          {localError}
        </div>
      )}
      {isError && message && (
        <div className="text-center text-red-500 bg-red-100 p-2 rounded mb-4">
          {message}
        </div>
      )}
      {isSuccess && message && !isError && (
        <div className="text-center text-green-500 bg-green-100 p-2 rounded mb-4">
          {message}
        </div>
      )}{' '}
      <Card>
        {' '}
        <form onSubmit={onSubmit} className="px-2">
          {/* First Name and Last Name - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
              id="firstName"
              label="First Name"
              type="text"
              placeholder="Your First Name"
              name="firstName"
              value={firstName}
              onChange={onChange}
              disabled={isLoading}
              required
            />

            <FormInput
              id="lastName"
              label="Last Name"
              type="text"
              placeholder="Your Last Name"
              name="lastName"
              value={lastName}
              onChange={onChange}
              disabled={isLoading}
              required
            />
          </div>

          <FormInput
            id="username"
            label="Username (Optional)"
            type="text"
            placeholder="Enter a custom username"
            name="username"
            value={username}
            onChange={onChange}
            disabled={isLoading}
            required={false}
            helpText="Optional: If left empty, a username will be automatically generated for you based on your name."
            minLength="3"
            maxLength="30"
          />

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
            error={
              isError && message.toLowerCase().includes('email')
                ? message
                : null
            }
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
            minLength="8"
            disabled={isLoading}
            error={
              localError ||
              (isError && message.toLowerCase().includes('password'))
                ? localError || message
                : null
            }
            helpText="Minimum 8 characters."
            autocomplete="new-password"
          />

          <FormInput
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="******************"
            name="confirmPassword"
            value={confirmPassword}
            onChange={onChange}
            required
            disabled={isLoading}
            error={localError ? localError : null}
            className="mb-6"
            autocomplete="new-password"
          />

          <div className="flex items-center justify-center">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Registering...' : 'Register'}
            </Button>
          </div>

          <p className="text-center text-text-muted text-xs mt-4">
            Already have an account?{' '}
            <Link
              className="text-accent-purple font-bold hover:text-accent-blue hover:underline"
              to="/login"
            >
              Login here
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default RegisterPage;
