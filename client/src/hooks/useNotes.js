/**
 * useNotes.js - Custom hook for fetching and managing notes data
 *
 * This hook leverages the useDataFetching hook to efficiently retrieve and cache notes data.
 * It ensures that notes are only fetched when needed and prevents redundant API calls,
 * which was causing multiple identical requests on dashboard load.
 *
 * Updated to support guest users by returning data from the guest sandbox when the user is a guest.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useDataFetching from './useDataFetching';
import { fetchNotes } from '../features/notes/noteSlice';
import { selectGuestItemsByType } from '../features/guestSandbox/guestSandboxSlice';

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
  backgroundRefresh = false,
  smartRefresh = false,
}) => {
  // Selectors for accessing notes state from Redux
  const selectNotes = (state) => state.notes.notes;
  const selectNotesLastFetched = (state) => state.notes.lastFetched;
  const selectNotesLoading = (state) => state.notes.isLoading;
  const selectNotesError = (state) =>
    state.notes.isError ? state.notes.message : null;

  // Get the current filter from Redux if needed for dependency tracking
  const notesFilter = useSelector((state) => state.notes.filter);

  // Get auth state to check if user is a guest
  const { isGuest } = useSelector((state) => state.auth);

  // Get guest note data directly if the user is a guest
  const guestNotes = useSelector((state) =>
    isGuest ? selectGuestItemsByType(state, 'notes') : []
  );

  // Format guest notes to match API structure
  const formattedGuestNotes = useMemo(() => {
    if (!isGuest) return [];

    return guestNotes.map((note) => ({
      ...note.data,
      _id: note.id,
      id: note.id,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));
  }, [isGuest, guestNotes]); // Use the enhanced data fetching hook
  const {
    data: apiNotes,
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
    skipInitialFetch: skipInitialFetch || isGuest, // Skip fetch for guest users
    backgroundRefresh: backgroundRefresh && !isGuest, // No background refresh for guest users
    smartRefresh,
    idField: '_id', // Use _id for comparing note objects
  });

  // For guest users, use the formatted guest notes
  const notes = isGuest ? formattedGuestNotes : apiNotes;

  return {
    notes,
    isLoading: isGuest ? false : isLoading, // Never loading for guest users
    error,
    refetchNotes,
  };
};

export default useNotes;
