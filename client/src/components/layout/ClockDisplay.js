import React from 'react';
import useClock from '../../hooks/useClock';

/**
 * Clock display component for the navigation bar with date tooltip
 * Uses the useClock hook to manage time state and displays date on hover
 * Uses the simple HTML title attribute for tooltip to match WeatherDisplay's style
 *
 * @param {Object} props - Component props
 * @param {Object} props.formatOptions - Options for time formatting (passed to useClock)
 * @returns {JSX.Element} - Rendered clock component with date tooltip
 */
const ClockDisplay = ({
  formatOptions = { hour: 'numeric', minute: '2-digit' },
}) => {
  const { formattedTime, currentTime } = useClock({ formatOptions });

  /**
   * Format the current date for the tooltip
   * Shows weekday, month, day, and year in a user-friendly format
   */
  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <span className="cursor-help" title={formattedDate}>
      {formattedTime}
    </span>
  );
};

export default ClockDisplay;
