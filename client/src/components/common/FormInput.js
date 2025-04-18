import React from 'react';

const FormInput = ({
  id,
  label,
  type = 'text',
  required = false,
  error = null,
  disabled = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  helpText = null,
  variant = 'default', // 'default', 'filled'
  ...props
}) => {
  // Base styling
  const baseInputClasses = `
    w-full px-3 py-2 rounded-md border
    focus:outline-none focus:ring-2 focus:ring-primary
    transition-colors duration-200
  `;

  // Variant styling - using dark theme colors to match the UI
  const variantClasses = {
    default:
      'bg-dark-700 text-foreground border-dark-600 hover:border-dark-500',
    filled: 'bg-dark-800 text-foreground border-dark-600 hover:bg-dark-700',
  };

  // State styling
  const stateClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const errorClasses = error ? 'border-error focus:ring-error' : '';

  const labelClasses = `
    block text-foreground text-sm font-medium mb-1.5
    ${error ? 'text-error' : ''}
    ${labelClassName}
  `;

  return (
    <div className={`mb-5 ${className}`}>
      {label && (
        <label className={labelClasses} htmlFor={id}>
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <input
        id={id}
        type={type}
        disabled={disabled}
        className={`
          ${baseInputClasses}
          ${variantClasses[variant]}
          ${stateClasses}
          ${errorClasses}
          ${inputClassName}
        `}
        {...props}
      />

      {error && <p className="text-error text-xs mt-1.5">{error}</p>}

      {helpText && !error && (
        <p className="text-text-muted text-xs mt-1.5">{helpText}</p>
      )}
    </div>
  );
};

export default FormInput;
