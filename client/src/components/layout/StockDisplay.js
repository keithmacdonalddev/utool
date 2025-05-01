import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import useStockData from '../../hooks/useStockData';
import { useSelector } from 'react-redux';

/**
 * Stock display component for the navigation bar
 * Shows stock price, change information, and refresh controls
 * Handles loading, error states, cooldown periods, and API limits
 * Includes admin override functionality for cooldown periods
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

  // Get the current user to check if they're an admin - ensure we're looking at the correct property
  const authState = useSelector((state) => state.auth);
  // More robust admin detection - handle both potential formats ("Admin" or "admin")
  const isAdmin =
    authState.user &&
    (authState.user.role === 'Admin' || authState.user.role === 'admin');

  // State for admin override confirmation dialog
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

  // Debug logging to help troubleshoot admin override functionality
  useEffect(() => {
    console.log('===== Stock Admin Override Debug =====');
    console.log('Auth state:', authState);
    console.log('Current user:', authState.user);
    console.log('User role:', authState.user?.role);
    console.log('Is admin detected:', isAdmin);
    console.log('Cooldown remaining:', cooldownRemaining);
    console.log(
      'Admin override button should be active:',
      isAdmin && cooldownRemaining > 0
    );
    console.log('=====================================');
  }, [authState, isAdmin, cooldownRemaining]);

  /**
   * Handle refresh button click
   * For admins in cooldown, show confirmation dialog
   * For regular users or admins not in cooldown, fetch normally
   */
  const handleRefreshClick = () => {
    // Log the click event for debugging
    console.log('Refresh button clicked');
    console.log('Current user role:', authState.user?.role);
    console.log('isAdmin:', isAdmin);
    console.log('cooldownRemaining:', cooldownRemaining);

    // If not in cooldown or not an admin, just refresh normally
    if (cooldownRemaining === 0 || !isAdmin) {
      console.log('Regular refresh flow - no override');
      fetchStock();
      return;
    }

    // Admin is in cooldown, show confirmation dialog
    console.log('Admin override flow - showing confirmation dialog');
    setShowOverrideConfirm(true);
  };

  /**
   * Handle admin override confirmation
   * @param {boolean} confirmed - Whether admin confirmed the override
   */
  const handleOverrideConfirm = (confirmed) => {
    console.log('Admin override confirmation:', confirmed);
    setShowOverrideConfirm(false);
    if (confirmed) {
      console.log('Executing admin override fetch');
      fetchStock(true); // Pass true to use admin override
    }
  };

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
          onClick={handleRefreshClick}
          disabled={
            isRefreshing ||
            apiCallsRemaining <= 0 ||
            (!isAdmin && cooldownRemaining > 0) ||
            !isMarketOpen()
          }
          className={`text-xs ${
            isRefreshing ||
            (!isAdmin && cooldownRemaining > 0) ||
            !isMarketOpen()
              ? 'text-gray-500 cursor-not-allowed'
              : cooldownRemaining > 0 && isAdmin
              ? 'text-yellow-400 hover:text-yellow-300' // Admin override style
              : 'text-blue-400 hover:text-blue-300'
          } ml-1`}
          title={
            !isMarketOpen()
              ? 'Market is closed. Try during market hours (9:30 AM - 4:00 PM EST, weekdays).'
              : cooldownRemaining > 0
              ? isAdmin
                ? `Admin Override Available: ${cooldownRemaining} min cooldown`
                : `Cooldown: ${cooldownRemaining} minute${
                    cooldownRemaining !== 1 ? 's' : ''
                  } remaining`
              : apiCallsRemaining > 0
              ? `Refresh stock data (${apiCallsRemaining}/25 calls remaining today)`
              : 'Daily API limit reached'
          }
        >
          {cooldownRemaining > 0 && !isAdmin ? (
            <Clock size={14} />
          ) : cooldownRemaining > 0 && isAdmin ? (
            <ShieldAlert size={14} className="text-yellow-400" /> // Special icon for admin override
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
      <>
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
          </span>
          <button
            onClick={handleRefreshClick}
            disabled={
              isRefreshing ||
              apiCallsRemaining <= 0 ||
              (!isAdmin && cooldownRemaining > 0) ||
              !isMarketOpen()
            }
            className={`focus:outline-none focus:ring-0 ${
              isRefreshing ||
              (!isAdmin && cooldownRemaining > 0) ||
              !isMarketOpen()
                ? 'text-gray-500 cursor-not-allowed'
                : cooldownRemaining > 0 && isAdmin
                ? 'text-yellow-400 hover:text-yellow-300' // Special color for admin override
                : 'text-blue-400 hover:text-blue-300'
            } ml-0.5`}
            title={
              !isMarketOpen()
                ? 'Market is closed. Try during market hours (9:30 AM - 4:00 PM EST, weekdays).'
                : cooldownRemaining > 0
                ? isAdmin
                  ? `Admin Override Available: ${cooldownRemaining} min cooldown`
                  : `Cooldown: ${cooldownRemaining} minute${
                      cooldownRemaining !== 1 ? 's' : ''
                    } remaining`
                : apiCallsRemaining > 0
                ? `Refresh stock data (${apiCallsRemaining}/25 calls remaining today)`
                : 'Daily API limit reached'
            }
          >
            {cooldownRemaining > 0 && !isAdmin ? (
              <Clock size={14} />
            ) : cooldownRemaining > 0 && isAdmin ? (
              <ShieldAlert size={14} /> // Special icon for admin override
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

        {/* Admin Override Confirmation Dialog */}
        {showOverrideConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-dark-800 border border-dark-600 rounded-lg shadow-lg p-6 max-w-sm mx-auto">
              <h3 className="text-lg font-bold text-white mb-4">
                Admin Override
              </h3>
              <p className="mb-6 text-gray-300">
                Are you sure you want to override the {cooldownRemaining} minute
                cooldown period and refresh stock data now?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => handleOverrideConfirm(false)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOverrideConfirm(true)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition"
                >
                  Override
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export default StockDisplay;
