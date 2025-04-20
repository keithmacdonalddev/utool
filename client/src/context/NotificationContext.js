import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import socket from '../utils/socket'; // Import as default export instead of named export
import { toast } from 'react-toastify';
import { PinIcon, XCircleIcon } from 'lucide-react';

// Create context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pinnedToasts, setPinnedToasts] = useState([]);
  const { user } = useSelector((state) => state.auth);

  // Fetch initial notifications and set up socket listener
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();

      // Make sure socket exists before attaching listeners
      if (socket && typeof socket.on === 'function') {
        // Set up socket listener for new notifications
        socket.on('notification', (notification) => {
          // Add the new notification to the state
          setNotifications((prevNotifications) => [
            notification,
            ...prevNotifications,
          ]);
          // Increment unread count
          setUnreadCount((prevCount) => prevCount + 1);

          // Show toast notification
          showSystemNotification(notification);
        });

        // Clean up the socket listener when the component unmounts
        return () => {
          if (socket && typeof socket.off === 'function') {
            socket.off('notification');
          }
        };
      }
    }
  }, [user]);

  // Custom function to display toast notification with pin/close buttons
  const showSystemNotification = (notification) => {
    const toastId = notification._id || Date.now().toString();

    const ToastContent = () => (
      <div className="flex flex-col">
        <div
          className="cursor-pointer"
          onClick={() => handleNotificationClick(notification)}
        >
          <strong>{notification.title}</strong>
          <p>{notification.message}</p>
        </div>
        <div className="flex justify-end mt-1 space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePinToast(toastId, notification);
            }}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            title="Pin notification"
          >
            <PinIcon size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(toastId);
            }}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            title="Close"
          >
            <XCircleIcon size={16} />
          </button>
        </div>
      </div>
    );

    toast(<ToastContent />, {
      position: 'top-right',
      autoClose: 5000,
      closeOnClick: false, // Don't close when clicking content
      closeButton: false, // Hide default close button
      draggable: true,
      pauseOnHover: true,
      toastId: toastId,
      type: notification.type || 'info',
    });
  };

  // Handle pinning a toast notification
  const handlePinToast = (toastId, notification) => {
    // First dismiss the auto-closing toast
    toast.dismiss(toastId);

    // Create a new pinned version that won't auto-close
    const pinnedToastId = `pinned-${toastId}`;

    const PinnedToastContent = () => (
      <div className="flex flex-col">
        <div className="flex items-start">
          <div
            className="cursor-pointer flex-grow"
            onClick={() => handleNotificationClick(notification)}
          >
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>
          <div className="ml-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(pinnedToastId);
                setPinnedToasts((prev) =>
                  prev.filter((id) => id !== pinnedToastId)
                );
              }}
              className="p-1 hover:bg-gray-700 rounded-full transition-colors"
              title="Close"
            >
              <XCircleIcon size={16} />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">Pinned notification</div>
      </div>
    );

    toast(<PinnedToastContent />, {
      position: 'top-right',
      autoClose: false, // Never auto-close pinned notifications
      closeOnClick: false,
      closeButton: false,
      draggable: true,
      pauseOnHover: true,
      toastId: pinnedToastId,
      type: notification.type || 'info',
      className: 'pinned-toast border-l-4 border-amber-500',
    });

    // Keep track of pinned toasts
    setPinnedToasts((prev) => [...prev, pinnedToastId]);
  };

  // Show a notification with the ability to pin
  const showNotification = (message, type = 'info') => {
    // Create notification object
    const notification = {
      _id: Date.now().toString(),
      title:
        type === 'error'
          ? 'Error'
          : type === 'success'
          ? 'Success'
          : 'Notification',
      message,
      type,
    };

    // Display the notification
    showSystemNotification(notification);
  };

  // Fetch all notifications from the API
  const fetchNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Mark a notification as read
  const markAsRead = async (id) => {
    if (!user) return;

    try {
      await api.put('/notifications/read', { ids: [id] });

      // Update the notification in the local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification._id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );

      // Update the unread count
      setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      await api.put('/notifications/read-all');

      // Update all notifications in the local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete a notification
  const deleteNotification = async (id) => {
    if (!user) return;

    try {
      await api.delete(`/notifications/${id}`);

      // Remove the notification from the local state
      const notificationToRemove = notifications.find((n) => n._id === id);
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notification) => notification._id !== id)
      );

      // Update unread count if the notification was unread
      if (notificationToRemove && !notificationToRemove.isRead) {
        setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user || notifications.length === 0) return;

    try {
      await api.delete('/notifications');

      // Clear all notifications from the local state
      setNotifications([]);

      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark the notification as read
    markAsRead(notification._id);

    // Navigate to the URL if provided
    if (notification.url) {
      window.location.href = notification.url;
    }
  };

  // Value to be provided to consumers
  const contextValue = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    fetchNotifications,
    handleNotificationClick,
    showNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};

export default NotificationContext;
