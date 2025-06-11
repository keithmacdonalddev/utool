import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/cn';

/**
 * UserAvatar - Display user avatar with image or initials fallback
 * @param {Object} props - Component props
 * @param {Object} props.user - User object containing name, email, and optional avatar
 * @param {string} props.user.name - User's display name
 * @param {string} [props.user.email] - User's email address (fallback for name display)
 * @param {string} [props.user.avatar] - URL to user's avatar image
 * @param {string} [props.size='md'] - Size of the avatar: 'xs', 'sm', 'md', 'lg', 'xl'
 * @param {boolean} [props.showName=false] - Whether to display the name next to the avatar
 * @param {string} [props.className] - Additional CSS classes
 */
export const UserAvatar = ({
  user,
  size = 'md',
  showName = false,
  className,
}) => {
  if (!user) {
    return null;
  }

  const sizes = {
    xs: 'h-5 w-5 text-xs',
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-sm',
    xl: 'h-12 w-12 text-base',
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBackgroundColor = (name) => {
    if (!name) return 'bg-gray-400';

    const colors = [
      'bg-red-400',
      'bg-blue-400',
      'bg-green-400',
      'bg-yellow-400',
      'bg-purple-400',
      'bg-pink-400',
      'bg-indigo-400',
      'bg-cyan-400',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const avatarContent = user.avatar ? (
    <img
      src={user.avatar}
      alt={user.name || 'User'}
      className={cn('rounded-full object-cover', sizes[size])}
    />
  ) : (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium',
        sizes[size],
        getBackgroundColor(user.name)
      )}
    >
      {getInitials(user.name)}
    </div>
  );

  if (showName) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {avatarContent}
        <span className="text-sm font-medium text-gray-900 truncate">
          {user.name || user.email}
        </span>
      </div>
    );
  }

  return (
    <div className={className} title={user.name || user.email}>
      {avatarContent}
    </div>
  );
};

UserAvatar.propTypes = {
  /** User object containing avatar and name information */
  user: PropTypes.shape({
    /** User's display name */
    name: PropTypes.string.isRequired,
    /** User's email address (used as fallback for display) */
    email: PropTypes.string,
    /** URL to user's avatar image */
    avatar: PropTypes.string,
  }).isRequired,
  /** Size of the avatar */
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  /** Whether to show the user's name next to the avatar */
  showName: PropTypes.bool,
  /** Additional CSS classes to apply */
  className: PropTypes.string,
};

UserAvatar.defaultProps = {
  size: 'md',
  showName: false,
  className: '',
};
