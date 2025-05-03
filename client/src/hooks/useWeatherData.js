import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { createLogger } from '../utils/clientLogger';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'react-toastify';

// Create a weather-specific logger
const logWeather = createLogger('WEATHER');

/**
 * Custom hook to fetch and manage weather data
 *
 * @param {Object} options - Configuration options for weather data
 * @param {string} options.location - The location to fetch weather for (default: 'Halifax')
 * @param {number} options.refreshInterval - Interval in milliseconds to refresh weather data (default: 15 minutes)
 * @param {number} options.maxRetries - Maximum number of retry attempts for failed requests (default: 2)
 * @param {number} options.retryDelay - Delay between retry attempts in milliseconds (default: 5000)
 * @returns {Object} - Weather data state including loading, error states and weather information
 */
const useWeatherData = (options = {}) => {
  const {
    location = 'Halifax',
    refreshInterval = 15 * 60 * 1000, // 15 minutes
    maxRetries = 2,
    retryDelay = 8000, // Increased to 8 seconds for better user experience
  } = options;

  // Get the notification functions from context
  const { showNotification } = useNotifications();

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isServerError, setIsServerError] = useState(false);

  // Track toast IDs to manage them
  const toastIdsRef = useRef({
    error: null,
    retry: null,
  });

  const weatherFetchedRef = useRef(false);
  const intervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    const fetchWeather = async (isRetry = false) => {
      if (!weather && !isRetry) setLoading(true);
      if (!isRetry) {
        setError('');
        setIsServerError(false);
      }

      try {
        // Check if we've already fetched weather data in this session
        if (weatherFetchedRef.current && !isRetry) {
          logWeather('Skipping duplicate weather fetch');
          return;
        }

        if (!isRetry) weatherFetchedRef.current = true;

        logWeather(
          `Fetching weather data for ${location}${
            isRetry ? ' (retry attempt)' : ''
          }`
        );
        const res = await api.get(
          `/weather?location=${encodeURIComponent(location)}`
        );

        if (res.data.success) {
          logWeather('Weather data fetched successfully', res.data.data);
          setWeather(res.data.data);
          retryCountRef.current = 0; // Reset retry count on success

          // Clear any existing retry timer
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }

          // Dismiss retry notification if it exists
          if (toastIdsRef.current.retry) {
            toast.dismiss(toastIdsRef.current.retry);
            toastIdsRef.current.retry = null;
          }

          // If we succeeded after a retry, show a success notification
          if (isRetry) {
            showNotification('Weather data successfully retrieved!', 'success');
          }
        } else {
          throw new Error(res.data.message || 'Failed to fetch weather');
        }
      } catch (err) {
        const statusCode = err.response?.status;
        const isNetworkError =
          !err.response && err.message.includes('Network Error');
        const isServerErr = statusCode >= 500;

        logWeather('Weather fetch error', {
          message: err.message,
          response: err.response?.data,
          statusCode,
          isNetworkError,
          isServerError: isServerErr,
          retryAttempt: retryCountRef.current,
        });

        // Set appropriate error message based on error type
        let errorMessage = '';
        if (isNetworkError) {
          errorMessage = 'Network issue. Check your connection.';
          setIsServerError(false);
        } else if (isServerErr) {
          errorMessage = 'Weather service temporarily unavailable.';
          setIsServerError(true);
        } else if (statusCode === 404) {
          errorMessage = `Location "${location}" not found`;
          setIsServerError(false);
        } else if (statusCode === 429) {
          errorMessage = 'Too many requests. Please try again later.';
          setIsServerError(false);
        } else {
          errorMessage =
            err.response?.data?.message ||
            err.message ||
            'Weather data unavailable';
          setIsServerError(false);
        }

        setError(errorMessage);

        // Handle retry logic for server errors or network issues
        if (
          (isServerErr || isNetworkError) &&
          retryCountRef.current < maxRetries
        ) {
          retryCountRef.current++;
          const currentRetry = retryCountRef.current;

          logWeather(
            `Scheduling retry ${currentRetry}/${maxRetries} in ${retryDelay}ms`
          );

          // First, show the error notification
          if (!isRetry) {
            // Only show error notification on first failure, not on retry failures
            showNotification(errorMessage, 'error');
          }

          // Then show retry notification
          const retryMessage = `Automatically retrying to fetch weather data in ${Math.round(
            retryDelay / 1000
          )} seconds. Attempt ${currentRetry} of ${maxRetries}.`;

          // Dismiss previous retry toast if it exists
          if (toastIdsRef.current.retry) {
            toast.dismiss(toastIdsRef.current.retry);
          }

          // Create a new toast for the retry notification
          toastIdsRef.current.retry = toast.info(retryMessage, {
            autoClose: retryDelay - 500, // Close just before the retry happens
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            className: 'weather-retry-toast',
          });

          // Clear any existing retry timer
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }

          // Schedule a retry
          retryTimerRef.current = setTimeout(() => {
            logWeather(`Executing retry ${currentRetry}/${maxRetries}`);
            fetchWeather(true);
          }, retryDelay);
        } else {
          // Reset the flag on error after retries are exhausted so we can try again later
          weatherFetchedRef.current = false;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    // Clear previous interval if it exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set new interval and store the ID
    intervalRef.current = setInterval(() => {
      // Reset the flag before fetching again in the interval
      weatherFetchedRef.current = false;
      retryCountRef.current = 0; // Reset retry counter for scheduled refresh
      fetchWeather();
    }, refreshInterval);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [location, refreshInterval, maxRetries, retryDelay]);

  return {
    weather,
    loading,
    error,
    isServerError, // Expose server error flag to help UI handle this case specifically
    retryFetch: () => {
      // Allow manual retry from UI
      weatherFetchedRef.current = false;
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return true;
    },
    setLocation: (newLocation) => {
      // Reset the fetch flag when changing location to force a new fetch
      weatherFetchedRef.current = false;
      retryCountRef.current = 0;
      return newLocation;
    },
  };
};

export default useWeatherData;
