import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { createLogger } from '../utils/clientLogger';

// Create a weather-specific logger
const logWeather = createLogger('WEATHER');

/**
 * Custom hook to fetch and manage weather data
 *
 * @param {Object} options - Configuration options for weather data
 * @param {string} options.location - The location to fetch weather for (default: 'Halifax')
 * @param {number} options.refreshInterval - Interval in milliseconds to refresh weather data (default: 15 minutes)
 * @returns {Object} - Weather data state including loading, error states and weather information
 */
const useWeatherData = (options = {}) => {
  const {
    location = 'Halifax',
    refreshInterval = 15 * 60 * 1000, // 15 minutes
  } = options;

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const weatherFetchedRef = useRef(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!weather) setLoading(true);
      setError('');

      try {
        // Check if we've already fetched weather data in this session
        if (weatherFetchedRef.current) {
          logWeather('Skipping duplicate weather fetch');
          return;
        }

        weatherFetchedRef.current = true;

        logWeather(`Fetching weather data for ${location}`);
        const res = await api.get(
          `/weather?location=${encodeURIComponent(location)}`
        );

        if (res.data.success) {
          logWeather('Weather data fetched successfully', res.data.data);
          setWeather(res.data.data);
        } else {
          throw new Error(res.data.message || 'Failed to fetch weather');
        }
      } catch (err) {
        logWeather('Weather fetch error', {
          message: err.message,
          response: err.response?.data,
        });
        setError(err.response?.data?.message || err.message || 'Weather N/A');

        // Reset the flag on error so we can try again
        weatherFetchedRef.current = false;
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
      fetchWeather();
    }, refreshInterval);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [location, refreshInterval, weather]);

  return {
    weather,
    loading,
    error,
    setLocation: (newLocation) => {
      // Reset the fetch flag when changing location to force a new fetch
      weatherFetchedRef.current = false;
      return newLocation;
    },
  };
};

export default useWeatherData;
