import React from 'react';

const FormCheckbox = ({
  id,
  label,
  error = null,
  disabled = false,
  className = '',
  labelClassName = '',
  checkboxClassName = '',
  helpText = null,
  ...props
}) => {
  // Standardized form control styling
  const baseCheckboxClasses =
    'h-5 w-5 text-blue-500 border-dark-600 rounded focus:ring-blue-500 focus:ring-2 transition-colors';

  // Dynamic styling based on props
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  // Custom label styling
  const labelClasses = `ml-2 text-text text-sm font-medium ${labelClassName}`;

  return (
    <div className={`mb-4 ${className}`}>
      <label className="flex items-center">
        <input
          id={id}
          type="checkbox"
          disabled={disabled}
          className={`form-checkbox ${baseCheckboxClasses} ${disabledClasses} ${checkboxClassName}`}
          {...props}
        />
        {label && <span className={labelClasses}>{label}</span>}
      </label>

      {error && <p className="text-red-500 text-xs italic mt-1">{error}</p>}

      {helpText && !error && (
        <p className="text-text-muted text-xs mt-1">{helpText}</p>
      )}
    </div>
  );
};

export default FormCheckbox;
