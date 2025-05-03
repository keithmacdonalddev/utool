/**
 * Market utilities for the application
 * Contains functions related to stock market operations
 */

// Cache for market open status with 1-minute expiry
let marketStatusCache = {
  status: null,
  timestamp: 0,
};

// US Market Holidays for 2025 (update yearly)
const US_MARKET_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King, Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving Day
  '2025-12-25', // Christmas Day
];

/**
 * Checks if the current day is a market holiday
 *
 * @returns {boolean} - True if today is a market holiday, false otherwise
 */
const isMarketHoliday = () => {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  return US_MARKET_HOLIDAYS_2025.includes(dateString);
};

/**
 * Gets the current time in Eastern Time (America/New_York timezone)
 *
 * @returns {Object} - Hours and minutes in ET, and total minutes since midnight ET
 */
const getEasternTime = () => {
  // Create date objects for current time
  const now = new Date();

  // Calculate if it's daylight saving time
  // This is a simple approximation - DST rules can change
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const stdTimezoneOffset = Math.max(
    jan.getTimezoneOffset(),
    jul.getTimezoneOffset()
  );
  const isDST = now.getTimezoneOffset() < stdTimezoneOffset;

  // EST is UTC-5, EDT is UTC-4
  const etOffset = isDST ? 4 : 5;
  const etHours = (now.getUTCHours() - etOffset + 24) % 24;
  const etMinutes = now.getUTCMinutes();
  const totalMinutes = etHours * 60 + etMinutes;

  return { hours: etHours, minutes: etMinutes, totalMinutes };
};

/**
 * Checks if the US stock market is currently open based on time of day and weekday
 * Uses a 1-minute cache to avoid redundant calculations
 * Market is open 9:30 AM - 4:00 PM ET, Monday-Friday, excluding holidays
 *
 * @param {boolean} shouldLog - Whether to log the market status check (default: false)
 * @param {Function} logger - Optional logging function to use
 * @returns {boolean} - True if the market is open, false otherwise
 */
export const isMarketOpen = (shouldLog = false, logger = console.log) => {
  // TEMPORARY DEBUG OVERRIDE: Always return true for testing
  if (shouldLog)
    logger('DEBUG OVERRIDE: Market status forced to OPEN for testing');
  return true;

  /* Original market check logic commented out for debugging
  const now = new Date();
  const currentTime = now.getTime();

  // Check cache validity (1-minute cache)
  if (
    marketStatusCache.status !== null &&
    currentTime - marketStatusCache.timestamp < 60000
  ) {
    if (shouldLog)
      logger(
        `Using cached market status: ${
          marketStatusCache.status ? 'OPEN' : 'CLOSED'
        }`
      );
    return marketStatusCache.status;
  }

  // Quick check for weekend (0 = Sunday, 6 = Saturday)
  const day = now.getDay();
  if (day === 0 || day === 6) {
    if (shouldLog) logger(`Market closed: Weekend (day ${day})`);
    marketStatusCache = {
      status: false,
      timestamp: currentTime,
    };
    return false;
  }

  // Check if today is a holiday
  if (isMarketHoliday()) {
    if (shouldLog) logger(`Market closed: Holiday`);
    marketStatusCache = {
      status: false,
      timestamp: currentTime,
    };
    return false;
  }

  // Get Eastern Time
  const { totalMinutes, hours, minutes } = getEasternTime();

  // Market hours: 9:30 AM (570 minutes) - 4:00 PM (960 minutes) ET
  const marketStart = 9 * 60 + 30; // 9:30 AM = 570 minutes
  const marketEnd = 16 * 60; // 4:00 PM = 960 minutes

  const isOpen = totalMinutes >= marketStart && totalMinutes <= marketEnd;

  if (shouldLog) {
    logger(
      `Market hours check: ${isOpen ? 'OPEN' : 'CLOSED'} (ET time: ${hours}:${
        minutes < 10 ? '0' : ''
      }${minutes}, total minutes: ${totalMinutes})`
    );
  }

  // Cache the result
  marketStatusCache = {
    status: isOpen,
    timestamp: currentTime,
  };

  return isOpen;
  */
};

/**
 * Returns a user-friendly message about market status
 *
 * @returns {string} A message explaining why the market is closed or when it will open
 */
export const getMarketStatusMessage = () => {
  const now = new Date();
  const day = now.getDay();

  // Weekend check
  if (day === 0 || day === 6) {
    return 'Market is closed for the weekend.';
  }

  // Holiday check
  if (isMarketHoliday()) {
    return 'Market is closed for a holiday.';
  }

  const { totalMinutes, hours, minutes } = getEasternTime();
  const marketStart = 9 * 60 + 30; // 9:30 AM
  const marketEnd = 16 * 60; // 4:00 PM

  // Before market hours
  if (totalMinutes < marketStart) {
    const minutesUntilOpen = marketStart - totalMinutes;
    const hoursUntilOpen = Math.floor(minutesUntilOpen / 60);
    const minsRemaining = minutesUntilOpen % 60;

    if (hoursUntilOpen > 0) {
      return `Market opens in ${hoursUntilOpen}h ${minsRemaining}m.`;
    } else {
      return `Market opens in ${minsRemaining} minutes.`;
    }
  }

  // After market hours
  if (totalMinutes > marketEnd) {
    return 'Market is closed for the day.';
  }

  return 'Market is open.';
};
