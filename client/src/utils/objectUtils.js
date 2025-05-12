/**
 * Utility functions for object manipulation and comparison
 */

/**
 * Performs a deep comparison of two values to determine if they are equivalent.
 * This is a simplified version of lodash's isEqual that works for most Redux state objects.
 *
 * @param {*} objA - First value to compare
 * @param {*} objB - Second value to compare
 * @param {string[]} excludeKeys - Keys to exclude from comparison (e.g., metadata fields)
 * @returns {boolean} True if the values are deeply equal
 */
export const deepCompareObjects = (
  objA,
  objB,
  excludeKeys = ['__v', 'updatedAt', 'lastModified']
) => {
  // Handle primitive values and null/undefined
  if (objA === objB) return true;
  if (objA == null || objB == null) return false;

  // If either is not an object, they're not equal
  if (typeof objA !== 'object' || typeof objB !== 'object') return false;

  // If one is an array and the other is not, they're not equal
  if (Array.isArray(objA) !== Array.isArray(objB)) return false;

  // Handle arrays
  if (Array.isArray(objA)) {
    if (objA.length !== objB.length) return false;

    // Compare each element
    for (let i = 0; i < objA.length; i++) {
      if (!deepCompareObjects(objA[i], objB[i], excludeKeys)) {
        return false;
      }
    }
    return true;
  }

  // Handle objects
  const keysA = Object.keys(objA).filter((key) => !excludeKeys.includes(key));
  const keysB = Object.keys(objB).filter((key) => !excludeKeys.includes(key));

  if (keysA.length !== keysB.length) return false;

  // Check if all keys in A exist in B and have the same values
  return keysA.every((key) => {
    if (!keysB.includes(key)) return false;

    // Handle dates: convert to ISO strings for comparison
    if (objA[key] instanceof Date && objB[key] instanceof Date) {
      return objA[key].toISOString() === objB[key].toISOString();
    }

    // Handle strings that might represent dates
    if (typeof objA[key] === 'string' && typeof objB[key] === 'string') {
      const dateA = new Date(objA[key]);
      const dateB = new Date(objB[key]);
      if (
        !isNaN(dateA) &&
        !isNaN(dateB) &&
        objA[key].includes('-') &&
        objB[key].includes('-')
      ) {
        return dateA.toISOString() === dateB.toISOString();
      }
    }

    return deepCompareObjects(objA[key], objB[key], excludeKeys);
  });
};

/**
 * Determine if a collection of items has changed compared to another collection
 * This is useful for comparing arrays in Redux state to avoid unnecessary updates
 *
 * @param {Array} oldItems - The original array of items
 * @param {Array} newItems - The new array of items to compare
 * @param {string} idKey - The key to use as identifier (default: '_id')
 * @param {string[]} excludeKeys - Fields to ignore in the comparison
 * @returns {boolean} True if there are differences between the collections
 */
export const hasCollectionChanged = (
  oldItems,
  newItems,
  idKey = '_id',
  excludeKeys = ['__v', 'updatedAt', 'lastModified']
) => {
  if (!oldItems || !newItems) return true;
  if (oldItems.length !== newItems.length) return true;

  // Create a map of old items for quick lookup
  const oldItemsMap = {};
  oldItems.forEach((item) => {
    if (item[idKey]) {
      oldItemsMap[item[idKey]] = item;
    }
  });

  // Check for changes in existing items or new items
  return newItems.some((newItem) => {
    const oldItem = oldItemsMap[newItem[idKey]];
    if (!oldItem) return true; // New item
    return !deepCompareObjects(oldItem, newItem, excludeKeys);
  });
};
