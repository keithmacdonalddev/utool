import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Check, X, Edit3, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * @component EditableText
 * @description Atomic component for inline text editing with validation and accessibility.
 * Provides seamless switching between display and edit modes with keyboard navigation.
 * Uses Tailwind CSS and follows the project's design system.
 *
 * @param {string} value - Current text value
 * @param {function} onSave - Callback when text is saved (value) => Promise
 * @param {function} onCancel - Callback when editing is cancelled
 * @param {string} placeholder - Placeholder text for empty values
 * @param {string} variant - Style variant: 'text', 'heading', 'subheading', 'caption'
 * @param {string} size - Size variant: 'sm', 'md', 'lg', 'xl'
 * @param {boolean} multiline - Whether to use textarea for multiline editing
 * @param {number} maxLength - Maximum character length
 * @param {function} validate - Validation function (value) => string|null
 * @param {boolean} disabled - Whether editing is disabled
 * @param {boolean} required - Whether value is required
 * @param {string} className - Additional CSS classes
 * @param {boolean} autoFocus - Whether to auto-focus when entering edit mode
 * @param {boolean} selectAll - Whether to select all text when focused
 * @param {string} saveMode - Save trigger: 'blur', 'enter', 'manual'
 */
const EditableText = ({
  value = '',
  onSave,
  onCancel,
  placeholder = 'Click to edit...',
  variant = 'text',
  size = 'md',
  multiline = false,
  maxLength = 500,
  validate,
  disabled = false,
  required = false,
  className = '',
  autoFocus = true,
  selectAll = true,
  saveMode = 'blur',
  ...props
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef(null);
  const originalValueRef = useRef(value);

  // Update edit value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
      originalValueRef.current = value;
    }
  }, [value, isEditing]);

  // Style variants
  const variantClasses = {
    text: 'text-gray-900',
    heading: 'text-gray-900 font-semibold',
    subheading: 'text-gray-700 font-medium',
    caption: 'text-gray-600 text-sm',
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const inputSizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-3 py-2',
    xl: 'text-xl px-4 py-3',
  };

  /**
   * Start editing mode
   */
  const startEditing = useCallback(() => {
    if (disabled) return;

    setIsEditing(true);
    setEditValue(value);
    setError(null);
    originalValueRef.current = value;

    // Focus input after render
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (selectAll && inputRef.current.select) {
          inputRef.current.select();
        }
      }
    }, 0);
  }, [disabled, value, selectAll]);

  /**
   * Validate current value
   */
  const validateValue = useCallback(
    (val) => {
      if (required && (!val || val.trim() === '')) {
        return 'This field is required';
      }

      if (maxLength && val.length > maxLength) {
        return `Maximum ${maxLength} characters allowed`;
      }

      if (validate) {
        return validate(val);
      }

      return null;
    },
    [required, maxLength, validate]
  );

  /**
   * Save the edited value
   */
  const saveValue = useCallback(async () => {
    const trimmedValue = editValue.trim();
    const validationError = validateValue(trimmedValue);

    if (validationError) {
      setError(validationError);
      return false;
    }

    // Skip save if value hasn't changed
    if (trimmedValue === originalValueRef.current) {
      setIsEditing(false);
      setError(null);
      return true;
    }

    if (onSave) {
      try {
        setIsLoading(true);
        setError(null);
        await onSave(trimmedValue);
        setIsEditing(false);
        return true;
      } catch (err) {
        setError(err.message || 'Failed to save');
        return false;
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsEditing(false);
      return true;
    }
  }, [editValue, validateValue, onSave]);

  /**
   * Cancel editing
   */
  const cancelEditing = useCallback(() => {
    setEditValue(originalValueRef.current);
    setIsEditing(false);
    setError(null);
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  /**
   * Handle key press events
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      } else if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        if (saveMode === 'enter' || saveMode === 'blur') {
          saveValue();
        }
      } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (saveMode === 'enter' || saveMode === 'blur') {
          saveValue();
        }
      }
    },
    [multiline, saveMode, saveValue, cancelEditing]
  );

  /**
   * Handle blur event
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (saveMode === 'blur') {
      // Small delay to allow clicking save/cancel buttons
      setTimeout(() => {
        if (isEditing) {
          saveValue();
        }
      }, 150);
    }
  }, [saveMode, isEditing, saveValue]);

  /**
   * Handle input change
   */
  const handleChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      if (maxLength && newValue.length > maxLength) {
        return; // Prevent typing beyond limit
      }
      setEditValue(newValue);
      if (error) {
        setError(null); // Clear error on change
      }
    },
    [maxLength, error]
  );

  // Display value or placeholder
  const displayValue = value || placeholder;
  const isEmpty = !value || value.trim() === '';

  if (isEditing) {
    return (
      <div className={cn('inline-block w-full', className)} {...props}>
        <div className="relative">
          {multiline ? (
            <textarea
              ref={inputRef}
              value={editValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={() => setIsFocused(true)}
              disabled={isLoading}
              className={cn(
                'w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-[80px]',
                inputSizeClasses[size],
                error &&
                  'border-red-300 focus:ring-red-500 focus:border-red-500',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              placeholder={placeholder}
              rows={3}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={() => setIsFocused(true)}
              disabled={isLoading}
              className={cn(
                'w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                inputSizeClasses[size],
                error &&
                  'border-red-300 focus:ring-red-500 focus:border-red-500',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              placeholder={placeholder}
            />
          )}

          {/* Manual save mode controls */}
          {saveMode === 'manual' && (
            <div className="flex items-center gap-1 mt-2">
              <button
                onClick={saveValue}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Save
              </button>
              <button
                onClick={cancelEditing}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          )}

          {/* Character count */}
          {maxLength && (
            <div className="text-xs text-gray-500 mt-1 text-right">
              {editValue.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && <div className="text-red-600 text-xs mt-1">{error}</div>}

        {/* Help text for keyboard shortcuts */}
        {saveMode !== 'manual' && (
          <div className="text-xs text-gray-400 mt-1">
            {multiline
              ? 'Ctrl+Enter to save, Esc to cancel'
              : 'Enter to save, Esc to cancel'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group cursor-pointer inline-block',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={startEditing}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEditing();
        }
      }}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`Edit ${value || 'empty value'}`}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'break-words',
            variantClasses[variant],
            sizeClasses[size],
            isEmpty && 'text-gray-400 italic',
            !disabled &&
              'group-hover:bg-gray-50 group-focus:bg-gray-50 rounded px-1 py-0.5 transition-colors'
          )}
        >
          {displayValue}
        </span>

        {!disabled && (
          <Edit3
            className={cn(
              'h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity',
              sizeClasses[size] === 'text-sm' && 'h-2.5 w-2.5'
            )}
          />
        )}
      </div>
    </div>
  );
};

EditableText.propTypes = {
  value: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  placeholder: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'heading', 'subheading', 'caption']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  multiline: PropTypes.bool,
  maxLength: PropTypes.number,
  validate: PropTypes.func,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  autoFocus: PropTypes.bool,
  selectAll: PropTypes.bool,
  saveMode: PropTypes.oneOf(['blur', 'enter', 'manual']),
};

export default EditableText;
