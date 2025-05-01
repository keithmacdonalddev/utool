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
 */
export const getStockQuote = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const adminOverride = req.query.adminOverride === 'true';
    const userId = req.user ? req.user.id : req.ip; // Use user ID or IP for non-authenticated users

    // Log if admin override is being used
    if (adminOverride) {
      logStock(`ADMIN OVERRIDE requested for stock refresh by user ${userId}`);
    }

    logStock(`Stock quote request received for ${symbol} from user ${userId}`);
    logAllPrices();

    // Validate symbol
    if (!symbol) {
      logStock(`Error: No symbol provided`);
      return next(new errorResponse('Stock symbol is required', 400));
    }

    // Market check is optional - skipping this would allow getting data even when market is closed
    // Uncomment the following if you want to enforce market hours
    /*
    if (!isMarketOpen()) {
      logStock(`Request rejected: Market is closed`);
      return next(
        new errorResponse(
          'Stock market is closed. Try during market hours (9:30 AM - 4:00 PM EST, weekdays).',
          403
        )
      );
    }
    */

    // Check if user is in cooldown period (passing admin override flag)
    if (isInCooldownPeriod(userId, adminOverride)) {
      const lastRequestTime = userLastRequestTimes.get(userId);
      const now = new Date();
      const minutesAgo = Math.floor((now - lastRequestTime) / (1000 * 60));
      const minutesRemaining = Math.max(0, 15 - minutesAgo);

      logStock(
        `Request rejected: User ${userId} in cooldown (${minutesRemaining} minutes remaining)`
      );

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
    logStock(`Processing request for ${normalizedSymbol}`);

    try {
      // Try FMP API first as it tends to have more accurate data
      const fmpData = await tryFMPAPI(normalizedSymbol);
      if (fmpData) {
        // Update last request time for this user
        userLastRequestTimes.set(userId, new Date());
        logStock(
          `Updated last request time for user ${userId}: ${new Date().toISOString()}`
        );

        logStock(`FMP API data returned for ${normalizedSymbol}`, fmpData);

        // SUCCESS: Return real-time data from FMP source
        return res.status(200).json({
          success: true,
          data: fmpData,
        });
      }

      // PRIMARY DATA SOURCE: Alpha Vantage API - Using Intraday data for real-time prices
      logStock(
        `Attempting API request to Alpha Vantage for real-time data on ${normalizedSymbol}`
      );

      // Use environment variable for API key when possible
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'KQ7XNXVXZCNJBP9X';

      // First, get the intraday data for current price
      const intradayResponse = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${normalizedSymbol}&interval=5min&apikey=${apiKey}`,
        { timeout: 5000 }
      );

      logStock(
        `Alpha Vantage Intraday API response received:`,
        intradayResponse.data
      );

      // Update last request time for this user
      userLastRequestTimes.set(userId, new Date());
      logStock(
        `Updated last request time for user ${userId}: ${new Date().toISOString()}`
      );

      // Then get the global quote for previous close and other data
      const globalQuoteResponse = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${normalizedSymbol}&apikey=${apiKey}`,
        { timeout: 5000 }
      );

      logStock(
        `Alpha Vantage Global Quote API response received:`,
        globalQuoteResponse.data
      );

      if (
        intradayResponse.data &&
        intradayResponse.data['Meta Data'] &&
        intradayResponse.data['Time Series (5min)'] &&
        globalQuoteResponse.data &&
        globalQuoteResponse.data['Global Quote']
      ) {
        // Get the most recent data point from intraday data
        const timeSeriesData = intradayResponse.data['Time Series (5min)'];
        const timestamps = Object.keys(timeSeriesData).sort().reverse();
        const latestTimestamp = timestamps[0];
        const latestDataPoint = timeSeriesData[latestTimestamp];

        // Get the current price from the latest intraday data point
        const currentPrice = parseFloat(latestDataPoint['4. close']);

        // Get previous close from global quote
        const quoteData = globalQuoteResponse.data['Global Quote'];
        const previousClose = parseFloat(quoteData['08. previous close']);

        // Calculate the change based on previous close and current real-time price
        const change = currentPrice - previousClose;
        const changePercent = ((change / previousClose) * 100).toFixed(2);

        const priceData = {
          symbol: normalizedSymbol,
          price: currentPrice,
          change: change,
          changePercent: `${changePercent}%`,
          previousClose: previousClose,
          source: 'alpha-vantage-realtime',
        };

        logStock(`Real-time data returned for ${normalizedSymbol}`, priceData);

        // SUCCESS: Return real-time data from primary source
        return res.status(200).json({
          success: true,
          data: priceData,
        });
      } else {
        // Either API returned an empty response or invalid format
        logStock(`Alpha Vantage API returned invalid data format:`, {
          intraday: intradayResponse.data,
          globalQuote: globalQuoteResponse.data,
        });
        throw new Error('Invalid Alpha Vantage API response format');
      }
    } catch (primaryApiError) {
      // Log the primary API error
      logStock(`Primary API Error: ${primaryApiError.message}`);

      // Update last request time for this user even on error
      userLastRequestTimes.set(userId, new Date());

      // SECONDARY DATA SOURCE: Try alternative APIs
      const alternativeData = await tryAlternativeAPIs(normalizedSymbol);
      if (alternativeData) {
        logStock(
          `Alternative API succeeded for ${normalizedSymbol}`,
          alternativeData
        );
        return res.status(200).json({
          success: true,
          data: alternativeData,
          message: 'Using alternative data source',
        });
      }

      // LAST RESORT: If we have mock data for this symbol, use it
      if (mockStockData[normalizedSymbol]) {
        const mockDataForSymbol = mockStockData[normalizedSymbol];
        // Get base price and previous close from mock data
        const basePrice = mockDataForSymbol.price;
        const previousClose =
          mockDataForSymbol.previousClose ||
          basePrice - mockDataForSymbol.change;

        logStock(
          `Using fallback mock data for ${normalizedSymbol}, base price: ${basePrice}, previous close: ${previousClose}`
        );

        // Generate a new price that's distinctly different
        const result = generateNewMockPrice(
          normalizedSymbol,
          basePrice,
          previousClose
        );
        const newPrice = result.price;
        const priceChange = result.change;

        // Calculate percent change based on the actual change
        const percentChange = (
          (priceChange / (result.previousClose || result.lastPrice)) *
          100
        ).toFixed(2);

        // Create mock response with dynamically generated data
        const mockData = {
          symbol: normalizedSymbol,
          price: newPrice,
          change: priceChange,
          changePercent: `${percentChange}%`,
          previousClose: result.previousClose || newPrice - priceChange,
          source: 'fallback',
          isMockData: true, // Explicitly flag this as mock data
        };

        logStock(`Mock data generated for ${normalizedSymbol}`, mockData);
        logAllPrices();

        return res.status(200).json({
          success: true,
          data: mockData,
          message:
            'Using fallback data due to API limitations. This is not real-time market data.',
        });
      }

      // No data available from any source
      logStock(
        `No data available for symbol ${normalizedSymbol} from any source`
      );
      return next(
        new errorResponse(
          `Stock data for ${normalizedSymbol} is currently unavailable from any source`,
          503
        )
      );
    }
  } catch (err) {
    logStock(`Critical Stock Controller Error: ${err.message}`, {
      stack: err.stack,
    });
    next(new errorResponse('Error fetching stock data', 500));
  }
};
