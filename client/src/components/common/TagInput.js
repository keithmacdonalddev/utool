// filepath: c:\Users\macdo\Documents\Cline\mern-productivity-app\client\src\components\common\TagInput.js
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * TagInput Component
 *
 * A reusable component for adding and managing tags.
 * Users can type text, press Enter or comma to add a tag,
 * and click the X button to remove a tag.
 *
 * @param {Object} props - Component props
 * @param {Array} props.tags - Array of tag strings
 * @param {Function} props.onChange - Callback when tags change, receives updated tags array
 * @param {string} props.label - Optional label for the input
 * @param {string} props.placeholder - Placeholder text for the input
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.id - ID for the input element
 * @param {string} props.className - Additional CSS classes for the container
 * @param {string} props.error - Error message to display
 * @param {boolean} props.required - Whether the field is required
 * @returns {JSX.Element} - The rendered component
 */
const TagInput = ({
  tags = [],
  onChange,
  label = 'Tags',
  placeholder = 'Add tags (press Enter or comma)',
  disabled = false,
  id = 'tags',
  className = '',
  error = null,
  required = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Focus the input when clicking on the container
  const handleContainerClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Add a new tag to the list
   * Validates the tag before adding it:
   * - Trims whitespace
   * - Checks for minimum length
   * - Prevents duplicates
   *
   * @param {string} value - The tag text to add
   */
  const addTag = (value) => {
    if (disabled) return;

    const trimmedValue = value.trim();

    // Only add non-empty tags and prevent duplicates
    if (
      trimmedValue &&
      trimmedValue.length > 0 &&
      !tags.includes(trimmedValue)
    ) {
      const newTags = [...tags, trimmedValue];
      onChange(newTags);
    }

    setInputValue('');
  };

  /**
   * Remove a tag from the list
   *
   * @param {number} index - The index of the tag to remove
   */
  const removeTag = (index) => {
    if (disabled) return;

    const newTags = [...tags];
    newTags.splice(index, 1);
    onChange(newTags);
  };

  /**
   * Handle input changes
   * Checks for comma to add a tag immediately
   *
   * @param {Object} e - The input change event
   */
  const handleInputChange = (e) => {
    const value = e.target.value;

    // If user types a comma, create a tag with the text before the comma
    if (value.includes(',')) {
      const tagValue = value.split(',')[0];
      addTag(tagValue);
    } else {
      setInputValue(value);
    }
  };

  /**
   * Handle keyboard events
   * - Enter: add a tag
   * - Backspace: remove the last tag when input is empty
   *
   * @param {Object} e - The keyboard event
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove the last tag when pressing backspace in an empty input
      removeTag(tags.length - 1);
    }
  };

  // Base container styles
  const containerClasses = `
    flex flex-wrap items-center gap-2 
    w-full px-3 py-2 min-h-[42px] rounded-md border
    focus-within:outline-none focus-within:ring-2 focus-within:ring-primary
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
    ${
      error
        ? 'border-error focus-within:ring-error'
        : 'border-dark-600 hover:border-dark-500'
    }
    bg-dark-700 text-foreground transition-colors duration-200
    ${className}
  `;

  const labelClasses = `
    block text-foreground text-sm font-medium mb-1.5
    ${error ? 'text-error' : ''}
  `;

  return (
    <div className="mb-5">
      {label && (
        <label className={labelClasses} htmlFor={id}>
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className={containerClasses} onClick={handleContainerClick}>
        {/* Render existing tags */}
        {tags.map((tag, index) => (
          <div
            key={index}
            className="flex items-center bg-primary/20 text-primary rounded-full px-2 py-1 text-sm"
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="ml-1 text-primary hover:text-primary-dark focus:outline-none"
                aria-label={`Remove tag ${tag}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {/* Input for new tags */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0 py-1 px-0 min-w-[120px]"
          aria-label={placeholder}
        />
      </div>

      {error && <p className="text-error text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default TagInput;
