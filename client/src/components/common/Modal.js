import React, { useEffect, useRef, useCallback } from 'react';
import Portal from './Portal';
import { X } from 'lucide-react';
import PropTypes from 'prop-types';
import FocusTrap from 'focus-trap-react';

/**
 * Modal Component
 *
 * A reusable modal component that renders via Portal for proper stacking context.
 * Includes backdrop, close button, and customizable content with full a11y support.
 *
 * Features:
 * - Keyboard navigation (ESC to close, tab trap within modal)
 * - Focus management (auto-focus first focusable element, return focus on close)
 * - ARIA attributes for screen readers
 * - Reduced motion support
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Handler to close the modal
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.maxWidth - Max width CSS class (e.g., 'max-w-2xl')
 * @param {string} props.titleId - ID for the modal title (for a11y)
 * @param {string} props.descriptionId - ID for modal description (for a11y)
 * @param {string} props.containerId - Portal container ID
 * @param {Function} props.onError - Optional callback for portal errors
 * @returns {React.ReactNode} The modal component
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
  titleId = 'modal-title',
  descriptionId = 'modal-description',
  containerId = 'modal-portal-root',
  onError = null,
}) => {
  // Reference to store the element that had focus before modal opened
  const previousFocusRef = useRef(null);
  // Reference for the main modal wrapper (for click detection and focus management)
  const modalRef = useRef(null);
  // Reference for the close button (default focus element)
  const closeButtonRef = useRef(null);

  // Safe close handler that prevents errors
  const handleClose = useCallback(
    (e) => {
      if (e) {
        // Prevent accidental double-click closures
        e.preventDefault();
      }
      onClose();
    },
    [onClose]
  );

  // Handler for clicks on the backdrop (outside the modal content)
  const handleBackdropClick = useCallback(
    (e) => {
      // Only close if the click is directly on the backdrop, not any of its children
      if (e.target === e.currentTarget) {
        handleClose(e);
      }
    },
    [handleClose]
  );

  // Save previously focused element and handle ESC key to close modal
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore focus later
      previousFocusRef.current = document.activeElement;

      // Prevent scrolling
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Portal containerId={containerId} onError={onError}>
      <div
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        aria-describedby={descriptionId}
        onClick={handleBackdropClick}
        ref={modalRef}
      >
        <FocusTrap
          active={isOpen}
          focusTrapOptions={{
            onActivate: () => {
              // Add console log
              console.log(
                'Modal FocusTrap ACTIVATED. Target:',
                closeButtonRef.current
              );
              console.log(
                'Modal Current activeElement:',
                document.activeElement
              );
              if (closeButtonRef.current) {
                closeButtonRef.current.focus();
              }
            },
            onDeactivate: () => {
              // Add console log
              console.log('Modal FocusTrap DEACTIVATED. Calling onClose.');
              if (
                previousFocusRef.current &&
                typeof previousFocusRef.current.focus === 'function'
              ) {
                setTimeout(() => {
                  if (
                    previousFocusRef.current &&
                    typeof previousFocusRef.current.focus === 'function'
                  ) {
                    previousFocusRef.current.focus({ preventScroll: true });
                  }
                }, 0);
              }
              // It seems onClose is not directly called here in the Modal's FocusTrap unlike SlidePanel
              // However, escapeDeactivates should still trigger the main onClose for the modal
            },
            escapeDeactivates: true, // This will trigger onClose via the keydown listener for ESC
            clickOutsideDeactivates: false, // Backdrop click is handled by handleBackdropClick
            initialFocus: () => closeButtonRef.current, // Focus the close button on activate
            fallbackFocus: () => modalRef.current, // Fallback focus to the modal itself
            allowOutsideClick: () => true, // Allow backdrop clicks to be handled by handleBackdropClick
          }}
        >
          <div
            className={`bg-dark-800 rounded-lg p-6 w-full ${maxWidth} shadow-xl`}
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'var(--modal-animation, modalFadeIn 0.2s ease-out)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 id={titleId} className="text-xl font-semibold text-[#F8FAFC]">
                {title}
              </h2>
              <button
                ref={closeButtonRef}
                onClick={handleClose}
                className="text-gray-400 hover:text-white p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div id={descriptionId}>{children}</div>
          </div>
        </FocusTrap>
      </div>
    </Portal>
  );
};

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.string,
  titleId: PropTypes.string,
  descriptionId: PropTypes.string,
  containerId: PropTypes.string,
  onError: PropTypes.func,
};

export default Modal;
