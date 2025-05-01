// filepath: c:\Users\macdo\Documents\Cline\mern-productivity-app\client\src\components\auditLogs\UserJourneyViewer.js
import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Activity,
  Info,
  AlertTriangle,
  AlertCircle,
  Tag,
  Hash,
  Globe,
  Monitor,
  Database,
  Check,
  X,
  Eye,
} from 'lucide-react';
import EventDescriptionDisplay from './EventDescriptionDisplay'; // Import the new component

/**
 * UserJourneyViewer Component
 *
 * This component visualizes user journeys, which are sequences of related audit log events
 * grouped by journeyId. It displays journeys as interactive timelines that can be expanded
 * to show the details of each event.
 *
 * Features:
 * - Collapsible journey timelines
 * - Visual indicators for event severity (info, warning, critical)
 * - Detailed view of individual events
 * - Visualization of event sequences and relationships
 * - Highlighting of state changes between events
 *
 * @param {Object} props Component props
 * @param {Array} props.journeys Array of user journeys to display
 * @param {Function} props.onViewDetails Function to call when viewing event details
 * @returns {JSX.Element} The rendered UserJourneyViewer component
 */
const UserJourneyViewer = ({ journeys = [], onViewDetails }) => {
  // State for tracking which journeys and events are expanded
  const [expandedJourneys, setExpandedJourneys] = useState({});
  const [expandedEvents, setExpandedEvents] = useState({});

  /**
   * Toggle the expanded state of a journey
   *
   * @param {string} journeyId The ID of the journey to toggle
   */
  const toggleJourney = (journeyId) => {
    setExpandedJourneys((prev) => ({
      ...prev,
      [journeyId]: !prev[journeyId],
    }));
  };

  /**
   * Toggle the expanded state of an event within a journey
   *
   * @param {string} eventId The ID of the event to toggle
   */
  const toggleEvent = (eventId) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  /**
   * Get appropriate severity icon based on severity level
   *
   * @param {string} severity The severity level ('info', 'warning', 'critical')
   * @returns {JSX.Element} The icon component for the severity level
   */
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'info':
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  /**
   * Get appropriate status icon and color based on event status
   *
   * @param {string} status The event status ('success', 'failed', 'pending')
   * @returns {Object} Object containing the icon component and CSS class
   */
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'success':
        return {
          icon: <Check size={16} />,
          className:
            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        };
      case 'failed':
        return {
          icon: <X size={16} />,
          className:
            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        };
      case 'pending':
        return {
          icon: <Clock size={16} />,
          className:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        };
      default:
        return {
          icon: <Info size={16} />,
          className:
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };
    }
  };

  /**
   * Get category icon based on event category
   *
   * @param {string} category The event category
   * @returns {JSX.Element} The icon component for the category
   */
  const getCategoryIcon = (category) => {
    // Check if category is undefined or null
    if (!category) {
      return <Hash size={16} />;
    }

    switch (category) {
      case 'authentication':
        return <User size={16} />;
      case 'data_access':
        return <Eye size={16} />;
      case 'data_modification':
        return <Database size={16} />;
      case 'permission':
        return <Tag size={16} />;
      case 'system':
        return <Monitor size={16} />;
      default:
        return <Hash size={16} />;
    }
  };

  /**
   * Format a timestamp in a human-readable way
   *
   * @param {string} timestamp ISO timestamp string
   * @returns {string} Formatted date and time
   */
  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm:ss a');
    } catch (error) {
      return 'Invalid date';
    }
  };

  /**
   * Render the list of changed fields from an event
   *
   * @param {Array} changedFields Array of field names that changed
   * @returns {JSX.Element} Rendered list of changed fields
   */
  const renderChangedFields = (changedFields) => {
    if (!changedFields || changedFields.length === 0) {
      return (
        <span className="text-gray-500 dark:text-gray-400">No changes</span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {changedFields.map((field) => (
          <span
            key={field}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
          >
            {field}
          </span>
        ))}
      </div>
    );
  };

  /**
   * The component's render method
   *
   * This renders the entire UserJourneyViewer, including:
   * - Journey headers showing user and timestamp range
   * - Timeline visualization for each journey
   * - Collapsible events with details
   * - Empty state when no journeys are available
   */
  return (
    <div className="space-y-6">
      {journeys.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No user journeys found for the selected time period.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Try adjusting your filters or date range.
          </p>
        </div>
      ) : (
        journeys.map((journey, index) => {
          // Sort events by timestamp
          const sortedEvents = [...journey.events].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );

          // Get first and last timestamps for the journey duration display
          const firstEvent = sortedEvents[0];
          const lastEvent = sortedEvents[sortedEvents.length - 1];

          // Determine the user for this journey (use the first event with a userId)
          const userEvent = sortedEvents.find((event) => event.userId);
          const userName = userEvent?.userId?.name || 'Anonymous User';

          // Calculate journey duration
          const journeyStart = new Date(firstEvent.timestamp);
          const journeyEnd = new Date(lastEvent.timestamp);
          const durationMs = journeyEnd - journeyStart;
          const durationSec = Math.floor(durationMs / 1000);
          const durationMin = Math.floor(durationSec / 60);

          // Format journey duration for display
          let durationText = '';
          if (durationMin > 0) {
            durationText = `${durationMin} min ${durationSec % 60} sec`;
          } else {
            durationText = `${durationSec} sec`;
          }

          const isExpanded = !!expandedJourneys[journey.journeyId];

          return (
            <div
              key={`journey-${journey.journeyId || index}`}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
            >
              {/* Journey Header */}
              <div
                className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer flex justify-between items-center"
                onClick={() => toggleJourney(journey.journeyId)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                  <User
                    size={16}
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <h3 className="font-medium">{userName}</h3>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Activity size={16} />
                    <span>{sortedEvents.length} events</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{durationText}</span>
                  </div>

                  <div>{formatTime(journeyStart)}</div>
                </div>
              </div>

              {/* Journey Timeline Content */}
              {isExpanded && (
                <div className="p-4">
                  <div className="timeline relative pl-8">
                    {/* Vertical timeline line */}
                    <div className="absolute top-0 left-3 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600" />

                    {/* Timeline Events */}
                    {sortedEvents.map((event, eventIndex) => {
                      const isEventExpanded = !!expandedEvents[event._id];
                      const statusIndicator = getStatusIndicator(event.status);

                      return (
                        <div
                          key={`event-${event._id}`}
                          className={`relative mb-4 pb-4 ${
                            eventIndex === sortedEvents.length - 1
                              ? ''
                              : 'border-b border-gray-100 dark:border-gray-700'
                          }`}
                        >
                          {/* Timeline dot */}
                          <div className="absolute left-[-24px] top-0 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center z-10">
                            {getSeverityIcon(event.severityLevel)}
                          </div>

                          {/* Event Header */}
                          <div
                            className="flex justify-between items-start cursor-pointer mb-1"
                            onClick={() => toggleEvent(event._id)}
                          >
                            <div className="flex items-center gap-2">
                              {isEventExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                              {/* Replace the raw action name with our natural language description */}
                              <EventDescriptionDisplay
                                event={event}
                                format="standard"
                                showTooltip={true}
                                className="font-medium"
                              />
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${
                                  statusIndicator
                                    ? statusIndicator.className
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {statusIndicator ? statusIndicator.icon : null}
                                {event.status || 'Unknown'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {event.timestamp
                                ? formatTime(event.timestamp)
                                : 'Unknown time'}
                            </span>
                          </div>

                          {/* Event Category Badge */}
                          <div className="flex gap-2 items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span className="flex items-center gap-1">
                              {event && event.eventCategory ? (
                                getCategoryIcon(event.eventCategory)
                              ) : (
                                <Hash size={16} />
                              )}
                              {event && event.eventCategory
                                ? event.eventCategory.replace(/_/g, ' ')
                                : 'Unknown'}
                            </span>

                            {event && event.ipAddress && (
                              <span className="flex items-center gap-1">
                                <Globe size={14} />
                                {event.ipAddress}
                              </span>
                            )}
                          </div>

                          {/* Expanded Event Details */}
                          {isEventExpanded && (
                            <div className="mt-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg space-y-2 text-sm">
                              {/* Client Info */}
                              {event.clientInfo && (
                                <div>
                                  <div className="font-medium mb-1">
                                    Client Info
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {event.clientInfo.browser && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          Browser:
                                        </span>{' '}
                                        {event.clientInfo.browser}
                                      </div>
                                    )}
                                    {event.clientInfo.os && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          OS:
                                        </span>{' '}
                                        {event.clientInfo.os}
                                      </div>
                                    )}
                                    {event.clientInfo.device && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          Device:
                                        </span>{' '}
                                        {event.clientInfo.device}
                                      </div>
                                    )}
                                    {event.clientInfo.location && (
                                      <div>
                                        <span className="text-gray-500 dark:text-gray-400">
                                          Location:
                                        </span>{' '}
                                        {event.clientInfo.location}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* State Changes */}
                              {event.stateChanges &&
                                event.stateChanges.changedFields && (
                                  <div>
                                    <div className="font-medium mb-1">
                                      Changed Fields
                                    </div>
                                    {renderChangedFields(
                                      event.stateChanges.changedFields
                                    )}
                                  </div>
                                )}

                              {/* User Context */}
                              {event.userContext &&
                                Object.keys(event.userContext).length > 0 && (
                                  <div>
                                    <div className="font-medium mb-1">
                                      User Context
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {event.userContext.role && (
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">
                                            Role:
                                          </span>{' '}
                                          {event.userContext.role}
                                        </div>
                                      )}
                                      {event.userContext.permissions &&
                                        event.userContext.permissions.length >
                                          0 && (
                                          <div>
                                            <span className="text-gray-500 dark:text-gray-400">
                                              Permissions:
                                            </span>{' '}
                                            {event.userContext.permissions.join(
                                              ', '
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                )}

                              {/* Metadata (if any) */}
                              {event.metadata &&
                                Object.keys(event.metadata).length > 0 && (
                                  <div>
                                    <div className="font-medium mb-1">
                                      Additional Info
                                    </div>
                                    <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                                      {JSON.stringify(event.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}

                              {/* View Details Button */}
                              <div className="flex justify-end">
                                <button
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewDetails && onViewDetails(event);
                                  }}
                                >
                                  <Eye size={14} />
                                  View Full Details
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default UserJourneyViewer;
