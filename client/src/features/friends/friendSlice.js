import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
// Import actions from guestSandboxSlice for guest user support
import {
  addItem,
  updateItem,
  deleteItem,
  setItems,
} from '../guestSandbox/guestSandboxSlice';
// Import utility for formatting guest data
import { formatGuestItemsArray } from '../../utils/guestDataFormatters';

// Async Thunks
export const searchUsers = createAsyncThunk(
  'friends/searchUsers',
  async (searchTerm, { rejectWithValue, getState }) => {
    const { auth } = getState();

    // Guest user - return empty results or mock data
    if (auth.user && auth.isGuest) {
      return []; // Guest users don't have access to search other users
    }

    try {
      const res = await api.get(`/friends/search?term=${searchTerm}`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Failed to search users'
      );
    }
  }
);

export const sendFriendRequest = createAsyncThunk(
  'friends/sendFriendRequest',
  async (userId, { rejectWithValue, getState }) => {
    const { auth } = getState();

    // Guest user - simulate acceptance
    if (auth.user && auth.isGuest) {
      return { userId, message: 'Friend request sent (Guest Mode)' };
    }

    try {
      const res = await api.post(`/friends/request/${userId}`);
      return { userId, message: res.data.message }; // Return userId to update UI optimistically if needed
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Failed to send request'
      );
    }
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'friends/acceptFriendRequest',
  async (userId, { dispatch, rejectWithValue, getState }) => {
    const { auth } = getState();

    // Guest user - simulate acceptance
    if (auth.user && auth.isGuest) {
      // Refresh lists after accepting
      dispatch(getFriends());
      dispatch(getFriendRequests());
      return { userId, message: 'Friend request accepted (Guest Mode)' };
    }

    try {
      const res = await api.put(`/friends/accept/${userId}`);
      // Refresh lists after accepting
      dispatch(getFriends());
      dispatch(getFriendRequests());
      return { userId, message: res.data.message };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Failed to accept request'
      );
    }
  }
);

export const rejectOrCancelFriendRequest = createAsyncThunk(
  'friends/rejectOrCancelFriendRequest',
  async (userId, { dispatch, rejectWithValue, getState }) => {
    const { auth } = getState();

    // Guest user - simulate rejection/cancellation
    if (auth.user && auth.isGuest) {
      // Refresh requests list after rejecting/canceling
      dispatch(getFriendRequests());
      return {
        userId,
        message: 'Friend request rejected/canceled (Guest Mode)',
      };
    }

    try {
      const res = await api.delete(`/friends/request/${userId}`);
      // Refresh requests list after rejecting/canceling
      dispatch(getFriendRequests());
      return { userId, message: res.data.message };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Failed to reject/cancel request'
      );
    }
  }
);

export const removeFriend = createAsyncThunk(
  'friends/removeFriend',
  async (userId, { dispatch, rejectWithValue, getState }) => {
    const { auth } = getState();

    // Guest user - simulate removal
    if (auth.user && auth.isGuest) {
      // Update guest sandbox state
      dispatch(
        deleteItem({
          entityType: 'friends',
          id: userId,
        })
      );
      // Refresh friends list after removing
      dispatch(getFriends());
      return { userId, message: 'Friend removed (Guest Mode)' };
    }

    try {
      const res = await api.delete(`/friends/${userId}`);
      // Refresh friends list after removing
      dispatch(getFriends());
      return { userId, message: res.data.message };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Failed to remove friend'
      );
    }
  }
);

export const getFriends = createAsyncThunk(
  'friends/getFriends',
  async (_, { rejectWithValue, getState }) => {
    const { auth } = getState(); // Guest user - get friends from sandbox
    if (auth.user && auth.isGuest) {
      const guestFriends = getState().guestSandbox.friends || [];

      // Use the utility function to format guest friends
      return formatGuestItemsArray(guestFriends);
    }

    try {
      const res = await api.get('/friends');
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Failed to fetch friends'
      );
    }
  }
);

export const getFriendRequests = createAsyncThunk(
  'friends/getFriendRequests',
  async (_, { rejectWithValue, getState }) => {
    const { auth } = getState();

    // Guest user - set empty request lists for sandbox
    if (auth.user && auth.isGuest) {
      return { sent: [], received: [] }; // Guest users don't have pending requests
    }

    try {
      const res = await api.get('/friends/requests');
      return res.data.data; // { sent: [...], received: [...] }
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || 'Failed to fetch requests'
      );
    }
  }
);

const initialState = {
  friends: [],
  requestsSent: [],
  requestsReceived: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  error: null,
};

const friendSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    clearFriendError: (state) => {
      state.error = null;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.isSearching = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Search Users
      .addCase(searchUsers.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.isSearching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload;
      })
      // Send Request
      .addCase(sendFriendRequest.pending, (state) => {
        state.isLoading = true; // Or a specific loading state for sending
      })
      .addCase(sendFriendRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        // Optimistically update search results or handle success notification
        state.searchResults = state.searchResults.filter(
          (user) => user._id !== action.payload.userId
        );
        // Potentially add to requestsSent if needed immediately, or rely on getFriendRequests
      })
      .addCase(sendFriendRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Accept Request
      .addCase(acceptFriendRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        // Data is refreshed by thunk dispatching getFriends/getFriendRequests
      })
      .addCase(acceptFriendRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Reject/Cancel Request
      .addCase(rejectOrCancelFriendRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(rejectOrCancelFriendRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        // Data is refreshed by thunk dispatching getFriendRequests
      })
      .addCase(rejectOrCancelFriendRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Remove Friend
      .addCase(removeFriend.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(removeFriend.fulfilled, (state, action) => {
        state.isLoading = false;
        // Data is refreshed by thunk dispatching getFriends
      })
      .addCase(removeFriend.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Friends
      .addCase(getFriends.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getFriends.fulfilled, (state, action) => {
        state.isLoading = false;
        state.friends = action.payload;
      })
      .addCase(getFriends.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Get Requests
      .addCase(getFriendRequests.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getFriendRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.requestsSent = action.payload.sent;
        state.requestsReceived = action.payload.received;
      })
      .addCase(getFriendRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearFriendError, clearSearchResults } = friendSlice.actions;
export default friendSlice.reducer;
