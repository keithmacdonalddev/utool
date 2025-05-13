import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Portal from './Portal';
import { debounce } from '../../utils/debounce';

/**
 * Custom hook to detect user's reduced motion preference
 * @returns {boolean} True if user prefers reduced motion
 */
const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    try {
      // Check initial preference
      const mediaQuery = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      );
      setPrefersReducedMotion(mediaQuery?.matches || false);

      // Add listener for preference changes
      const handleChange = (event) => {
        setPrefersReducedMotion(event.matches);
      };

      // Add event listener if supported
      if (mediaQuery?.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => {
          try {
            mediaQuery.removeEventListener('change', handleChange);
          } catch (error) {
            console.error(
              '[TooltipPortal] Error removing media query listener:',
              error.message
            );
          }
        };
      } else if (mediaQuery?.addListener) {
        // Older browsers support
        mediaQuery.addListener(handleChange);
        return () => {
          try {
            mediaQuery.removeListener(handleChange);
          } catch (error) {
            console.error(
              '[TooltipPortal] Error removing legacy media query listener:',
              error.message
            );
          }
        };
      }
    } catch (error) {
      console.error(
        '[TooltipPortal] Error setting up reduced motion detection:',
        error.message
      );
    }
  }, []);

  return prefersReducedMotion;
};

/**
 * TooltipPortal Component
 *
 * A specialized portal for displaying tooltips at specific screen positions.
 * Handles positioning, visibility, and click-outside dismissal.
 * Includes improved handling for screen edge cases, window resizing,
 * and reduced motion preferences.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the tooltip is visible
 * @param {Function} props.onClose - Handler to close the tooltip
 * @param {React.ReactNode} props.children - Tooltip content
 * @param {Object} props.position - Screen position for the tooltip
 * @param {number} props.position.x - X coordinate
 * @param {number} props.position.y - Y coordinate
 * @param {string} props.containerId - Portal container ID
 * @param {boolean} props.showArrow - Whether to show a positioning arrow
 * @param {number} props.padding - Padding to apply from screen edges (in px)
 * @param {Function} props.onError - Optional callback for portal errors
 * @param {string} props.role - ARIA role for the tooltip (defaults to "tooltip")
 * @returns {React.ReactNode|null} The tooltip portal component or null if closed
 */
const TooltipPortal = ({
  isOpen,
  onClose,
  children,
  position = { x: 0, y: 0 },
  containerId = 'tooltip-portal-root',
  showArrow = true,
  padding = 8,
  onError = null,
  role = 'tooltip',
}) => {
  const [tooltipStyles, setTooltipStyles] = useState({});
  const [arrowStyles, setArrowStyles] = useState({});
  const [placement, setPlacement] = useState('bottom-start');
  const tooltipRef = useRef(null);
  const contentRef = useRef(null);
  const isRenderedRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Calculate tooltip position and handle screen edge cases
  const calculatePosition = useCallback(() => {
    if (!isOpen || !isRenderedRef.current || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const content = contentRef.current;

    // Safety check to ensure refs are available
    if (!tooltip || !content) return;

    // Get tooltip dimensions after it's rendered
    const tooltipRect = tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;

    // Calculate available space in each direction
    const rightSpace = window.innerWidth - position.x - padding;
    const leftSpace = position.x - padding;
    const bottomSpace = window.innerHeight - position.y - padding;
    const topSpace = position.y - padding;

    // Determine optimal placement
    let xPos, yPos;
    let arrowPos = {};
    let newPlacement;

    // Horizontal positioning
    if (rightSpace < tooltipWidth && leftSpace >= tooltipWidth) {
      // Not enough space to the right, but enough to the left
      xPos = Math.max(padding, position.x - tooltipWidth);
      arrowPos.right = '8px';
      newPlacement = 'left';
    } else if (leftSpace < tooltipWidth && rightSpace >= tooltipWidth) {
      // Not enough space to the left, but enough to the right
      xPos = position.x;
      arrowPos.left = '8px';
      newPlacement = 'right';
    } else if (rightSpace >= tooltipWidth && leftSpace >= tooltipWidth) {
      // Space on both sides, prefer right
      xPos = position.x;
      arrowPos.left = '8px';
      newPlacement = 'right';
    } else {
      // Not enough space on either side, center horizontally
      xPos = Math.max(
        padding,
        Math.min(
          window.innerWidth - tooltipWidth - padding,
          position.x - tooltipWidth / 2
        )
      );
      arrowPos.left = `${Math.max(
        8,
        Math.min(tooltipWidth - 16, position.x - xPos)
      )}px`;
      newPlacement = 'center';
    }

    // Vertical positioning
    if (bottomSpace < tooltipHeight && topSpace >= tooltipHeight) {
      // Not enough space below, but enough above
      yPos = Math.max(padding, position.y - tooltipHeight);
      arrowPos.bottom = '-4px';
      newPlacement = `${newPlacement}-top`;
    } else if (topSpace < tooltipHeight && bottomSpace >= tooltipHeight) {
      // Not enough space above, but enough below
      yPos = position.y;
      arrowPos.top = '-4px';
      newPlacement = `${newPlacement}-bottom`;
    } else if (bottomSpace >= tooltipHeight && topSpace >= tooltipHeight) {
      // Space both above and below, prefer below
      yPos = position.y;
      arrowPos.top = '-4px';
      newPlacement = `${newPlacement}-bottom`;
    } else {
      // Not enough space either above or below, center vertically
      yPos = Math.max(
        padding,
        Math.min(
          window.innerHeight - tooltipHeight - padding,
          position.y - tooltipHeight / 2
        )
      );
      arrowPos.top = `${Math.max(
        8,
        Math.min(tooltipHeight - 16, position.y - yPos)
      )}px`;
      newPlacement = `${newPlacement}-center`;
    }

    // Adjust for viewport boundaries (ensure tooltip is always visible)
    xPos = Math.max(
      padding,
      Math.min(window.innerWidth - tooltipWidth - padding, xPos)
    );
    yPos = Math.max(
      padding,
      Math.min(window.innerHeight - tooltipHeight - padding, yPos)
    );

    setPlacement(newPlacement);

    // Apply calculated styles
    setTooltipStyles({
      position: 'fixed',
      top: `${yPos}px`,
      left: `${xPos}px`,
      zIndex: 100,
      maxWidth: '400px',
      animation: prefersReducedMotion ? 'none' : 'tooltipFadeIn 0.2s ease-out',
    });

    setArrowStyles(arrowPos);
  }, [isOpen, position, padding, prefersReducedMotion]);

  // Calculate position when component mounts, position changes, or window resizes
  useEffect(() => {
    if (!isOpen) return;

    // Set flag that component has rendered
    isRenderedRef.current = true;

    // Calculate position on mount and when dependencies change
    calculatePosition();

    // Create debounced handlers to improve performance
    const debouncedResize = debounce(calculatePosition, 16); // ~60fps
    const debouncedScroll = debounce(calculatePosition, 16); // ~60fps

    // Handle window resize
    window.addEventListener('resize', debouncedResize);

    // Add additional recalculation on scroll - handles scrolling containers
    window.addEventListener('scroll', debouncedScroll, true); // Capture phase to get all scroll events

    // Clean up
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('scroll', debouncedScroll, true);
      // Cancel any pending debounced calls
      debouncedResize.cancel();
      debouncedScroll.cancel();
      isRenderedRef.current = false;
    };
  }, [isOpen, calculatePosition]);

  // Add global click handler to close tooltip when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Add escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal containerId={containerId} onError={onError} renderInPlace={true}>
      <div
        ref={tooltipRef}
        className="tooltip-content bg-dark-800 border border-dark-600 rounded-md shadow-lg p-4 text-[#F8FAFC]"
        style={tooltipStyles}
        onClick={(e) => e.stopPropagation()}
        role={role}
        aria-live="polite"
        data-placement={placement}
      >
        {showArrow && (
          <div
            className="tooltip-arrow absolute w-2 h-2 bg-dark-800 transform rotate-45 border border-dark-600"
            style={arrowStyles}
            aria-hidden="true"
          />
        )}
        <div ref={contentRef}>{children}</div>{' '}
      </div>
    </Portal>
  );
};

TooltipPortal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }),
  containerId: PropTypes.string,
  showArrow: PropTypes.bool,
  padding: PropTypes.number,
  onError: PropTypes.func,
  role: PropTypes.string,
};

export default TooltipPortal;
