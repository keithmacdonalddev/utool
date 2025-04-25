/**
 * Custom hook for clock functionality
 * Manages time formatting, updates, and time-related display logic
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook to provide a real-time updating clock
 *
 * @param {Object} options - Configuration options for the clock
 * @param {number} options.updateInterval - Interval in milliseconds between clock updates (default: 1000)
 * @param {Object} options.formatOptions - Options for time formatting using toLocaleTimeString
 * @returns {Object} - Object containing the current time and formatted time string
 */
const useClock = (options = {}) => {
  const {
    updateInterval = 1000,
    formatOptions = { hour: 'numeric', minute: '2-digit' },
  } = options;

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(
      () => setCurrentTime(new Date()),
      updateInterval
    );
    return () => clearInterval(timerId); // Cleanup on unmount
  }, [updateInterval]);

  // Format the time according to the provided options
  const formattedTime = currentTime.toLocaleTimeString([], formatOptions);

  return {
    currentTime,
    formattedTime,
  };
};

export default useClock;
