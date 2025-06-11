import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { logStockClient } from '../utils/clientLogger';
import { isMarketOpen } from '../utils/marketUtils';

/**
 * Custom hook to fetch and manage stock data
 * Handles API rate limiting, cooldown periods, and persistent storage
 *
 * @param {Object} options - Configuration options
 * @param {string} options.symbol - Stock symbol to fetch (default: 'TSLA')
 * @param {number} options.cooldownMinutes - Cooldown period in minutes between refreshes (default: 15)
 * @param {number} options.dailyLimit - Maximum number of API calls per day (default: 25)
 * @returns {Object} - Stock data and related state/functions
 */
const useStockData = (options = {}) => {
  const { symbol = 'TSLA', cooldownMinutes = 15, dailyLimit = 25 } = options;

  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiCallsRemaining, setApiCallsRemaining] = useState(dailyLimit);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const cooldownIntervalRef = useRef(null);

  // Check and reset API calls counter if needed
  const checkAndResetApiCallsCounter = () => {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('stockApiCallsResetDate');

    // If it's a new day or no data exists, reset the counter
    if (!lastResetDate || lastResetDate !== today) {
      localStorage.setItem('stockApiCallsToday', '0');
      localStorage.setItem('stockApiCallsResetDate', today);
      logStockClient(
        `API call counter reset to ${dailyLimit} (new day: ${today})`
      );
      setApiCallsRemaining(dailyLimit);
      return dailyLimit;
    }

    // Otherwise, return the remaining calls
    const callsMade = parseInt(
      localStorage.getItem('stockApiCallsToday') || '0',
      10
    );
    const remaining = Math.max(0, dailyLimit - callsMade);
    logStockClient(
      `API calls remaining check: ${remaining} remaining (${callsMade} made today)`
    );
    setApiCallsRemaining(remaining);
    return remaining;
  };

  // Increment API calls counter
  const incrementApiCallsCounter = () => {
    const remaining = checkAndResetApiCallsCounter();
    if (remaining <= 0) {
      logStockClient(`API call increment rejected: no calls remaining`);
      return false;
    }

    const callsMade = parseInt(
      localStorage.getItem('stockApiCallsToday') || '0',
      10
    );
    localStorage.setItem('stockApiCallsToday', String(callsMade + 1));
    const newRemaining = dailyLimit - (callsMade + 1);
    setApiCallsRemaining(newRemaining);
    logStockClient(`API call counter incremented: ${newRemaining} remaining`);
    return true;
  };

  // Check if the cooldown period has elapsed and update cooldown timer
  const checkCooldownStatus = () => {
    const lastFetchTime = localStorage.getItem('stockLastFetchTime');
    if (!lastFetchTime) {
      logStockClient(`No cooldown: No previous fetch time found`);
      return true; // No cooldown if never fetched before
    }

    const lastFetch = new Date(lastFetchTime);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastFetch) / (1000 * 60));

    // Check against cooldown period
    if (diffMinutes >= cooldownMinutes) {
      logStockClient(
        `Cooldown elapsed: ${diffMinutes} minutes since last fetch`
      );
      setCooldownRemaining(0);
      return true; // Cooldown elapsed
    } else {
      // Update cooldown remaining
      const remaining = cooldownMinutes - diffMinutes;
      logStockClient(`Still in cooldown: ${remaining} minutes remaining`);
      setCooldownRemaining(remaining);
      return false; // Still in cooldown
    }
  };

  // Function to start cooldown timer
  const startCooldownTimer = () => {
    // Clear any existing interval
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      logStockClient(`Cleared existing cooldown timer`);
    }

    // Set the initial cooldown time
    setCooldownRemaining(cooldownMinutes);
    logStockClient(`Starting cooldown timer: ${cooldownMinutes} minutes`);

    // Start a new interval that updates the cooldown every minute
    cooldownIntervalRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        const newValue = prev <= 1 ? 0 : prev - 1;
        logStockClient(`Cooldown timer updated: ${newValue} minutes remaining`);
        if (newValue === 0) {
          clearInterval(cooldownIntervalRef.current);
          logStockClient(`Cooldown timer ended`);
        }
        return newValue;
      });
    }, 60000); // Update every minute
  };

  /**
   * Fetch stock data from the server, with optional admin override
   * @param {boolean} adminOverride - Whether to override the cooldown check (admin only)
   * @returns {Promise<void>}
   */
  const fetchStock = async (adminOverride = false) => {
    // Don't fetch if we're already fetching
    if (isRefreshing) {
      logStockClient(`Fetch rejected: Already refreshing`);
      return;
    }

    // Log if admin override is being used
    if (adminOverride) {
      logStockClient(`Admin override used to bypass cooldown check`);
    }

    // Check if market is open
    const marketOpen = isMarketOpen(false);
    if (!marketOpen) {
      logStockClient(`Fetch rejected: Market is closed`);
      setError(
        'Market is closed. Stock data can only be refreshed during market hours (9:30 AM - 4:00 PM EST, weekdays).'
      );
      return;
    }

    // Check cooldown status (skip if admin override)
    if (!adminOverride) {
      const cooldownElapsed = checkCooldownStatus();
      if (!cooldownElapsed) {
        logStockClient(
          `Fetch rejected: In cooldown (${cooldownRemaining} minutes remaining)`
        );
        setError(
          `Please wait ${cooldownRemaining} minute${
            cooldownRemaining !== 1 ? 's' : ''
          } before refreshing again.`
        );
        return;
      }
    }

    // Check if we've hit the daily limit
    if (!incrementApiCallsCounter()) {
      logStockClient(`Fetch rejected: Daily API limit reached`);
      setError(
        `Daily API call limit reached (${dailyLimit}/${dailyLimit}). Try again tomorrow.`
      );
      return;
    }

    setIsRefreshing(true);
    setLoading(true);
    logStockClient(`Client → Server: Fetching stock data for ${symbol}`);

    try {
      // Add adminOverride parameter to the API request
      const res = await api.get(
        `/stocks/${symbol}${adminOverride ? '?adminOverride=true' : ''}`
      );

      // Simplified logging with clear client-server flow markers
      logStockClient(
        `Server → Client: Received ${res.data.data.source} data for ${symbol}`,
        {
          price: res.data.data.price,
          change: res.data.data.change,
          source: res.data.data.source,
        }
      );

      if (res.data.success) {
        const currentTime = new Date();
        const stockData = {
          ...res.data.data,
          lastUpdated: currentTime.toISOString(),
        };

        // Update state and storage with minimal logging
        setStock(stockData);
        localStorage.setItem('lastStockData', JSON.stringify(stockData));
        localStorage.setItem('stockLastFetchTime', currentTime.toISOString());
        setError('');

        // Start cooldown timer
        startCooldownTimer();

        logStockClient(
          `Client: Stock data successfully updated in UI for ${symbol}`
        );
      } else {
        logStockClient(`Server returned unsuccessful response`);
        throw new Error(res.data.message || 'Failed to fetch stock data');
      }
    } catch (err) {
      logStockClient(`Error during fetch: ${err.message}`);

      // Handle specific error types
      if (err.response?.status === 429) {
        logStockClient(`Rate limit exceeded (429), setting extended cooldown`);
        setError('Rate limit exceeded. Please wait before trying again.');
        // Start an extended cooldown for rate limit errors
        setCooldownRemaining(30); // 30 minute cooldown for rate limit
        startCooldownTimer();
      } else if (err.response?.status >= 500) {
        logStockClient(
          `Server error (${err.response.status}), using cached data if available`
        );
        setError('Stock service temporarily unavailable. Showing cached data.');
      } else {
        setError(err.response?.data?.message || err.message || 'Stock N/A');
      }

      // Even if there's an error, update the lastUpdated time for cached data
      if (stock) {
        const updatedStock = {
          ...stock,
          lastUpdated: new Date().toISOString(),
        };
        setStock(updatedStock);
        localStorage.setItem('lastStockData', JSON.stringify(updatedStock));
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load stock data from localStorage and initialize cooldown timer on mount
  useEffect(() => {
    logStockClient(`Component mounted, initializing...`);
    const savedStock = localStorage.getItem('lastStockData');
    if (savedStock) {
      try {
        const parsedStock = JSON.parse(savedStock);
        logStockClient(`Loaded stock data from localStorage:`, parsedStock);
        setStock(parsedStock);
      } catch (e) {
        console.error('Error parsing saved stock data:', e);
        localStorage.removeItem('lastStockData');
        logStockClient(
          `Error parsing saved stock data, removed from localStorage`
        );
      }
    } else {
      logStockClient(`No saved stock data found in localStorage`);
      // Auto-fetch stock data if none is found in localStorage
      setTimeout(() => {
        logStockClient(`Auto-fetching initial stock data for ${symbol}`);
        fetchStock();
      }, 500); // Small delay to ensure component is fully mounted
    }

    // Initialize the API calls counter
    checkAndResetApiCallsCounter();

    // Check initial cooldown status and start timer if needed
    const inCooldown = !checkCooldownStatus();
    if (inCooldown) {
      // Start the cooldown timer with the remaining time
      const lastFetchTime = new Date(
        localStorage.getItem('stockLastFetchTime')
      );
      const now = new Date();
      const elapsedMinutes = Math.floor((now - lastFetchTime) / (1000 * 60));
      const remainingMinutes = Math.max(0, cooldownMinutes - elapsedMinutes);

      logStockClient(
        `Initializing cooldown from previous session: ${remainingMinutes} minutes remaining`
      );

      if (remainingMinutes > 0) {
        setCooldownRemaining(remainingMinutes);

        // Start a new interval that updates the cooldown every minute
        cooldownIntervalRef.current = setInterval(() => {
          setCooldownRemaining((prev) => {
            if (prev <= 1) {
              logStockClient(`Initial cooldown timer ended`);
              clearInterval(cooldownIntervalRef.current);
              return 0;
            }
            logStockClient(
              `Initial cooldown timer updated: ${prev - 1} minutes remaining`
            );
            return prev - 1;
          });
        }, 60000);
      }
    }

    // Set up a timer to check and reset the API calls counter at midnight
    const setupMidnightReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilMidnight = tomorrow - now;
      logStockClient(
        `Scheduling midnight reset in ${Math.floor(
          timeUntilMidnight / 1000 / 60
        )} minutes`
      );

      // Set timeout to reset counter at midnight
      setTimeout(() => {
        logStockClient(`Executing midnight reset`);
        checkAndResetApiCallsCounter();
        setupMidnightReset(); // Set up the next day's reset
      }, timeUntilMidnight);
    };

    setupMidnightReset();

    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        logStockClient(`Cleanup: cleared cooldown interval`);
      }
    };
  }, [cooldownMinutes, dailyLimit]);

  return {
    stock,
    loading,
    error,
    apiCallsRemaining,
    isRefreshing,
    cooldownRemaining,
    fetchStock,
    isMarketOpen: () => isMarketOpen(false),
  };
};

export default useStockData;
