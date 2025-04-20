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

// Get real-time stock quote from Alpha Vantage
export const getStockQuote = async (req, res, next) => {
  try {
    const { symbol } = req.params;

    // Validate symbol
    if (!symbol) {
      return next(new errorResponse('Stock symbol is required', 400));
    }

    // Normalized symbol (uppercase)
    const normalizedSymbol = symbol.toUpperCase();

    try {
      // Try to get real data from API
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${normalizedSymbol}&apikey=KQ7XNXVXZCNJBP9X`,
        { timeout: 5000 } // Set a timeout to prevent long-hanging requests
      );

      if (
        response.data &&
        response.data['Global Quote'] &&
        Object.keys(response.data['Global Quote']).length > 0
      ) {
        const quote = response.data['Global Quote'];
        return res.status(200).json({
          success: true,
          data: {
            symbol: normalizedSymbol,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: quote['10. change percent'],
            source: 'live',
          },
        });
      } else {
        // API returned an empty response or invalid format
        console.log(
          'Alpha Vantage API returned invalid data format:',
          response.data
        );
        throw new Error('Invalid API response format');
      }
    } catch (apiError) {
      // Log the API error
      console.error('Alpha Vantage API Error:', apiError.message);

      // If we have mock data for this symbol, use it
      if (mockStockData[normalizedSymbol]) {
        // Add slight random variation to make it look dynamic
        const variation = (Math.random() * 2 - 1) * 3; // -3% to +3%
        const mockData = { ...mockStockData[normalizedSymbol] };
        const newPrice = mockData.price * (1 + variation / 100);
        const priceChange = newPrice - mockData.price;

        mockData.price = newPrice;
        mockData.change = priceChange;
        mockData.changePercent = `${(
          (priceChange / mockData.price) *
          100
        ).toFixed(2)}%`;
        mockData.source = 'fallback';

        return res.status(200).json({
          success: true,
          data: mockData,
          message: 'Using fallback data due to API limitations',
        });
      }

      // If we don't have mock data for this symbol, inform client
      return next(
        new errorResponse(
          `Stock data for ${normalizedSymbol} is currently unavailable`,
          503
        )
      );
    }
  } catch (err) {
    console.error('Stock Controller Error:', err);
    next(new errorResponse('Error fetching stock data', 500));
  }
};
