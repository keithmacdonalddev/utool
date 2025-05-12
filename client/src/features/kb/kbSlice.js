import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance
import { hasCollectionChanged } from '../../utils/objectUtils'; // Added import

/**
 * @constant {string} KB_URL
 * @description The base URL path for Knowledge Base API endpoints.
 * This is appended to the `baseURL` configured in the `api.js` utility.
 * All KB-related API requests will be routed through this path.
 */
const KB_URL = '/kb/'; // Relative to base URL in api.js

/**
 * @constant {number} CACHE_TIMEOUT
 * @description Default cache timeout in milliseconds.
 * This constant defines how long fetched KB articles are considered fresh
 * before a background refresh or a full refresh is triggered.
 * It helps in reducing unnecessary API calls by serving cached data
 * when it's still considered valid. Currently set to 5 minutes.
 */
const CACHE_TIMEOUT = 5 * 60 * 1000;

// Action payload type constants
const FETCH_TYPE_CACHE_VALID_REFRESH = 'CACHE_VALID_BACKGROUND_REFRESH';
const FETCH_TYPE_FRESH_DATA = 'FRESH_DATA';
const FETCH_TYPE_SKIP = 'SKIP_FETCH'; // Although not used after removing fallback, kept for potential future use or consistency

/**
 * @typedef {object} KbInitialState
 * @property {Array<object>} articles - Stores the array of fetched knowledge base articles.
 * @property {object|null} currentArticle - Holds the currently selected or viewed article. Null if no article is active.
 * @property {boolean} isError - Flag indicating if an error occurred during the last API request.
 * @property {boolean} isSuccess - Flag indicating if the last API request was successful.
 * @property {boolean} isLoading - Flag indicating if an API request is currently in progress for primary data.
 * @property {string} message - Stores messages from API responses, typically error or success messages.
 * @property {number|null} lastFetched - Timestamp (Date.now()) of when the articles collection was last successfully fetched or validated. Used for cache management.
 * @property {boolean} backgroundRefreshingArticles - Flag indicating if a background refresh of articles is currently in progress.
 */

/**
 * @type {KbInitialState}
 * @description Initial state for the Knowledge Base feature slice.
 * This structure holds all data related to KB articles, their fetching status,
 * and UI-related flags.
 */
const initialState = {
  articles: [],
  currentArticle: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
  lastFetched: null,
  backgroundRefreshingArticles: false,
};

/**
 * @async
 * @function getKbArticles
 * @description Asynchronous thunk to fetch Knowledge Base articles from the API.
 * It supports various fetching strategies including force refresh, smart refresh (comparing with existing data),
 * and background refresh to update data without blocking the UI.
 *
 * @param {object} [options={}] - Configuration options for fetching articles.
 * @param {boolean} [options.forceRefresh=false] - If true, bypasses the cache and fetches fresh data unconditionally.
 * @param {boolean} [options.smartRefresh=true] - If true, fetches data and only updates the Redux state if the new data differs from the existing data.
 * @param {boolean} [options.backgroundRefresh=false] - If true and the cache is valid, returns cached data immediately while initiating a background fetch to update the cache.
 * @param {object} [options.queryParams={}] - An object containing query parameters to be sent with the API request (e.g., for filtering, sorting, pagination).
 * @param {boolean} [options.compareWithExisting=true] - (Used internally by smartRefresh logic) Determines if fetched data should be compared with existing state.
 * @param {string} [options.idField='_id'] - (Used internally by smartRefresh logic) The field name to use as a unique identifier when comparing collections.
 *
 * @returns {Promise<object>} A promise that resolves to an object indicating the fetch outcome.
 * Possible return structures:
 * - For fresh data: `{ type: FETCH_TYPE_FRESH_DATA, data: Array<object>, timestamp: number }`
 * - For cache valid with background refresh: `{ type: FETCH_TYPE_CACHE_VALID_REFRESH, data: Array<object>, message: string }`
 * The `data` property contains the array of KB articles.
 *
 * @throws {string} Rejects with an error message if the API call fails.
 */
export const getKbArticles = createAsyncThunk(
  'kb/getAll',
  async (options = {}, thunkAPI) => {
    const {
      forceRefresh = false,
      smartRefresh = true,
      backgroundRefresh = false,
      queryParams = {},
    } = options;

    const state = thunkAPI.getState().kb;

    // Scenario 1: Background refresh with valid cache
    if (
      backgroundRefresh &&
      smartRefresh &&
      state.lastFetched &&
      !forceRefresh
    ) {
      const now = Date.now();
      const timeSinceLastFetch = now - state.lastFetched;
      if (timeSinceLastFetch < CACHE_TIMEOUT) {
        // Cache is valid, dispatch background fetch and return current data
        thunkAPI.dispatch(
          fetchKbArticlesInBackground({ queryParams, smartRefresh })
        );
        return {
          type: FETCH_TYPE_CACHE_VALID_REFRESH,
          data: state.articles, // Return existing data immediately
          message: 'Serving from cache while refreshing in background.',
        };
      }
    }

    // Scenario 2: Normal fetch (or cache expired for background refresh)
    try {
      // For normal fetches, or background fetches with an invalid cache,
      // the isLoading state will be set to true by the corresponding pending reducer case.
      const response = await api.get(KB_URL, { params: queryParams });
      return {
        type: FETCH_TYPE_FRESH_DATA,
        data: response.data.data, // Return the array of articles
        timestamp: Date.now(),
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

/**
 * @async
 * @function fetchKbArticlesInBackground
 * @description Asynchronous thunk to fetch Knowledge Base articles in the background.
 * This is typically dispatched by `getKbArticles` when a background refresh is initiated.
 * It updates the cache without affecting the primary `isLoading` state.
 *
 * @param {object} [options={}] - Configuration options for fetching articles.
 * @param {object} [options.queryParams={}] - An object containing query parameters to be sent with the API request.
 * @param {boolean} [options.smartRefresh=true] - If true, fetches data and only updates the Redux state if the new data differs from the existing data.
 *
 * @returns {Promise<object>} A promise that resolves to an object containing the fetched data and metadata.
 * Structure: `{ data: Array<object>, timestamp: number, smartRefresh: boolean }`
 * The `data` property contains the array of KB articles.
 *
 * @throws {string} Rejects with an error message if the API call fails. This error is typically handled silently (e.g., logged) without setting global error flags.
 */
export const fetchKbArticlesInBackground = createAsyncThunk(
  'kb/fetchInBackground',
  async (options = {}, thunkAPI) => {
    const { queryParams = {}, smartRefresh = true } = options;
    try {
      const response = await api.get(KB_URL, { params: queryParams });
      return {
        data: response.data.data,
        timestamp: Date.now(),
        smartRefresh, // Pass this along to the reducer
      };
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      // Optionally, dispatch a specific error action or handle silently
      console.error('Background fetch for KB articles failed:', message);
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// TODO: Add thunks for createKbArticle, getKbArticle, updateKbArticle, deleteKbArticle later

// Create the KB slice
export const kbSlice = createSlice({
  name: 'kb',
  initialState,
  reducers: {
    /**
     * @function resetKbStatus
     * @description Resets the status flags (isLoading, isSuccess, isError, message, backgroundRefreshingArticles) in the KB state.
     * This is useful for clearing status indicators after an operation is complete or when navigating away from a view.
     * @param {KbInitialState} state - The current KB slice state.
     */
    resetKbStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
      state.backgroundRefreshingArticles = false;
    },
    // Add other specific reducers if needed
  },
  extraReducers: (builder) => {
    builder
      // Get KB Articles Cases
      .addCase(getKbArticles.pending, (state, action) => {
        if (action.meta.arg && action.meta.arg.backgroundRefresh) {
          state.backgroundRefreshingArticles = true;
        } else {
          state.isLoading = true;
        }
        state.isError = false; // Reset error state on new request
        state.isSuccess = false; // Reset success state
      })
      .addCase(getKbArticles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.backgroundRefreshingArticles = false;
        state.isSuccess = true;

        if (
          action.payload &&
          action.payload.type === FETCH_TYPE_CACHE_VALID_REFRESH
        ) {
          // Data served from cache, background refresh initiated. No primary state change needed for articles.
          // Message from payload can be used for notifications if desired.
        } else if (
          action.payload &&
          action.payload.type === FETCH_TYPE_FRESH_DATA
        ) {
          const {
            smartRefresh,
            compareWithExisting = true, // Default to true if smartRefresh is enabled
            idField = '_id',
          } = action.meta.arg || {}; // Options passed to getKbArticles

          if (smartRefresh && compareWithExisting) {
            if (
              hasCollectionChanged(action.payload.data, state.articles, idField)
            ) {
              state.articles = action.payload.data;
              state.lastFetched = action.payload.timestamp;
            } else {
              // Smart refresh determined no changes, but update timestamp to reflect the check
              state.lastFetched = action.payload.timestamp;
            }
          } else {
            // Not using smart refresh or explicitly told not to compare
            state.articles = action.payload.data;
            state.lastFetched = action.payload.timestamp;
          }
        }
        // Removed the risky fallback:
        // else if (action.payload) {
        // Fallback for direct data, though type field is preferred
        // state.articles = action.payload;
        // state.lastFetched = Date.now();
        // }
      })
      .addCase(getKbArticles.rejected, (state, action) => {
        state.isLoading = false;
        state.backgroundRefreshingArticles = false;
        state.isError = true;
        state.message = action.payload;
      })
      // Fetch KB Articles In Background Cases
      .addCase(fetchKbArticlesInBackground.pending, (state) => {
        state.backgroundRefreshingArticles = true;
        state.isError = false; // Reset error state on new background request
      })
      .addCase(fetchKbArticlesInBackground.fulfilled, (state, action) => {
        state.backgroundRefreshingArticles = false;
        // state.isSuccess = true; // Optionally set success, or rely on main fetch's success

        // The options for smartRefresh, compareWithExisting, idField are taken from the
        // fetchKbArticlesInBackground thunk's arguments, which should be passed
        // when it's dispatched by getKbArticles.
        const {
          smartRefresh, // This comes from action.payload as returned by the thunk
          compareWithExisting = true, // Default to true if smartRefresh is enabled
          idField = '_id', // Default idField
        } = action.payload && typeof action.payload === 'object'
          ? action.payload
          : {};

        if (smartRefresh && compareWithExisting) {
          if (
            hasCollectionChanged(action.payload.data, state.articles, idField)
          ) {
            state.articles = action.payload.data;
            state.lastFetched = action.payload.timestamp;
          } else {
            // Ensure lastFetched is updated even if content is same, to reflect check time
            state.lastFetched = action.payload.timestamp;
          }
        } else {
          state.articles = action.payload.data;
          state.lastFetched = action.payload.timestamp;
        }
      })
      .addCase(fetchKbArticlesInBackground.rejected, (state, action) => {
        state.backgroundRefreshingArticles = false;
        // state.isError = true; // Optionally set error, or log silently
        // state.message = `Background refresh failed: ${action.payload}`;
        console.error(
          'Background fetch of KB articles failed:',
          action.payload
        );
      });
    // TODO: Add cases for other KB actions later
  },
});

export const { resetKbStatus } = kbSlice.actions;
export default kbSlice.reducer;
