/**
 * Date Utility Functions
 *
 * This file contains utility functions for consistent date handling
 * throughout the application to ensure dates are properly formatted,
 * parsed, and displayed across components.
 */

/**
 * Normalizes a date string or object into a consistent ISO format
 * This helps prevent inconsistencies in how dates are handled between
 * the server and client, especially for MongoDB date fields
 *
 * @param {string|Date|null} dateValue - The date to normalize
 * @returns {string|null} - An ISO string date or null if input was invalid/empty
 */
export const normalizeDate = (dateValue) => {
  // Handle null/undefined/empty cases
  if (!dateValue) return null;

  try {
    // Convert to Date object (if it's not already)
    const dateObj = new Date(dateValue);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date encountered:', dateValue);
      return null;
    }

    // Return a consistent ISO string format
    return dateObj.toISOString();
  } catch (err) {
    console.error('Error normalizing date:', err, dateValue);
    return null;
  }
};

/**
 * Formats a date for display in the UI with consistent timezone handling
 * Ensures dates display correctly regardless of user's timezone
 *
 * @param {string|Date|null} dateValue - The date to format
 * @param {string} format - The format style ('full', 'date', 'shortDate')
 * @returns {string} - A formatted date string or fallback value
 */
export const formatDateForDisplay = (
  dateValue,
  format = 'date',
  fallback = 'N/A'
) => {
  if (!dateValue) return fallback;

  try {
    // Create a Date object from the input
    const rawDate = new Date(dateValue);

    // Check if date is valid
    if (isNaN(rawDate.getTime())) {
      return fallback;
    }

    // Fix timezone issues by preserving the UTC date components
    // Create a new date using the UTC components to avoid timezone shifts
    const year = rawDate.getUTCFullYear();
    const month = rawDate.getUTCMonth();
    const day = rawDate.getUTCDate();

    // Create a date object that treats the UTC components as local
    // This preserves the actual day without timezone shifting
    const localDate = new Date(year, month, day);

    switch (format) {
      case 'full':
        return localDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC', // Ensure consistent display across timezones
        });
      case 'date':
        return localDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC', // Ensure consistent display across timezones
        });
      case 'shortDate':
        return localDate.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
          timeZone: 'UTC', // Ensure consistent display across timezones
        });
      default:
        return localDate.toLocaleDateString('en-US', { timeZone: 'UTC' });
    }
  } catch (err) {
    console.error('Error formatting date for display:', err, dateValue);
    return fallback;
  }
};

/**
 * Converts a date to the format required by HTML date inputs (YYYY-MM-DD)
 * Handles timezone issues by working with UTC values to avoid day shifts
 *
 * @param {string|Date|null} dateValue - The date to convert
 * @returns {string} - Date in YYYY-MM-DD format or empty string if invalid
 */
export const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';

  try {
    const date = new Date(dateValue);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // Use UTC methods to avoid timezone issues
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // +1 because months are 0-indexed
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Format as YYYY-MM-DD for HTML date inputs
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error('Error formatting date for input:', err, dateValue);
    return '';
  }
};
