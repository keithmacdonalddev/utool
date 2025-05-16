/**
 * Utility functions for formatting guest sandbox data to match API structure
 * These functions ensure consistent transformation of guest data across the application
 */

/**
 * Formats a guest friend item from the sandbox to match the API structure
 * @param {Object} guestFriendItem - The raw guest friend item from the sandbox
 * @returns {Object} - Friend object formatted to match API structure
 */
export const formatGuestFriendData = (guestFriendItem) => ({
  ...guestFriendItem.data,
  _id: guestFriendItem.id,
  id: guestFriendItem.id,
  createdAt: guestFriendItem.createdAt,
  updatedAt: guestFriendItem.updatedAt,
});

/**
 * Formats an array of guest items from the sandbox to match the API structure
 * @param {Array} guestItems - Array of raw guest items from the sandbox
 * @returns {Array} - Array of items formatted to match API structure
 */
export const formatGuestItemsArray = (guestItems) => {
  return guestItems.map((item) => formatGuestFriendData(item));
};

/**
 * Creates a complete guest sandbox item with all required properties
 * @param {string} entityType - The type of entity (e.g., 'friends', 'tasks')
 * @param {Object} data - The actual data for the item
 * @param {string} [id] - Optional ID (will be generated if not provided)
 * @returns {Object} - Complete sandbox item with all required properties
 */
export const createGuestItem = (entityType, data, id = null) => {
  const timestamp = new Date().toISOString();
  return {
    id:
      id ||
      `guest-${entityType}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
    entityType,
    data,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
