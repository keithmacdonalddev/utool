import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/cn';

/**
 * TaskBadge - A reusable badge component for displaying task status, priority, or type
 * @param {Object} props - Component props
 * @param {string} props.variant - The type of badge: 'status', 'priority', or 'type'
 * @param {string} props.value - The value to display (e.g., 'todo', 'high', 'bug')
 * @param {string} [props.size='md'] - Size of the badge: 'sm', 'md', or 'lg'
 * @param {string} [props.className] - Additional CSS classes
 * @param {React.ReactNode} [props.children] - Optional children to display instead of formatted value
 */
export const TaskBadge = ({
  variant = 'status',
  value,
  size = 'md',
  className,
  children,
}) => {
  // Define color schemes for different variants and values
  const variants = {
    status: {
      todo: { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-300' },
      'in-progress': {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        ring: 'ring-blue-300',
      },
      'in-review': {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        ring: 'ring-purple-300',
      },
      blocked: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
      done: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        ring: 'ring-green-300',
      },
      cancelled: {
        bg: 'bg-gray-100',
        text: 'text-gray-500',
        ring: 'ring-gray-300',
      },
    },
    priority: {
      low: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        ring: 'ring-green-300',
      },
      medium: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        ring: 'ring-yellow-300',
      },
      high: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        ring: 'ring-orange-300',
      },
      urgent: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
    },
    type: {
      task: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300' },
      bug: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300' },
      feature: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        ring: 'ring-green-300',
      },
      epic: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        ring: 'ring-purple-300',
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
  const colorScheme = variants[variant]?.[value] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    ring: 'ring-gray-300',
  };

  // Format the display text
  const displayText =
    children ||
    value
      ?.split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center font-medium rounded-full ring-1 ring-inset',
        // Dynamic color scheme
        colorScheme.bg,
        colorScheme.text,
        colorScheme.ring,
        // Size variations
        sizes[size],
        // Additional classes
        className
      )}
    >
      {displayText}
    </span>
  );
};

TaskBadge.propTypes = {
  /** The type of badge to render */
  variant: PropTypes.oneOf(['status', 'priority', 'type']).isRequired,
  /** The value to display in the badge */
  value: PropTypes.string.isRequired,
  /** Size of the badge */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Additional CSS classes to apply */
  className: PropTypes.string,
  /** Optional children to override the default formatted display */
  children: PropTypes.node,
};

TaskBadge.defaultProps = {
  size: 'md',
  className: '',
  children: null,
};

// Export utility functions
export const getStatusColor = (status) => {
  const colors = {
    todo: 'gray',
    'in-progress': 'blue',
    'in-review': 'purple',
    blocked: 'red',
    done: 'green',
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
};

export const getPriorityColor = (priority) => {
  const colors = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    urgent: 'red',
  };
  return colors[priority] || 'gray';
};
