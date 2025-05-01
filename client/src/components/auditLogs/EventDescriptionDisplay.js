/**
 * Event Description Display Component
 *
 * This component transforms technical event codes and audit log entries into natural language
 * descriptions that are easier for non-technical users to understand. It provides different
 * display formats and tooltip functionality to show technical details on hover.
 *
 * Features:
 * - Multiple display formats (brief, standard, detailed)
 * - Tooltip to show technical details on hover
 * - Context awareness based on user role
 * - Accessibility support with proper ARIA attributes
 */

import React, { useState } from 'react';
import {
  formatEventDescription,
  getSeverityDescription,
  getCategoryDescription,
} from '../../utils/eventDescriptionFormatter';
import { Info } from 'lucide-react';

/**
 * Event Description Display Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.event - The audit log event object to display
 * @param {string} props.format - Display format: 'brief', 'standard', 'detailed' (default: 'standard')
 * @param {boolean} props.showTooltip - Whether to show technical details on hover (default: true)
 * @param {string} props.userRole - Current user's role for context-aware descriptions (default: 'user')
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The rendered component
 */
const EventDescriptionDisplay = ({
  event,
  format = 'standard',
  showTooltip = true,
  userRole = 'user',
  className = '',
}) => {
  // State for tooltip visibility
  const [showDetails, setShowDetails] = useState(false);

  // If no event is provided, return placeholder
  if (!event) {
    return (
      <span className={`text-gray-400 italic ${className}`}>No event data</span>
    );
  }

  // Generate the natural language description
  const description = formatEventDescription(event, format);

  // Technical details to show in tooltip
  const technicalDetails = {
    action: event.action || 'Unknown action',
    category: event.eventCategory
      ? getCategoryDescription(event.eventCategory)
      : 'Uncategorized',
    severity: event.severityLevel
      ? getSeverityDescription(event.severityLevel)
      : 'Unknown severity',
    timestamp: new Date(event.timestamp).toLocaleString(),
    status: event.status || 'Unknown status',
  };

  // Toggle tooltip visibility
  const toggleDetails = () => {
    setShowDetails((prev) => !prev);
  };

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`}>
      {/* Main description text */}
      <span className="text-gray-900 dark:text-white">{description}</span>

      {/* Info icon with tooltip (only if showTooltip is true) */}
      {showTooltip && (
        <>
          <button
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-full"
            onClick={toggleDetails}
            onMouseEnter={() => setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
            aria-label="Show technical details"
            aria-expanded={showDetails}
          >
            <Info size={16} />
          </button>

          {/* Tooltip with technical details */}
          {showDetails && (
            <div
              className="absolute z-10 top-full mt-2 left-0 bg-white dark:bg-gray-800 shadow-lg rounded-md p-3 text-sm w-64"
              role="tooltip"
              aria-hidden={!showDetails}
            >
              <div className="space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">
                  Technical Details
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    Action:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {technicalDetails.action}
                  </span>

                  <span className="text-gray-500 dark:text-gray-400">
                    Category:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {technicalDetails.category}
                  </span>

                  <span className="text-gray-500 dark:text-gray-400">
                    Severity:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {technicalDetails.severity}
                  </span>

                  <span className="text-gray-500 dark:text-gray-400">
                    Status:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {technicalDetails.status}
                  </span>

                  <span className="text-gray-500 dark:text-gray-400">
                    Time:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {technicalDetails.timestamp}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventDescriptionDisplay;
