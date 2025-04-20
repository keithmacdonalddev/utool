import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { UserPlus, Users, UserCheck, Send, ArrowLeft } from 'lucide-react';
import AddFriendSearch from '../components/friends/AddFriendSearch';
import FriendList from '../components/friends/FriendList';
import FriendRequestList from '../components/friends/FriendRequestList';
import SentRequestList from '../components/friends/SentRequestList';
import {
  getFriends,
  getFriendRequests,
  clearFriendError,
} from '../features/friends/friendSlice';
import Notification from '../components/Notification'; // Assuming Notification component exists

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function FriendsPage() {
  const dispatch = useDispatch();
  const { error, friends, requestsReceived, requestsSent } = useSelector(
    (state) => state.friends
  );
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: '',
  });

  useEffect(() => {
    // Fetch initial data when the component mounts
    dispatch(getFriends());
    dispatch(getFriendRequests());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      setNotification({ show: true, message: error, type: 'error' });
      // Optionally clear the error after showing notification
      const timer = setTimeout(() => {
        dispatch(clearFriendError());
        setNotification({ show: false, message: '', type: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleNotificationClose = () => {
    setNotification({ show: false, message: '', type: '' });
    dispatch(clearFriendError()); // Clear error when notification is manually closed
  };

  const tabs = [
    {
      name: 'My Friends',
      icon: Users,
      count: friends?.length || 0,
      content: <FriendList />,
    },
    {
      name: 'Friend Requests',
      icon: UserCheck,
      count: requestsReceived?.length || 0,
      content: <FriendRequestList />,
    },
    {
      name: 'Sent Requests',
      icon: Send,
      count: requestsSent?.length || 0,
      content: <SentRequestList />,
    },
    { name: 'Add Friends', icon: UserPlus, content: <AddFriendSearch /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header Row: Back Link, Title */}
      <div className="flex justify-between items-center mb-3 px-4 md:px-0 pt-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Friends</h1>
        </div>
      </div>

      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={handleNotificationClose}
        />
      )}

      {/* Main content */}
      <div className="w-full px-4 md:px-0">
        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-card p-1 border border-dark-700 shadow-sm">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 px-3 text-sm font-medium leading-5 flex items-center justify-center gap-2',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-primary text-white shadow'
                      : 'text-foreground hover:bg-dark-700 hover:text-white'
                  )
                }
              >
                <tab.icon size={16} />
                <span className="flex items-center">
                  {tab.name}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-accent-purple text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </span>
              </Tab>
            ))}
          </Tab.List>
          <Tab.Panels className="mt-4">
            {tabs.map((tab, idx) => (
              <Tab.Panel
                key={idx}
                className={classNames(
                  'rounded-xl bg-card p-4 border border-dark-700 shadow',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                )}
              >
                {tab.content}
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}

export default FriendsPage;
