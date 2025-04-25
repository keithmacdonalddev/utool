import React from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Clock } from 'lucide-react';
import useStockData from '../../hooks/useStockData';

/**
 * Stock display component for the navigation bar
 * Shows stock price, change information, and refresh controls
 * Handles loading, error states, cooldown periods, and API limits
 *
 * @param {Object} props - Component props
 * @param {string} props.symbol - Stock symbol to display (default: 'TSLA')
 * @returns {JSX.Element} - Rendered stock component
 */
const StockDisplay = ({ symbol = 'TSLA' }) => {
  const {
    stock,
    loading,
    error,
    apiCallsRemaining,
    isRefreshing,
    cooldownRemaining,
    fetchStock,
    isMarketOpen,
  } = useStockData({ symbol });

  // Loading state when no stock data is available
  if (loading && !stock) {
    return <span className="text-xs italic">Loading stock...</span>;
  }

  // Error state with possible cached data
  if (error) {
    return (
      <div className="flex items-center space-x-1">
        {stock ? (
          <>
            <span className="text-gray-400">
              {symbol} ${stock.price.toFixed(2)}
            </span>
            <span
              className="text-xs text-yellow-500"
              title="Using cached data - click to refresh"
            >
              (Cached)
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400" title={error}>
            Stock data unavailable
          </span>
        )}
        <button
          onClick={fetchStock}
          disabled={
            isRefreshing ||
            apiCallsRemaining <= 0 ||
            cooldownRemaining > 0 ||
            !isMarketOpen()
          }
          className={`text-xs ${
            isRefreshing || cooldownRemaining > 0 || !isMarketOpen()
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-blue-400 hover:text-blue-300'
          } ml-1`}
          title={
            !isMarketOpen()
              ? 'Market is closed. Try during market hours (9:30 AM - 4:00 PM EST, weekdays).'
              : cooldownRemaining > 0
              ? `Cooldown: ${cooldownRemaining} minute${
                  cooldownRemaining !== 1 ? 's' : ''
                } remaining`
              : apiCallsRemaining > 0
              ? `Refresh stock data (${apiCallsRemaining}/25 calls remaining today)`
              : 'Daily API limit reached'
          }
        >
          {cooldownRemaining > 0 ? (
            <Clock size={14} />
          ) : (
            <RefreshCw
              size={14}
              className={isRefreshing ? 'animate-spin' : ''}
            />
          )}
        </button>
      </div>
    );
  }

  // Stock data available
  if (stock && !error) {
    return (
      <div
        className="flex items-center space-x-1"
        title={`${symbol}: $${stock.price.toFixed(
          2
        )} - ${apiCallsRemaining}/25 API calls remaining today${
          cooldownRemaining > 0
            ? ` - Cooldown: ${cooldownRemaining} min remaining`
            : ''
        }`}
      >
        {stock.change >= 0 ? (
          <TrendingUp size={16} className="text-green-400" />
        ) : (
          <TrendingDown size={16} className="text-red-400" />
        )}
        <span>
          {symbol} ${stock.price.toFixed(2)}
        </span>
        <span className={stock.change >= 0 ? 'text-green-400' : 'text-red-400'}>
          {stock.change >= 0 ? '+' : ''}
          {stock.change.toFixed(2)} ({stock.changePercent})
        </span>
        <span
          className="text-xs ml-1"
          title={
            stock.lastUpdated
              ? `Last updated: ${new Date(stock.lastUpdated).toLocaleString()}`
              : 'Current data'
          }
        >
          {stock.lastUpdated
            ? new Date(stock.lastUpdated).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Now'}
        </span>
        <button
          onClick={fetchStock}
          disabled={
            isRefreshing ||
            apiCallsRemaining <= 0 ||
            cooldownRemaining > 0 ||
            !isMarketOpen()
          }
          className={`focus:outline-none focus:ring-0 ${
            isRefreshing || cooldownRemaining > 0 || !isMarketOpen()
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-blue-400 hover:text-blue-300'
          } ml-0.5`}
          title={
            !isMarketOpen()
              ? 'Market is closed. Try during market hours (9:30 AM - 4:00 PM EST, weekdays).'
              : cooldownRemaining > 0
              ? `Cooldown: ${cooldownRemaining} minute${
                  cooldownRemaining !== 1 ? 's' : ''
                } remaining`
              : apiCallsRemaining > 0
              ? `Refresh stock data (${apiCallsRemaining}/25 calls remaining today)`
              : 'Daily API limit reached'
          }
        >
          {cooldownRemaining > 0 ? (
            <Clock size={14} />
          ) : (
            <RefreshCw
              size={14}
              className={`${isRefreshing ? 'animate-spin' : ''}`}
            />
          )}
        </button>
        <span className="text-xs text-gray-400 ml-0.5">
          ({apiCallsRemaining}/25)
        </span>
      </div>
    );
  }

  return null;
};

export default StockDisplay;
