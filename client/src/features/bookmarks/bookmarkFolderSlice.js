import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Get all bookmark folders
export const getFolders = createAsyncThunk(
  'bookmarkFolders/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/bookmark-folders');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Get a single bookmark folder
export const getFolder = createAsyncThunk(
  'bookmarkFolders/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/bookmark-folders/${id}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Create a bookmark folder
export const createFolder = createAsyncThunk(
  'bookmarkFolders/create',
  async (folderData, { rejectWithValue }) => {
    try {
      const response = await api.post('/bookmark-folders', folderData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Update a bookmark folder
export const updateFolder = createAsyncThunk(
  'bookmarkFolders/update',
  async ({ id, folderData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/bookmark-folders/${id}`, folderData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Delete a bookmark folder
export const deleteFolder = createAsyncThunk(
  'bookmarkFolders/delete',
  async ({ id, confirm = false }, { rejectWithValue }) => {
    try {
      const url = confirm
        ? `/bookmark-folders/${id}?confirm=true`
        : `/bookmark-folders/${id}`;

      await api.delete(url);
      return id;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Get bookmarks for a specific folder
export const getFolderBookmarks = createAsyncThunk(
  'bookmarkFolders/getBookmarks',
  async (folderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/bookmark-folders/${folderId}/bookmarks`);
      return {
        folderId,
        bookmarks: response.data.data,
      };
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const bookmarkFolderSlice = createSlice({
  name: 'bookmarkFolders',
  initialState: {
    folders: [],
    currentFolder: null,
    currentFolderBookmarks: [],
    isLoading: false,
    isSuccess: false,
    isError: false,
    message: '',
  },
  reducers: {
    resetFolderStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    clearCurrentFolder: (state) => {
      state.currentFolder = null;
      state.currentFolderBookmarks = [];
    },
    setFolderExpanded: (state, action) => {
      const { id, expanded } = action.payload;
      const folder = state.folders.find((f) => f._id === id);
      if (folder) {
        folder.expanded = expanded;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all folders
      .addCase(getFolders.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getFolders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.folders = action.payload;
      })
      .addCase(getFolders.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch folders';
      })
      // Get single folder
      .addCase(getFolder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getFolder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentFolder = action.payload;
      })
      .addCase(getFolder.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to fetch folder';
      })
      // Create folder
      .addCase(createFolder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createFolder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.folders.push(action.payload);
      })
      .addCase(createFolder.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to create folder';
      })
      // Update folder
      .addCase(updateFolder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateFolder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.folders = state.folders.map((folder) =>
          folder._id === action.payload._id ? action.payload : folder
        );
        if (state.currentFolder?._id === action.payload._id) {
          state.currentFolder = action.payload;
        }
      })
      .addCase(updateFolder.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to update folder';
      })
      // Delete folder
      .addCase(deleteFolder.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteFolder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.folders = state.folders.filter(
          (folder) => folder._id !== action.payload
        );
        if (state.currentFolder?._id === action.payload) {
          state.currentFolder = null;
          state.currentFolderBookmarks = [];
        }
      })
      .addCase(deleteFolder.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload?.message || 'Failed to delete folder';
      })
      // Get folder bookmarks
      .addCase(getFolderBookmarks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getFolderBookmarks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentFolderBookmarks = action.payload.bookmarks;
      })
      .addCase(getFolderBookmarks.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message =
          action.payload?.message || 'Failed to fetch folder bookmarks';
      });
  },
});

export const { resetFolderStatus, clearCurrentFolder, setFolderExpanded } =
  bookmarkFolderSlice.actions;
export default bookmarkFolderSlice.reducer;
