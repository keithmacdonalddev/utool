import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, resetAuthStatus } from '../features/auth/authSlice';
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
          />

          <div className="flex items-center justify-center">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </div>

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
