import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  FolderKanban,
  Library,
  Users,
  Settings,
  User,
  ChevronsLeft,
  ChevronsRight,
  Wrench,
  Star,
  LineChart, // Added for Admin Logs Dashboard
} from 'lucide-react'; // Added Star

const Sidebar = ({ isOpen, isMinimized, toggleSidebar, toggleMinimize }) => {
  const { user } = useSelector((state) => state.auth);

  // Common classes for NavLink items
  const linkItemClasses =
    'flex items-center py-2.5 px-4 rounded transition duration-150 ease-in-out';
  // Conditionally hide text based on isMinimized, but only on medium screens and up (md:)
  const linkTextClasses = `ml-3 whitespace-nowrap ${
    isMinimized ? 'md:hidden' : 'md:inline'
  }`;
  const activeLinkClasses = 'bg-accent-purple text-text font-bold shadow';
  const inactiveLinkClasses =
    'text-text-muted hover:bg-dark-700 hover:text-text transition';

  return (
    <>
      {/* Overlay for mobile (remains the same) */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${
          isOpen ? 'block' : 'hidden'
        }`}
        onClick={toggleSidebar} // Close sidebar when overlay is clicked
      ></div>

      {/* Sidebar - Adjust width based on isMinimized for desktop */}
      <aside
        className={`fixed inset-y-0 left-0 bg-[#23242B] text-[#F8FAFC] border-r border-[#181A20] space-y-6 py-7 px-2 z-40 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 transition-all duration-200 ease-in-out flex flex-col shadow-lg ${
          isMinimized ? 'md:w-20' : 'md:w-64'
        }`}
      >
        {/* Logo/Header Area */}
        <div className="px-4 flex items-center justify-between h-16">
          {' '}
          {/* Added fixed height */}
          {/* Logo Area (conditionally shown) */}
          <div
            className={`flex items-center ${
              isMinimized ? 'md:w-full md:justify-center' : ''
            }`}
          >
            {/* Text Logo */}
            <Link
              to="/dashboard"
              className={`text-[#F8FAFC] font-bold items-center space-x-2 ${
                isMinimized ? 'md:hidden' : 'flex'
              }`}
            >
              <span className="text-2xl font-bold whitespace-nowrap">
                uTool
              </span>{' '}
              {/* Changed Name */}
            </Link>
            {/* Icon Logo */}
            <Link
              to="/dashboard"
              className={`text-white ${
                isMinimized ? 'flex' : 'hidden'
              } hidden md:flex justify-center w-full`}
            >
              <Wrench size={28} /> {/* Changed Icon */}
            </Link>
          </div>
          {/* Minimize/Maximize Toggle Button (Desktop Only) */}
          {/* Positioned absolutely or adjust flex container */}
          <button
            onClick={toggleMinimize}
            className="hidden md:block text-gray-400 hover:text-white focus:outline-none p-2" // Added padding
            title={isMinimized ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isMinimized ? (
              <ChevronsRight size={20} />
            ) : (
              <ChevronsLeft size={20} />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow overflow-y-auto">
          {' '}
          {/* Added overflow-y-auto */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={toggleSidebar}
            title="Dashboard"
          >
            <LayoutDashboard size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Dashboard</span>
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={toggleSidebar}
            title="Projects"
          >
            <FolderKanban size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Projects</span>
          </NavLink>
          <NavLink
            to="/kb"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={toggleSidebar}
            title="Knowledge Base"
          >
            <Library size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Knowledge Base</span>
          </NavLink>
          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={toggleSidebar}
            title="Notes"
          >
            <Library size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Notes</span>
          </NavLink>
          <NavLink
            to="/favorite-quotes"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={toggleSidebar}
            title="Favorite Quotes"
          >
            <Star size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Favorite Quotes</span>
          </NavLink>
          {/* TODO: Add Tasks link */}
          {/* Admin Links */}
          {user?.role === 'Admin' && (
            <>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `${linkItemClasses} ${
                    isMinimized ? 'md:justify-center' : ''
                  } ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                }
                onClick={toggleSidebar}
                title="User Management"
              >
                <Users size={20} className="flex-shrink-0" />
                <span className={linkTextClasses}>User Management</span>
              </NavLink>

              <NavLink
                to="/admin/logs"
                className={({ isActive }) =>
                  `${linkItemClasses} ${
                    isMinimized ? 'md:justify-center' : ''
                  } ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                }
                onClick={toggleSidebar}
                title="Server Logs"
              >
                <LineChart size={20} className="flex-shrink-0" />
                <span className={linkTextClasses}>Server Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer Links (Profile/Settings/Logout) */}
        <div className="mt-auto border-t border-gray-700 pt-4">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={toggleSidebar}
            title="Profile"
          >
            <User size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Profile</span>
          </NavLink>
          {/* Optional Settings Link */}
          {/* <NavLink
                         to="/settings"
                          className={({ isActive }) => `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
                         onClick={toggleSidebar}
                         title="Settings"
                     >
                         <Settings size={20} className="flex-shrink-0" />
                         <span className={linkTextClasses}>Settings</span>
                     </NavLink> */}
          {/* Logout button can stay in header or move here */}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
