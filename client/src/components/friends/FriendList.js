import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeFriend } from '../../features/friends/friendSlice';
import Button from '../common/Button'; // Fixed: Changed from named import to default import
import { UserMinus, MessageSquare } from 'lucide-react'; // Added MessageSquare for potential chat feature
import UserAvatar from '../common/UserAvatar';
import Spinner from '../common/Spinner';

function FriendList() {
  const dispatch = useDispatch();
  const { friends, isLoading } = useSelector((state) => state.friends);

  const handleRemoveFriend = (userId) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      dispatch(removeFriend(userId));
    }
  };

  if (isLoading && friends.length === 0) {
    return <Spinner message="Loading friends..." />;
  }

  if (!isLoading && friends.length === 0) {
    return (
      <p className="text-muted-foreground">
        You haven't added any friends yet. Use the 'Add Friends' tab to find
        people!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">
        My Friends ({friends.length})
      </h2>
      <ul className="divide-y divide-border rounded-md border border-border bg-card-alt">
        {friends.map((friend) => (
          <li
            key={friend._id}
            className="flex items-center justify-between p-3 hover:bg-muted/50"
          >
            <div className="flex items-center space-x-3">
              <UserAvatar user={friend} size="sm" />
              <div>
                <p className="font-medium text-foreground">{friend.name}</p>
                <p className="text-sm text-muted-foreground">{friend.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Placeholder for future chat button */}
              {/* <Button variant="outline" size="icon" aria-label={`Message ${friend.name}`}>
                <MessageSquare size={16} />
              </Button> */}
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRemoveFriend(friend._id)}
                disabled={isLoading}
                aria-label={`Remove ${friend.name} as friend`}
              >
                <UserMinus size={16} className="mr-1" /> Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FriendList;
