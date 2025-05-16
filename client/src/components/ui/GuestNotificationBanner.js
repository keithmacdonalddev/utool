import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

/**
 * A notification banner that appears when a user is browsing as a guest
 * Provides information about guest limitations and options to sign up/login
 * Can be dismissed for the current session only
 */
const GuestNotificationBanner = () => {
  const { isGuest } = useSelector((state) => state.auth);
  const [showBanner, setShowBanner] = useState(true);

  // Check if user previously dismissed the banner in this session
  useEffect(() => {
    const bannerDismissed = sessionStorage.getItem('guestBannerDismissed');
    if (bannerDismissed === 'true') {
      setShowBanner(false);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('guestBannerDismissed', 'true');
    setShowBanner(false);
  };

  if (!isGuest || !showBanner) return null;

  return (
    <div className="bg-blue-100 text-blue-800 mb-0 py-2 text-center sticky top-0 z-50 border-b border-blue-200">
      <span className="mr-2">
        <strong>Guest Mode:</strong> You're browsing as a guest. Your data won't
        be saved and some features are limited.
      </span>
      <Link
        to="/login"
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm rounded mr-2"
      >
        Sign In
      </Link>
      <Link
        to="/register"
        className="border border-blue-500 hover:bg-blue-100 text-blue-500 px-3 py-1 text-sm rounded mr-2"
      >
        Register
      </Link>
      <button
        className="text-blue-500 hover:text-blue-700 text-sm underline"
        onClick={handleDismiss}
      >
        Dismiss
      </button>
    </div>
  );
};

export default GuestNotificationBanner;
