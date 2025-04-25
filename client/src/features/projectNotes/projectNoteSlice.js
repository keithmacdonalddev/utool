// projectNoteSlice.js - Redux Toolkit slice for managing project notes
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// Initial state
const initialState = {
  notes: [],
  currentNote: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Async thunks for project notes

/**
 * Get all notes for a specific project
 */
export const getProjectNotes = createAsyncThunk(
  'projectNotes/getAll',
  async (projectId, thunkAPI) => {
    try {
      const response = await api.get(`/projects/${projectId}/notes`);
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

/**
 * Create a new project note
 */
export const createProjectNote = createAsyncThunk(
  'projectNotes/create',
  async ({ projectId, noteData }, thunkAPI) => {
    try {
      const response = await api.post(`/projects/${projectId}/notes`, noteData);
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

/**
 * Get a single project note
 */
export const getProjectNote = createAsyncThunk(
  'projectNotes/getOne',
  async ({ projectId, noteId }, thunkAPI) => {
    try {
      const response = await api.get(`/projects/${projectId}/notes/${noteId}`);
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

/**
 * Update a project note
 */
export const updateProjectNote = createAsyncThunk(
  'projectNotes/update',
  async ({ projectId, noteId, noteData }, thunkAPI) => {
    try {
      const response = await api.put(
        `/projects/${projectId}/notes/${noteId}`,
        noteData
      );
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

/**
 * Delete a project note
 */
export const deleteProjectNote = createAsyncThunk(
  'projectNotes/delete',
  async ({ projectId, noteId }, thunkAPI) => {
    try {
      await api.delete(`/projects/${projectId}/notes/${noteId}`);
      return { id: noteId };
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
 * Toggle pin status of a project note
 */
export const togglePinProjectNote = createAsyncThunk(
  'projectNotes/togglePin',
  async ({ projectId, noteId }, thunkAPI) => {
    try {
      const response = await api.patch(
        `/projects/${projectId}/notes/${noteId}/toggle-pin`
      );
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

// Project Notes slice
const projectNoteSlice = createSlice({
  name: 'projectNotes',
  initialState,
  reducers: {
    // Reset status flags
    resetProjectNoteStatus: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    // Clear notes - used when navigating away from a project
    clearProjectNotes: (state) => {
      state.notes = [];
      state.currentNote = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all notes for a project
      .addCase(getProjectNotes.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getProjectNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notes = action.payload;
      })
      .addCase(getProjectNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.notes = [];
      })

      // Create a new note
      .addCase(createProjectNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createProjectNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.notes.unshift(action.payload);
      })
      .addCase(createProjectNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Get a single note
      .addCase(getProjectNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getProjectNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.currentNote = action.payload;
      })
      .addCase(getProjectNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Update a note
      .addCase(updateProjectNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProjectNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Replace the updated note in the array
        state.notes = state.notes.map((note) =>
          note._id === action.payload._id ? action.payload : note
        );
        // Also update currentNote if it matches the updated note
        if (state.currentNote && state.currentNote._id === action.payload._id) {
          state.currentNote = action.payload;
        }
      })
      .addCase(updateProjectNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Delete a note
      .addCase(deleteProjectNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteProjectNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Remove the deleted note from the array
        state.notes = state.notes.filter(
          (note) => note._id !== action.payload.id
        );
        // Clear currentNote if it's the one being deleted
        if (state.currentNote && state.currentNote._id === action.payload.id) {
          state.currentNote = null;
        }
      })
      .addCase(deleteProjectNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Toggle pin status
      .addCase(togglePinProjectNote.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(togglePinProjectNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the note in the array
        state.notes = state.notes.map((note) =>
          note._id === action.payload._id ? action.payload : note
        );
        // Re-sort the notes to keep pinned ones at top
        state.notes.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          // If both are pinned or both are not pinned, sort by creation date (newest first)
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        // Also update currentNote if it matches
        if (state.currentNote && state.currentNote._id === action.payload._id) {
          state.currentNote = action.payload;
        }
      })
      .addCase(togglePinProjectNote.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

// Export actions and reducer
export const { resetProjectNoteStatus, clearProjectNotes } =
  projectNoteSlice.actions;
export default projectNoteSlice.reducer;
