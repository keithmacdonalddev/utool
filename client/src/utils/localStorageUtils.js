/**
 * Local Storage utilities for consistent data persistence across the application
 * Provides functions for reading, writing, and managing localStorage with type safety
 */

import { logApp } from './logger';

/**
 * Storage keys used across the application
 * Centralizing these prevents typos and makes refactoring easier
 */
export const STORAGE_KEYS = {
  WEATHER: 'weatherData',
  STOCK: 'stockData',
  STOCK_API_CALLS: 'stockApiCalls',
  STOCK_COOLDOWN: 'stockCooldown',
  STOCK_SYMBOLS: 'stockSymbols',
  LAST_MIDNIGHT_RESET: 'lastMidnightReset',
};

/**
 * Gets an item from localStorage with proper error handling and typing
 * @param {string} key - The localStorage key
 * @param {boolean} parseJson - Whether to parse the value as JSON
 * @returns {any} The stored value or null if not found/invalid
 */
export const getStorageItem = (key, parseJson = true) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return parseJson ? JSON.parse(item) : item;
  } catch (error) {
    logApp('LocalStorage', `Error getting item [${key}]:`, error);
    return null;
  }
};

/**
 * Sets an item in localStorage with proper error handling
 * @param {string} key - The localStorage key
 * @param {any} value - The value to store
 * @returns {boolean} Success indicator
 */
export const setStorageItem = (key, value) => {
  try {
    const serializedValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    logApp('LocalStorage', `Error setting item [${key}]:`, error);
    return false;
  }
};

/**
 * Removes an item from localStorage
 * @param {string} key - The localStorage key to remove
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    logApp('LocalStorage', `Error removing item [${key}]:`, error);
  }
};

/**
 * Checks if midnight has passed since last reset and resets counters if needed
 * Important for resetting daily limits and counters
 * @returns {boolean} True if reset was performed
 */
export const checkAndResetAtMidnight = () => {
  const now = new Date();
  const today = now.toDateString();
  const lastResetDay = getStorageItem(STORAGE_KEYS.LAST_MIDNIGHT_RESET, false);

  if (lastResetDay !== today) {
    // It's a new day, reset all daily counters
    setStorageItem(STORAGE_KEYS.STOCK_API_CALLS, 0);
    setStorageItem(STORAGE_KEYS.LAST_MIDNIGHT_RESET, today);
    logApp('LocalStorage', 'Daily reset performed at midnight');
    return true;
  }

  return false;
};

export default {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  checkAndResetAtMidnight,
};
