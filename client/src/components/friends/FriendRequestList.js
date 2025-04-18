import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  acceptFriendRequest,
  rejectOrCancelFriendRequest,
} from '../../features/friends/friendSlice';
import { Button } from '../common/Button';
import { UserCheck, UserX } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import Spinner from '../common/Spinner';

function FriendRequestList() {
  const dispatch = useDispatch();
  const { requestsReceived, isLoading } = useSelector((state) => state.friends);

  const handleAccept = (userId) => {
    dispatch(acceptFriendRequest(userId));
  };

  const handleReject = (userId) => {
    if (
      window.confirm('Are you sure you want to reject this friend request?')
    ) {
      dispatch(rejectOrCancelFriendRequest(userId));
    }
  };

  if (isLoading && requestsReceived.length === 0) {
    return <Spinner message="Loading friend requests..." />;
  }

  if (!isLoading && requestsReceived.length === 0) {
    return (
      <p className="text-muted-foreground">
        You have no pending friend requests.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">
        Incoming Requests ({requestsReceived.length})
      </h2>
      <ul className="divide-y divide-border rounded-md border border-border bg-card-alt">
        {requestsReceived.map((request) => (
          <li
            key={request._id}
            className="flex items-center justify-between p-3 hover:bg-muted/50"
          >
            <div className="flex items-center space-x-3">
              <UserAvatar user={request.sender} size="sm" />
              <div>
                <p className="font-medium text-foreground">
                  {request.sender.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.sender.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="success" // Assuming a success variant exists
                size="sm"
                onClick={() => handleAccept(request.sender._id)}
                disabled={isLoading}
                aria-label={`Accept friend request from ${request.sender.name}`}
              >
                <UserCheck size={16} className="mr-1" /> Accept
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleReject(request.sender._id)}
                disabled={isLoading}
                aria-label={`Reject friend request from ${request.sender.name}`}
              >
                <UserX size={16} className="mr-1" /> Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FriendRequestList;
