import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronDown,
  Circle,
  CheckCircle,
  Clock,
  XCircle,
  Pause,
  Archive,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * @component StatusSelect
 * @description Atomic component for selecting status values across projects and tasks.
 * Provides a consistent interface for status selection with proper styling and accessibility.
 * Supports different status types and follows the project's Tailwind CSS architecture.
 *
 * @param {string} value - Current selected status value
 * @param {function} onChange - Callback function when status changes
 * @param {array} options - Array of status options with label, value, and color
 * @param {string} type - Type of status: 'project', 'task', 'generic'
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} disabled - Whether the select is disabled
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 * @param {string} name - Form input name
 * @param {string} id - Input ID for accessibility
 */
const StatusSelect = ({
  value = '',
  onChange,
  options = null,
  type = 'generic',
  size = 'md',
  disabled = false,
  placeholder = 'Select status...',
  className = '',
  name = 'status',
  id = null,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  /**
   * Default status options based on type
   */
  const getDefaultOptions = (statusType) => {
    switch (statusType) {
      case 'project':
        return [
          {
            label: 'Planning',
            value: 'planning',
            color: 'gray',
            icon: Circle,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-700',
            ringColor: 'ring-gray-300',
          },
          {
            label: 'Active',
            value: 'active',
            color: 'blue',
            icon: CheckCircle,
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700',
            ringColor: 'ring-blue-300',
          },
          {
            label: 'On Hold',
            value: 'on-hold',
            color: 'yellow',
            icon: Pause,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            ringColor: 'ring-yellow-300',
          },
          {
            label: 'Completed',
            value: 'completed',
            color: 'green',
            icon: CheckCircle,
            bgColor: 'bg-green-100',
            textColor: 'text-green-700',
            ringColor: 'ring-green-300',
          },
          {
            label: 'Archived',
            value: 'archived',
            color: 'gray',
            icon: Archive,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-500',
            ringColor: 'ring-gray-300',
          },
          {
            label: 'Cancelled',
            value: 'cancelled',
            color: 'red',
            icon: XCircle,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
            ringColor: 'ring-red-300',
          },
        ];
      case 'task':
        return [
          {
            label: 'Todo',
            value: 'todo',
            color: 'gray',
            icon: Circle,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-700',
            ringColor: 'ring-gray-300',
          },
          {
            label: 'In Progress',
            value: 'in-progress',
            color: 'blue',
            icon: Clock,
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700',
            ringColor: 'ring-blue-300',
          },
          {
            label: 'Review',
            value: 'review',
            color: 'yellow',
            icon: Clock,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            ringColor: 'ring-yellow-300',
          },
          {
            label: 'Done',
            value: 'done',
            color: 'green',
            icon: CheckCircle,
            bgColor: 'bg-green-100',
            textColor: 'text-green-700',
            ringColor: 'ring-green-300',
          },
          {
            label: 'Blocked',
            value: 'blocked',
            color: 'red',
            icon: XCircle,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
            ringColor: 'ring-red-300',
          },
        ];
      default:
        return [
          {
            label: 'Active',
            value: 'active',
            color: 'blue',
            icon: CheckCircle,
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-700',
            ringColor: 'ring-blue-300',
          },
          {
            label: 'Inactive',
            value: 'inactive',
            color: 'gray',
            icon: Circle,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-700',
            ringColor: 'ring-gray-300',
          },
          {
            label: 'Pending',
            value: 'pending',
            color: 'yellow',
            icon: Clock,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            ringColor: 'ring-yellow-300',
          },
          {
            label: 'Complete',
            value: 'complete',
            color: 'green',
            icon: CheckCircle,
            bgColor: 'bg-green-100',
            textColor: 'text-green-700',
            ringColor: 'ring-green-300',
          },
        ];
    }
  };

  const statusOptions = options || getDefaultOptions(type);
  const selectedOption = statusOptions.find((option) => option.value === value);

  // Size variants
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs min-h-[28px]',
    md: 'px-3 py-2 text-sm min-h-[36px]',
    lg: 'px-4 py-3 text-base min-h-[44px]',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handle option selection
   */
  const handleOptionSelect = (option) => {
    if (onChange && !disabled) {
      onChange(option.value, option);
    }
    setIsOpen(false);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const IconComponent = selectedOption?.icon || Circle;

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Main Select Button */}
      <button
        type="button"
        id={id}
        name={name}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500',
          sizeClasses[size],
          disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
          !disabled && 'hover:border-gray-400',
          selectedOption && !disabled && selectedOption.bgColor,
          isOpen && 'ring-1 ring-blue-500 border-blue-500'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        {...props}
      >
        <span className="flex items-center">
          {selectedOption ? (
            <>
              <IconComponent
                className={cn(
                  'h-4 w-4 mr-2 flex-shrink-0',
                  selectedOption.textColor
                )}
              />
              <span className={cn('block truncate', selectedOption.textColor)}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="block truncate text-gray-500">{placeholder}</span>
          )}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform duration-200',
              isOpen && 'transform rotate-180'
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {statusOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'relative cursor-default select-none py-2 pl-3 pr-9 w-full text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                  isSelected && 'bg-blue-50'
                )}
                onClick={() => handleOptionSelect(option)}
              >
                <div className="flex items-center">
                  <OptionIcon
                    className={cn(
                      'h-4 w-4 mr-2 flex-shrink-0',
                      option.textColor
                    )}
                  />
                  <span
                    className={cn(
                      'block truncate',
                      isSelected ? 'font-medium' : 'font-normal'
                    )}
                  >
                    {option.label}
                  </span>
                </div>
                {isSelected && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <CheckCircle
                      className="h-4 w-4 text-blue-600"
                      aria-hidden="true"
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

StatusSelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      color: PropTypes.string,
      icon: PropTypes.elementType,
      bgColor: PropTypes.string,
      textColor: PropTypes.string,
      ringColor: PropTypes.string,
    })
  ),
  type: PropTypes.oneOf(['project', 'task', 'generic']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
};

export default StatusSelect;
