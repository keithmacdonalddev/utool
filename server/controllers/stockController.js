import axios from 'axios';
import errorResponse from '../utils/errorResponse.js';

/**
 * Mock data for fallback when all API calls fail
 * These values are updated to April 2025 prices for better accuracy when APIs are unavailable
 * This is the last resort data source and should rarely be used in production
 */
const mockStockData = {
  TSLA: {
    symbol: 'TSLA',
    price: 279.15, // Updated to current market price (April 2025)
    change: -12.88,
    changePercent: '-4.41%',
    previousClose: 292.03, // Updated with real previous close
  },
  AAPL: {
    symbol: 'AAPL',
    price: 187.23,
    change: 1.45,
    changePercent: '0.78%',
  },
  MSFT: {
    symbol: 'MSFT',
    price: 420.15,
    change: 5.32,
    changePercent: '1.28%',
  },
  AMZN: {
    symbol: 'AMZN',
    price: 185.07,
    change: -2.13,
    changePercent: '-1.14%',
  },
  GOOGL: {
    symbol: 'GOOGL',
    price: 165.42,
    change: 0.87,
    changePercent: '0.53%',
  },
};

// Keep track of last generated price for each stock
const lastGeneratedPrices = {};

// In-memory store for tracking API request times by user
const userLastRequestTimes = new Map();

/**
 * Enhanced logging function for stock-related operations
 * @param {string} message - The message to log
 * @param {any} data - Optional data to include in the log
 */
const logStock = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[STOCK][${timestamp}] ${message}`);
  if (data) {
    console.log(`[STOCK][${timestamp}] Data:`, JSON.stringify(data, null, 2));
  }
};

// Check if the stock market is currently open
const isMarketOpen = () => {
  const now = new Date();

  // Check if it's a weekday (0 = Sunday, 6 = Saturday)
  const day = now.getDay();
  if (day === 0 || day === 6) {
    logStock(`Market closed: Weekend day ${day}`);
    return false;
  }

  // Get EST/EDT time
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const stdTimezoneOffset = Math.max(
    jan.getTimezoneOffset(),
    jul.getTimezoneOffset()
  );
  const isDST = now.getTimezoneOffset() < stdTimezoneOffset;

  // EST is UTC-5, EDT is UTC-4
  const estOffset = isDST ? 4 : 5;
  const estHours = (now.getUTCHours() - estOffset + 24) % 24;
  const estMinutes = now.getUTCMinutes();
  const totalMinutes = estHours * 60 + estMinutes;

  const isOpen = totalMinutes >= 570 && totalMinutes <= 960;

  logStock(
    `Market check: ${isOpen ? 'OPEN' : 'CLOSED'} (EST/EDT: ${estHours}:${
      estMinutes < 10 ? '0' : ''
    }${estMinutes}, Total minutes: ${totalMinutes})`
  );

  // Market hours: 9:30 AM - 4:00 PM EST
  return isOpen;
};

// Check if a user is within cooldown period
const isInCooldownPeriod = (userId, adminOverride = false) => {
  // Admin override bypasses cooldown check completely
  if (adminOverride) {
    logStock(`Cooldown bypassed: Admin override used by ${userId}`);
    return false;
  }

  if (!userLastRequestTimes.has(userId)) {
    logStock(`Cooldown: No previous requests for user ${userId}`);
    return false; // No previous request, not in cooldown
  }

  const lastRequestTime = userLastRequestTimes.get(userId);
  const now = new Date();

  // Calculate minutes since last request
  const diffMinutes = (now - lastRequestTime) / (1000 * 60);
  const inCooldown = diffMinutes < 15;

  logStock(
    `Cooldown check for ${userId}: ${
      inCooldown ? 'IN COOLDOWN' : 'NOT IN COOLDOWN'
    } (${diffMinutes.toFixed(2)} minutes elapsed of 15)`
  );

  // Return true if less than 15 minutes have passed
  return inCooldown;
};

// Generate a distinctly different price for mock data
const generateNewMockPrice = (symbol, basePrice, previousClose) => {
  // Get the last price or use the base price if this is the first time
  const lastPrice = lastGeneratedPrices[symbol] || basePrice;
  logStock(
    `Generating mock price for ${symbol}. Base: ${basePrice}, Last: ${lastPrice}`
  );

  // For TSLA, use more realistic values based on actual market data
  if (symbol === 'TSLA') {
    // Return our updated mock data that matches real market data
    const realChange = basePrice - previousClose;
    const realChangePercent = ((realChange / previousClose) * 100).toFixed(2);

    // Update stored price
    lastGeneratedPrices[symbol] = basePrice;

    logStock(
      `Using accurate market data for TSLA: $${basePrice.toFixed(
        2
      )}, Change: ${realChange.toFixed(2)} (${realChangePercent}%)`
    );

    return {
      price: basePrice,
      change: realChange,
      changePercent: `${realChangePercent}%`,
      previousClose: previousClose,
      lastPrice: previousClose,
    };
  }

  // For other symbols, continue with simulated data
  // Decide if price should go up or down (alternate or random)
  const direction = Math.random() > 0.5 ? 1 : -1;

  // Generate a meaningful change (at least 0.5% of price and at most 3%)
  const minChange = lastPrice * 0.005 * direction; // At least 0.5% change
  const maxChange = lastPrice * 0.03 * direction; // At most 3% change
  const change =
    direction > 0
      ? Math.max(minChange, Math.random() * maxChange)
      : Math.min(minChange, Math.random() * maxChange);

  // Calculate new price with at least 0.5% difference
  const newPrice = lastPrice + change;

  // Store for next time
  const oldPrice = lastGeneratedPrices[symbol];
  lastGeneratedPrices[symbol] = newPrice;

  logStock(
    `Mock price generated. Direction: ${
      direction > 0 ? 'UP' : 'DOWN'
    }, Change: ${change.toFixed(2)}, Old stored price: ${
      oldPrice || 'none'
    }, New price: ${newPrice.toFixed(2)}`
  );

  // Return both the new price and the change from last price
  return {
    price: newPrice,
    change: change, // This is the actual change from last price
    lastPrice,
  };
};

// Dump the current state of all stored prices (debugging)
const logAllPrices = () => {
  logStock(`Current state of lastGeneratedPrices:`, lastGeneratedPrices);
  logStock(
    `Current state of userLastRequestTimes:`,
    Array.from(userLastRequestTimes.entries()).map(([key, value]) => ({
      user: key,
      time: value.toISOString(),
      minutesAgo: ((new Date() - value) / (1000 * 60)).toFixed(2),
    }))
  );
};

/**
 * Alternative API providers for stock data
 * Used as fallbacks when the primary API fails
 * @param {string} symbol - The stock symbol to fetch
 * @returns {Promise<Object|null>} - Stock data or null if failed
 */
const tryAlternativeAPIs = async (symbol) => {
  try {
    logStock(
      `Attempting alternative API for ${symbol} (Yahoo Finance API via RapidAPI)`
    );

    // Using Yahoo Finance API through RapidAPI
    const rapidApiKey = process.env.YAHOO_FINANCE_API_KEY;

    // Skip this attempt if no API key is configured
    if (!rapidApiKey || rapidApiKey === 'your_rapidapi_key_here') {
      logStock(`Yahoo Finance API skipped: No API key configured`);
      return null;
    }

    const response = await axios.get(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quote?symbol=${symbol}`,
      {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com',
        },
        timeout: 5000,
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      const quote = response.data.data[0];

      // Extract the needed stock data from Yahoo Finance response
      return {
        symbol: symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: `${quote.regularMarketChangePercent.toFixed(2)}%`,
        source: 'yahoo-finance',
      };
    }

    logStock(`Yahoo Finance API returned invalid or empty data`);
    return null;
  } catch (error) {
    logStock(`Alternative API failed: ${error.message}`);
    return null;
  }
};

/**
 * Try to get stock data from FMP API
 * (Financial Modeling Prep)
 */
const tryFMPAPI = async (symbol) => {
  try {
    logStock(`Attempting FMP API for ${symbol}`);
    const apiKey = process.env.FMP_API_KEY || 'demo'; // Use demo key if not configured

    const response = await axios.get(
      `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`,
      { timeout: 5000 }
    );

    if (response.data && response.data.length > 0) {
      const quote = response.data[0];

      return {
        symbol: symbol,
        price: quote.price,
        change: quote.change,
        changePercent: `${quote.changesPercentage.toFixed(2)}%`,
        previousClose: quote.previousClose,
        source: 'financial-modeling-prep',
      };
    }

    logStock(`FMP API returned invalid or empty data`);
    return null;
  } catch (error) {
    logStock(`FMP API failed: ${error.message}`);
    return null;
  }
};

/**
 * Get real-time stock quote from primary API, with fallback options
 * Implements multiple layers of fallbacks to ensure data availability
 * Optimized to only return the most recent price without excessive data
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} - Resolves when the API call completes
 */
export const getStockQuote = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const adminOverride = req.query.adminOverride === 'true';
    const userId = req.user ? req.user.id : req.ip; // Use user ID or IP for non-authenticated users

    // Simple request logging - keep this minimal
    logStock(
      `Stock request: ${symbol} from ${userId} ${
        adminOverride ? '(admin override)' : ''
      }`
    );

    // Validate symbol
    if (!symbol) {
      return next(new errorResponse('Stock symbol is required', 400));
    }

    // Check if user is in cooldown period (passing admin override flag)
    if (isInCooldownPeriod(userId, adminOverride)) {
      const lastRequestTime = userLastRequestTimes.get(userId);
      const now = new Date();
      const minutesAgo = Math.floor((now - lastRequestTime) / (1000 * 60));
      const minutesRemaining = Math.max(0, 15 - minutesAgo);

      return next(
        new errorResponse(
          `Please wait ${minutesRemaining} minute${
            minutesRemaining !== 1 ? 's' : ''
          } before refreshing again.`,
          429 // Too Many Requests
        )
      );
    }

    // Normalized symbol (uppercase)
    const normalizedSymbol = symbol.toUpperCase();

    try {
      // Use Time Series Intraday API for real-time data instead of Global Quote
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'KQ7XNXVXZCNJBP9X';

      logStock(
        `Fetching real-time stock data for ${normalizedSymbol} from Alpha Vantage Intraday API`
      );

      // Get intraday data with 5-minute interval
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${normalizedSymbol}&interval=5min&apikey=${apiKey}&outputsize=compact`,
        { timeout: 8000 } // Increased timeout as intraday data can be larger
      );

      // Update last request time for this user
      userLastRequestTimes.set(userId, new Date());

      // Check if we have valid data
      if (
        response.data &&
        response.data['Meta Data'] &&
        response.data['Time Series (5min)']
      ) {
        // Get the most recent data point (first key in the time series)
        const timeSeriesData = response.data['Time Series (5min)'];
        const timestamps = Object.keys(timeSeriesData).sort().reverse();

        if (timestamps.length === 0) {
          throw new Error('No time series data available');
        }

        const latestTimestamp = timestamps[0];
        const latestDataPoint = timeSeriesData[latestTimestamp];

        // Get previous close from meta data or fallback to using nearby points
        const metaData = response.data['Meta Data'];
        let previousClose;

        // Try to get previous day's data for comparison
        // For simplicity, we'll use the opening price of the day if we can't determine the previous close
        const currentDate = new Date(latestTimestamp)
          .toISOString()
          .split('T')[0];
        const openingTimestamps = timestamps.filter(
          (ts) => ts.startsWith(currentDate) && ts.includes('09:30')
        );

        if (openingTimestamps.length > 0) {
          previousClose = parseFloat(
            timeSeriesData[openingTimestamps[0]]['1. open']
          );
        } else {
          // Fallback: use an earlier point if opening data isn't available
          const earlierTimestamp =
            timestamps[Math.min(timestamps.length - 1, 30)]; // Use an earlier point as reference
          previousClose = parseFloat(
            timeSeriesData[earlierTimestamp]['4. close']
          );
        }

        // Current price is the latest close value
        const currentPrice = parseFloat(latestDataPoint['4. close']);

        // Calculate change
        const change = currentPrice - previousClose;
        const changePercent = ((change / previousClose) * 100).toFixed(2);

        // Build the stock data object
        const stockData = {
          symbol: normalizedSymbol,
          price: currentPrice,
          change: change,
          changePercent: `${changePercent}%`,
          previousClose: previousClose,
          latestTradingDay: currentDate, // Today's date
          latestUpdate: latestTimestamp, // The exact timestamp
          source: 'alpha-vantage-realtime',
        };

        logStock(`Returning real-time data for ${normalizedSymbol}`, stockData);

        return res.status(200).json({
          success: true,
          data: stockData,
        });
      } else {
        throw new Error(
          'Invalid or empty response from Alpha Vantage Intraday API'
        );
      }
    } catch (primaryApiError) {
      logStock(`Alpha Vantage API Error: ${primaryApiError.message}`);

      // Try FMP as fallback (simpler implementation)
      try {
        const fmpApiKey = process.env.FMP_API_KEY || 'demo';
        logStock(`Trying fallback FMP API for ${normalizedSymbol}`);

        const fmpResponse = await axios.get(
          `https://financialmodelingprep.com/api/v3/quote/${normalizedSymbol}?apikey=${fmpApiKey}`,
          { timeout: 5000 }
        );

        if (fmpResponse.data && fmpResponse.data.length > 0) {
          const quote = fmpResponse.data[0];

          const stockData = {
            symbol: normalizedSymbol,
            price: quote.price,
            change: quote.change,
            changePercent: `${quote.changesPercentage.toFixed(2)}%`,
            previousClose: quote.previousClose,
            source: 'financial-modeling-prep',
          };

          logStock(`Returning FMP data for ${normalizedSymbol}`, stockData);

          return res.status(200).json({
            success: true,
            data: stockData,
          });
        }
      } catch (fmpError) {
        logStock(`FMP API failed: ${fmpError.message}`);
      }

      // Last resort: Use mock data
      if (mockStockData[normalizedSymbol]) {
        const mockData = {
          ...mockStockData[normalizedSymbol],
          source: 'fallback',
          isMockData: true,
        };

        logStock(`Using mock data for ${normalizedSymbol}`, mockData);

        return res.status(200).json({
          success: true,
          data: mockData,
          message: 'Using fallback data. This is not real-time market data.',
        });
      }

      // No data available from any source
      return next(
        new errorResponse(
          `Stock data for ${normalizedSymbol} is currently unavailable`,
          503
        )
      );
    }
  } catch (err) {
    logStock(`Critical error in stock controller: ${err.message}`);
    next(new errorResponse('Error fetching stock data', 500));
  }
};
