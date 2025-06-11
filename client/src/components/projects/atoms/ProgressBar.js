import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/cn';

/**
 * @component ProgressBar
 * @description Atomic component for displaying progress bars across the application.
 * Used for project completion, task progress, and milestone tracking.
 * Supports different sizes, colors, and animation states.
 *
 * @param {number} value - Progress value (0-100)
 * @param {string} size - Size variant: 'small', 'medium', 'large'
 * @param {string} variant - Color variant: 'primary', 'success', 'warning', 'danger'
 * @param {boolean} animated - Whether to show animation
 * @param {boolean} striped - Whether to show striped pattern
 * @param {string} label - Optional label text
 * @param {boolean} showLabel - Whether to show percentage label
 * @param {string} className - Additional CSS classes
 * @param {object} style - Inline styles
 *
 * @example
 * <ProgressBar value={75} size="medium" variant="success" animated showLabel />
 */
const ProgressBar = ({
  value = 0,
  size = 'medium',
  variant = 'primary',
  animated = false,
  striped = false,
  label = null,
  showLabel = false,
  className = '',
  style = {},
  ...props
}) => {
  // Ensure value is within valid range
  const normalizedValue = Math.max(0, Math.min(100, value));

  // Build CSS classes
  const progressBarClasses = [
    'progress-bar',
    `progress-bar--${size}`,
    `progress-bar--${variant}`,
    animated && 'progress-bar--animated',
    striped && 'progress-bar--striped',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const fillClasses = [
    'progress-bar__fill',
    `progress-bar__fill--${variant}`,
    animated && 'progress-bar__fill--animated',
    striped && 'progress-bar__fill--striped',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={progressBarClasses}
      style={style}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label={label || `Progress: ${normalizedValue}%`}
      {...props}
    >
      <div className="progress-bar__track">
        <div className={fillClasses} style={{ width: `${normalizedValue}%` }}>
          {showLabel && (
            <span className="progress-bar__label">
              {Math.round(normalizedValue)}%
            </span>
          )}
        </div>
      </div>
      {label && <div className="progress-bar__text">{label}</div>}
    </div>
  );
};

ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['primary', 'success', 'warning', 'danger', 'info']),
  animated: PropTypes.bool,
  striped: PropTypes.bool,
  label: PropTypes.string,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ProgressBar;
