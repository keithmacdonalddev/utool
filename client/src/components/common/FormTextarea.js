import React from 'react';

const FormTextarea = ({
  id,
  label,
  required = false,
  error = null,
  disabled = false,
  className = '',
  labelClassName = '',
  textareaClassName = '',
  helpText = null,
  rows = 4,
  maxLength = null,
  showCharCount = false,
  value = '',
  variant = 'default', // 'default', 'filled'
  ...props
}) => {
  // Base styling
  const baseTextareaClasses = `
    w-full px-3 py-2 rounded-md border
    focus:outline-none focus:ring-2 focus:ring-primary
    transition-colors duration-200 min-h-[100px]
  `;

  // Variant styling
  const variantClasses = {
    default:
      'bg-dark-700 text-foreground border-dark-600 hover:border-dark-500',
    filled: 'bg-dark-800 text-foreground border-dark-700 hover:bg-dark-700',
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

      <textarea
        id={id}
        disabled={disabled}
        className={`
          ${baseTextareaClasses}
          ${variantClasses[variant]}
          ${stateClasses}
          ${errorClasses}
          ${textareaClassName}
        `}
        rows={rows}
        maxLength={maxLength}
        value={value} // Explicitly set the value prop
        {...props} // Keep other props like onChange, name, etc.
      />

      {error && <p className="text-error text-xs mt-1.5">{error}</p>}

      {showCharCount && maxLength && (
        <p className="text-text-muted text-xs mt-1.5">
          {value.length || 0}/{maxLength} characters
        </p>
      )}

      {helpText && !error && !showCharCount && (
        <p className="text-text-muted text-xs mt-1.5">{helpText}</p>
      )}
    </div>
  );
};

export default FormTextarea;
