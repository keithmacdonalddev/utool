import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
// Import actions from guestSandboxSlice for guest user support
import {
  addItem,
  updateItem,
  deleteItem,
  setItems,
} from '../guestSandbox/guestSandboxSlice';

// Get all bookmarks
export const getBookmarks = createAsyncThunk(
  'bookmarks/getAll',
  async (_, { rejectWithValue, getState }) => {
    // Check if user is a guest
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // For guest users, get bookmarks from guest sandbox
      const guestBookmarks = getState().guestSandbox.bookmarks.map(
        (bookmark) => ({
          ...bookmark.data,
          _id: bookmark.id,
          id: bookmark.id,
          createdAt: bookmark.createdAt,
          updatedAt: bookmark.updatedAt,
        })
      );

      return guestBookmarks;
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.get('/bookmarks');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Get a single bookmark
export const getBookmark = createAsyncThunk(
  'bookmarks/getOne',
  async (id, { rejectWithValue, getState }) => {
    // Check if user is a guest
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // For guest users, get bookmark from guest sandbox
      const guestBookmarks = getState().guestSandbox.bookmarks;
      const guestBookmark = guestBookmarks.find((b) => b.id === id);

      if (guestBookmark) {
        // Return formatted guest bookmark with API-compatible structure
        return {
          ...guestBookmark.data,
          _id: guestBookmark.id,
          id: guestBookmark.id,
          createdAt: guestBookmark.createdAt,
          updatedAt: guestBookmark.updatedAt,
        };
      }

      // If guest bookmark not found, return error
      return rejectWithValue('Bookmark not found in guest session');
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.get(`/bookmarks/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Create a bookmark
export const createBookmark = createAsyncThunk(
  'bookmarks/create',
  async (bookmarkData, { rejectWithValue, getState, dispatch }) => {
    // Check if user is a guest
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Add to sandbox, no API call
      const guestBookmarkData = {
        ...bookmarkData,
        // Add any additional fields needed for consistency with API structure
      };

      // Dispatch to add item to guest sandbox
      dispatch(
        addItem({
          entityType: 'bookmarks',
          itemData: { data: guestBookmarkData },
        })
      );

      // Return data structure that matches the API response
      return {
        ...guestBookmarkData,
        _id: 'guest-' + Date.now(), // Temporary ID for immediate feedback
        _isGuestCreation: true,
      };
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.post('/bookmarks', bookmarkData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Update a bookmark
export const updateBookmark = createAsyncThunk(
  'bookmarks/update',
  async ({ id, bookmarkData }, { rejectWithValue, getState, dispatch }) => {
    // Check if user is a guest
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Update item in sandbox, no API call
      dispatch(
        updateItem({
          entityType: 'bookmarks',
          itemId: id,
          updates: { data: bookmarkData },
        })
      );

      // Return a response that matches API structure but with guest data
      return {
        ...bookmarkData,
        _id: id,
        id: id,
        _isGuestUpdate: true,
      };
    }

    // Regular user: Proceed with API call
    try {
      const response = await api.put(`/bookmarks/${id}`, bookmarkData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Delete a bookmark
export const deleteBookmark = createAsyncThunk(
  'bookmarks/delete',
  async (id, { rejectWithValue, getState, dispatch }) => {
    // Check if user is a guest
    const { auth } = getState();

    // Handle guest user
    if (auth.user && auth.isGuest) {
      // Guest user: Delete item from sandbox, no API call
      dispatch(
        deleteItem({
          entityType: 'bookmarks',
          itemId: id,
        })
      );

      // Return the ID for the reducer to remove from state
      return id;
    }

    // Regular user: Proceed with API call
    try {
      await api.delete(`/bookmarks/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const bookmarkSlice = createSlice({
  name: 'bookmarks',
  initialState: {
    bookmarks: [],
    currentBookmark: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
  },
  reducers: {
    resetBookmarkStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearCurrentBookmark: (state) => {
      state.currentBookmark = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all bookmarks
      .addCase(getBookmarks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getBookmarks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bookmarks = action.payload;
      })
      .addCase(getBookmarks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch bookmarks';
      })
      // Get single bookmark
      .addCase(getBookmark.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getBookmark.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentBookmark = action.payload;
      })
      .addCase(getBookmark.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch bookmark';
      })
      // Create bookmark
      .addCase(createBookmark.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createBookmark.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bookmarks.push(action.payload);
      })
      .addCase(createBookmark.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to create bookmark';
      })
      // Update bookmark
      .addCase(updateBookmark.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateBookmark.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bookmarks = state.bookmarks.map((bookmark) =>
          bookmark._id === action.payload._id ? action.payload : bookmark
        );
        if (state.currentBookmark?._id === action.payload._id) {
          state.currentBookmark = action.payload;
        }
      })
      .addCase(updateBookmark.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to update bookmark';
      })
      // Delete bookmark
      .addCase(deleteBookmark.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteBookmark.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.bookmarks = state.bookmarks.filter(
          (bookmark) => bookmark._id !== action.payload
        );
        if (state.currentBookmark?._id === action.payload) {
          state.currentBookmark = null;
        }
      })
      .addCase(deleteBookmark.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to delete bookmark';
      });
  },
});

export const { resetBookmarkStatus, clearCurrentBookmark } =
  bookmarkSlice.actions;
export default bookmarkSlice.reducer;
