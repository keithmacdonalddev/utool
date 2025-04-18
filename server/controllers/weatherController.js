const axios = require('axios');

// @desc    Get current weather for a location
// @route   GET /api/v1/weather?location=...
// @access  Private
exports.getCurrentWeather = async (req, res, next) => {
  const location = req.query.location;
  const primaryApiKey = process.env.OPENWEATHER_API_KEY_PRIMARY;
  const secondaryApiKey = process.env.OPENWEATHER_API_KEY_SECONDARY;

  if (!primaryApiKey && !secondaryApiKey) {
    console.error(
      'OpenWeatherMap API keys (Primary and Secondary) not configured.'
    );
    return res
      .status(500)
      .json({
        success: false,
        message: 'Weather service configuration error.',
      });
  }
  // Removed incorrect console.log referencing old 'apiKey' variable

  if (!location) {
    return res
      .status(400)
      .json({
        success: false,
        message: 'Please provide a location query parameter (e.g., city name).',
      });
  }

  // Function to attempt fetch with a given key
  const attemptFetch = async (keyToTry) => {
    if (!keyToTry) return null; // Skip if key is not provided

    console.log(
      `Attempting weather fetch with key: ${keyToTry.substring(0, 5)}...`
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
        console.warn(
          'Received invalid data structure from OpenWeatherMap with key:',
          keyToTry.substring(0, 5)
        );
        return {
          success: false,
          error: new Error('Invalid data structure received'),
          statusCode: 500,
        };
      }
    } catch (err) {
      // Return the error object to be handled by the main logic
      console.error(
        `Weather API Error with key ${keyToTry.substring(0, 5)}...:`,
        err.response?.data || err.message
      );
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
    console.log('Primary key failed (401), trying secondary key...');
    result = await attemptFetch(secondaryApiKey);
  }

  // Process the final result (either from primary or secondary attempt)
  if (result && result.success) {
    // Successful fetch
    const responseData = result.data; // Correct variable holding the successful response data
    const weatherData = {
      temp: responseData.main.temp, // Use responseData here
      feels_like: responseData.main.feels_like, // Use responseData here
      humidity: responseData.main.humidity, // Use responseData here
      description: responseData.weather[0]?.description || 'N/A', // Use responseData here
      icon: responseData.weather[0]?.icon || null, // Use responseData here
      city: responseData.name, // Use responseData here
      country: responseData.sys?.country, // Use responseData here
      wind_speed: responseData.wind?.speed, // Use responseData here
    };
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
    if (finalError)
      console.error(
        'Final Weather API Error:',
        finalError.response?.data || finalError.message
      );

    res.status(finalStatusCode).json({ success: false, message: message });
  }
};

// @desc    Get current weather by location
// @route   GET /api/v1/weather/:location
// @access  Private
exports.getWeatherByLocation = async (req, res) => {
  const location = req.params.location;
  console.log(`Weather requested for location: ${location}`);

  // API key handling with fallback mechanism
  const primaryKey = process.env.OPENWEATHER_API_KEY;
  const secondaryKey = process.env.OPENWEATHER_API_KEY_BACKUP;

  // Track which API key was successful or what the final error was
  let result;
  let finalError = null;
  let finalStatusCode = 500;

  // Try primary key first if available
  if (primaryKey) {
    result = await fetchWeatherData(location, primaryKey);
    if (result.success) {
      const responseData = result.data;
      // Format response into a consistent shape
      const weatherData = {
        location: responseData.name,
        weather: responseData.weather?.[0]?.main || 'Unknown',
        description:
          responseData.weather?.[0]?.description || 'No description available',
        temperature: responseData.main?.temp || null,
        feels_like: responseData.main?.feels_like || null,
        humidity: responseData.main?.humidity || null,
        country: responseData.sys?.country || 'Unknown',
        wind_speed: responseData.wind?.speed || null,
      };
      return res.status(200).json({ success: true, data: weatherData });
    }
    // Fall through to secondary key if primary fails
    finalError = result.error;
    finalStatusCode = result.statusCode || 500;
  }

  // Try secondary key as fallback
  if (secondaryKey && (!primaryKey || !result?.success)) {
    result = await fetchWeatherData(location, secondaryKey);
    if (result.success) {
      const responseData = result.data;
      // Format response into a consistent shape
      const weatherData = {
        location: responseData.name,
        weather: responseData.weather?.[0]?.main || 'Unknown',
        description:
          responseData.weather?.[0]?.description || 'No description available',
        temperature: responseData.main?.temp || null,
        feels_like: responseData.main?.feels_like || null,
        humidity: responseData.main?.humidity || null,
        country: responseData.sys?.country || 'Unknown',
        wind_speed: responseData.wind?.speed || null,
      };
      return res.status(200).json({ success: true, data: weatherData });
    }
    // Update final error if secondary key also failed
    finalError = result?.error;
    finalStatusCode = result?.statusCode || 500;
  }

  // Handle errors from the final attempt
  let message = 'Server error fetching weather data.';

  if (finalStatusCode === 404) {
    message = `Location not found: ${location}`;
  } else if (finalStatusCode === 401) {
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
  if (finalError) {
    console.error(
      'Weather API Error:',
      finalError.response?.data || finalError.message
    );
  }

  return res.status(finalStatusCode).json({ success: false, message });
};

// Helper function to fetch weather data
async function fetchWeatherData(location, keyToTry) {
  try {
    console.log(
      `Attempting weather fetch with key: ${keyToTry.substring(0, 3)}...`
    );
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      location
    )}&appid=${keyToTry}&units=metric`;
    const response = await axios.get(url);

    // Check for successful response structure
    if (response.data && response.data.main && response.data.weather) {
      return { success: true, data: response.data };
    } else {
      console.warn('Received invalid data structure from OpenWeatherMap');
      return {
        success: false,
        error: new Error('Invalid data structure received'),
        statusCode: 500,
      };
    }
  } catch (err) {
    console.error(`Weather API Error:`, err.message);
    return {
      success: false,
      error: err,
      statusCode: err.response?.status || 500,
    };
  }
}
