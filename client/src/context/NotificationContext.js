import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import socket from '../utils/socket'; // Import as default export instead of named export
import { toast } from 'react-toastify';

// Create context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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
          toast.info(
            <div onClick={() => handleNotificationClick(notification)}>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>,
            {
              position: 'top-right',
              autoClose: 5000,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
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
