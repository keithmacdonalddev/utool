import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * @typedef {Object} PortalProps
 * @property {React.ReactNode} children - The children to render inside the portal.
 * @property {string} [portalId='submenu-portal-root'] - The ID of the DOM element to render the portal into.
 */

/**
 * A React component that renders its children into a DOM node outside of the main component hierarchy.
 * This is useful for rendering elements like modals, tooltips, or submenus that need to overlay other content
 * and avoid being clipped by parent elements with `overflow: hidden` or `transform` properties.
 *
 * The component attempts to find a DOM element with the specified `portalId`. If the element is not found
 * immediately, it will wait for the DOM to be fully loaded before attempting to find it again.
 *
 * @param {PortalProps} props - The props for the Portal component.
 * @returns {React.Portal|null} A React Portal rendering the children, or null if the portal root element is not found.
 */
const Portal = ({ children, portalId = 'submenu-portal-root' }) => {
  const [mounted, setMounted] = useState(false);
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    setMounted(true);
    let element = document.getElementById(portalId);

    if (!element) {
      // Fallback if the element isn't immediately available (e.g., SSR or delayed rendering)
      const onDOMContentLoaded = () => {
        element = document.getElementById(portalId);
        if (element) {
          setPortalElement(element);
        } else {
          console.error(
            `Portal: Target element with id '${portalId}' not found in the DOM.`
          );
        }
      };

      if (document.readyState === 'complete') {
        onDOMContentLoaded();
      } else {
        document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
        return () =>
          document.removeEventListener('DOMContentLoaded', onDOMContentLoaded);
      }
    } else {
      setPortalElement(element);
    }

    // Cleanup function for the main useEffect
    return () => {
      // If an event listener was added, it's cleaned up above.
      // No specific cleanup needed for `setMounted` or `setPortalElement` here.
    };
  }, [portalId]);

  if (!mounted || !portalElement) {
    return null;
  }

  return ReactDOM.createPortal(children, portalElement);
};

export default Portal;
