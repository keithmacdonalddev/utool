import React from 'react';

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  // Default fallback to generate avatar if user doesn't have one
  const generateAvatar = (user) => {
    const name = user?.name || user?.email || '?';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&size=128`;
  };

  const avatarSrc = user?.avatar || generateAvatar(user);
  const displayName = user?.name || user?.email || 'User';

  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={`${className} flex flex-col items-center`}>
      <img
        src={avatarSrc}
        alt={displayName}
        className={`${
          sizeClasses[size] || sizeClasses.md
        } rounded-full object-cover border-2 border-dark-600 hover:border-primary transition-colors`}
        title={displayName}
      />
    </div>
  );
};

// Export both as named export and default
export { UserAvatar };
export default UserAvatar;
