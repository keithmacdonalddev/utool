/**
 * useBookmarks.js - Custom hook for fetching and managing bookmarks data
 *
 * This hook leverages the useDataFetching hook to efficiently retrieve and cache bookmarks data.
 * It ensures that bookmarks are only fetched when needed and prevents redundant API calls.
 *
 * Includes support for guest users by returning data from the guest sandbox when the user is a guest.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import useDataFetching from './useDataFetching';
import { getBookmarks, getBookmark } from '../features/bookmarks/bookmarkSlice';
import { selectGuestItemsByType } from '../features/guestSandbox/guestSandboxSlice';

/**
 * Custom hook for efficiently loading bookmarks list or a single bookmark
 * This prevents redundant API calls by using the caching system in Redux
 *
 * @param {Object} options - Additional options
 * @param {number} options.cacheTimeout - How long to consider cached data fresh (ms)
 * @param {boolean} options.skipInitialFetch - Whether to skip the initial fetch
 * @param {boolean} options.backgroundRefresh - Whether to refresh in background while showing cached data
 * @param {string} options.actionCreator - Which action to use ('getBookmarks' or 'getBookmark')
 * @param {any} options.actionParams - Parameters to pass to the action creator (e.g., bookmarkId)
 * @returns {Object} Object containing { bookmarks/data, isLoading, error, refetchBookmarks/refetch }
 */
const useBookmarks = (options = {}) => {
  const {
    cacheTimeout,
    skipInitialFetch = false,
    backgroundRefresh = true,
    actionCreator = 'getBookmarks',
    actionParams = {},
  } = options;

  // Get auth state to check if user is a guest
  const { isGuest } = useSelector((state) => state.auth);

  // Get guest bookmark data directly if the user is a guest
  const guestBookmarks = useSelector((state) =>
    isGuest ? selectGuestItemsByType(state, 'bookmarks') : []
  );

  // Format guest bookmarks to match API structure
  const formattedGuestBookmarks = useMemo(() => {
    if (!isGuest) return [];

    // For a specific bookmark
    if (actionCreator === 'getBookmark') {
      const bookmarkId =
        typeof actionParams === 'string'
          ? actionParams
          : actionParams.bookmarkId;

      const bookmark = guestBookmarks.find((b) => b.id === bookmarkId);

      if (bookmark) {
        return {
          ...bookmark.data,
          _id: bookmark.id,
          id: bookmark.id,
          createdAt: bookmark.createdAt,
          updatedAt: bookmark.updatedAt,
        };
      }
      return null;
    }

    // For all bookmarks
    return guestBookmarks.map((bookmark) => ({
      ...bookmark.data,
      _id: bookmark.id,
      id: bookmark.id,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
    }));
  }, [isGuest, guestBookmarks, actionCreator, actionParams]);

  // Determine which action function to use based on actionCreator
  const fetchAction = useMemo(() => {
    if (actionCreator === 'getBookmark') {
      return getBookmark;
    }
    return getBookmarks;
  }, [actionCreator]);

  // Selectors for accessing bookmarks state from Redux
  const selectBookmarks = (state) => state.bookmarks.bookmarks;
  const selectBookmarksLastFetched = (state) =>
    state.bookmarks.lastFetched || null;
  const selectBookmarksLoading = (state) => state.bookmarks.isLoading;
  const selectBookmarksError = (state) =>
    state.bookmarks.isError ? state.bookmarks.message : null;

  // Use the enhanced data fetching hook
  const {
    data: apiBookmarks,
    isLoading,
    error,
    refetch: refetchBookmarks,
  } = useDataFetching({
    fetchAction,
    selectData: selectBookmarks,
    selectLastFetched: selectBookmarksLastFetched,
    selectIsLoading: selectBookmarksLoading,
    selectError: selectBookmarksError,
    dependencies: [], // Re-fetch if dependencies change
    fetchParams: actionParams,
    cacheTimeout,
    skipInitialFetch: skipInitialFetch || isGuest, // Skip fetch for guest users
    backgroundRefresh: backgroundRefresh && !isGuest, // No background refresh for guest users
    idField: '_id', // Use _id for comparing bookmark objects
  });

  // For guest users, use the formatted guest bookmarks
  const bookmarks = isGuest ? formattedGuestBookmarks : apiBookmarks;

  return {
    bookmarks,
    isLoading: isGuest ? false : isLoading, // Never loading for guest users
    error,
    refetchBookmarks,
  };
};

export default useBookmarks;
