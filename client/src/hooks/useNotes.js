/**
 * useNotes.js - Custom hook for fetching and managing notes data
 *
 * This hook leverages the useDataFetching hook to efficiently retrieve and cache notes data.
 * It ensures that notes are only fetched when needed and prevents redundant API calls,
 * which was causing multiple identical requests on dashboard load.
 */

import { useSelector } from 'react-redux';
import useDataFetching from './useDataFetching';
import { fetchNotes } from '../features/notes/noteSlice';

/**
 * Hook for efficient notes data fetching with caching
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.queryParams - Query parameters for the notes API
 * @param {string} options.queryParams.sort - Sorting criteria (e.g., '-updatedAt')
 * @param {number} options.queryParams.limit - Maximum number of notes to retrieve
 * @param {number} options.cacheTimeout - Custom cache timeout in milliseconds
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @returns {Object} Object containing { notes, isLoading, error, refetchNotes }
 */
const useNotes = ({
  queryParams = {},
  cacheTimeout,
  skipInitialFetch = false,
}) => {
  // Selectors for accessing notes state from Redux
  const selectNotes = (state) => state.notes.notes;
  const selectNotesLastFetched = (state) => state.notes.lastFetched;
  const selectNotesLoading = (state) => state.notes.isLoading;
  const selectNotesError = (state) =>
    state.notes.isError ? state.notes.message : null;

  // Get the current filter from Redux if needed for dependency tracking
  const notesFilter = useSelector((state) => state.notes.filter);

  // Use the enhanced data fetching hook
  const {
    data: notes,
    isLoading,
    error,
    refetch: refetchNotes,
  } = useDataFetching({
    fetchAction: fetchNotes,
    selectData: selectNotes,
    selectLastFetched: selectNotesLastFetched,
    selectIsLoading: selectNotesLoading,
    selectError: selectNotesError,
    dependencies: [JSON.stringify(queryParams), notesFilter], // Re-fetch if query params change
    fetchParams: queryParams,
    cacheTimeout,
    skipInitialFetch,
  });

  return {
    notes,
    isLoading,
    error,
    refetchNotes,
  };
};

export default useNotes;
