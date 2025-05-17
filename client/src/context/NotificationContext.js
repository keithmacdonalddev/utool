import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import { connectSocketWithToken, disconnectSocket, getSocket } from '../utils/socket';
import { toast } from 'react-toastify';
import { PinIcon, XCircleIcon } from 'lucide-react';

// Create context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pinnedToasts, setPinnedToasts] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const { user, token } = useSelector((state) => state.auth);

  // Custom function to display toast notification with pin/close buttons
  const showSystemNotification = useCallback((notification) => {
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
  }, []);
  
  // Handle pinning a toast notification
  const handlePinToast = useCallback((toastId, notification) => {
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
  }, []);
  
  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    // Mark the notification as read
    markAsRead(notification._id);

    // Navigate to the URL if provided
    if (notification.url) {
      window.location.href = notification.url;
    }
  }, []);
  
  // Memoize the notification handler to stabilize useEffect dependencies
  const handleNewNotification = useCallback((notification) => {
    console.log('Received new notification via socket:', notification);
    setNotifications((prevNotifications) => [
      notification,
      ...prevNotifications,
    ]);
    setUnreadCount((prevCount) => prevCount + 1);
    showSystemNotification(notification);
  }, [showSystemNotification]);
  
  // Show a notification with the ability to pin
  const showNotification = useCallback((message, type = 'info') => {
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
  }, [showSystemNotification]);
  
  // Fetch all notifications from the API - wrapped in useCallback for stability
  const fetchNotifications = useCallback(async () => {
    // Guard clause: Do not attempt to fetch if there's no user or token.
    // This is an additional safeguard, though the useEffect hook should
    // primarily control when this function is called.
    if (!user || !token) return;

    setIsLoading(true);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  // Fetch unread notification count - wrapped in useCallback for stability
  const fetchUnreadCount = useCallback(async () => {
    // Guard clause: Do not attempt to fetch if there's no user or token.
    // Similar to fetchNotifications, this ensures that the function does not
    // proceed without necessary authentication details.
    if (!user || !token) return;

    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      toast.error('Failed to fetch notification count. Please try again later.');
    }
  }, [user, token]);

  // Mark a notification as read
  const markAsRead = async (id) => {
    // Guard clause: Do not attempt to modify data if there's no user or token.
    // All write operations should be protected by ensuring authentication.
    if (!user || !token) return;

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
      toast.error('Failed to mark notification as read.');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    // Guard clause: Ensure user and token are present and there are unread messages.
    if (!user || !token || unreadCount === 0) return;

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
      toast.error('Failed to mark all notifications as read.');
    }
  };

  // Delete a notification
  const deleteNotification = async (id) => {
    // Guard clause: Protect delete operations with user and token check.
    if (!user || !token) return;

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
      toast.error('Failed to delete notification.');
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    // Guard clause: Protect clear all operation, ensure there are notifications to clear.
    if (!user || !token || notifications.length === 0) return;

    try {
      await api.delete('/notifications');

      // Clear all notifications from the local state
      setNotifications([]);

      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear all notifications.');
    }
  };
  
  // Fetch initial notifications and set up socket listener
  useEffect(() => {
    let currentSocket;

    // Ensure both user and token are present before fetching notifications
    // and setting up socket listeners
    if (user && token) {
      fetchNotifications();
      fetchUnreadCount();

      // Connect socket with the current token
      currentSocket = connectSocketWithToken(token);
      
      // Check initial connection state
      if (currentSocket.connected) {
        console.log('Socket already connected in NotificationContext');
        setSocketConnected(true);
      }

      // Set up connection status listeners
      currentSocket.on('connect', () => {
        console.log('Socket connected in NotificationContext');
        setSocketConnected(true);
      });

      currentSocket.on('disconnect', () => {
        console.log('Socket disconnected in NotificationContext');
        setSocketConnected(false);
      });

      // Attach notification listener to the actual socket instance
      currentSocket.on('notification', handleNewNotification);

      // Cleanup: remove listeners when component unmounts or dependencies change
      return () => {
        if (currentSocket) {
          currentSocket.off('connect');
          currentSocket.off('disconnect');
          currentSocket.off('notification', handleNewNotification);
        }
      };
    } else {
      // No user or token, ensure socket is disconnected
      disconnectSocket();
      setSocketConnected(false);
    }
  }, [user, token, handleNewNotification, fetchNotifications, fetchUnreadCount]);

  // Add fallback polling for notifications when socket is disconnected
  useEffect(() => {
    let pollInterval;
    
    if (user && token && !socketConnected) {
      console.log('Socket disconnected, enabling fallback polling for notifications');
      // Poll every 30 seconds if socket is disconnected
      pollInterval = setInterval(() => {
        console.log('Polling for notifications (fallback mode)');
        fetchNotifications();
        fetchUnreadCount();
      }, 30000);
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [user, token, socketConnected, fetchNotifications, fetchUnreadCount]);


  // Value to be provided to consumers
  const contextValue = {
    notifications,
    unreadCount,
    isLoading,
    socketConnected,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
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
