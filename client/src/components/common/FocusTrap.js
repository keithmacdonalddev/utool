import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * FocusTrap Component
 *
 * Creates an accessible focus trap within a component like a modal.
 * Ensures focus stays within the trap when tabbing, making it accessible for keyboard users.
 *
 * Features:
 * - Keeps focus within the trap when tabbing
 * - Restores focus to previous element when trap is deactivated
 * - Supports specifying initial focus element
 * - Handles escape key presses
 * - Dynamically updates focusable elements when content changes
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The content to trap focus within
 * @param {boolean} props.active - Whether the focus trap is active
 * @param {Function} props.onEscape - Callback when escape key is pressed
 * @param {string|null} props.initialFocusId - ID of element to focus initially (optional)
 * @param {boolean} props.restoreFocus - Whether to restore focus to the previously focused element when trap is deactivated
 * @returns {React.ReactNode} The focus trap component
 */
const FocusTrap = ({
  children,
  active = true,
  onEscape = null,
  initialFocusId = null,
  restoreFocus = true,
}) => {
  const trapRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const focusableElementsRef = useRef([]);
  const mutationObserverRef = useRef(null);

  // Get all focusable elements within the trap
  const updateFocusableElements = () => {
    if (!trapRef.current) return;

    const focusableElements = trapRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElementsRef.current = focusableElements;

    if (focusableElements.length === 0) return;

    firstFocusableRef.current = focusableElements[0];
    lastFocusableRef.current = focusableElements[focusableElements.length - 1];
  };

  // Set up focus trap and restore focus
  useEffect(() => {
    // Save reference to previously focused element
    if (active && restoreFocus) {
      previousActiveElementRef.current = document.activeElement;
    }

    // Cleanup function to restore focus
    return () => {
      if (
        restoreFocus &&
        previousActiveElementRef.current &&
        previousActiveElementRef.current.focus
      ) {
        // Use setTimeout to ensure focus is restored after the component is unmounted
        setTimeout(() => {
          if (previousActiveElementRef.current) {
            previousActiveElementRef.current.focus();
          }
        }, 0);
      }
    };
  }, [active, restoreFocus]);
  // Handle tab key to trap focus within component
  useEffect(() => {
    if (!active || !trapRef.current) return;

    updateFocusableElements();

    // Setup mutation observer to detect DOM changes
    let observer;

    try {
      observer = new MutationObserver((mutations) => {
        try {
          // When DOM changes, update focusable elements
          updateFocusableElements();
        } catch (error) {
          console.error(
            '[FocusTrap] Error updating focusable elements:',
            error.message
          );
        }
      });

      // Start observing content changes
      if (trapRef.current) {
        observer.observe(trapRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['tabindex', 'disabled', 'aria-hidden'],
        });
      }
    } catch (error) {
      console.error(
        '[FocusTrap] Failed to initialize MutationObserver:',
        error.message
      );
    }

    const handleTabKey = (e) => {
      // If not tab key or trap not active, ignore
      if (e.key !== 'Tab' || !active) return;

      // Update refs in case DOM has changed
      updateFocusableElements();

      if (focusableElementsRef.current.length === 0) return;

      // Handle shift+tab on first element
      if (e.shiftKey && document.activeElement === firstFocusableRef.current) {
        e.preventDefault();
        lastFocusableRef.current.focus();
      }
      // Handle tab on last element
      else if (
        !e.shiftKey &&
        document.activeElement === lastFocusableRef.current
      ) {
        e.preventDefault();
        firstFocusableRef.current.focus();
      }
    };

    // Handle escape key
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape(e);
      }
    };

    // Set initial focus
    if (initialFocusId) {
      const initialFocusElement = document.getElementById(initialFocusId);
      if (initialFocusElement) {
        initialFocusElement.focus();
      }
    } else if (
      document.activeElement === document.body &&
      firstFocusableRef.current
    ) {
      // Focus the first element when trap is activated (but only if nothing else has focus)
      firstFocusableRef.current.focus();
    }

    // Add event listeners
    document.addEventListener('keydown', handleTabKey);
    if (onEscape) {
      document.addEventListener('keydown', handleEscapeKey);
    } // Clean up event listeners and observer
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      if (onEscape) {
        document.removeEventListener('keydown', handleEscapeKey);
      }

      // Safely disconnect observer if it exists
      if (observer) {
        try {
          observer.disconnect();
        } catch (error) {
          console.error(
            '[FocusTrap] Error disconnecting MutationObserver:',
            error.message
          );
        }
      }
    };
  }, [active, onEscape, initialFocusId]);
  return (
    <div
      ref={trapRef}
      data-focus-trap={active ? 'active' : 'inactive'}
      role="dialog"
      aria-modal={active ? 'true' : 'false'}
    >
      {children}
    </div>
  );
};

FocusTrap.propTypes = {
  children: PropTypes.node.isRequired,
  active: PropTypes.bool,
  onEscape: PropTypes.func,
  initialFocusId: PropTypes.string,
  restoreFocus: PropTypes.bool,
};

export default FocusTrap;
