import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronDown,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * @component PrioritySelect
 * @description Atomic component for selecting priority values across projects and tasks.
 * Provides a consistent interface for priority selection with visual indicators and accessibility.
 * Uses Tailwind CSS classes and follows the project's design system.
 *
 * @param {string} value - Current selected priority value
 * @param {function} onChange - Callback function when priority changes
 * @param {array} options - Array of priority options with label, value, and styling
 * @param {string} scheme - Priority scheme: 'standard', 'severity', 'impact'
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} disabled - Whether the select is disabled
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 * @param {string} name - Form input name
 * @param {string} id - Input ID for accessibility
 */
const PrioritySelect = ({
  value = '',
  onChange,
  options = null,
  scheme = 'standard',
  size = 'md',
  disabled = false,
  placeholder = 'Select priority...',
  className = '',
  name = 'priority',
  id = null,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  /**
   * Default priority options based on scheme
   */
  const getDefaultOptions = (priorityScheme) => {
    switch (priorityScheme) {
      case 'standard':
        return [
          {
            label: 'Critical',
            value: 'critical',
            icon: AlertTriangle,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
            iconColor: 'text-red-600',
            ringColor: 'ring-red-300',
            description: 'Requires immediate attention',
          },
          {
            label: 'High',
            value: 'high',
            icon: ArrowUp,
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-700',
            iconColor: 'text-orange-600',
            ringColor: 'ring-orange-300',
            description: 'Important, resolve soon',
          },
          {
            label: 'Medium',
            value: 'medium',
            icon: Minus,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            iconColor: 'text-yellow-600',
            ringColor: 'ring-yellow-300',
            description: 'Normal priority',
          },
          {
            label: 'Low',
            value: 'low',
            icon: ArrowDown,
            bgColor: 'bg-green-100',
            textColor: 'text-green-700',
            iconColor: 'text-green-600',
            ringColor: 'ring-green-300',
            description: 'Can be addressed later',
          },
        ];
      case 'severity':
        return [
          {
            label: 'Blocker',
            value: 'blocker',
            icon: AlertTriangle,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
            iconColor: 'text-red-600',
            ringColor: 'ring-red-300',
            description: 'Blocks other work',
          },
          {
            label: 'Major',
            value: 'major',
            icon: ArrowUp,
            bgColor: 'bg-orange-100',
            textColor: 'text-orange-700',
            iconColor: 'text-orange-600',
            ringColor: 'ring-orange-300',
            description: 'Significant impact',
          },
          {
            label: 'Minor',
            value: 'minor',
            icon: Minus,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            iconColor: 'text-yellow-600',
            ringColor: 'ring-yellow-300',
            description: 'Small impact',
          },
          {
            label: 'Trivial',
            value: 'trivial',
            icon: ArrowDown,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-700',
            iconColor: 'text-gray-600',
            ringColor: 'ring-gray-300',
            description: 'Minimal impact',
          },
        ];
      case 'impact':
        return [
          {
            label: 'High Impact',
            value: 'high-impact',
            icon: AlertTriangle,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
            iconColor: 'text-red-600',
            ringColor: 'ring-red-300',
            description: 'Affects many users/systems',
          },
          {
            label: 'Medium Impact',
            value: 'medium-impact',
            icon: Minus,
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-700',
            iconColor: 'text-yellow-600',
            ringColor: 'ring-yellow-300',
            description: 'Affects some users/systems',
          },
          {
            label: 'Low Impact',
            value: 'low-impact',
            icon: ArrowDown,
            bgColor: 'bg-green-100',
            textColor: 'text-green-700',
            iconColor: 'text-green-600',
            ringColor: 'ring-green-300',
            description: 'Affects few users/systems',
          },
        ];
      default:
        return getDefaultOptions('standard');
    }
  };

  const priorityOptions = options || getDefaultOptions(scheme);
  const selectedOption = priorityOptions.find(
    (option) => option.value === value
  );

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
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  };

  const IconComponent = selectedOption?.icon || Minus;

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
          'relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200',
          sizeClasses[size],
          disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
          !disabled && 'hover:border-gray-400',
          selectedOption && !disabled && selectedOption.bgColor,
          isOpen && 'ring-1 ring-blue-500 border-blue-500'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        title={selectedOption?.description}
        {...props}
      >
        <span className="flex items-center">
          {selectedOption ? (
            <>
              <IconComponent
                className={cn(
                  'h-4 w-4 mr-2 flex-shrink-0',
                  selectedOption.iconColor
                )}
              />
              <span
                className={cn(
                  'block truncate font-medium',
                  selectedOption.textColor
                )}
              >
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
          {priorityOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'relative cursor-default select-none py-3 pl-3 pr-9 w-full text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150',
                  isSelected && 'bg-blue-50'
                )}
                onClick={() => handleOptionSelect(option)}
                title={option.description}
              >
                <div className="flex items-center">
                  <OptionIcon
                    className={cn(
                      'h-4 w-4 mr-3 flex-shrink-0',
                      option.iconColor
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'block truncate font-medium',
                        isSelected ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-xs text-gray-500 truncate mt-0.5">
                        {option.description}
                      </span>
                    )}
                  </div>
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

PrioritySelect.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      bgColor: PropTypes.string,
      textColor: PropTypes.string,
      iconColor: PropTypes.string,
      ringColor: PropTypes.string,
      description: PropTypes.string,
    })
  ),
  scheme: PropTypes.oneOf(['standard', 'severity', 'impact']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
};

export default PrioritySelect;
