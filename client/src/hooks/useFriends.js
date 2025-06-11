import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getFriends } from '../features/friends/friendSlice';
import { selectGuestItemsByType } from '../features/guestSandbox/guestSandboxSlice';
import { formatGuestItemsArray } from '../utils/guestDataFormatters';

/**
 * Custom hook to fetch and manage the friends list
 * Returns friends list and loading/error states
 * Includes support for guest users by handling data from the guest sandbox
 */
export function useFriends() {
  const dispatch = useDispatch();

  // Memoized selectors to prevent Redux rerender warnings
  const selectFriends = useMemo(() => (state) => state.friends, []);
  const selectAuth = useMemo(() => (state) => state.auth, []);
  const selectGuestFriends = useMemo(
    () => (state) => selectGuestItemsByType(state, 'friends'),
    []
  );

  const { friends, isLoading } = useSelector(selectFriends);

  const { isGuest } = useSelector(selectAuth);

  const guestFriends = useSelector(selectGuestFriends);

  const [error, setError] = useState(null);

  // Format guest friends to match API structure
  const formattedGuestFriends = useMemo(() => {
    if (!isGuest) return [];

    // Use the utility function to format guest friends
    return formatGuestItemsArray(guestFriends);
  }, [isGuest, guestFriends]);

  useEffect(() => {
    // Skip API call for guest users - data comes from Redux state directly
    if (isGuest) return;

    const loadFriends = async () => {
      try {
        await dispatch(getFriends()).unwrap();
        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load friends');
        console.error('Error loading friends:', err);
      }
    };

    loadFriends();
  }, [dispatch, isGuest]);

  // Return guest data if in guest mode, or API data for regular users
  return {
    friends: isGuest ? formattedGuestFriends : friends,
    isLoading: isGuest ? false : isLoading, // Never loading for guest users
    error,
  };
}

export default useFriends;
