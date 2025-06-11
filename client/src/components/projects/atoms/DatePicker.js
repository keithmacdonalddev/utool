import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Calendar,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * @component DatePicker
 * @description Atomic component for selecting dates with calendar popup.
 * Provides a consistent interface for date selection with accessibility support.
 * Uses Tailwind CSS classes and follows the project's design system.
 *
 * @param {string|Date} value - Current selected date (string or Date object)
 * @param {function} onChange - Callback function when date changes
 * @param {string} format - Date format for display ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} disabled - Whether the picker is disabled
 * @param {string} placeholder - Placeholder text
 * @param {Date} minDate - Minimum selectable date
 * @param {Date} maxDate - Maximum selectable date
 * @param {boolean} showTime - Whether to include time selection
 * @param {string} className - Additional CSS classes
 * @param {string} name - Form input name
 * @param {string} id - Input ID for accessibility
 */
const DatePicker = ({
  value = '',
  onChange,
  format = 'MM/DD/YYYY',
  size = 'md',
  disabled = false,
  placeholder = 'Select date...',
  minDate = null,
  maxDate = null,
  showTime = false,
  className = '',
  name = 'date',
  id = null,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState({
    hours: '12',
    minutes: '00',
    period: 'PM',
  });
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Convert value to Date object if it's a string
  const selectedDate = value
    ? typeof value === 'string'
      ? new Date(value)
      : value
    : null;

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
   * Format date for display
   */
  const formatDate = (date) => {
    if (!date) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default: // MM/DD/YYYY
        return `${month}/${day}/${year}`;
    }
  };

  /**
   * Get calendar days for current month
   */
  const getCalendarDays = () => {
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );
    const startOfWeek = new Date(startOfMonth);
    startOfWeek.setDate(startOfMonth.getDate() - startOfMonth.getDay());

    const days = [];
    const current = new Date(startOfWeek);

    // Generate 42 days (6 weeks) for consistent calendar grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  /**
   * Check if date is disabled
   */
  const isDateDisabled = (date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  /**
   * Check if date is today
   */
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  /**
   * Check if date is selected
   */
  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  /**
   * Handle date selection
   */
  const handleDateSelect = (date) => {
    if (isDateDisabled(date)) return;

    let finalDate = new Date(date);

    if (showTime) {
      const hours24 =
        selectedTime.period === 'AM'
          ? selectedTime.hours === '12'
            ? 0
            : parseInt(selectedTime.hours)
          : selectedTime.hours === '12'
          ? 12
          : parseInt(selectedTime.hours) + 12;

      finalDate.setHours(hours24, parseInt(selectedTime.minutes));
    }

    if (onChange) {
      onChange(finalDate);
    }

    if (!showTime) {
      setIsOpen(false);
    }
  };

  /**
   * Handle time change
   */
  const handleTimeChange = (field, value) => {
    const newTime = { ...selectedTime, [field]: value };
    setSelectedTime(newTime);

    if (selectedDate) {
      const hours24 =
        newTime.period === 'AM'
          ? newTime.hours === '12'
            ? 0
            : parseInt(newTime.hours)
          : newTime.hours === '12'
          ? 12
          : parseInt(newTime.hours) + 12;

      const newDate = new Date(selectedDate);
      newDate.setHours(hours24, parseInt(newTime.minutes));

      if (onChange) {
        onChange(newDate);
      }
    }
  };

  /**
   * Navigate calendar months
   */
  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
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

  const calendarDays = getCalendarDays();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Main Input */}
      <div
        className={cn(
          'relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 cursor-pointer focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500',
          sizeClasses[size],
          disabled && 'bg-gray-50 cursor-not-allowed',
          !disabled && 'hover:border-gray-400'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={formatDate(selectedDate)}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className={cn(
            'w-full bg-transparent border-0 p-0 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0',
            disabled && 'text-gray-500'
          )}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 p-4 w-72">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>

            <h3 className="text-lg font-medium text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>

            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day headers */}
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div
                key={day}
                className="text-xs font-medium text-gray-500 p-2 text-center"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((date, index) => {
              const isCurrentMonth =
                date.getMonth() === currentMonth.getMonth();
              const isDisabled = isDateDisabled(date);
              const isTodayDate = isToday(date);
              const isSelectedDate = isSelected(date);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(date)}
                  disabled={isDisabled}
                  className={cn(
                    'relative p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                    isDisabled && 'cursor-not-allowed opacity-25',
                    !isDisabled && 'hover:bg-gray-100',
                    isTodayDate && 'bg-blue-50 text-blue-600 font-medium',
                    isSelectedDate && 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  <span
                    className={cn(
                      'block w-full h-full',
                      isTodayDate && !isSelectedDate && 'relative'
                    )}
                  >
                    {date.getDate()}
                    {isTodayDate && !isSelectedDate && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Time Selection */}
          {showTime && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 justify-center">
                <Clock className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedTime.hours}
                  onChange={(e) => handleTimeChange('hours', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = String(i + 1).padStart(2, '0');
                    return (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    );
                  })}
                </select>
                <span className="text-gray-500">:</span>
                <select
                  value={selectedTime.minutes}
                  onChange={(e) => handleTimeChange('minutes', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 60 }, (_, i) => {
                    const minute = String(i).padStart(2, '0');
                    return (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={selectedTime.period}
                  onChange={(e) => handleTimeChange('period', e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                handleDateSelect(today);
              }}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              <CalendarDays className="h-3 w-3" />
              Today
            </button>

            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  if (onChange) onChange(null);
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

DatePicker.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  onChange: PropTypes.func.isRequired,
  format: PropTypes.oneOf(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  minDate: PropTypes.instanceOf(Date),
  maxDate: PropTypes.instanceOf(Date),
  showTime: PropTypes.bool,
  className: PropTypes.string,
  name: PropTypes.string,
  id: PropTypes.string,
};

export default DatePicker;
