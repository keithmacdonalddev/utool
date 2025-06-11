// filepath: c:\Users\macdo\Documents\Cline\utool\client\src\features\guestSandbox\guestSandboxSlice.js
import { createSlice, createSelector } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {'tasks' | 'projects' | 'notes' | 'bookmarks' | 'projectNotes' | 'comments' | 'friends' | 'otherData'} GuestSandboxEntityType
 * Represents the type of entity being stored in the guest sandbox.
 * This helps in organizing and retrieving data within the sandbox.
 */

/**
 * @typedef {Object} GuestSandboxItem
 * @property {string} id - A unique identifier for the item (client-generated UUID).
 * @property {GuestSandboxEntityType} entityType - The type of the entity.
 * @property {Object} data - The actual data object for the entity.
 * @property {Date|string} createdAt - Timestamp of creation.
 * @property {Date|string} updatedAt - Timestamp of last update.
 */

/**
 * @typedef {Object.<GuestSandboxEntityType, GuestSandboxItem[]>} GuestSandboxState
 * The shape of the guest sandbox state, where each key is an entity type
 * and the value is an array of items of that type.
 */

/**
 * @type {GuestSandboxState}
 * @description
 * Initial state for the guest sandbox. It's an object where keys are entity types
 * (e.g., 'tasks', 'projects') and values are arrays of items for that entity type.
 * This structure allows for organized storage and retrieval of different types of
 * data manipulated by a guest user. All data here is session-only and not persisted.
 */
const initialState = {
  tasks: [],
  projects: [],
  notes: [],
  bookmarks: [],
  friends: [], // Added friends array for guest user simulation
  // Add other entity types as needed, e.g.:
  // projectNotes: [],
  // comments: [],
  // otherData: [], // For miscellaneous guest-specific data
};

/**
 * @description
 * Slice for managing a "sandbox" state for guest users.
 * This allows guests to interact with the application and see their changes
 * reflected in the UI, but all data is stored client-side in this slice
 * and is not persisted to the backend. The sandbox is reset on logout or session end.
 *
 * Key design considerations:
 * - **Client-Side IDs:** All items created by guests will have client-generated UUIDs.
 *   This avoids collisions with real database IDs and clearly distinguishes guest data.
 * - **Entity-Based Storage:** Data is organized by entity type (e.g., 'tasks', 'projects')
 *   within the slice for easier management and retrieval.
 * - **CRUD Operations:** Provides reducers for adding, updating, and deleting items
 *   within the sandbox for various entity types.
 * - **Reset Functionality:** Includes a reducer to clear the entire sandbox, typically
 *   called on guest logout or session expiration.
 */
const guestSandboxSlice = createSlice({
  name: 'guestSandbox',
  initialState,
  reducers: {
    /**
     * Adds an item to a specified entity type array in the guest sandbox.
     * The item is expected to have its `id` pre-generated (e.g., using uuidv4)
     * and include `entityType` and `data`.
     * @param {GuestSandboxState} state - The current guest sandbox state.
     * @param {Object} action - The action object.
     * @param {Object} action.payload - The payload for adding an item.
     * @param {GuestSandboxEntityType} action.payload.entityType - The type of entity to add the item to.
     * @param {Omit<GuestSandboxItem, 'createdAt' | 'updatedAt'>} action.payload.itemData - The item data to add, excluding timestamps which will be added.
     * @example
     * dispatch(addItem({ entityType: 'tasks', itemData: { id: 'uuid-123', data: { title: 'Guest Task' } } }));
     */
    addItem: (state, action) => {
      const { entityType, itemData } = action.payload;
      if (!state.hasOwnProperty(entityType)) {
        // More robust check
        console.warn(
          `GuestSandbox: Entity type "${entityType}" does not exist in initial state. Item not added.`
        );
        // If dynamic entity types are truly needed, they should be initialized here:
        // state[entityType] = [];
        return;
      }
      if (!itemData || typeof itemData.data !== 'object') {
        console.error(
          'GuestSandbox: addItem requires itemData with a data object.'
        );
        return;
      }
      const newItem = {
        ...itemData, // Contains 'data' and potentially 'id'
        id: itemData.id || uuidv4(), // Ensure ID exists, generate if not provided
        entityType, // Ensure entityType is part of the item itself for consistency
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state[entityType].push(newItem);
    },

    /**
     * Updates an existing item in a specified entity type array in the guest sandbox.
     * Matches items by `id`.
     * @param {GuestSandboxState} state - The current guest sandbox state.
     * @param {Object} action - The action object.
     * @param {Object} action.payload - The payload for updating an item.
     * @param {GuestSandboxEntityType} action.payload.entityType - The type of entity where the item exists.
     * @param {string} action.payload.id - The ID of the item to update.
     * @param {Object} action.payload.updates - An object containing the fields to update in the item's `data`.
     * @example
     * dispatch(updateItem({ entityType: 'tasks', id: 'uuid-123', updates: { title: 'Updated Guest Task' } }));
     */
    updateItem: (state, action) => {
      const { entityType, id, updates } = action.payload;
      if (!state[entityType]) {
        console.warn(
          `GuestSandbox: Entity type "${entityType}" does not exist. Item not updated.`
        );
        return;
      }
      const itemIndex = state[entityType].findIndex((item) => item.id === id);
      if (itemIndex !== -1) {
        // Ensure data property exists before spreading
        state[entityType][itemIndex].data = {
          ...(state[entityType][itemIndex].data || {}),
          ...updates,
        };
        state[entityType][itemIndex].updatedAt = new Date().toISOString();
      } else {
        console.warn(
          `GuestSandbox: Item with id "${id}" not found in "${entityType}". No update performed.`
        );
      }
    },

    /**
     * Deletes an item from a specified entity type array in the guest sandbox.
     * Matches items by `id`.
     * @param {GuestSandboxState} state - The current guest sandbox state.
     * @param {Object} action - The action object.
     * @param {Object} action.payload - The payload for deleting an item.
     * @param {GuestSandboxEntityType} action.payload.entityType - The type of entity from which to delete the item.
     * @param {string} action.payload.id - The ID of the item to delete.
     * @example
     * dispatch(deleteItem({ entityType: 'tasks', id: 'uuid-123' }));
     */
    deleteItem: (state, action) => {
      const { entityType, id } = action.payload;
      if (!state[entityType]) {
        console.warn(
          `GuestSandbox: Entity type "${entityType}" does not exist. Item not deleted.`
        );
        return;
      }
      state[entityType] = state[entityType].filter((item) => item.id !== id);
    },

    /**
     * Replaces all items for a specific entity type.
     * Useful for bulk updates or setting initial guest data for an entity if needed.
     * @param {GuestSandboxState} state - The current guest sandbox state.
     * @param {Object} action - The action object.
     * @param {Object} action.payload - The payload.
     * @param {GuestSandboxEntityType} action.payload.entityType - The entity type to update.
     * @param {GuestSandboxItem[]} action.payload.items - The new array of items for this entity type.
     *                                                     Each item should conform to GuestSandboxItem structure.
     */
    setItems: (state, action) => {
      const { entityType, items } = action.payload;
      if (!state.hasOwnProperty(entityType)) {
        console.warn(
          `GuestSandbox: setItems - Entity type "${entityType}" is not defined in initial state. Items not set.`
        );
        return;
      }
      if (!Array.isArray(items)) {
        console.error(
          `GuestSandbox: setItems requires "items" to be an array for entityType "${entityType}".`
        );
        return;
      }
      state[entityType] = items.map((item) => ({
        id: item.id || uuidv4(), // Ensure ID
        entityType: item.entityType || entityType, // Ensure entityType consistency
        data: item.data || {}, // Ensure data object exists
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      }));
    },

    /**
     * Resets the entire guest sandbox to its initial empty state.
     * This should be called when the guest session ends (e.g., on logout, or explicit "clear my data" action).
     * @param {GuestSandboxState} state - The current guest sandbox state.
     */
    resetGuestSandbox: (state) => {
      for (const key in initialState) {
        if (initialState.hasOwnProperty(key)) {
          state[key] = initialState[key];
        }
      }
      for (const key in state) {
        if (!initialState.hasOwnProperty(key)) {
          delete state[key];
        }
      }
    },
  },
});

export const { addItem, updateItem, deleteItem, setItems, resetGuestSandbox } =
  guestSandboxSlice.actions;

/**
 * Selects the entire guest sandbox state.
 * @param {Object} rootState - The global Redux state.
 * @returns {GuestSandboxState} The guest sandbox state.
 */
export const selectGuestSandbox = (rootState) => rootState.guestSandbox;

/**
 * Memoized selector for guest items by type to prevent unnecessary rerenders.
 * @param {GuestSandboxEntityType} entityType - The type of entity to select.
 * @returns {function} Memoized selector function.
 */
export const selectGuestItemsByType = createSelector(
  [(rootState) => rootState.guestSandbox, (rootState, entityType) => entityType],
  (guestSandbox, entityType) => {
    return guestSandbox && guestSandbox[entityType]
      ? guestSandbox[entityType]
      : [];
  }
);

/**
 * Memoized selector for a specific guest item by ID and entity type.
 * @param {GuestSandboxEntityType} entityType - The type of entity.
 * @param {string} id - The ID of the item to select.
 * @returns {function} Memoized selector function.
 */
export const selectGuestItemById = createSelector(
  [
    (rootState, entityType) => selectGuestItemsByType(rootState, entityType),
    (rootState, entityType, id) => id
  ],
  (items, id) => {
    return items.find((item) => item.id === id);
  }
);

export default guestSandboxSlice.reducer;
