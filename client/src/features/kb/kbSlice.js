import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance

const KB_URL = '/kb/'; // Relative to base URL in api.js

// Initial state for Knowledge Base
const initialState = {
    articles: [], // Store fetched articles
    currentArticle: null, // For viewing a single article later
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// Async thunk to get KB articles
export const getKbArticles = createAsyncThunk(
    'kb/getAll',
    async (_, thunkAPI) => { // Add arguments later for pagination/filtering
        try {
            const response = await api.get(KB_URL);
            return response.data.data; // Return the array of articles
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

// TODO: Add thunks for createKbArticle, getKbArticle, updateKbArticle, deleteKbArticle later

// Create the KB slice
export const kbSlice = createSlice({
    name: 'kb',
    initialState,
    reducers: {
        resetKbStatus: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        },
        // Add other specific reducers if needed
    },
    extraReducers: (builder) => {
        builder
            // Get KB Articles Cases
            .addCase(getKbArticles.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getKbArticles.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.articles = action.payload; // Store fetched articles
            })
            .addCase(getKbArticles.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.articles = []; // Clear on error
            });
            // TODO: Add cases for other KB actions later
    },
});

export const { resetKbStatus } = kbSlice.actions;
export default kbSlice.reducer;
