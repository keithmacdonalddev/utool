import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { rejectOrCancelFriendRequest } from '../../features/friends/friendSlice';
import { Button } from '../common/Button';
import { XCircle } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import Spinner from '../common/Spinner';

function SentRequestList() {
  const dispatch = useDispatch();
  const { requestsSent, isLoading } = useSelector((state) => state.friends);

  const handleCancelRequest = (userId) => {
    if (
      window.confirm('Are you sure you want to cancel this friend request?')
    ) {
      dispatch(rejectOrCancelFriendRequest(userId));
    }
  };

  if (isLoading && requestsSent.length === 0) {
    return <Spinner message="Loading sent requests..." />;
  }

  if (!isLoading && requestsSent.length === 0) {
    return (
      <p className="text-muted-foreground">
        You haven't sent any friend requests yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">
        Sent Requests ({requestsSent.length})
      </h2>
      <ul className="divide-y divide-border rounded-md border border-border bg-card-alt">
        {requestsSent.map((request) => {
          // Add null check for the receiver object
          if (!request || !request.receiver) {
            console.warn(
              'Found friend request with missing receiver data:',
              request
            );
            return null; // Skip rendering this item
          }

          return (
            <li
              key={request._id}
              className="flex items-center justify-between p-3 hover:bg-muted/50"
            >
              <div className="flex items-center space-x-3">
                <UserAvatar user={request.receiver} size="sm" />
                <div>
                  <p className="font-medium text-foreground">
                    {request.receiver.name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {request.receiver.email || 'No email available'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelRequest(request.receiver._id)}
                disabled={isLoading || !request.receiver._id}
                aria-label={`Cancel friend request sent to ${
                  request.receiver.name || 'Unknown User'
                }`}
              >
                <XCircle size={16} className="mr-1" /> Cancel Request
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SentRequestList;
