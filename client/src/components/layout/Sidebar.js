import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Portal from '../Portal'; // Import the Portal component
import {
  LayoutDashboard,
  FolderKanban,
  Library,
  Users, // Keep this import
  Settings,
  User,
  ChevronsLeft,
  ChevronsRight,
  Wrench,
  StickyNote, // Added for Notes
  Trash2, // Added for Trash
  History, // Added for Audit Logs
  CheckSquare, // Added for Tasks icon
  Bookmark, // Add Bookmark for Resources
  Archive, // Added for Archive page
  ChevronRight, // For submenu indicator
  // ChevronDown, // For submenu indicator // Removed as it's not used for Resources fly-out
} from 'lucide-react'; // Removed UserGroup import which isn't available

/**
 * @component Sidebar
 * @description A responsive and interactive sidebar component for application navigation.
 * It includes features like main navigation links, a fly-out submenu for "Resources",
 * admin-specific links, user profile access, and options to toggle between an open,
 * closed (for mobile), and minimized (for desktop) state.
 *
 * @param {object} props - The properties passed to the component.
 * @param {boolean} props.isOpen - Controls whether the sidebar is open or closed on mobile.
 * @param {boolean} props.isMinimized - Controls whether the sidebar is minimized or expanded on desktop.
 * @param {function} props.toggleSidebar - Function to toggle the sidebar's open/closed state on mobile.
 * @param {function} props.toggleMinimize - Function to toggle the sidebar's minimized/expanded state on desktop.
 * @returns {JSX.Element} The rendered sidebar component.
 */
const Sidebar = ({ isOpen, isMinimized, toggleSidebar, toggleMinimize }) => {
  /**
   * @state
   * @description Retrieves the authenticated user's data from the Redux store.
   * This is used to conditionally render elements like admin links based on user role.
   */
  const { user } = useSelector((state) => state.auth);

  /**
   * @state {boolean} resourcesSubmenuOpen - Manages the visibility of the "Resources" fly-out submenu.
   * `true` if the submenu is open, `false` otherwise.
   */
  const [resourcesSubmenuOpen, setResourcesSubmenuOpen] = useState(false);

  /**
   * @state {object} submenuPosition - Stores the calculated top and left CSS properties for the "Resources" submenu.
   * This allows dynamic positioning of the submenu next to its trigger button, considering viewport boundaries.
   * @property {number} top - The CSS `top` value for the submenu.
   * @property {number} left - The CSS `left` value for the submenu.
   */
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });

  /**
   * @state {boolean} isTouchDevice - Indicates whether the current device has touch capabilities.
   * This state is determined on component mount and used to adapt interaction logic,
   * for example, enabling tap-to-toggle for the submenu on touch devices.
   */
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  /**
   * @ref {HTMLElement} resourcesMenuRef - A React ref attached to the "Resources" submenu DOM element.
   * Used for various purposes such as detecting clicks outside the submenu to close it,
   * and for calculating its dimensions for positioning.
   */
  const resourcesMenuRef = useRef(null);

  /**
   * @ref {HTMLElement} resourcesButtonRef - A React ref attached to the "Resources" main link/trigger DOM element.
   * Used for calculating the submenu's position relative to this button, managing focus,
   * and detecting clicks outside.
   */
  const resourcesButtonRef = useRef(null);

  /**
   * @ref {number|null} leaveTimeout - A React ref storing the timeout ID for the `handleMouseLeave` function.
   * This is used to manage a slight delay before closing the "Resources" submenu,
   * allowing users to move their cursor from the trigger to the submenu without it closing prematurely.
   * The timeout can be cleared if the cursor re-enters the trigger or submenu area.
   */
  let leaveTimeout = useRef(null);

  /**
   * @effect
   * @description Detects touch capability on component mount.
   * This effect runs once after the initial render. It checks for standard browser
   * properties that indicate touch support (e.g., `ontouchstart` in window, `navigator.maxTouchPoints`).
   * The result updates the `isTouchDevice` state, allowing the component to adapt its
   * behavior for touch vs. mouse-driven interactions.
   */
  useEffect(() => {
    const touchSupport = !!(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
    setIsTouchDevice(touchSupport);
  }, []);

  /**
   * @function handleMouseEnter
   * @description Opens the "Resources" submenu and clears any pending close timeouts.
   * This function is triggered when the mouse pointer enters the "Resources" link's
   * interactive area or the submenu itself. Clearing the `leaveTimeout` prevents the
   * submenu from closing if the user was in the process of moving their mouse from
   * the link to the submenu.
   */
  const handleMouseEnter = () => {
    clearTimeout(leaveTimeout.current);
    setResourcesSubmenuOpen(true);
  };

  /**
   * @function handleMouseLeave
   * @description Initiates closing of the "Resources" submenu after a short delay.
   * This delay (e.g., 150ms) provides a grace period, allowing the user to move the
   * mouse from the main "Resources" link to the submenu content without it closing
   * immediately. If the device is a touch device and the submenu was opened by touch,
   * this function will not close it, as touch interactions handle their own open/close logic.
   */
  const handleMouseLeave = () => {
    leaveTimeout.current = setTimeout(() => {
      if (isTouchDevice && resourcesSubmenuOpen) return;
      setResourcesSubmenuOpen(false);
    }, 150);
  };

  /**
   * @function handleResourcesKeyboardNav
   * @description Manages keyboard navigation for the "Resources" submenu trigger and its items,
   * enhancing accessibility.
   *
   * Behavior on the trigger element (the main "Resources" link):
   * - `Enter` or `Space`: Toggles the submenu. If opening, it attempts to focus the first item in the submenu.
   *
   * Behavior within the submenu items:
   * - `Escape`: Closes the submenu and returns focus to the trigger element.
   * - `ArrowDown`: Moves focus to the next submenu item, wrapping to the first item if at the end.
   * - `ArrowUp`: Moves focus to the previous submenu item, wrapping to the last item if at the beginning.
   * - `Enter` or `Space` (on a submenu item): Activates the item (delegating to the `NavLink`'s `onClick`
   *   for navigation and submenu closing).
   *
   * @param {React.KeyboardEvent} event - The JavaScript keyboard event object.
   * @param {string} type - Specifies the context of the keyboard event: 'trigger' for the main link,
   *                        or 'item' for an individual submenu link.
   * @param {number} [index] - The index of the current submenu item, used for `ArrowUp` and `ArrowDown`
   *                           navigation when `type` is 'item'.
   */
  const handleResourcesKeyboardNav = (event, type, index) => {
    const items =
      resourcesMenuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!items && type === 'item') return;

    if (type === 'trigger') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const opening = !resourcesSubmenuOpen;
        setResourcesSubmenuOpen(opening);
        if (opening && items && items.length > 0) {
          setTimeout(() => items[0].focus(), 0); // Focus first item when opening
        }
      }
    } else if (type === 'item' && resourcesSubmenuOpen && items) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setResourcesSubmenuOpen(false);
        resourcesButtonRef.current?.focus(); // Return focus to trigger
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = (index + 1) % items.length;
        items[nextIndex]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex = (index - 1 + items.length) % items.length;
        items[prevIndex]?.focus();
      }
      // Enter/Space on item is handled by NavLink's onClick
    }
  };

  /**
   * @function handleResourcesTriggerClick
   * @description Handles click/tap events on the "Resources" trigger element (the parent div of the NavLink).
   * This function is primarily designed to enhance usability on touch devices.
   *
   * On touch devices:
   * - It prevents the default navigation behavior of the underlying `NavLink`.
   * - It toggles the open/closed state of the "Resources" submenu.
   * - If the submenu is being opened, it attempts to focus the first item within the submenu
   *   to facilitate keyboard navigation or screen reader interaction.
   *
   * On non-touch devices:
   * - This function effectively does nothing, allowing the standard `NavLink` click behavior
   *   (i.e., navigation) to proceed. Hover and keyboard interactions will manage submenu
   *   visibility on these devices.
   *
   * @param {React.MouseEvent} event - The JavaScript mouse event object.
   */
  const handleResourcesTriggerClick = (event) => {
    if (isTouchDevice) {
      event.preventDefault();
      const currentlyOpen = resourcesSubmenuOpen;
      setResourcesSubmenuOpen(!currentlyOpen);
      if (!currentlyOpen) {
        setTimeout(() => {
          const items =
            resourcesMenuRef.current?.querySelectorAll('[role="menuitem"]');
          items?.[0]?.focus();
        }, 0);
      }
    }
  };

  /**
   * @effect
   * @description Manages the "Resources" submenu's position and handles clicks outside to close it.
   * This effect runs when `resourcesSubmenuOpen` state changes.
   *
   * When the submenu opens (`resourcesSubmenuOpen` is true):
   * 1.  `calculateSubmenuPosition`: Calculates and sets the optimal `top` and `left`
   *     position for the submenu. It positions the submenu to the right of the
   *     "Resources" button and adjusts vertically to prevent it from rendering
   *     off-screen (viewport collision detection).
   * 2.  Event Listeners:
   *     - Adds a `mousedown` event listener to the `document` to detect clicks outside
   *       the submenu and its trigger button. If such a click occurs, the submenu is closed.
   *     - Adds a `resize` event listener to the `window` to recalculate the submenu's
   *       position if the window size changes, ensuring it remains correctly placed.
   *
   * When the submenu closes (`resourcesSubmenuOpen` is false) or the component unmounts:
   * - The `mousedown` and `resize` event listeners are removed to prevent memory leaks
   *   and unnecessary computations.
   *
   * The `calculateSubmenuPosition` function:
   * - Gets the bounding rectangle of the `resourcesButtonRef` (the "Resources" link).
   * - Sets the initial `left` position to be to the right of the button with a small gap.
   * - Sets the initial `top` position to align with the button's top.
   * - If the `resourcesMenuRef` (the submenu itself) is available, it gets its dimensions.
   * - It then checks if the submenu would extend beyond the bottom of the viewport. If so,
   *   it adjusts `newTop` to ensure the submenu fits within the viewport, respecting a small padding.
   * - It also checks if the submenu would extend above the top of the viewport (less common,
   *   but important for very short viewports or unusual scrolling) and adjusts `newTop` accordingly.
   * - Finally, it updates the `submenuPosition` state with the calculated `top` and `left` values.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        resourcesSubmenuOpen &&
        resourcesMenuRef.current &&
        !resourcesMenuRef.current.contains(event.target) &&
        resourcesButtonRef.current &&
        !resourcesButtonRef.current.contains(event.target)
      ) {
        setResourcesSubmenuOpen(false);
      }
    };

    const calculateSubmenuPosition = () => {
      if (resourcesButtonRef.current) {
        const rect = resourcesButtonRef.current.getBoundingClientRect();
        let newTop = rect.top;
        const newLeft = rect.right + 4;
        const padding = 8;

        if (resourcesMenuRef.current) {
          const submenuRect = resourcesMenuRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          if (rect.top + submenuRect.height > viewportHeight - padding) {
            newTop = viewportHeight - submenuRect.height - padding;
          }
          if (newTop < padding) {
            newTop = padding;
          }
        }
        setSubmenuPosition({ top: newTop, left: newLeft });
      }
    };

    if (resourcesSubmenuOpen) {
      calculateSubmenuPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', calculateSubmenuPosition);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', calculateSubmenuPosition);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', calculateSubmenuPosition);
      clearTimeout(leaveTimeout.current); // Clear timeout on unmount or if submenu closes
    };
  }, [resourcesSubmenuOpen]);

  // Common classes for NavLink items
  const linkItemClasses =
    'flex items-center py-2.5 px-4 rounded transition duration-150 ease-in-out w-full'; // Added w-full
  // Conditionally hide text based on isMinimized, but only on medium screens and up (md:)
  const linkTextClasses = `ml-3 whitespace-nowrap ${
    isMinimized ? 'md:hidden' : 'md:inline'
  }`;
  const activeLinkClasses = 'bg-accent-purple text-text font-bold shadow';
  const inactiveLinkClasses =
    'text-text-muted hover:bg-dark-700 hover:text-text transition';

  const submenuLinkClasses =
    'flex items-center py-2 px-3 rounded transition duration-150 ease-in-out text-sm text-text-muted hover:bg-dark-600 hover:text-text w-full'; // Added w-full for consistency

  return (
    <>
      {/* Overlay for mobile: Dims the background and closes sidebar on click */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${
          isOpen ? 'block' : 'hidden'
        }`}
        onClick={toggleSidebar}
        aria-hidden="true" // Hide from screen readers as it's a visual effect
      ></div>

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 bg-app-sidebar text-[#F8FAFC] border-r border-sidebar-border space-y-6 py-7 px-2 z-40 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 transition-all duration-200 ease-in-out flex flex-col shadow-lg ${
          isMinimized ? 'md:w-20' : 'md:w-64'
        }`}
        aria-label="Main navigation" // Add ARIA label for the sidebar
      >
        {/* Logo/Header Area */}
        <div className="px-4 flex items-center justify-between h-16">
          <div
            className={`flex items-center ${
              isMinimized ? 'md:w-full md:justify-center' : ''
            }`}
          >
            {/* Text Logo: Visible when sidebar is expanded */}
            <Link
              to="/dashboard"
              className={`text-[#F8FAFC] font-bold items-center space-x-2 ${
                isMinimized ? 'md:hidden' : 'flex'
              }`}
              aria-label="uTool Home" // ARIA label for logo link
            >
              <span className="text-2xl font-bold whitespace-nowrap">
                uTool
              </span>
            </Link>
            {/* Icon Logo: Visible when sidebar is minimized (on md screens and up) */}
            <Link
              to="/dashboard"
              className={`text-white ${
                isMinimized ? 'flex' : 'hidden'
              } hidden md:flex justify-center w-full`}
              aria-label="uTool Home" // ARIA label for icon logo link
            >
              <Wrench size={28} />
            </Link>
          </div>
          {/* Minimize/Maximize Toggle Button (Desktop Only) */}
          <button
            onClick={toggleMinimize}
            className="hidden md:block text-gray-400 hover:text-white focus:outline-none focus:ring-0"
            style={{
              outline: 'none',
              boxShadow: 'none',
              border: 'none',
              WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
              appearance: 'none',
            }}
            title={isMinimized ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isMinimized ? 'Expand sidebar' : 'Collapse sidebar'} // ARIA label for toggle
            aria-pressed={isMinimized} // Indicates the current state
          >
            <span className="pointer-events-none">
              {isMinimized ? (
                <ChevronsRight size={20} />
              ) : (
                <ChevronsLeft size={20} />
              )}
            </span>
          </button>
        </div>

        {/* Navigation Links Section */}
        <nav
          className="flex-grow overflow-y-auto overflow-x-visible"
          aria-label="Main navigation links"
        >
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={() => {
              if (isOpen && window.innerWidth < 768) toggleSidebar();
            }} // Close mobile sidebar on nav
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
            onClick={() => {
              if (isOpen && window.innerWidth < 768) toggleSidebar();
            }}
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
            onClick={() => {
              if (isOpen && window.innerWidth < 768) toggleSidebar();
            }}
            title="Knowledge Base"
          >
            <Library size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Knowledge Base</span>
          </NavLink>

          {/* Resources Link with Fly-out Submenu */}
          <div
            ref={resourcesButtonRef} // Ref for positioning and click-outside detection
            id="resources-menu-button" // ID for ARIA labelling
            className="relative w-full" // Ensures proper positioning context
            onMouseEnter={handleMouseEnter} // Opens submenu on hover
            onMouseLeave={handleMouseLeave} // Closes submenu on mouse leave (with delay)
            onClick={handleResourcesTriggerClick} // Toggles submenu on tap for touch devices
            onKeyDown={(e) => handleResourcesKeyboardNav(e, 'trigger')} // Handles keyboard interaction for trigger
            tabIndex={0} // Makes the div focusable
            role="button" // Indicates it acts as a button
            aria-haspopup="true" // Indicates it has a submenu
            aria-expanded={resourcesSubmenuOpen} // Communicates submenu open/closed state
            aria-controls="resources-submenu" // Links to the submenu ID
          >
            <NavLink
              to="/resources" // Base navigation path for "Resources"
              className={({ isActive }) =>
                `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                  isActive && !resourcesSubmenuOpen
                    ? activeLinkClasses
                    : inactiveLinkClasses // Active only if not submenu trigger
                }`
              }
              onClick={(e) => {
                // On non-touch devices, or if touch interaction doesn't prevent default (e.g. submenu already open and navigating)
                // this click will navigate.
                // The primary role of this onClick is to close the mobile sidebar if it's open.
                if (isOpen && window.innerWidth < 768) {
                  toggleSidebar();
                }
                // If it's a touch device and the submenu is being toggled by the parent div,
                // event.preventDefault() in handleResourcesTriggerClick will stop this NavLink's navigation.
              }}
              title="Resources"
              tabIndex={-1} // Not directly focusable; parent div handles focus and interaction
              aria-hidden={
                resourcesSubmenuOpen && isTouchDevice ? 'true' : 'false'
              } // Hide from AT if submenu is open on touch (parent handles interaction)
            >
              <Bookmark size={20} className="flex-shrink-0" />
              <span className={linkTextClasses}>Resources</span>
              {!isMinimized && (
                <span className="ml-auto pl-1">
                  <ChevronRight size={16} />
                </span>
              )}
            </NavLink>
            {resourcesSubmenuOpen && (
              <Portal>
                <div
                  ref={resourcesMenuRef} // Ref for positioning and click-outside
                  id="resources-submenu" // ID for ARIA control
                  role="menu" // ARIA role for a menu
                  aria-labelledby="resources-menu-button" // Links to the trigger button
                  className={
                    'fixed p-2 rounded-md shadow-xl bg-app-sidebar border border-sidebar-border z-[100] w-48'
                  }
                  style={{
                    top: submenuPosition.top,
                    left: submenuPosition.left,
                  }}
                  onMouseEnter={handleMouseEnter} // Keeps submenu open when mouse enters
                  onMouseLeave={handleMouseLeave} // Closes submenu when mouse leaves (with delay)
                >
                  <NavLink
                    to="/resources"
                    state={{ activeTab: 'bookmarks' }} // State to activate specific tab on ResourcesPage
                    className={submenuLinkClasses}
                    onClick={() => {
                      if (isOpen && window.innerWidth < 768) toggleSidebar();
                      setResourcesSubmenuOpen(false); // Close submenu on item click
                      resourcesButtonRef.current?.focus(); // Return focus to trigger
                    }}
                    title="Bookmarks"
                    role="menuitem" // ARIA role for a menu item
                    tabIndex={0} // Make item focusable
                    onKeyDown={(e) => handleResourcesKeyboardNav(e, 'item', 0)} // Keyboard nav for item
                  >
                    Bookmarks
                  </NavLink>
                  <NavLink
                    to="/resources"
                    state={{ activeTab: 'snippets' }}
                    className={submenuLinkClasses}
                    onClick={() => {
                      if (isOpen && window.innerWidth < 768) toggleSidebar();
                      setResourcesSubmenuOpen(false);
                      resourcesButtonRef.current?.focus();
                    }}
                    title="Snippets"
                    role="menuitem"
                    tabIndex={0}
                    onKeyDown={(e) => handleResourcesKeyboardNav(e, 'item', 1)}
                  >
                    Snippets
                  </NavLink>
                  <NavLink
                    to="/resources"
                    state={{ activeTab: 'quotes' }}
                    className={submenuLinkClasses}
                    onClick={() => {
                      if (isOpen && window.innerWidth < 768) toggleSidebar();
                      setResourcesSubmenuOpen(false);
                      resourcesButtonRef.current?.focus();
                    }}
                    title="Favorite Quotes"
                    role="menuitem"
                    tabIndex={0}
                    onKeyDown={(e) => handleResourcesKeyboardNav(e, 'item', 2)}
                  >
                    Favorite Quotes
                  </NavLink>
                </div>
              </Portal>
            )}
          </div>

          <NavLink
            to="/notes"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={() => {
              if (isOpen && window.innerWidth < 768) toggleSidebar();
            }}
            title="Notes"
          >
            <StickyNote size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Notes</span>
          </NavLink>
          <NavLink
            to="/archive"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={() => {
              if (isOpen && window.innerWidth < 768) toggleSidebar();
            }}
            title="Archive"
          >
            <Archive size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Archive</span>
          </NavLink>
          <NavLink
            to="/friends"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={() => {
              if (isOpen && window.innerWidth < 768) toggleSidebar();
            }}
            title="Friends"
          >
            <Users size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Friends</span>
          </NavLink>

          {/* Admin Specific Links: Rendered only if user has 'Admin' role */}
          {user?.role === 'Admin' && (
            <>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `${linkItemClasses} ${
                    isMinimized ? 'md:justify-center' : ''
                  } ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                }
                onClick={() => {
                  if (isOpen && window.innerWidth < 768) toggleSidebar();
                }}
                title="User Management"
              >
                <Users size={20} className="flex-shrink-0" />
                <span className={linkTextClasses}>User Management</span>
              </NavLink>
              <NavLink
                to="/admin/audit-logs"
                className={({ isActive }) =>
                  `${linkItemClasses} ${
                    isMinimized ? 'md:justify-center' : ''
                  } ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                }
                onClick={() => {
                  if (isOpen && window.innerWidth < 768) toggleSidebar();
                }}
                title="Audit Logs"
              >
                <History size={20} className="flex-shrink-0" />
                <span className={linkTextClasses}>Audit Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer Links Area: Profile, Settings (optional), Logout */}
        <div className="mt-auto border-t border-gray-700 pt-4">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${
                isActive ? activeLinkClasses : inactiveLinkClasses
              }`
            }
            onClick={() => {
              if (isOpen && window.innerWidth < 768) toggleSidebar();
            }}
            title="Profile"
          >
            <User size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Profile</span>
          </NavLink>
          {/* Example of an optional Settings link, currently commented out
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${linkItemClasses} ${isMinimized ? 'md:justify-center' : ''} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
            }
            onClick={() => { if (isOpen && window.innerWidth < 768) toggleSidebar(); }}
            title="Settings"
          >
            <Settings size={20} className="flex-shrink-0" />
            <span className={linkTextClasses}>Settings</span>
          </NavLink>
          */}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
