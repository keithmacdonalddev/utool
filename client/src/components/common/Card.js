import React from 'react';

const Card = ({
  children,
  title = null,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footer = null,
  footerClassName = '',
  variant = 'default', // 'default', 'elevated', 'outline'
}) => {
  const variantClasses = {
    default: 'bg-card border border-dark-700',
    elevated: 'bg-card shadow-lg border border-dark-800',
    outline: 'bg-transparent border border-dark-600'
  };

  return (
    <div
      className={`p-6 rounded-lg ${variantClasses[variant]} text-text transition-all hover:shadow-md ${className}`}
    >
      {title && (
        <div className={`mb-4 ${headerClassName}`}>
          {typeof title === 'string' ? (
            <h3 className="text-xl font-semibold text-text">{title}</h3>
          ) : (
            title
          )}
        </div>
      )}

      <div className={`${bodyClassName}`}>{children}</div>

      {footer && <div className={`mt-4 pt-4 border-t border-dark-700 ${footerClassName}`}>{footer}</div>}
    </div>
  );
};

export default Card;
