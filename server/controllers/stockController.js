import axios from 'axios';
import errorResponse from '../utils/errorResponse.js';

// Mock data for fallback when API fails
const mockStockData = {
  TSLA: {
    symbol: 'TSLA',
    price: 912.75,
    change: 22.5,
    changePercent: '2.53%',
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

// Enhanced logging function
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
const isInCooldownPeriod = (userId) => {
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
const generateNewMockPrice = (symbol, basePrice) => {
  // Get the last price or use the base price if this is the first time
  const lastPrice = lastGeneratedPrices[symbol] || basePrice;
  logStock(
    `Generating mock price for ${symbol}. Base: ${basePrice}, Last: ${lastPrice}`
  );

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

// Get real-time stock quote from Alpha Vantage
export const getStockQuote = async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const userId = req.user ? req.user.id : req.ip; // Use user ID or IP for non-authenticated users

    logStock(`Stock quote request received for ${symbol} from user ${userId}`);
    logAllPrices();

    // Validate symbol
    if (!symbol) {
      logStock(`Error: No symbol provided`);
      return next(new errorResponse('Stock symbol is required', 400));
    }

    // Check if market is open
    if (!isMarketOpen()) {
      logStock(`Request rejected: Market is closed`);
      return next(
        new errorResponse(
          'Stock market is closed. Try during market hours (9:30 AM - 4:00 PM EST, weekdays).',
          403
        )
      );
    }

    // Check if user is in cooldown period
    if (isInCooldownPeriod(userId)) {
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

    // Debug output to track what's happening
    logStock(`Processing request for ${normalizedSymbol}`);

    try {
      // Try to get real data from API
      logStock(
        `Attempting API request to Alpha Vantage for ${normalizedSymbol}`
      );

      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${normalizedSymbol}&apikey=KQ7XNXVXZCNJBP9X`,
        { timeout: 5000 } // Set a timeout to prevent long-hanging requests
      );

      logStock(`Alpha Vantage API response received:`, response.data);

      // Update last request time for this user
      userLastRequestTimes.set(userId, new Date());
      logStock(
        `Updated last request time for user ${userId}: ${new Date().toISOString()}`
      );

      if (
        response.data &&
        response.data['Global Quote'] &&
        Object.keys(response.data['Global Quote']).length > 0
      ) {
        const quote = response.data['Global Quote'];
        const priceData = {
          symbol: normalizedSymbol,
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: quote['10. change percent'],
          source: 'live',
        };

        logStock(`Live data returned for ${normalizedSymbol}`, priceData);

        logStock(`Sending successful response with live data`);
        return res.status(200).json({
          success: true,
          data: priceData,
        });
      } else {
        // API returned an empty response or invalid format
        logStock(
          `Alpha Vantage API returned invalid data format:`,
          response.data
        );
        throw new Error('Invalid API response format');
      }
    } catch (apiError) {
      // Log the API error
      logStock(`Alpha Vantage API Error: ${apiError.message}`);

      // Update last request time for this user even on error
      userLastRequestTimes.set(userId, new Date());
      logStock(
        `Updated last request time for user ${userId} despite error: ${new Date().toISOString()}`
      );

      // If we have mock data for this symbol, use it
      if (mockStockData[normalizedSymbol]) {
        // Get base price from mock data
        const basePrice = mockStockData[normalizedSymbol].price;
        logStock(
          `Using fallback mock data for ${normalizedSymbol}, base price: ${basePrice}`
        );

        // Generate a new price that's distinctly different
        const result = generateNewMockPrice(normalizedSymbol, basePrice);
        const newPrice = result.price;
        const priceChange = result.change;

        // Calculate percent change based on the actual change
        const percentChange = ((priceChange / result.lastPrice) * 100).toFixed(
          2
        );

        // Create mock response with dynamically generated data
        const mockData = {
          symbol: normalizedSymbol,
          price: newPrice,
          change: priceChange,
          changePercent: `${percentChange}%`,
          source: 'fallback',
        };

        logStock(`Mock data generated for ${normalizedSymbol}`, mockData);
        logAllPrices();

        logStock(`Sending successful response with mock data`);
        return res.status(200).json({
          success: true,
          data: mockData,
          message: 'Using fallback data due to API limitations',
        });
      }

      // If we don't have mock data for this symbol, inform client
      logStock(`No mock data available for symbol ${normalizedSymbol}`);
      return next(
        new errorResponse(
          `Stock data for ${normalizedSymbol} is currently unavailable`,
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
