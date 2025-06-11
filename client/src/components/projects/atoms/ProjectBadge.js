import React from 'react';
import PropTypes from 'prop-types';
import {
  Lightbulb,
  Zap,
  AlertTriangle,
  Clock,
  CheckCircle,
  Pause,
  Target,
  MoreHorizontal,
} from 'lucide-react';

/**
 * ProjectBadge - Atomic component for displaying project status, priority, or type
 *
 * This component follows the atomic design principle and serves as a
 * building block for larger components. It's highly reusable and can
 * display different types of badges with consistent styling.
 *
 * @param {Object} props - Component props
 * @param {('status'|'priority'|'type')} props.variant - The type of badge to display
 * @param {string} props.value - The actual value to display (e.g., 'active', 'high', 'development')
 * @param {('sm'|'md'|'lg')} props.size - Size of the badge
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Optional children to render instead of value
 */
export const ProjectBadge = ({
  variant = 'status',
  value,
  size = 'md',
  className,
  children,
}) => {
  // Define color schemes for different variants and values
  // This creates a consistent visual language across the application
  const variants = {
    status: {
      planning: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        ring: 'ring-gray-300',
      },
      active: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        ring: 'ring-blue-300',
      },
      'on-hold': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        ring: 'ring-yellow-300',
      },
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        ring: 'ring-green-300',
      },
      archived: {
        bg: 'bg-gray-100',
        text: 'text-gray-500',
        ring: 'ring-gray-300',
      },
      cancelled: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        ring: 'ring-red-300',
      },
      // Backward compatibility with existing status values
      Planning: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        ring: 'ring-gray-300',
      },
      Active: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        ring: 'ring-blue-300',
      },
      'On Hold': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        ring: 'ring-yellow-300',
      },
      Completed: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        ring: 'ring-green-300',
      },
      Archived: {
        bg: 'bg-gray-100',
        text: 'text-gray-500',
        ring: 'ring-gray-300',
      },
    },
    priority: {
      critical: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        ring: 'ring-red-300',
      },
      high: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        ring: 'ring-orange-300',
      },
      medium: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        ring: 'ring-yellow-300',
      },
      low: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        ring: 'ring-green-300',
      },
      // Backward compatibility with existing priority values
      Critical: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        ring: 'ring-red-300',
      },
      High: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        ring: 'ring-orange-300',
      },
      Medium: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        ring: 'ring-yellow-300',
      },
      Low: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        ring: 'ring-green-300',
      },
    },
    type: {
      development: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        ring: 'ring-purple-300',
      },
      marketing: {
        bg: 'bg-pink-100',
        text: 'text-pink-700',
        ring: 'ring-pink-300',
      },
      design: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-700',
        ring: 'ring-indigo-300',
      },
      research: {
        bg: 'bg-cyan-100',
        text: 'text-cyan-700',
        ring: 'ring-cyan-300',
      },
      operations: {
        bg: 'bg-teal-100',
        text: 'text-teal-700',
        ring: 'ring-teal-300',
      },
      other: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        ring: 'ring-gray-300',
      },
    },
  };

  // Define size variations
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  // Get the appropriate color scheme
  // Fallback to a default gray scheme if the value isn't recognized
  const colorScheme = variants[variant]?.[value] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    ring: 'ring-gray-300',
  };

  // Format the display text
  // Convert value to a more readable format (e.g., 'on-hold' -> 'On Hold')
  const displayText =
    children ||
    value
      ?.split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ring-1 ring-inset ${
        colorScheme.bg
      } ${colorScheme.text} ${colorScheme.ring} ${sizes[size]} ${
        className || ''
      }`}
    >
      {displayText}
    </span>
  );
};

// PropTypes validation for development and runtime error prevention
ProjectBadge.propTypes = {
  variant: PropTypes.oneOf(['status', 'priority', 'type']),
  value: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
  children: PropTypes.node,
};

ProjectBadge.defaultProps = {
  variant: 'status',
  size: 'md',
  className: '',
  children: null,
};

// Export additional utility functions for use in other components
export const getStatusColor = (status) => {
  const colors = {
    planning: 'gray',
    active: 'blue',
    'on-hold': 'yellow',
    completed: 'green',
    archived: 'gray',
    cancelled: 'red',
    // Backward compatibility
    Planning: 'gray',
    Active: 'blue',
    'On Hold': 'yellow',
    Completed: 'green',
    Archived: 'gray',
  };
  return colors[status] || 'gray';
};

export const getPriorityColor = (priority) => {
  const colors = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'green',
    // Backward compatibility
    Critical: 'red',
    High: 'orange',
    Medium: 'yellow',
    Low: 'green',
  };
  return colors[priority] || 'gray';
};

export default ProjectBadge;
