import React from 'react';
import { AlertCircle } from 'lucide-react';
import useWeatherData from '../../hooks/useWeatherData';
import { getWeatherIcon } from '../../utils/weatherUtils';

/**
 * Weather display component for the navigation bar
 * Handles loading, error states, and displaying weather information
 *
 * @param {Object} props - Component props
 * @param {string} props.location - Location to fetch weather for
 * @returns {JSX.Element} - Rendered weather component
 */
const WeatherDisplay = ({ location = 'Halifax' }) => {
  const { weather, loading, error } = useWeatherData({ location });

  if (loading && !weather) {
    return <span className="text-xs italic">Loading weather...</span>;
  }

  if (error) {
    return (
      <span className="text-xs text-red-500 flex items-center" title={error}>
        <AlertCircle size={14} className="mr-1" /> Weather N/A
      </span>
    );
  }

  if (weather) {
    return (
      <div
        className="flex items-center space-x-1"
        title={`${weather.description} in ${weather.city}`}
      >
        {getWeatherIcon(weather.icon)}
        <span>{Math.round(weather.temp)}°C</span>
      </div>
    );
  }

  return null;
};

export default WeatherDisplay;
