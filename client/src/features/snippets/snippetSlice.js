import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Get all snippets
export const getSnippets = createAsyncThunk(
  'snippets/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/snippets');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Get a single snippet
export const getSnippet = createAsyncThunk(
  'snippets/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/snippets/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Create a snippet
export const createSnippet = createAsyncThunk(
  'snippets/create',
  async (snippetData, { rejectWithValue }) => {
    try {
      const response = await api.post('/snippets', snippetData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Update a snippet
export const updateSnippet = createAsyncThunk(
  'snippets/update',
  async ({ id, snippetData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/snippets/${id}`, snippetData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Delete a snippet
export const deleteSnippet = createAsyncThunk(
  'snippets/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/snippets/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const snippetSlice = createSlice({
  name: 'snippets',
  initialState: {
    snippets: [],
    currentSnippet: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
  },
  reducers: {
    resetSnippetStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearCurrentSnippet: (state) => {
      state.currentSnippet = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all snippets
      .addCase(getSnippets.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSnippets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.snippets = action.payload;
      })
      .addCase(getSnippets.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch snippets';
      })
      // Get single snippet
      .addCase(getSnippet.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getSnippet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentSnippet = action.payload;
      })
      .addCase(getSnippet.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch snippet';
      })
      // Create snippet
      .addCase(createSnippet.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createSnippet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.snippets.push(action.payload);
      })
      .addCase(createSnippet.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to create snippet';
      })
      // Update snippet
      .addCase(updateSnippet.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateSnippet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.snippets = state.snippets.map((snippet) =>
          snippet._id === action.payload._id ? action.payload : snippet
        );
        if (state.currentSnippet?._id === action.payload._id) {
          state.currentSnippet = action.payload;
        }
      })
      .addCase(updateSnippet.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to update snippet';
      })
      // Delete snippet
      .addCase(deleteSnippet.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteSnippet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.snippets = state.snippets.filter(
          (snippet) => snippet._id !== action.payload
        );
        if (state.currentSnippet?._id === action.payload) {
          state.currentSnippet = null;
        }
      })
      .addCase(deleteSnippet.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to delete snippet';
      });
  },
});

export const { resetSnippetStatus, clearCurrentSnippet } = snippetSlice.actions;
export default snippetSlice.reducer;
