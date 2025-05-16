import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
// Import actions from guestSandboxSlice for guest user support
import {
  addItem,
  updateItem,
  deleteItem,
  setItems,
} from '../guestSandbox/guestSandboxSlice';

const NOTE_URL = '/notes';

// Initial state for notes
const initialState = {
  notes: [],
  trash: [],
  archived: [],
  favorites: [],
  pinned: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
  selectedNote: null,
  lastFetched: null, // Track when data was last fetched for caching
  filter: {}, // Track current filter options for dependency tracking
};

/**
 * Fetch all notes with optional filtering, sorting, and limiting
 * Now supports enhanced caching through lastFetched timestamp
 *
 * @param {Object} params - API parameters including sort, limit, etc.
 * @returns {Array} Array of note objects
 */
export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async (params = {}, thunkAPI) => {
    // Get state and check if user is a guest
    const state = thunkAPI.getState();
    const { auth } = state;

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // For guest users, get notes from guest sandbox
      const guestNotes = state.guestSandbox.notes.map((note) => ({
        ...note.data,
        _id: note.id,
        id: note.id,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      }));

      return {
        data: guestNotes,
        useCache: true,
        isGuestData: true,
      };
    }

    try {
      // Track the current filter configuration
      const state = thunkAPI.getState();

      // Check if this is a forced refresh
      const forceRefresh = params.forceRefresh;

      // Check if we have cached data we can use
      const lastFetched = state.notes.lastFetched;
      const cacheTimeout = params.cacheTimeout || 5 * 60 * 1000; // Default 5 minutes

      if (
        !forceRefresh &&
        lastFetched &&
        Date.now() - lastFetched < cacheTimeout
      ) {
        // Use cached data if it's still fresh and not a forced refresh
        // Return existing notes data, but still update the filter
        return {
          data: state.notes.notes,
          useCache: true,
        };
      }

      // Remove internal params before sending to API
      const apiParams = { ...params };
      delete apiParams.forceRefresh;
      delete apiParams.cacheTimeout;

      const response = await api.get(NOTE_URL, { params: apiParams });

      // Return API data with current timestamp
      return {
        data: response.data.data,
        useCache: false,
        filter: apiParams, // Store filter for dependency tracking
      };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create a new note
export const createNote = createAsyncThunk(
  'notes/createNote',
  async (noteData, thunkAPI) => {
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Add to sandbox, no API call
      const guestNoteData = {
        ...noteData,
        // Add any additional fields needed for consistency with API structure
      };

      // Dispatch to add item to guest sandbox
      dispatch(
        addItem({ entityType: 'notes', itemData: { data: guestNoteData } })
      );

      // Return data structure that matches the API response
      return {
        ...guestNoteData,
        _id: 'guest-' + Date.now(), // Temporary ID for immediate feedback
        _isGuestCreation: true,
      };
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.post(NOTE_URL, noteData);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Fetch a single note
export const fetchNote = createAsyncThunk(
  'notes/fetchNote',
  async (id, thunkAPI) => {
    const { getState } = thunkAPI;
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // For guest users, get note from guest sandbox
      const guestNotes = getState().guestSandbox.notes;
      const guestNote = guestNotes.find((n) => n.id === id);

      if (guestNote) {
        // Return formatted guest note with API-compatible structure
        return {
          ...guestNote.data,
          _id: guestNote.id,
          id: guestNote.id,
          createdAt: guestNote.createdAt,
          updatedAt: guestNote.updatedAt,
          _isGuestData: true,
        };
      }

      // If guest note not found, return error
      return thunkAPI.rejectWithValue('Note not found in guest session');
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.get(`${NOTE_URL}/${id}`);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update a note
export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, updates }, thunkAPI) => {
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Update item in sandbox, no API call
      dispatch(
        updateItem({
          entityType: 'notes',
          itemId: id,
          updates: { data: updates },
        })
      );

      // Return a response that matches API structure but with guest data
      return {
        ...updates,
        _id: id,
        id: id,
        _isGuestUpdate: true,
      };
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.put(`${NOTE_URL}/${id}`, updates);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Soft delete a note
export const softDeleteNote = createAsyncThunk(
  'notes/softDeleteNote',
  async (id, thunkAPI) => {
    const { getState, dispatch } = thunkAPI;
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Delete item from sandbox, no API call
      dispatch(
        deleteItem({
          entityType: 'notes',
          itemId: id,
        })
      );

      // Return the ID for the reducer to handle correctly
      return { _id: id, _isGuestDeletion: true };
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.delete(`${NOTE_URL}/${id}`);
      console.log('Soft delete response:', response.data);
      return response.data.data; // This should contain the deleted note
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Restore a soft-deleted note
export const restoreNote = createAsyncThunk(
  'notes/restoreNote',
  async (id, thunkAPI) => {
    try {
      const response = await api.patch(`${NOTE_URL}/${id}/restore`);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Hard delete a note (permanent)
export const hardDeleteNote = createAsyncThunk(
  'notes/hardDeleteNote',
  async (id, thunkAPI) => {
    try {
      await api.delete(`${NOTE_URL}/${id}/permanent`);
      return id;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const noteSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    resetNoteStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setSelectedNote: (state, action) => {
      state.selectedNote = action.payload;
    },
    /**
     * Clear the lastFetched timestamp to force a refresh on next fetch
     * Useful when data is known to be stale (e.g., after socket updates)
     */
    invalidateNotesCache: (state) => {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all notes
      .addCase(fetchNotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;

        // Only update the filter when not using cache
        if (!action.payload.useCache) {
          state.filter = action.payload.filter || {};
        }

        // Always update lastFetched timestamp unless using cache
        if (!action.payload.useCache) {
          state.lastFetched = Date.now();

          // Process the new data
          const allNotes = action.payload.data;

          state.notes = allNotes.filter((n) => !n.archived && !n.deletedAt);
          state.trash = allNotes.filter((n) => n.deletedAt);
          state.archived = allNotes.filter((n) => n.archived && !n.deletedAt);
          state.favorites = allNotes.filter(
            (n) => n.favorite && !n.deletedAt && !n.archived
          );
          state.pinned = allNotes.filter(
            (n) => n.pinned && !n.deletedAt && !n.archived
          );
        }
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Create note
      .addCase(createNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notes.unshift(action.payload);
      })
      .addCase(createNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Fetch single note
      .addCase(fetchNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.selectedNote = action.payload;
      })
      .addCase(fetchNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Update note
      .addCase(updateNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notes = state.notes.map((n) =>
          n._id === action.payload._id ? action.payload : n
        );
        state.archived = state.archived.map((n) =>
          n._id === action.payload._id ? action.payload : n
        );
        state.favorites = state.favorites.map((n) =>
          n._id === action.payload._id ? action.payload : n
        );
        state.pinned = state.pinned.map((n) =>
          n._id === action.payload._id ? action.payload : n
        );
        state.trash = state.trash.map((n) =>
          n._id === action.payload._id ? action.payload : n
        );
        if (
          state.selectedNote &&
          state.selectedNote._id === action.payload._id
        ) {
          state.selectedNote = action.payload;
        }
      })
      .addCase(updateNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Soft delete note
      .addCase(softDeleteNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(softDeleteNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        console.log('Soft delete success payload:', action.payload);

        // Make sure we have payload data before processing
        if (action.payload) {
          // Add to trash
          state.trash.unshift(action.payload);

          // Remove from all other arrays
          state.notes = state.notes.filter((n) => n._id !== action.payload._id);
          state.archived = state.archived.filter(
            (n) => n._id !== action.payload._id
          );
          state.favorites = state.favorites.filter(
            (n) => n._id !== action.payload._id
          );
          state.pinned = state.pinned.filter(
            (n) => n._id !== action.payload._id
          );

          // If this is the selected note, clear it
          if (
            state.selectedNote &&
            state.selectedNote._id === action.payload._id
          ) {
            state.selectedNote = null;
          }
        } else {
          console.error('No payload data in softDeleteNote.fulfilled action');
        }
      })
      .addCase(softDeleteNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Restore note
      .addCase(restoreNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(restoreNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Remove from trash and add back to notes
        state.trash = state.trash.filter((n) => n._id !== action.payload._id);
        state.notes.unshift(action.payload);
      })
      .addCase(restoreNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Hard delete note
      .addCase(hardDeleteNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(hardDeleteNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Remove from trash
        state.trash = state.trash.filter((n) => n._id !== action.payload);
      })
      .addCase(hardDeleteNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetNoteStatus, setSelectedNote, invalidateNotesCache } =
  noteSlice.actions;
export default noteSlice.reducer;
