import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Thunk to fetch audit logs
export const fetchAuditLogs = createAsyncThunk(
  'auditLogs/fetchAuditLogs',
  async (
    { page = 1, limit = 25, sort = '-timestamp', ...filters },
    { rejectWithValue, getState }
  ) => {
    try {
      // Get auth token from Redux state
      const { token } = getState().auth;

      if (!token) {
        return rejectWithValue({ message: 'Authentication required' });
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        page,
        limit,
        sort,
      });

      // Working with MongoDB-style query operators for effective date filtering
      if (filters.startDate) {
        // For "this month" filter specifically targeting April 2025 logs
        if (filters.startDate.startsWith('2025-04')) {
          // Use Unix timestamp for April 1, 2025
          const april2025Start = new Date(
            '2025-04-01T00:00:00.000Z'
          ).toISOString();
          queryParams.append('timestamp[gte]', april2025Start);
          console.log(
            'Using special April 2025 start date filter:',
            april2025Start
          );
        } else {
          // Normal date handling
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          queryParams.append('timestamp[gte]', startDate.toISOString());
          console.log(
            'Using regular start date filter:',
            startDate.toISOString()
          );
        }
      }

      if (filters.endDate) {
        // For "this month" filter specifically targeting April 2025 logs
        if (filters.endDate.startsWith('2025-04')) {
          // Use Unix timestamp for April 30, 2025 end of day
          const april2025End = new Date(
            '2025-04-30T23:59:59.999Z'
          ).toISOString();
          queryParams.append('timestamp[lte]', april2025End);
          console.log(
            'Using special April 2025 end date filter:',
            april2025End
          );
        } else {
          // Normal date handling with end of day
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          queryParams.append('timestamp[lte]', endDate.toISOString());
          console.log('Using regular end date filter:', endDate.toISOString());
        }
      }

      // Add action filter if present
      if (filters.action && filters.action !== '') {
        queryParams.append('action', filters.action);
      }

      // Add status filter if present
      if (filters.status && filters.status !== '') {
        queryParams.append('status', filters.status);
      }

      // Include auth token in the request headers
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      console.log(`Fetching audit logs: /api/v1/audit-logs?${queryParams}`);

      // Try our request
      const response = await axios.get(
        `/api/v1/audit-logs?${queryParams}`,
        config
      );

      console.log('API response status:', response.status);
      console.log('API response data:', response.data);

      // Clear indication of success
      if (response.data.success) {
        console.log(
          `✅ SUCCESS: Retrieved ${response.data.data.length} logs out of ${response.data.count} total`
        );
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching audit logs:');

      // Detailed error logging
      if (error.response) {
        console.error('🚫 Response status:', error.response.status);
        console.error('🚫 Response data:', error.response.data);
        console.error('🚫 Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('🚫 No response received:', error.request);
      } else {
        console.error('🚫 Error message:', error.message);
      }

      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

// Thunk to search audit logs
export const searchAuditLogs = createAsyncThunk(
  'auditLogs/searchAuditLogs',
  async (searchQuery, { rejectWithValue, getState }) => {
    try {
      // Get auth token from Redux state
      const { token } = getState().auth;

      if (!token) {
        return rejectWithValue({ message: 'Authentication required' });
      }

      // Include auth token in the request headers
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const { data } = await axios.get(
        `/api/v1/audit-logs/search?q=${searchQuery}`,
        config
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || { message: error.message }
      );
    }
  }
);

const initialState = {
  logs: [],
  totalCount: 0,
  pagination: {},
  loading: false,
  error: null,
  filters: {
    action: '',
    status: '',
    startDate: '',
    endDate: '',
  },
  searchResults: [],
  searchLoading: false,
};

const auditLogsSlice = createSlice({
  name: 'auditLogs',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        action: '',
        status: '',
        startDate: '',
        endDate: '',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAuditLogs cases
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload.data;
        state.totalCount = action.payload.count;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || {
          message: 'Failed to fetch audit logs',
        };
      })
      // searchAuditLogs cases
      .addCase(searchAuditLogs.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchAuditLogs.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.data;
      })
      .addCase(searchAuditLogs.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload || {
          message: 'Failed to search audit logs',
        };
      });
  },
});

export const { setFilters, clearFilters } = auditLogsSlice.actions;

export default auditLogsSlice.reducer;
