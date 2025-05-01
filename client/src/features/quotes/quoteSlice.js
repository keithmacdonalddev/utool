import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

/**
 * Redux async thunk to fetch all favorite quotes for the current user
 *
 * Makes an API request to the backend and retrieves all quotes saved by the user.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of quote objects
 * @throws {Object} Will reject with error response data if request fails
 */
export const getFavoriteQuotes = createAsyncThunk(
  'quotes/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/quotes/favorite');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to fetch favorite quotes' }
      );
    }
  }
);

/**
 * Redux async thunk to create a new favorite quote
 *
 * Takes quote data (text and author) and sends it to the backend to save
 * as a new favorite quote for the current user.
 *
 * @param {Object} quoteData - The data for the quote to create
 * @param {string} quoteData.text - The text content of the quote
 * @param {string} quoteData.author - The author of the quote
 * @returns {Promise<Object>} A promise that resolves to the created quote object
 * @throws {Object} Will reject with error response data if request fails
 */
export const createFavoriteQuote = createAsyncThunk(
  'quotes/create',
  async (quoteData, { rejectWithValue }) => {
    try {
      const response = await api.post('/quotes/favorite', quoteData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to create favorite quote' }
      );
    }
  }
);

/**
 * Redux async thunk to delete a favorite quote
 *
 * Takes a quote ID and sends a delete request to the backend to remove
 * the quote from the user's favorites.
 *
 * @param {string} quoteId - The ID of the quote to delete
 * @returns {Promise<string>} A promise that resolves to the ID of the deleted quote
 * @throws {Object} Will reject with error response data if request fails
 */
export const deleteFavoriteQuote = createAsyncThunk(
  'quotes/delete',
  async (quoteId, { rejectWithValue }) => {
    try {
      await api.delete(`/quotes/favorite/${quoteId}`);
      return quoteId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: 'Failed to delete favorite quote' }
      );
    }
  }
);

/**
 * Quote Slice
 *
 * Redux slice that manages state for favorite quotes, including:
 * - List of all quotes
 * - Loading/error states
 * - Error messages
 */
const quoteSlice = createSlice({
  name: 'quotes',
  initialState: {
    favoriteQuotes: [],
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
  },
  reducers: {
    /**
     * Resets the quote state status flags
     * Used after completing operations to reset loading and success states
     */
    resetQuoteStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all favorite quotes
      .addCase(getFavoriteQuotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getFavoriteQuotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.favoriteQuotes = action.payload;
      })
      .addCase(getFavoriteQuotes.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message =
          action.payload?.message || 'Failed to fetch favorite quotes';
      })
      // Create a favorite quote
      .addCase(createFavoriteQuote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createFavoriteQuote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.favoriteQuotes.push(action.payload);
      })
      .addCase(createFavoriteQuote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message =
          action.payload?.message || 'Failed to create favorite quote';
      })
      // Delete a favorite quote
      .addCase(deleteFavoriteQuote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteFavoriteQuote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.favoriteQuotes = state.favoriteQuotes.filter(
          (quote) => quote._id !== action.payload
        );
      })
      .addCase(deleteFavoriteQuote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message =
          action.payload?.message || 'Failed to delete favorite quote';
      });
  },
});

export const { resetQuoteStatus } = quoteSlice.actions;
export default quoteSlice.reducer;
