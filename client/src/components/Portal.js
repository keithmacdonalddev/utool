import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * @typedef {Object} PortalProps
 * @property {React.ReactNode} children - The children to render inside the portal.
 * @property {string} [portalId='submenu-portal-root'] - The ID of the DOM element to render the portal into.
 * @property {Function} [onError=null] - Optional callback for portal creation errors.
 * @property {boolean} [renderInPlace=false] - If true, children will be rendered in-place as fallback when portal cannot be created.
 */

/**
 * A React component that renders its children into a DOM node outside of the main component hierarchy.
 * This is useful for rendering elements like modals, tooltips, or submenus that need to overlay other content
 * and avoid being clipped by parent elements with `overflow: hidden` or `transform` properties.
 *
 * Includes robust error handling, safe rendering, and cleanup:
 * - Falls back to in-place rendering if the portal root is not found (when renderInPlace=true)
 * - Provides error callback for error handling at the consumer level
 * - Safely manages mounting/unmounting
 * - Handles SSR and delayed rendering scenarios
 *
 * @param {PortalProps} props - The props for the Portal component.
 * @returns {React.Portal|React.ReactNode|null} A React Portal rendering the children, children directly if fallback is enabled, or null.
 */
const Portal = ({
  children,
  portalId = 'submenu-portal-root',
  onError = null,
  renderInPlace = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const [portalElement, setPortalElement] = useState(null);
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    try {
      setMounted(true);

      // Sanitize the portalId to prevent potential DOM-based attacks
      const sanitizedId = portalId.replace(/[^\w-]/g, '');

      if (sanitizedId !== portalId) {
        console.warn(
          `[Portal] Sanitized portalId from "${portalId}" to "${sanitizedId}"`
        );
      }

      let element = document.getElementById(sanitizedId);

      if (!element) {
        // Fallback if the element isn't immediately available (e.g., SSR or delayed rendering)
        const onDOMContentLoaded = () => {
          try {
            element = document.getElementById(sanitizedId);
            if (element) {
              setPortalElement(element);
            } else {
              const errorMsg = `[Portal] Target element with id '${sanitizedId}' not found in the DOM.`;
              console.warn(errorMsg);
              setHasError(true);

              // Invoke error callback if provided
              if (onError) {
                onError(new Error(errorMsg));
              }
            }
          } catch (error) {
            console.error('Error in Portal DOM content loaded handler:', error);
            setHasError(true);
            if (onError) {
              onError(error);
            }
          }
        };

        if (document.readyState === 'complete') {
          onDOMContentLoaded();
        } else {
          document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
          return () =>
            document.removeEventListener(
              'DOMContentLoaded',
              onDOMContentLoaded
            );
        }
      } else {
        setPortalElement(element);
      }

      // Cleanup function for the main useEffect
      return () => {
        // If an event listener was added, it's cleaned up above.
        setPortalElement(null);
      };
    } catch (error) {
      console.error('Error in Portal component:', error);
      setHasError(true);
      if (onError) {
        onError(error);
      }
    }
  }, [portalId, onError]);

  // Early return if we have an error and should render in-place
  if (hasError && renderInPlace) {
    return children;
  }

  if (!mounted || !portalElement) {
    return null;
  }

  // Safely create the portal
  try {
    return ReactDOM.createPortal(children, portalElement);
  } catch (error) {
    console.error('Error creating portal:', error);
    if (onError) {
      onError(error);
    }
    // Render children in-place as fallback for portal creation errors
    return renderInPlace ? children : null;
  }
};

export default Portal;
