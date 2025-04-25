import React from 'react';
import useClock from '../../hooks/useClock';

/**
 * Simple clock display component for the navigation bar
 * Uses the useClock hook to manage time state
 *
 * @param {Object} props - Component props
 * @param {Object} props.formatOptions - Options for time formatting (passed to useClock)
 * @returns {JSX.Element} - Rendered clock component
 */
const ClockDisplay = ({
  formatOptions = { hour: 'numeric', minute: '2-digit' },
}) => {
  const { formattedTime } = useClock({ formatOptions });

  return <span>{formattedTime}</span>;
};

export default ClockDisplay;
