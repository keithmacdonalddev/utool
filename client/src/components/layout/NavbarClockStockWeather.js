import React, { useState, useEffect, memo } from 'react';
import api from '../../utils/api';
import { 
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, 
  AlertCircle, TrendingUp, TrendingDown 
} from 'lucide-react';

// Helper to map OpenWeatherMap icon codes to Lucide icons (simplified & smaller)
const getWeatherIcon = (iconCode) => {
    if (!iconCode) return <Sun size={16} className="text-yellow-500" />; // Default icon
    const main = iconCode.substring(0, 2);
    switch (main) {
        case '01': return <Sun size={16} className="text-yellow-500" />;
        case '02': return <Cloud size={16} className="text-gray-400" />;
        case '03': return <Cloud size={16} className="text-gray-500" />;
        case '04': return <Cloud size={16} className="text-gray-600" />;
        case '09': return <CloudRain size={16} className="text-blue-500" />;
        case '10': return <CloudRain size={16} className="text-blue-400" />;
        case '11': return <CloudLightning size={16} className="text-yellow-600" />;
        case '13': return <CloudSnow size={16} className="text-blue-300" />;
        case '50': return <Wind size={16} className="text-gray-400" />;
        default: return <Sun size={16} className="text-yellow-500" />;
    }
};

const NavbarClockStockWeather = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [stock, setStock] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState('');
  // TODO: Make location configurable or detect automatically
  const [location, setLocation] = useState('Halifax');

  // Effect for clock update
  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // Effect for stock fetching with local storage persistence
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await api.get('/stocks/TSLA');
        if (res.data.success) {
          const stockData = res.data.data;
          setStock(stockData);
          // Save to localStorage when we get fresh data
          localStorage.setItem('lastStockData', JSON.stringify(stockData));
        } else {
          throw new Error(res.data.message || 'Failed to fetch stock data');
        }
      } catch (err) {
        console.error("Stock Fetch Error:", err);
        setStockError(err.response?.data?.message || err.message || 'Stock N/A');
      } finally {
        setStockLoading(false);
      }
    };

    const isMarketOpen = () => {
      const now = new Date();
      const estHours = now.getUTCHours() - 5; // Convert to EST
      const estMinutes = now.getUTCMinutes();
      const totalMinutes = estHours * 60 + estMinutes;
      return totalMinutes >= 600 && totalMinutes <= 1050; // 10am-5:30pm EST
    };

    // Initialize with localStorage data if available
    const savedStock = localStorage.getItem('lastStockData');
    if (savedStock) {
      setStock(JSON.parse(savedStock));
    }

    // Make one-time API call to get initial price
    const initializeStockData = async () => {
      try {
        const res = await api.get('/stocks/TSLA');
        if (res.data.success) {
          const stockData = res.data.data;
          localStorage.setItem('lastStockData', JSON.stringify(stockData));
          setStock(stockData);
        }
      } catch (err) {
        console.error("Initial Stock Fetch Error:", err);
      }
    };

    setStockLoading(true);
    if (!savedStock) {
      initializeStockData();
    }

    if (isMarketOpen()) {
      fetchStock();
    } else {
      setStockLoading(false);
      setStockError('Market Closed');
    }

    // Set up interval that only runs during market hours
    const stockIntervalId = setInterval(() => {
      if (isMarketOpen()) {
        fetchStock();
      }
    }, 60 * 1000); // 1 minute interval

    return () => clearInterval(stockIntervalId);
  }, []);

  // Effect for weather fetching
  useEffect(() => {
    const fetchWeather = async () => {
        // Don't show loading state on subsequent fetches if we already have data
        if (!weather) {
            setWeatherLoading(true);
        }
        setWeatherError('');
        try {
            const res = await api.get(`/weather?location=${encodeURIComponent(location)}`);
            if (res.data.success) {
                setWeather(res.data.data);
            } else {
                throw new Error(res.data.message || 'Failed to fetch weather');
            }
        } catch (err) {
            console.error("Navbar Weather Fetch Error:", err);
            // Set error message but keep previous weather data if available
            setWeatherError(err.response?.data?.message || err.message || 'Weather N/A');
        } finally {
            setWeatherLoading(false);
        }
    };

    fetchWeather();
    // Fetch weather every 15 minutes
    const weatherIntervalId = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(weatherIntervalId); // Cleanup interval

  }, [location]); // Refetch if location changes

  // Format time
  const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    return (
    <div className="flex items-center space-x-3 text-sm text-white drop-shadow">
        {/* Stock Display */}
        {stockLoading && !stock && (
            <span className="text-xs italic">Loading stock...</span>
        )}
        {stockError && (
            <span className="text-xs text-red-500 flex items-center" title={stockError}>
                <AlertCircle size={14} className="mr-1" /> TSLA N/A
            </span>
        )}
        {stock && (
            <div className="flex items-center space-x-1" title={`TSLA: $${stock.price.toFixed(2)}`}>
                {stock.change >= 0 ? (
                    <TrendingUp size={16} className="text-green-400" />
                ) : (
                    <TrendingDown size={16} className="text-red-400" />
                )}
                <span>TSLA ${stock.price.toFixed(2)}</span>
                <span className={stock.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent})
                </span>
            </div>
        )}

        {/* Separator */}
        <span className="text-gray-300">|</span>

        {/* Weather Display */}
        {weatherLoading && !weather && ( // Show loading only initially
             <span className="text-xs italic">Loading weather...</span>
        )}
        {weatherError && (
             <span className="text-xs text-red-500 flex items-center" title={weatherError}>
                 <AlertCircle size={14} className="mr-1" /> Weather N/A
             </span>
        )}
        {weather && (
            <div className="flex items-center space-x-1" title={`${weather.description} in ${weather.city}`}>
                {getWeatherIcon(weather.icon)}
                <span>{Math.round(weather.temp)}°C</span>
            </div>
        )}

        {/* Separator */}
        <span className="text-gray-300">|</span>

        {/* Time Display */}
        <span>{formattedTime}</span>
    </div>
  );
});

export default NavbarClockStockWeather;
