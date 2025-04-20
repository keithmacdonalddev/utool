import axios from 'axios';
import { logger } from '../utils/logger.js';

// @desc    Get current weather for a location
// @route   GET /api/v1/weather?location=...
// @access  Private
export const getCurrentWeather = async (req, res, next) => {
  const location = req.query.location;
  const primaryApiKey = process.env.OPENWEATHER_API_KEY_PRIMARY;
  const secondaryApiKey = process.env.OPENWEATHER_API_KEY_SECONDARY;

  // Log the weather request
  logger.info(`Weather requested for location: ${location}`, {
    userId: req.user?.id,
    action: 'get_weather',
  });

  if (!primaryApiKey && !secondaryApiKey) {
    logger.error('OpenWeatherMap API keys not configured', {
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      message: 'Weather service configuration error.',
      notificationType: 'error',
    });
  }

  if (!location) {
    logger.warn('Weather request missing location', {
      userId: req.user?.id,
    });

    return res.status(400).json({
      success: false,
      message: 'Please provide a location query parameter (e.g., city name).',
      notificationType: 'error',
    });
  }

  // Function to attempt fetch with a given key
  const attemptFetch = async (keyToTry) => {
    if (!keyToTry) return null; // Skip if key is not provided

    // Don't log the entire API key for security reasons
    logger.info(
      `Attempting weather fetch with key: ${keyToTry.substring(0, 3)}...`,
      {
        userId: req.user?.id,
        location,
      }
    );

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      location
    )}&appid=${keyToTry}&units=metric`;

    try {
      const response = await axios.get(url);
      // Check for successful response structure
      if (response.data && response.data.main && response.data.weather) {
        return { success: true, data: response.data }; // Indicate success
      } else {
        logger.warn('Received invalid data structure from OpenWeatherMap', {
          userId: req.user?.id,
          location,
        });

        return {
          success: false,
          error: new Error('Invalid data structure received'),
          statusCode: 500,
        };
      }
    } catch (err) {
      // Return the error object to be handled by the main logic
      logger.error(`Weather API Error:`, {
        userId: req.user?.id,
        location,
        error: err.response?.data || err.message,
        status: err.response?.status,
      });

      return { success: false, error: err, statusCode: err.response?.status };
    }
  };

  let result = await attemptFetch(primaryApiKey);
  let finalError = null;
  let finalStatusCode = 500;

  // If primary key failed specifically with 401 (Invalid Key), try secondary
  if (
    result &&
    !result.success &&
    result.statusCode === 401 &&
    secondaryApiKey
  ) {
    logger.warn('Primary weather API key failed (401), trying secondary key', {
      userId: req.user?.id,
      location,
    });

    result = await attemptFetch(secondaryApiKey);
  }

  // Process the final result (either from primary or secondary attempt)
  if (result && result.success) {
    // Successful fetch
    const responseData = result.data;
    const weatherData = {
      temp: responseData.main.temp,
      feels_like: responseData.main.feels_like,
      humidity: responseData.main.humidity,
      description: responseData.weather[0]?.description || 'N/A',
      icon: responseData.weather[0]?.icon || null,
      city: responseData.name,
      country: responseData.sys?.country,
      wind_speed: responseData.wind?.speed,
    };

    logger.info(`Weather data fetched successfully for ${location}`, {
      userId: req.user?.id,
    });

    res.status(200).json({ success: true, data: weatherData });
  } else {
    // Handle errors from the final attempt
    finalError = result?.error;
    finalStatusCode = result?.statusCode || 500;
    let message = 'Server error fetching weather data.';

    if (finalStatusCode === 404) {
      message = `Location not found: ${location}`;
    } else if (finalStatusCode === 401) {
      // Both keys failed with 401 or only primary failed and secondary wasn't available/tried
      message = 'Weather service authentication failed. Please check API keys.';
      finalStatusCode = 500; // Internal config issue
    } else if (
      finalError &&
      finalError.message === 'Invalid data structure received'
    ) {
      message = 'Received unexpected data from weather service.';
      finalStatusCode = 502; // Bad Gateway might be appropriate
    } else if (finalError?.response?.data?.message) {
      message = finalError.response.data.message; // Use message from API if available
    } else if (finalError?.message) {
      message = finalError.message;
    }

    // Log the underlying error if it exists
    logger.error('Weather API final error', {
      userId: req.user?.id,
      location,
      error: finalError?.response?.data || finalError?.message,
      status: finalStatusCode,
    });

    res.status(finalStatusCode).json({
      success: false,
      message: message,
      notificationType: 'error',
    });
  }
};
