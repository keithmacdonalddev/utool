import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

/**
 * @fileoverview Date utility functions for the application.
 * Provides consistent date formatting and manipulation throughout the project.
 */

/**
 * Format a date for display
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM d, yyyy')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatString = 'MMM d, yyyy') => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return format(dateObj, formatString);
};

/**
 * Format a date relative to now (e.g., "2 days ago")
 * @param {Date|string} date - Date to format
 * @param {Object} options - Options for formatting
 * @returns {string} Relative date string
 */
export const formatRelativeDate = (date, options = {}) => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return formatDistanceToNow(dateObj, { addSuffix: true, ...options });
};

/**
 * Format a date for project display (created/updated dates)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date for project display
 */
export const formatProjectDate = (date) => {
  return formatDate(date, 'MMM d, yyyy');
};

/**
 * Format a date and time
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM d, yyyy h:mm a')
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, formatString = 'MMM d, yyyy h:mm a') => {
  return formatDate(date, formatString);
};

/**
 * Check if a date is valid
 * @param {Date|string} date - Date to validate
 * @returns {boolean} Whether the date is valid
 */
export const isValidDate = (date) => {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj);
};

/**
 * Get a safe date object from various inputs
 * @param {Date|string|number} date - Date input
 * @returns {Date|null} Date object or null if invalid
 */
export const getSafeDate = (date) => {
  if (!date) return null;

  let dateObj;
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  return isValid(dateObj) ? dateObj : null;
};

/**
 * Format a date for display (alias for formatDate)
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'MMM d, yyyy')
 * @returns {string} Formatted date string
 */
export const formatDateForDisplay = (date, formatString = 'MMM d, yyyy') => {
  return formatDate(date, formatString);
};
