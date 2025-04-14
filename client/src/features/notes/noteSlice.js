import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

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
};

// Fetch all notes (with filters/search/sort)
export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async (params = {}, thunkAPI) => {
    try {
      const response = await api.get(NOTE_URL, { params });
      return response.data.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
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
    try {
      const response = await api.post(NOTE_URL, noteData);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
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
    try {
      const response = await api.get(`${NOTE_URL}/${id}`);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
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
    try {
      const response = await api.put(`${NOTE_URL}/${id}`, updates);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
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
    try {
      const response = await api.delete(`${NOTE_URL}/${id}`);
      return response.data.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
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
        (error.response && error.response.data && error.response.data.message) ||
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
        (error.response && error.response.data && error.response.data.message) ||
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
        state.notes = action.payload.filter((n) => !n.archived && !n.deletedAt);
        state.trash = action.payload.filter((n) => n.deletedAt);
        state.archived = action.payload.filter((n) => n.archived && !n.deletedAt);
        state.favorites = action.payload.filter((n) => n.favorite && !n.deletedAt && !n.archived);
        state.pinned = action.payload.filter((n) => n.pinned && !n.deletedAt && !n.archived);
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
        state.notes = state.notes.map((n) => (n._id === action.payload._id ? action.payload : n));
        state.archived = state.archived.map((n) => (n._id === action.payload._id ? action.payload : n));
        state.favorites = state.favorites.map((n) => (n._id === action.payload._id ? action.payload : n));
        state.pinned = state.pinned.map((n) => (n._id === action.payload._id ? action.payload : n));
        state.trash = state.trash.map((n) => (n._id === action.payload._id ? action.payload : n));
        if (state.selectedNote && state.selectedNote._id === action.payload._id) {
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
        // Move to trash
        state.trash.unshift(action.payload);
        state.notes = state.notes.filter((n) => n._id !== action.payload._id);
        state.archived = state.archived.filter((n) => n._id !== action.payload._id);
        state.favorites = state.favorites.filter((n) => n._id !== action.payload._id);
        state.pinned = state.pinned.filter((n) => n._id !== action.payload._id);
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

export const { resetNoteStatus, setSelectedNote } = noteSlice.actions;
export default noteSlice.reducer;
