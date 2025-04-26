import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';

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

  // Handle escape key press to close the panel
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent scrolling on the body when panel is open
      document.body.style.overflow = 'hidden';

      // Focus trap - move focus into the panel when it opens
      if (panelRef.current) {
        panelRef.current.focus();
      }
    }

    // Cleanup event listeners and restore body scrolling when panel closes
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      if (isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render anything if the panel is closed
  if (!isOpen) return null;

  return (
    // Full screen overlay with semi-transparent background
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="slide-panel-title"
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
        tabIndex="-1"
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
            onClick={onClose}
            className="p-1 rounded-full hover:bg-dark-700 transition-colors"
            aria-label="Close panel"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
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
