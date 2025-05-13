import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * Base Portal Component
 *
 * Renders children into a specified DOM node outside of the component hierarchy.
 * Includes robust error handling, safe rendering, and cleanup.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to render inside the portal
 * @param {string} props.containerId - ID of the DOM element to render into
 * @param {Function} props.onError - Optional callback for portal creation errors
 * @returns {React.ReactPortal|React.ReactNode} Portal with children or children directly if portal root not found
 */
const Portal = ({ children, containerId = 'portal-root', onError = null }) => {
  const [portalRoot, setPortalRoot] = useState(null);
  const [hasError, setHasError] = useState(false);
  // Find and set the portal root element when component mounts
  // or when containerId changes
  useEffect(() => {
    try {
      // Sanitize the containerId to prevent potential DOM-based attacks
      const sanitizedId = containerId.replace(/[^\w-]/g, '');

      if (sanitizedId !== containerId) {
        console.warn(
          `[Portal] Sanitized containerId from "${containerId}" to "${sanitizedId}"`
        );
      }

      const rootElement = document.getElementById(sanitizedId);

      if (!rootElement) {
        console.warn(
          `[Portal] Root element with ID "${sanitizedId}" not found. Will render in-place.`
        );
        // Optionally invoke error callback
        if (onError) {
          onError(new Error(`Portal root with ID "${sanitizedId}" not found`));
        }
      }

      setPortalRoot(rootElement);
    } catch (error) {
      console.error(`[Portal] Error finding portal root:`, error.message);
      setHasError(true);
      if (onError) {
        onError(error);
      }
    }
  }, [containerId, onError]);

  // Early return if we have an error or no portal root
  if (hasError || !portalRoot) {
    // Render children in-place as fallback
    return children;
  }

  // Safely create the portal
  try {
    return ReactDOM.createPortal(children, portalRoot);
  } catch (error) {
    console.error('Error creating portal:', error);
    if (onError) {
      onError(error);
    }
    // Render children in-place as fallback for portal creation errors
    return children;
  }
};

export default Portal;
