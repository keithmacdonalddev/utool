import React from 'react';

const Spinner = ({ size = 'md', className = '' }) => {
  // Size classes for the spinner
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div className={`${className} flex justify-center items-center`}>
      <div
        className={`${
          sizeClasses[size] || sizeClasses.md
        } rounded-full border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin`}
      ></div>
    </div>
  );
};

// Export both as named export and default
export { Spinner };
export default Spinner;
