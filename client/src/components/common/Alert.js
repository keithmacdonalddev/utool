import React from 'react';
import { AlertTriangle, CheckCircle, X, Info, AlertCircle } from 'lucide-react';

/**
 * Alert component for displaying notifications
 * @param {string} type - The type of alert: 'error', 'success', 'info', 'warning'
 * @param {string} message - The message to display
 * @param {function} onClose - Optional close handler
 * @param {string} className - Optional additional classes
 * @param {boolean} dismissable - Whether the alert can be dismissed
 */
const Alert = ({
  type = 'info',
  message,
  onClose = null,
  className = '',
  dismissable = true,
}) => {
  if (!message) return null;

  // Define type-specific settings
  const typeConfig = {
    error: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-400',
      icon: <AlertTriangle className="w-5 h-5 text-red-700" />,
    },
    success: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-400',
      icon: <CheckCircle className="w-5 h-5 text-green-700" />,
    },
    warning: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-400',
      icon: <AlertCircle className="w-5 h-5 text-yellow-700" />,
    },
    info: {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-400',
      icon: <Info className="w-5 h-5 text-blue-700" />,
    },
  };

  const { bgColor, textColor, borderColor, icon } =
    typeConfig[type] || typeConfig.info;

  return (
    <div
      className={`${bgColor} ${textColor} border ${borderColor} px-4 py-3 rounded relative mb-4 ${className}`}
      role="alert"
    >
      <div className="flex items-center">
        <span className="mr-2">{icon}</span>
        <span>
          <strong className="font-bold mr-1">
            {type === 'error'
              ? 'Error!'
              : type === 'success'
              ? 'Success!'
              : type === 'warning'
              ? 'Warning!'
              : 'Info:'}
          </strong>
          {message}
        </span>

        {dismissable && onClose && (
          <button
            onClick={onClose}
            className={`${textColor} absolute top-0 right-0 mt-3 mr-4 focus:outline-none`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
