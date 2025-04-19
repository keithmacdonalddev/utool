import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    handleNotificationClick,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Handle notification item click
  const onNotificationClick = (notification) => {
    handleNotificationClick(notification);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="p-2 rounded-full hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-400 relative"
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={unreadCount > 0 ? 'text-accent-purple' : 'text-gray-400'}
        />

        {/* Notification Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.2rem] h-[1.2rem]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-dark-700 shadow-lg rounded-md max-h-[80vh] overflow-hidden flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-dark-700">
            <h3 className="text-base font-semibold">Notifications</h3>
            <div className="flex space-x-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1 hover:bg-dark-700 rounded text-xs flex items-center text-gray-400 hover:text-white"
                  title="Mark all as read"
                >
                  <Check size={14} className="mr-1" />
                  <span>Read all</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="p-1 hover:bg-dark-700 rounded text-xs flex items-center text-gray-400 hover:text-white"
                  title="Clear all notifications"
                >
                  <Trash2 size={14} className="mr-1" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-6">
                <div className="animate-pulse text-accent-blue">Loading...</div>
              </div>
            ) : notifications.length > 0 ? (
              <ul className="py-1">
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    className={`p-3 hover:bg-dark-700 border-b border-dark-700 cursor-pointer ${
                      !notification.isRead ? 'bg-dark-800' : ''
                    }`}
                  >
                    <div
                      className="flex justify-between"
                      onClick={() => onNotificationClick(notification)}
                    >
                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            !notification.isRead
                              ? 'font-semibold'
                              : 'text-gray-300'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.createdAt &&
                            formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true }
                            )}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="p-1 hover:bg-dark-600 rounded-full"
                        title="Delete notification"
                      >
                        <X
                          size={14}
                          className="text-gray-400 hover:text-gray-200"
                        />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Bell size={24} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-400">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
