import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const Notification = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Configure appearance based on notification type
  const typeConfig = {
    success: {
      bgColor: 'bg-green-500',
      icon: <CheckCircle size={18} />,
    },
    error: {
      bgColor: 'bg-red-500',
      icon: <AlertTriangle size={18} />,
    },
    info: {
      bgColor: 'bg-blue-500',
      icon: <Info size={18} />,
    },
    warning: {
      bgColor: 'bg-yellow-500',
      icon: <AlertTriangle size={18} />,
    },
  };

  const { bgColor, icon } = typeConfig[type] || typeConfig.success;

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between min-w-[300px] animate-fadeIn`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{message}</span>
      </div>
      <button
        onClick={onClose}
        className="ml-4 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full p-1"
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Notification;
