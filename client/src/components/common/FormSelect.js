import React from 'react';

const FormSelect = ({
  id,
  label,
  required = false,
  error = null,
  disabled = false,
  className = '',
  labelClassName = '',
  selectClassName = '',
  helpText = null,
  options = [],
  variant = 'default', // 'default', 'filled'
  ...props
}) => {
  // Base styling
  const baseSelectClasses = `
    w-full px-3 py-2 rounded-md border
    focus:outline-none focus:ring-2 focus:ring-primary
    transition-colors duration-200
  `;

  // Variant styling
  const variantClasses = {
    default: 'bg-dark-700 border-dark-600 hover:border-dark-500',
    filled: 'bg-dark-800 border-dark-700 hover:bg-dark-700'
  };

  // State styling
  const stateClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : '';

  const errorClasses = error ? 'border-error focus:ring-error' : '';

  const labelClasses = `
    block text-text text-sm font-medium mb-1.5
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

      <select
        id={id}
        disabled={disabled}
        className={`
          ${baseSelectClasses}
          ${variantClasses[variant]}
          ${stateClasses}
          ${errorClasses}
          ${selectClassName}
        `}
        {...props}
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-dark-800 text-text"
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-error text-xs mt-1.5">{error}</p>
      )}

      {helpText && !error && (
        <p className="text-text-muted text-xs mt-1.5">{helpText}</p>
      )}
    </div>
  );
};

export default FormSelect;
