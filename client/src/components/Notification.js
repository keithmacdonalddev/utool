import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center justify-between min-w-[300px]`}>
      <div>{message}</div>
      <button 
        onClick={onClose}
        className="ml-4 hover:text-gray-200"
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Notification;
