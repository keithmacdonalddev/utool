import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getFriends } from '../features/friends/friendSlice';

/**
 * Custom hook to fetch and manage the friends list
 * Returns friends list and loading/error states
 */
export function useFriends() {
  const dispatch = useDispatch();
  const { friends, isLoading } = useSelector((state) => state.friends);
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, [dispatch]);

  return { friends, isLoading, error };
}

export default useFriends;
