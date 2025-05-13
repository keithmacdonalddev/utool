import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import Portal from './Portal'; // Import Portal
import FocusTrap from 'focus-trap-react'; // Import focus-trap-react

/**
 * SlidePanel Component
 *
 * A reusable slide-in panel component that appears from the right side of the viewport.
 * Includes a semi-transparent overlay that blocks interaction with the page behind it.
 * Perfect for displaying details, forms, or any content that shouldn't navigate away from the current page.
 *
 * @param {Object} props - Component properties
 * @param {boolean} props.isOpen - Controls whether the panel is visible
 * @param {Function} props.onClose - Callback function to close the panel
 * @param {React.ReactNode} props.children - Content to display inside the panel
 * @param {string} props.title - Title to display in the panel header
 * @param {string} props.width - Width of the panel (e.g., '400px', '30%')
 * @param {string} props.maxWidth - Maximum width of the panel
 * @param {boolean} props.closeOnOverlayClick - Whether clicking the overlay closes the panel
 * @param {string} props.panelClassName - Additional CSS classes for the panel
 * @returns {JSX.Element} The SlidePanel component
 */
const SlidePanel = ({
  isOpen,
  onClose,
  children,
  title,
  width = '30rem',
  maxWidth = '100%',
  closeOnOverlayClick = true,
  panelClassName = '',
}) => {
  // Reference to track panel element for focus management
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null); // To store focus before panel opens
  const closeButtonRef = useRef(null); // Ref for the close button

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement; // Save focus before panel opens
      document.body.style.overflow = 'hidden';
    } else {
      // Ensure body scroll is restored if panel is closed by other means than unmounting
      document.body.style.overflow = '';
    }

    // Cleanup event listeners and restore body scrolling when panel closes or unmounts
    return () => {
      // Only restore overflow if no other modal/panel is open (more complex state needed for that)
      // For now, assume this is the only one or it's handled globally.
      document.body.style.overflow = '';
      // Focus restoration will be handled by FocusTrap's onDeactivate
    };
  }, [isOpen]); // Removed onClose from dependencies as it's called by FocusTrap

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render anything if the panel is closed
  if (!isOpen) return null;

  return (
    <Portal containerId="modal-portal-root">
      {/* Full screen overlay with semi-transparent background */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
        onClick={handleOverlayClick}
      >
        <FocusTrap
          active={isOpen}
          focusTrapOptions={{
            onActivate: () => {
              // Add console log
              console.log(
                'SlidePanel FocusTrap ACTIVATED. Target:',
                closeButtonRef.current || panelRef.current
              );
              console.log(
                'SlidePanel Current activeElement:',
                document.activeElement
              );
              // Try to focus the close button first, then the panel itself
              if (closeButtonRef.current) {
                closeButtonRef.current.focus();
              } else if (panelRef.current) {
                panelRef.current.focus();
              }
            },
            onDeactivate: () => {
              // Add console log
              console.log(
                'SlidePanel FocusTrap DEACTIVATED. Would normally call onClose here.'
              );
              if (
                previousFocusRef.current &&
                typeof previousFocusRef.current.focus === 'function'
              ) {
                setTimeout(() => {
                  // Ensure focus restoration happens after trap is fully deactivated
                  if (
                    previousFocusRef.current &&
                    typeof previousFocusRef.current.focus === 'function'
                  ) {
                    previousFocusRef.current.focus({ preventScroll: true });
                  }
                }, 0);
              }
              // onClose(); // Temporarily commented out for diagnosis
            },
            escapeDeactivates: true,
            clickOutsideDeactivates: false, // We handle this with `handleOverlayClick`
            initialFocus: () => closeButtonRef.current || panelRef.current, // Attempt close button, then panel
            fallbackFocus: () => panelRef.current, // Fallback to the panel itself
            allowOutsideClick: () => true, // Let our own overlay click handler work
          }}
        >
          {/* Panel container */}
          <div
            ref={panelRef}
            className={`bg-dark-800 border-l border-dark-700 shadow-xl h-full overflow-y-auto focus:outline-none transition-transform duration-300 ease-in-out ${panelClassName}`}
            style={{
              width,
              maxWidth,
              transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            }}
            tabIndex="-1" // Make the panel itself focusable for fallback
            role="dialog" // Add ARIA role here
            aria-modal="true" // Add ARIA modal state here
            aria-labelledby="slide-panel-title" // Ensure this ID exists on the title element
          >
            {/* Header */}
            <div className="sticky top-0 bg-dark-800 border-b border-dark-700 p-4 flex justify-between items-center z-10">
              <h2
                id="slide-panel-title"
                className="text-lg font-semibold text-white"
              >
                {title}
              </h2>
              <button
                ref={closeButtonRef} // Add ref to the close button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-dark-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close panel"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">{children}</div>
          </div>
        </FocusTrap>
      </div>
    </Portal>
  );
};

SlidePanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  width: PropTypes.string,
  maxWidth: PropTypes.string,
  closeOnOverlayClick: PropTypes.bool,
  panelClassName: PropTypes.string,
};

export default SlidePanel;
