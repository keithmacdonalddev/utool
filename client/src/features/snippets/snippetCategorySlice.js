import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

/**
 * Fetches all snippet categories for the current user
 *
 * @returns {Promise<Array>} Array of category objects
 */
export const getCategories = createAsyncThunk(
  'snippetCategories/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/snippets/categories');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/**
 * Fetches snippets belonging to a specific category
 *
 * @param {string} categoryId - The id of the category to fetch snippets for
 * @returns {Promise<Array>} Array of snippet objects in the category
 */
export const getCategorySnippets = createAsyncThunk(
  'snippetCategories/getCategorySnippets',
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/snippets/categories/${categoryId}`);
      return {
        categoryId,
        snippets: response.data.data,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/**
 * Creates a new snippet category
 *
 * @param {Object} categoryData - The category data including name and optional description
 * @returns {Promise<Object>} The created category object
 */
export const createCategory = createAsyncThunk(
  'snippetCategories/create',
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await api.post('/snippets/categories', categoryData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/**
 * Updates an existing snippet category
 *
 * @param {Object} params - Object containing id and categoryData
 * @param {string} params.id - The id of the category to update
 * @param {Object} params.categoryData - The updated category data
 * @returns {Promise<Object>} The updated category object
 */
export const updateCategory = createAsyncThunk(
  'snippetCategories/update',
  async ({ id, categoryData }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/snippets/categories/${id}`,
        categoryData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/**
 * Deletes a snippet category
 *
 * @param {string} id - The id of the category to delete
 * @returns {Promise<string>} The id of the deleted category
 */
export const deleteCategory = createAsyncThunk(
  'snippetCategories/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/snippets/categories/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

/**
 * Snippet Category Slice
 *
 * Manages state for snippet categories including:
 * - List of all categories
 * - Current category snippets
 * - Loading/error states
 */
const snippetCategorySlice = createSlice({
  name: 'snippetCategories',
  initialState: {
    categories: [],
    currentCategorySnippets: [],
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
  },
  reducers: {
    resetCategoryStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearCurrentCategorySnippets: (state) => {
      state.currentCategorySnippets = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all categories
      .addCase(getCategories.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.categories = action.payload;
      })
      .addCase(getCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch categories';
      })
      // Get category snippets
      .addCase(getCategorySnippets.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCategorySnippets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentCategorySnippets = action.payload.snippets;
      })
      .addCase(getCategorySnippets.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message =
          action.payload?.message || 'Failed to fetch category snippets';
      })
      // Create category
      .addCase(createCategory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.categories.push(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to create category';
      })
      // Update category
      .addCase(updateCategory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.categories = state.categories.map((category) =>
          category._id === action.payload._id ? action.payload : category
        );
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to update category';
      })
      // Delete category
      .addCase(deleteCategory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.categories = state.categories.filter(
          (category) => category._id !== action.payload
        );
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to delete category';
      });
  },
});

export const { resetCategoryStatus, clearCurrentCategorySnippets } =
  snippetCategorySlice.actions;
export default snippetCategorySlice.reducer;
