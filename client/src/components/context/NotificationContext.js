import React, { createContext, useContext } from 'react';

// Mock notification context - basic implementation for compilation
// This should be implemented with proper notification functionality later

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return mock functions for compilation
    return {
      showNotification: () => {},
      showError: () => {},
      showSuccess: () => {},
      showWarning: () => {},
      hideNotification: () => {},
    };
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const value = {
    showNotification: () => {},
    showError: () => {},
    showSuccess: () => {},
    showWarning: () => {},
    hideNotification: () => {},
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
