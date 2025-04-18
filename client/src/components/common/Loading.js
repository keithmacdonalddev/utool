import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading component to display loading states consistently across the application
 * @param {string} size - Size of the loader: 'sm', 'md', 'lg', 'xl'
 * @param {string} message - Optional message to display
 * @param {string} className - Additional CSS classes
 * @param {boolean} fullScreen - Whether to display in fullscreen mode
 * @param {string} variant - 'default', 'primary', 'secondary'
 */
const Loading = ({
  size = 'md',
  message = '',
  className = '',
  fullScreen = false,
  variant = 'primary',
}) => {
  const sizeConfig = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const variantColors = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    default: 'text-text-muted'
  };

  const iconSize = sizeConfig[size] || sizeConfig.md;
  const iconColor = variantColors[variant] || variantColors.primary;

  const containerClass = fullScreen
    ? 'fixed inset-0 bg-dark-900 bg-opacity-80 flex items-center justify-center z-50'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="flex flex-col items-center">
        <Loader2 className={`${iconSize} ${iconColor} animate-spin`} />
        {message && (
          <p className="mt-4 text-text font-medium text-center">{message}</p>
        )}
      </div>
    </div>
  );
};

export default Loading;
