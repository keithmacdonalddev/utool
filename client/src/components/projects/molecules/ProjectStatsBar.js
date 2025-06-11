import React from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, TrendingDown, Activity, Archive } from 'lucide-react';

/**
 * ProjectStatsBar - Displays project statistics in a clean card-based layout
 *
 * This component shows key project metrics in a visually appealing way,
 * helping users quickly understand the overall state of their projects.
 *
 * @param {Object} props - Component props
 * @param {Object} props.stats - Statistics object containing project counts
 * @param {number} props.stats.total - Total number of projects
 * @param {number} props.stats.active - Number of active projects
 * @param {number} props.stats.completed - Number of completed projects
 * @param {number} props.stats.onHold - Number of projects on hold
 * @param {string} props.className - Additional CSS classes
 */
const ProjectStatsBar = ({ stats, className = '' }) => {
  // Define the statistics items with their corresponding icons and colors
  // This follows the milestone specification for stat items
  const statItems = [
    {
      label: 'Total Projects',
      value: stats?.total || 0,
      icon: Activity,
      // Using blue colors to match existing primary theme
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Active',
      value: stats?.active || 0,
      icon: TrendingUp,
      // Green for active/positive status
      color: 'text-green-400',
      bgColor: 'bg-green-900/30',
      borderColor: 'border-green-500/20',
    },
    {
      label: 'Completed',
      value: stats?.completed || 0,
      icon: Archive,
      // Purple for completed status
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/30',
      borderColor: 'border-purple-500/20',
    },
    {
      label: 'On Hold',
      value: stats?.onHold || 0,
      icon: TrendingDown,
      // Yellow/orange for warning/paused status
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/30',
      borderColor: 'border-yellow-500/20',
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {statItems.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <div
            key={index}
            className={`
              bg-dark-800 border rounded-lg p-4 transition-all duration-200 hover:bg-dark-700
              ${stat.borderColor}
            `}
          >
            {/* Header with label and icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400 font-medium">
                {stat.label}
              </span>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon size={20} className={stat.color} />
              </div>
            </div>

            {/* Value display */}
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// PropTypes for development-time validation
ProjectStatsBar.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number,
    active: PropTypes.number,
    completed: PropTypes.number,
    onHold: PropTypes.number,
  }),
  className: PropTypes.string,
};

// Default props for graceful fallbacks
ProjectStatsBar.defaultProps = {
  stats: {
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0,
  },
  className: '',
};

export default ProjectStatsBar;
