/**
 * MainLayout.js - The primary layout component for the application
 *
 * This component serves as the main structure for authenticated user pages.
 * It implements several key UI features:
 * 1. A responsive sidebar navigation that can be toggled open/closed on mobile
 * 2. A minimizable sidebar for desktop views
 * 3. A top navbar with user information, notifications, and weather
 * 4. A user dropdown menu with profile and logout options
 *
 * The layout uses React Router's Outlet to render child route components in the main content area.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  logoutUser,
  resetAuthStatus,
  clearGuestUser,
} from '../../features/auth/authSlice'; // Added clearGuestUser
import Sidebar from './Sidebar';
import NavbarClockStockWeather from './NavbarClockStockWeather';
import NotificationBell from './NotificationBell';
import GuestNotificationBanner from '../ui/GuestNotificationBanner'; // Import guest banner
import { Menu, X, LogOut } from 'lucide-react'; // Lucide provides icon components

/**
 * MainLayout Component - The main structural component for the app's UI
 *
 * This functional component manages the state of the sidebar, the user menu dropdown,
 * and handles user logout functionality.
 *
 * @returns {JSX.Element} The rendered layout with sidebar, header and content area
 */
const MainLayout = () => {
  // State management for UI elements using React's useState hook
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Controls mobile sidebar visibility
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false); // Controls desktop sidebar width
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Controls user dropdown menu visibility

  // Redux hooks for state management and navigation
  const dispatch = useDispatch(); // Used to dispatch actions to the Redux store
  const navigate = useNavigate(); // Used for programmatic navigation

  // Extract the current user and guest status from the Redux authentication state
  const { user, isGuest } = useSelector((state) => state.auth); // Added isGuest

  // Create a reference to the user menu dropdown for detecting outside clicks
  const userMenuRef = useRef(null);

  /**
   * Handles user logout or guest session exit
   *
   * This function:
   * 1. If guest, dispatches clearGuestUser to clear guest session data.
   * 2. If authenticated user, dispatches logoutUser action.
   * 3. Resets the auth status in the Redux store.
   * 4. Navigates the user to the login page.
   * 5. Closes the user menu dropdown.
   */
  const onLogout = () => {
    if (isGuest) {
      dispatch(clearGuestUser());
    } else {
      dispatch(logoutUser());
    }
    dispatch(resetAuthStatus());
    navigate('/login');
    setIsUserMenuOpen(false);
  };

  /**
   * Toggles the sidebar open/closed state
   * This is primarily used for mobile views where the sidebar is hidden by default
   */
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    setIsUserMenuOpen(false); // Close user menu when toggling sidebar
  };

  /**
   * Toggles the sidebar between full width and minimized states
   * This is primarily used for desktop views to give more space to the main content
   */
  const toggleMinimizeSidebar = () => {
    setIsSidebarMinimized(!isSidebarMinimized);
    setIsUserMenuOpen(false); // Close user menu when adjusting sidebar
  };

  /**
   * Toggles the user profile dropdown menu visibility
   */
  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  /**
   * Effect hook to close the user dropdown menu when clicking outside of it
   *
   * This uses:
   * 1. The useRef hook to get a reference to the dropdown DOM element
   * 2. An event listener to detect clicks anywhere in the document
   * 3. Logic to check if the click was outside the dropdown
   *
   * The event listener is added when the component mounts and removed when it unmounts
   * to prevent memory leaks - this is achieved with the return function (cleanup).
   */
  useEffect(() => {
    // Function to handle clicks outside the user menu
    const handleClickOutside = (event) => {
      // If the click is outside the user menu, close the menu
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    // Add the event listener to the document
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup function to remove the event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef]); // Only re-run this effect if userMenuRef changes

  return (
    <div className="min-h-screen flex bg-app-page">
      {/* Sidebar Component
          Props passed:
          - isOpen: controls sidebar visibility on mobile
          - isMinimized: controls sidebar width on desktop
          - toggleSidebar: function to open/close sidebar
          - toggleMinimize: function to expand/contract sidebar
          - isGuest: indicates if the user is a guest
      */}
      <Sidebar
        isOpen={isSidebarOpen}
        isMinimized={isSidebarMinimized}
        toggleSidebar={toggleSidebar}
        toggleMinimize={toggleMinimizeSidebar}
        isGuest={isGuest} // Pass isGuest to Sidebar
      />

      {/* Main Content Area - Takes remaining space with flex-1 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-app-page">
        {/* Header/Navbar Section */}
        <header className="bg-app-navbar text-text shadow-md z-20 flex-shrink-0">
          <div className="px-4 py-3 flex justify-between items-center">
            {/* Mobile Menu Toggle Button - Only visible on mobile screens (md:hidden) */}
            <button
              onClick={toggleSidebar}
              className="text-[#F8FAFC] font-bold focus:outline-none md:hidden"
              aria-label="Toggle menu" // Accessibility attribute for screen readers
            >
              {/* Conditional rendering to show different icons based on sidebar state */}
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Header Title - Shows personalized greeting with user's first name */}
            <div className="text-lg font-bold md:ml-0 ml-4 text-[#F8FAFC]">
              {/* If user exists and has a name, extract first name, otherwise show generic greeting */}
              {/* Updated to use firstName, lastName, and username */}
              {user && (user.firstName || user.username)
                ? `Hello, ${user.firstName || user.username}`
                : 'Hello'}
              {isGuest && (
                <span className="ml-2 text-sm font-normal bg-accent-warning text-text-primary px-2 py-1 rounded">
                  Guest Mode
                </span>
              )}
            </div>

            {/* Right side of navbar with weather, notifications and user menu */}
            <div className="flex items-center space-x-4">
              {/* Component for displaying clock, stock, and weather information */}
              <NavbarClockStockWeather />

              {/* Notification Bell - Only shown if user is logged in */}
              {user && <NotificationBell />}

              {/* User Avatar and Dropdown Menu - Only shown if user is logged in */}
              {user && (
                <div className="relative" ref={userMenuRef}>
                  {/* Button to toggle the user menu dropdown */}
                  <button
                    onClick={toggleUserMenu}
                    className="focus:outline-none block rounded-full"
                  >
                    {/* User Avatar - Uses provided avatar or generates one from user's name */}
                    <img
                      src={
                        user.avatar ||
                        // Updated to use firstName, lastName, and username for avatar fallback
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.firstName
                            ? `${user.firstName} ${user.lastName || ''}`.trim()
                            : user.username || user.email || '?'
                        )}&background=random`
                      }
                      alt="User Avatar"
                      className="h-8 w-8 rounded-full object-cover border-2 border-transparent hover:border-gray-300"
                      // Updated to use firstName, lastName, and username for title
                      title={
                        user.firstName
                          ? `${user.firstName} ${user.lastName || ''}`.trim()
                          : user.username || user.email
                      } // Tooltip showing user name or email
                    />
                  </button>

                  {/* Dropdown Menu - Conditionally rendered based on isUserMenuOpen state */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-card text-text rounded-md shadow-xl z-50 border border-dark-700">
                      <div className="py-1">
                        {/* Profile Link - Hidden for guest users */}
                        {!isGuest && (
                          <>
                            <Link
                              to="/profile"
                              onClick={() => setIsUserMenuOpen(false)} // Close menu after clicking
                              className="block px-4 py-2 text-sm text-[#F8FAFC] hover:bg-dark-700"
                            >
                              Profile
                            </Link>
                            <hr /> {/* Visual separator line */}
                          </>
                        )}
                        {/* Logout/Exit Guest Mode Button */}
                        <button
                          onClick={onLogout}
                          className="w-full text-left px-4 py-2 text-sm text-[#F8FAFC] hover:bg-red-700 flex items-center"
                        >
                          <LogOut size={16} className="mr-2" />{' '}
                          {isGuest ? 'Exit Guest Mode' : 'Logout'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>{' '}
        </header>

        {/* Guest Notification Banner */}
        <GuestNotificationBanner />

        {/* Main Content Area */}
        <main className="flex-grow p-2 md:p-4 lg:p-6 overflow-auto bg-app-page">
          {/* React Router's Outlet renders the child route components here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
