import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Use our configured axios instance

const PROJECT_URL = '/projects/'; // Relative to base URL in api.js

// Initial state for projects
const initialState = {
    projects: [],
    currentProject: null, // For viewing a single project later
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: '',
};

// Async thunk to get user's projects
export const getProjects = createAsyncThunk(
    'projects/getAll',
    async (_, thunkAPI) => {
        try {
            const response = await api.get(PROJECT_URL);
            return response.data.data; // Return the array of projects
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

// Async thunk to create a project
export const createProject = createAsyncThunk(
    'projects/create',
    async (projectData, thunkAPI) => {
        try {
            const response = await api.post(PROJECT_URL, projectData);
            return response.data.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async thunk to get a single project
export const getProject = createAsyncThunk(
    'projects/getOne',
    async (projectId, thunkAPI) => {
        try {
            const response = await api.get(PROJECT_URL + projectId);
            return response.data.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async thunk to update a project
export const updateProject = createAsyncThunk(
    'projects/update',
    async ({ projectId, projectData }, thunkAPI) => {
        try {
            const response = await api.put(PROJECT_URL + projectId, projectData);
            return response.data.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async thunk to delete a project
export const deleteProject = createAsyncThunk(
    'projects/delete',
    async (projectId, thunkAPI) => {
        try {
            await api.delete(PROJECT_URL + projectId);
            return projectId; // Return the ID of the deleted project for removal from state
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);


// Create the project slice
export const projectSlice = createSlice({
    name: 'projects',
    initialState,
    reducers: {
        resetProjectStatus: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        },
        // Add other specific reducers if needed
    },
    extraReducers: (builder) => {
        builder
            // Get Projects Cases
            .addCase(getProjects.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getProjects.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.projects = action.payload; // Store fetched projects
            })
            .addCase(getProjects.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.projects = []; // Clear on error
            })
            // Create Project Cases
            .addCase(createProject.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.projects.push(action.payload); // Add new project to the list
            })
            .addCase(createProject.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Single Project Cases
            .addCase(getProject.pending, (state) => {
                state.isLoading = true; // Or a different loading flag like isLoadingCurrent
                state.currentProject = null; // Clear previous project
            })
            .addCase(getProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.currentProject = action.payload; // Set the fetched project
            })
            .addCase(getProject.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.currentProject = null;
            })
            // Update Project Cases
            .addCase(updateProject.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Update the project in the projects array
                const index = state.projects.findIndex(p => p._id === action.payload._id);
                if (index !== -1) {
                    state.projects[index] = action.payload;
                }
                // Update currentProject if it's the one being edited
                if (state.currentProject?._id === action.payload._id) {
                    state.currentProject = action.payload;
                }
            })
            .addCase(updateProject.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Delete Project Cases
            .addCase(deleteProject.pending, (state) => {
                state.isLoading = true; // Or a specific deleting flag
            })
            .addCase(deleteProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Remove the project from the projects array
                state.projects = state.projects.filter(p => p._id !== action.payload);
                 // Clear currentProject if it's the one deleted
                if (state.currentProject?._id === action.payload) {
                    state.currentProject = null;
                }
            })
            .addCase(deleteProject.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { resetProjectStatus } = projectSlice.actions;
export default projectSlice.reducer;
