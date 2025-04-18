import React from 'react';

const Button = ({
  children,
  className = '',
  variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost'
  size = 'md', // 'sm', 'md', 'lg'
  disabled = false,
  ...props
}) => {
  const baseClasses =
    'font-medium rounded-md focus:outline-none transition-colors';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary:
      'bg-primary text-text hover:bg-primary-dark focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-800',
    secondary:
      'bg-secondary text-text hover:bg-secondary-dark focus:ring-secondary focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-800',
    danger:
      'bg-error text-text hover:bg-error-dark focus:ring-error focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-800',
    ghost:
      'text-primary hover:bg-dark-700 focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-800',
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${disabled ? disabledClasses : ''}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Export both as default and named export to support both import styles
export { Button };
export default Button;
