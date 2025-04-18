import React from 'react';

const Input = ({
  id,
  type = 'text',
  label,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  className = '',
  error = '',
  ...props
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-text text-sm font-bold mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 rounded-md border bg-dark-700 text-foreground border-dark-600 hover:border-dark-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-200 ${
          error ? 'border-error' : ''
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
};

// Export both as named export and default
export { Input };
export default Input;
