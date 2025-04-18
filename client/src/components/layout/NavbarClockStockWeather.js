import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const getWeatherIcon = (iconCode) => {
  if (!iconCode) return <Sun size={16} className="text-yellow-500" />;
  const main = iconCode.substring(0, 2);
  switch (main) {
    case '01':
      return <Sun size={16} className="text-yellow-500" />;
    case '02':
      return <Cloud size={16} className="text-gray-400" />;
    case '03':
      return <Cloud size={16} className="text-gray-500" />;
    case '04':
      return <Cloud size={16} className="text-gray-600" />;
    case '09':
      return <CloudRain size={16} className="text-blue-500" />;
    case '10':
      return <CloudRain size={16} className="text-blue-400" />;
    case '11':
      return <CloudLightning size={16} className="text-yellow-600" />;
    case '13':
      return <CloudSnow size={16} className="text-blue-300" />;
    case '50':
      return <Wind size={16} className="text-gray-400" />;
    default:
      return <Sun size={16} className="text-yellow-500" />;
  }
};

const NavbarClockStockWeather = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [stock, setStock] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  const [location, setLocation] = useState('Halifax');
  const intervalRef = useRef(null);

  // Clock update
  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const fetchStock = async () => {
    try {
      console.log('Fetching stock data at:', new Date().toLocaleTimeString());
      // Remove the duplicate v1 prefix since it's already in the baseURL
      const res = await api.get('/stocks/TSLA');
      if (res.data.success) {
        const stockData = {
          ...res.data.data,
          lastUpdated: new Date().toISOString(),
        };

        // Check if this is fallback data and show indicator if needed
        if (res.data.data.source === 'fallback') {
          stockData.isFallback = true;
        }

        setStock(stockData);
        localStorage.setItem('lastStockData', JSON.stringify(stockData));
        setStockError(''); // Clear any previous errors
      } else {
        throw new Error(res.data.message || 'Failed to fetch stock data');
      }
    } catch (err) {
      console.error('Stock Fetch Error:', err);
      setStockError(err.response?.data?.message || err.message || 'Stock N/A');

      // Even if there's an error, we still want to update the lastUpdated time
      // so the UI shows when we last attempted to fetch
      if (stock) {
        const updatedStock = {
          ...stock,
          lastUpdated: new Date().toISOString(),
        };
        setStock(updatedStock);
        localStorage.setItem('lastStockData', JSON.stringify(updatedStock));
      }
    } finally {
      setStockLoading(false);
    }
  };

  const isMarketOpen = () => {
    const now = new Date();

    // Check if it's a weekday (0 = Sunday, 6 = Saturday)
    const day = now.getDay();
    if (day === 0 || day === 6) return false;

    // Get EST/EDT time (UTC-5 or UTC-4 depending on daylight saving)
    // Calculate offset accounting for daylight saving time
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

    // Market hours: 9:30 AM - 4:00 PM EST
    return totalMinutes >= 570 && totalMinutes <= 960;
  };

  // Stock fetching
  useEffect(() => {
    const savedStock = localStorage.getItem('lastStockData');
    if (savedStock) {
      try {
        setStock(JSON.parse(savedStock));
      } catch (e) {
        console.error('Error parsing saved stock data:', e);
        localStorage.removeItem('lastStockData');
      }
    }

    // Initialize stock data
    setStockLoading(true);

    // Do an immediate fetch
    fetchStock();

    // Clear any existing interval to prevent duplicates
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Create a new interval for stock updates
    intervalRef.current = setInterval(() => {
      console.log(
        'Stock update interval triggered at:',
        new Date().toLocaleTimeString()
      );
      fetchStock();
    }, 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Weather fetching
  useEffect(() => {
    const fetchWeather = async () => {
      if (!weather) setWeatherLoading(true);
      setWeatherError('');
      try {
        const res = await api.get(
          `/weather?location=${encodeURIComponent(location)}`
        );
        if (res.data.success) {
          setWeather(res.data.data);
        } else {
          throw new Error(res.data.message || 'Failed to fetch weather');
        }
      } catch (err) {
        console.error('Navbar Weather Fetch Error:', err);
        setWeatherError(
          err.response?.data?.message || err.message || 'Weather N/A'
        );
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
    const weatherIntervalId = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(weatherIntervalId);
  }, [location]);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center space-x-3 text-sm text-white drop-shadow">
      {/* Stock Display */}
      {stockLoading && !stock && (
        <span className="text-xs italic">Loading stock...</span>
      )}
      {stockError && (
        <div className="flex items-center space-x-1">
          {stock ? (
            <>
              <span className="text-gray-400">
                TSLA ${stock.price.toFixed(2)}
              </span>
              <span
                className="text-xs text-yellow-500"
                title="Using cached data - click to refresh"
              >
                (Cached)
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400" title={stockError}>
              Stock data unavailable
            </span>
          )}
          <button
            onClick={fetchStock}
            className="text-xs text-blue-400 hover:text-blue-300 ml-1"
            title="Refresh stock data"
          >
            ⟳
          </button>
        </div>
      )}
      {stock && (
        <div
          className="flex items-center space-x-1"
          title={`TSLA: $${stock.price.toFixed(2)}`}
        >
          {stock.change >= 0 ? (
            <TrendingUp size={16} className="text-green-400" />
          ) : (
            <TrendingDown size={16} className="text-red-400" />
          )}
          <span>TSLA ${stock.price.toFixed(2)}</span>
          <span
            className={stock.change >= 0 ? 'text-green-400' : 'text-red-400'}
          >
            {stock.change >= 0 ? '+' : ''}
            {stock.change.toFixed(2)} ({stock.changePercent})
          </span>
          <span
            className="text-xs ml-1"
            title={
              stock.lastUpdated
                ? `Last updated: ${new Date(
                    stock.lastUpdated
                  ).toLocaleString()}`
                : 'Current data'
            }
          >
            {stock.lastUpdated
              ? new Date(stock.lastUpdated).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Now'}
            {stock.lastUpdated &&
              Date.now() - new Date(stock.lastUpdated).getTime() > 120000 && (
                <span className="text-yellow-400 ml-1">⚠️</span>
              )}
            {stock.isFallback && (
              <span className="text-yellow-400 ml-1" title="Fallback data">
                ⚠️
              </span>
            )}
          </span>
        </div>
      )}

      <span className="text-gray-300">|</span>

      {/* Weather Display */}
      {weatherLoading && !weather && (
        <span className="text-xs italic">Loading weather...</span>
      )}
      {weatherError && (
        <span
          className="text-xs text-red-500 flex items-center"
          title={weatherError}
        >
          <AlertCircle size={14} className="mr-1" /> Weather N/A
        </span>
      )}
      {weather && (
        <div
          className="flex items-center space-x-1"
          title={`${weather.description} in ${weather.city}`}
        >
          {getWeatherIcon(weather.icon)}
          <span>{Math.round(weather.temp)}°C</span>
        </div>
      )}

      <span className="text-gray-300">|</span>

      <span>{formattedTime}</span>
    </div>
  );
};

export default NavbarClockStockWeather;
