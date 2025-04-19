import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser, resetAuthStatus } from '../../features/auth/authSlice';
import Sidebar from './Sidebar';
import NavbarClockStockWeather from './NavbarClockStockWeather';
import NotificationBell from './NotificationBell';
import { Menu, X, LogOut } from 'lucide-react';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const userMenuRef = useRef(null);

  const onLogout = () => {
    dispatch(logoutUser());
    dispatch(resetAuthStatus());
    navigate('/login');
    setIsUserMenuOpen(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    setIsUserMenuOpen(false);
  };

  const toggleMinimizeSidebar = () => {
    setIsSidebarMinimized(!isSidebarMinimized);
    setIsUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef]);

  return (
    <div className="min-h-screen flex bg-app-page">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        isMinimized={isSidebarMinimized}
        toggleSidebar={toggleSidebar}
        toggleMinimize={toggleMinimizeSidebar}
      />

      {/* Main Content Area Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-app-page">
        {/* Header */}
        <header className="bg-app-navbar text-text shadow-md z-20 flex-shrink-0">
          <div className="px-4 py-3 flex justify-between items-center">
            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="text-[#F8FAFC] font-bold focus:outline-none md:hidden"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Header Title: Hello, [FirstName] */}
            <div className="text-lg font-bold md:ml-0 ml-4 text-[#F8FAFC]">
              {user && user.name
                ? `Hello, ${user.name.split(' ')[0]}`
                : 'Hello'}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Clock & Weather */}
              <NavbarClockStockWeather />

              {/* Notification Bell */}
              {user && <NotificationBell />}

              {/* Avatar Button & Dropdown */}
              {user && (
                <div className="relative" ref={userMenuRef}>
                  {' '}
                  {/* Added ref here */}
                  <button
                    onClick={toggleUserMenu}
                    className="focus:outline-none block rounded-full"
                  >
                    <img
                      src={
                        user.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          user.name || user.email || '?'
                        )}&background=random`
                      }
                      alt="User Avatar"
                      className="h-8 w-8 rounded-full object-cover border-2 border-transparent hover:border-gray-300"
                      title={user.name || user.email}
                    />
                  </button>
                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-card text-text rounded-md shadow-xl z-50 border border-dark-700">
                      <div className="py-1">
                        {/* Optional Profile Link */}
                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="block px-4 py-2 text-sm text-[#F8FAFC] hover:bg-dark-700"
                        >
                          Profile
                        </Link>
                        <hr /> {/* Separator */}
                        <button
                          onClick={onLogout}
                          className="w-full text-left px-4 py-2 text-sm text-[#F8FAFC] hover:bg-red-700 flex items-center"
                        >
                          <LogOut size={16} className="mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow p-2 md:p-4 lg:p-6 overflow-auto bg-app-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
