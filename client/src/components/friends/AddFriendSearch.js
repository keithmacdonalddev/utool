import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  searchUsers,
  sendFriendRequest,
  clearSearchResults,
  getFriendRequests,
} from '../../features/friends/friendSlice';
import { Input } from '../common/Input'; // Assuming common Input component
import Button from '../common/Button'; // Fixed: Changed from named import to default import
import { UserPlus, Search, XCircle } from 'lucide-react';
import UserAvatar from '../common/UserAvatar'; // Assuming common UserAvatar component
import Spinner from '../common/Spinner'; // Assuming common Spinner component

function AddFriendSearch() {
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const { searchResults, isSearching, isLoading } = useSelector(
    (state) => state.friends
  );
  const { user: currentUser } = useSelector((state) => state.auth);

  // Clear search results when the component unmounts, the tab changes, or the current user changes
  useEffect(() => {
    return () => {
      dispatch(clearSearchResults());
    };
  }, [dispatch, currentUser]); // Added currentUser to dependency array

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      dispatch(searchUsers(searchTerm.trim()));
    }
  };

  const handleSendRequest = async (userId) => {
    await dispatch(sendFriendRequest(userId));
    // Refresh the friend requests list to show newly sent request
    dispatch(getFriendRequests());
    // Clear search results after sending a request
    dispatch(clearSearchResults());
    // Optionally provide feedback like a toast notification here
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    dispatch(clearSearchResults());
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">Find New Friends</h2>
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
          disabled={isSearching}
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClearSearch}
            disabled={isSearching}
            aria-label="Clear search"
          >
            <XCircle size={20} />
          </Button>
        )}
        <Button type="submit" disabled={isSearching || !searchTerm.trim()}>
          {isSearching ? <Spinner size="sm" /> : <Search size={20} />} Search
        </Button>
      </form>

      {isSearching && <Spinner message="Searching users..." />}

      {!isSearching && searchResults.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-lg font-medium">Search Results:</h3>
          <ul className="divide-y divide-border rounded-md border border-border bg-card-alt">
            {searchResults.map((user) => (
              <li
                key={user._id}
                className="flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  <UserAvatar user={user} size="sm" />
                  <div>
                    <p className="font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendRequest(user._id)}
                  disabled={isLoading} // Disable button while any friend action is loading
                  aria-label={`Send friend request to ${user.firstName} ${user.lastName}`}
                >
                  <UserPlus size={16} className="mr-1" /> Add Friend
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isSearching && searchResults.length === 0 && searchTerm.trim() && (
        <p className="mt-4 text-muted-foreground">
          No users found matching your search criteria.
        </p>
      )}
    </div>
  );
}

export default AddFriendSearch;
