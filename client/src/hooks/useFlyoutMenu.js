import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useFlyoutMenu Hook
 *
 * A comprehensive hook for managing flyout menu state and behavior
 * as part of Milestone 0 - Flyout Menu Hook for Navigation.
 *
 * Features:
 * - Accessible keyboard navigation (ARIA compliant)
 * - Click outside to close functionality
 * - Escape key handling
 * - Touch device detection and handling
 * - Position tracking for dynamic flyout placement
 * - Focus management for accessibility
 * - Configurable behavior options
 *
 * This hook is specifically designed for the admin navigation flyout
 * but is flexible enough for other flyout menu use cases.
 */

/**
 * Custom hook for managing flyout menu state and interactions
 *
 * @param {Object} options - Configuration options for the flyout menu
 * @param {boolean} options.closeOnOutsideClick - Whether to close on outside clicks (default: true)
 * @param {boolean} options.closeOnEscape - Whether to close on Escape key (default: true)
 * @param {boolean} options.trapFocus - Whether to trap focus within the flyout (default: true)
 * @param {number} options.closeDelay - Delay before closing on mouse leave (default: 150ms)
 * @param {boolean} options.preventCloseOnContentClick - Prevent closing when clicking content (default: false)
 * @param {Function} options.onOpen - Callback when flyout opens
 * @param {Function} options.onClose - Callback when flyout closes
 * @returns {Object} Flyout state and control functions
 */
const useFlyoutMenu = (options = {}) => {
  const {
    closeOnOutsideClick = true,
    closeOnEscape = true,
    trapFocus = true,
    closeDelay = 150,
    preventCloseOnContentClick = false,
    onOpen,
    onClose,
  } = options;

  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Refs for DOM elements
  const flyoutRef = useRef(null);
  const triggerRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const lastFocusedElementRef = useRef(null);

  // Detect touch devices
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  /**
   * Calculate optimal position for the flyout menu
   * Ensures the flyout stays within viewport bounds
   */
  const calculatePosition = useCallback((triggerElement) => {
    if (!triggerElement) return { top: 0, left: 0 };

    const triggerRect = triggerElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default positioning (to the right of trigger)
    let left = triggerRect.right + 8; // 8px gap
    let top = triggerRect.top;

    // Check if flyout would overflow viewport width
    const estimatedFlyoutWidth = 280; // Approximate flyout width
    if (left + estimatedFlyoutWidth > viewportWidth) {
      // Position to the left of trigger instead
      left = triggerRect.left - estimatedFlyoutWidth - 8;
    }

    // Check if flyout would overflow viewport height
    const estimatedFlyoutHeight = 400; // Approximate flyout height
    if (top + estimatedFlyoutHeight > viewportHeight) {
      // Adjust top position to fit in viewport
      top = Math.max(10, viewportHeight - estimatedFlyoutHeight - 10);
    }

    // Ensure flyout doesn't go off-screen to the left
    if (left < 10) {
      left = 10;
    }

    return { top: Math.max(10, top), left };
  }, []);

  /**
   * Open the flyout menu
   */
  const openFlyout = useCallback(() => {
    if (isOpen) return;

    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    // Store the currently focused element to restore later
    lastFocusedElementRef.current = document.activeElement;

    // Calculate position if trigger ref is available
    if (triggerRef.current) {
      const newPosition = calculatePosition(triggerRef.current);
      setPosition(newPosition);
    }

    setIsOpen(true);

    // Call onOpen callback
    if (onOpen) {
      onOpen();
    }

    // Focus management for accessibility
    if (trapFocus) {
      // Focus the first focusable element in the flyout after a short delay
      setTimeout(() => {
        if (flyoutRef.current) {
          const firstFocusable = flyoutRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }, 50);
    }
  }, [isOpen, calculatePosition, onOpen, trapFocus]);

  /**
   * Close the flyout menu
   */
  const closeFlyout = useCallback(() => {
    if (!isOpen) return;

    setIsOpen(false);

    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    // Restore focus to the trigger element
    if (lastFocusedElementRef.current && triggerRef.current) {
      lastFocusedElementRef.current.focus();
    }

    // Call onClose callback
    if (onClose) {
      onClose();
    }
  }, [isOpen, onClose]);

  /**
   * Toggle the flyout menu state
   */
  const toggleFlyout = useCallback(() => {
    if (isOpen) {
      closeFlyout();
    } else {
      openFlyout();
    }
  }, [isOpen, openFlyout, closeFlyout]);

  /**
   * Schedule flyout close with delay (for mouse leave events)
   */
  const scheduleClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      if (!isTouchDevice) {
        closeFlyout();
      }
    }, closeDelay);
  }, [closeFlyout, closeDelay, isTouchDevice]);

  /**
   * Cancel scheduled close (for mouse enter events)
   */
  const cancelScheduledClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    if (!closeOnOutsideClick || !isOpen) return;

    const handleClickOutside = (event) => {
      const clickedInsideFlyout = flyoutRef.current?.contains(event.target);
      const clickedTrigger = triggerRef.current?.contains(event.target);

      if (!clickedInsideFlyout && !clickedTrigger) {
        closeFlyout();
      } else if (clickedInsideFlyout && preventCloseOnContentClick) {
        // Prevent closing when clicking inside flyout content
        event.stopPropagation();
      }
    };

    // Add listener with a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, closeOnOutsideClick, closeFlyout, preventCloseOnContentClick]);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeFlyout();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, closeFlyout]);

  // Handle window resize to recalculate position
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (triggerRef.current) {
        const newPosition = calculatePosition(triggerRef.current);
        setPosition(newPosition);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculatePosition]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Get ARIA properties for the trigger element
   */
  const getTriggerAriaProps = useCallback(
    () => ({
      'aria-expanded': isOpen,
      'aria-haspopup': true,
      'aria-controls': isOpen ? 'flyout-menu' : undefined,
    }),
    [isOpen]
  );

  /**
   * Get ARIA properties for the flyout element
   */
  const getFlyoutAriaProps = useCallback(
    () => ({
      id: 'flyout-menu',
      role: 'menu',
      'aria-hidden': !isOpen,
      'aria-labelledby': 'flyout-trigger',
    }),
    [isOpen]
  );

  /**
   * Keyboard navigation handler for menu items
   */
  const handleKeyboardNavigation = useCallback(
    (event, itemIndex) => {
      if (!flyoutRef.current) return;

      const menuItems = flyoutRef.current.querySelectorAll('[role="menuitem"]');
      const currentIndex = itemIndex;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % menuItems.length;
          menuItems[nextIndex]?.focus();
          break;

        case 'ArrowUp':
          event.preventDefault();
          const prevIndex =
            (currentIndex - 1 + menuItems.length) % menuItems.length;
          menuItems[prevIndex]?.focus();
          break;

        case 'Home':
          event.preventDefault();
          menuItems[0]?.focus();
          break;

        case 'End':
          event.preventDefault();
          menuItems[menuItems.length - 1]?.focus();
          break;

        case 'Enter':
        case ' ':
          // Let the item handle its own click
          break;

        case 'Escape':
          event.preventDefault();
          closeFlyout();
          break;

        default:
          // Handle alphabetic navigation
          if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
            const key = event.key.toLowerCase();
            const itemsArray = Array.from(menuItems);
            const currentItemIndex = itemsArray.indexOf(event.target);

            // Find next item starting with the pressed key
            const nextItem = itemsArray.find((item, index) => {
              if (index <= currentItemIndex) return false;
              const text = item.textContent?.toLowerCase();
              return text && text.startsWith(key);
            });

            // If no item found after current, search from beginning
            const fallbackItem =
              nextItem ||
              itemsArray.find((item) => {
                const text = item.textContent?.toLowerCase();
                return text && text.startsWith(key);
              });

            if (fallbackItem) {
              fallbackItem.focus();
            }
          }
          break;
      }
    },
    [closeFlyout]
  );

  return {
    // State
    isOpen,
    position,
    isTouchDevice,

    // Actions
    openFlyout,
    closeFlyout,
    toggleFlyout,
    scheduleClose,
    cancelScheduledClose,

    // Refs
    flyoutRef,
    triggerRef,

    // ARIA helpers
    getTriggerAriaProps,
    getFlyoutAriaProps,
    handleKeyboardNavigation,

    // Deprecated - keeping for backward compatibility
    getAriaProps: getTriggerAriaProps,
  };
};

export default useFlyoutMenu;
