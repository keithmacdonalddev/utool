import React from 'react';

const Button = ({
  children,
  className = '',
  variant = 'primary', // 'primary', 'secondary', 'danger'
  ...props
}) => {
  let base =
    'font-bold rounded-xl shadow px-4 py-2 focus:outline-none transition duration-150 ease-in-out';
  let color =
    variant === 'primary'
      ? 'bg-[#7C3AED] text-[#F8FAFC] hover:bg-[#A78BFA]'
      : variant === 'secondary'
      ? 'bg-dark-700 text-[#F8FAFC] border border-[#393A41] hover:bg-dark-600'
      : variant === 'danger'
      ? 'bg-red-600 text-[#F8FAFC] hover:bg-red-700'
      : '';

  return (
    <button className={`${base} ${color} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
