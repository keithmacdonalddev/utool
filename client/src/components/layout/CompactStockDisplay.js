import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import useStockData from '../../hooks/useStockData';
import { getMarketStatusMessage } from '../../utils/marketUtils';
import { useSelector } from 'react-redux';

/**
 * A space-efficient stock display component for the navigation bar
 * Shows minimal information by default, with expandable detailed view
 * Includes admin override functionality for cooldown periods
 *
 * This component addresses the UI space concern by showing only the essential
 * information (symbol and price) by default, while allowing users to
 * access detailed information on demand.
 *
 * @param {Object} props - Component props
 * @param {string} props.symbol - Stock symbol to display (default: 'TSLA')
 * @returns {JSX.Element} - Rendered compact stock component
 */
const CompactStockDisplay = ({ symbol = 'TSLA' }) => {
  const [expanded, setExpanded] = useState(false);
  // State for admin override confirmation dialog
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

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

  // Get the current user to check if they're an admin
  const authState = useSelector((state) => state.auth);
  // Check for admin role (handle both "Admin" and "admin" formats)
  const isAdmin =
    authState.user &&
    (authState.user.role === 'Admin' || authState.user.role === 'admin');

  // Debug logging for admin status
  useEffect(() => {
    console.log('CompactStockDisplay Admin Debug:', {
      userRole: authState.user?.role,
      isAdmin,
      cooldownRemaining,
    });
  }, [authState, cooldownRemaining, isAdmin]);

  /**
   * Handle refresh button click with admin override capability
   * For admins in cooldown, show confirmation dialog
   * For regular users or admins not in cooldown, fetch normally
   */
  const handleRefreshClick = useCallback(() => {
    console.log('Stock refresh clicked, isAdmin:', isAdmin);

    // If not in cooldown or not an admin, proceed normally
    if (cooldownRemaining === 0 || !isAdmin) {
      fetchStock();
      return;
    }

    // Admin is in cooldown, show confirmation dialog
    console.log('Showing admin override confirmation');
    setShowOverrideConfirm(true);
  }, [cooldownRemaining, isAdmin, fetchStock]);

  /**
   * Handle admin override confirmation
   * @param {boolean} confirmed - Whether admin confirmed the override
   */
  const handleOverrideConfirm = useCallback(
    (confirmed) => {
      console.log('Admin override confirmed:', confirmed);
      setShowOverrideConfirm(false);
      if (confirmed) {
        fetchStock(true); // Pass true to use admin override
      }
    },
    [fetchStock]
  );

  // Debug logging to help troubleshoot - limit to development environment and only when values change
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('CompactStockDisplay rendering with:', {
        stock: stock ? { price: stock.price, change: stock.change } : null,
        loading,
        error: error ? 'Error present' : '',
        apiCallsRemaining,
        isMarketOpen: isMarketOpen(),
      });
    }
  }, [stock, loading, error, apiCallsRemaining, isMarketOpen]);

  // Loading state when no stock data is available
  if (loading && !stock) {
    return (
      <span className="text-xs italic bg-blue-900 px-2 py-1 rounded">
        Loading Stock...
      </span>
    );
  }

  // Error state with minimal display
  if (error && !stock) {
    return (
      <span
        className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded"
        title={error}
      >
        Stock Error: {error.substring(0, 15)}...
      </span>
    );
  }

  // No stock data available
  if (!stock) {
    return (
      <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded">
        No Stock Data
      </span>
    );
  }

  // Price with up/down indicator - compact display
  const priceDisplay = (
    <div className="flex items-center bg-gray-800/50 px-2 py-1 rounded">
      {stock.change >= 0 ? (
        <TrendingUp size={14} className="text-green-400 mr-1" />
      ) : (
        <TrendingDown size={14} className="text-red-400 mr-1" />
      )}
      <span>
        {symbol} ${stock.price.toFixed(2)}
      </span>

      {/* Toggle expand/collapse button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="ml-1 focus:outline-none text-gray-400 hover:text-white"
        aria-label={expanded ? 'Show less stock info' : 'Show more stock info'}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    </div>
  );

  // If not expanded, just show the minimal display
  if (!expanded) {
    return <div className="relative">{priceDisplay}</div>;
  }

  // Expanded details view
  return (
    <div className="relative">
      {priceDisplay}

      <div className="absolute top-full mt-1 right-0 bg-gray-800 rounded p-2 shadow-lg z-10 text-xs min-w-[200px]">
        <div className="flex items-center space-x-2">
          <span
            className={stock.change >= 0 ? 'text-green-400' : 'text-red-400'}
          >
            {stock.change >= 0 ? '+' : ''}
            {stock.change.toFixed(2)} ({stock.changePercent})
          </span>
        </div>

        <div className="mt-1 text-gray-400">
          Last updated:{' '}
          {new Date(stock.lastUpdated).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span>API calls: {apiCallsRemaining}/25</span>

          <button
            onClick={handleRefreshClick}
            disabled={
              isRefreshing ||
              apiCallsRemaining <= 0 ||
              (!isAdmin && cooldownRemaining > 0) ||
              !isMarketOpen()
            }
            className={`text-xs focus:outline-none ${
              isRefreshing ||
              (!isAdmin && cooldownRemaining > 0) ||
              !isMarketOpen()
                ? 'text-gray-500 cursor-not-allowed'
                : cooldownRemaining > 0 && isAdmin
                ? 'text-yellow-400 hover:text-yellow-300' // Special styling for admin override
                : 'text-blue-400 hover:text-blue-300'
            } flex items-center`}
            title={
              !isMarketOpen()
                ? getMarketStatusMessage()
                : cooldownRemaining > 0
                ? isAdmin
                  ? `Admin Override Available: ${cooldownRemaining}m cooldown`
                  : `Cooldown: ${cooldownRemaining} minute${
                      cooldownRemaining !== 1 ? 's' : ''
                    } remaining`
                : apiCallsRemaining > 0
                ? `Refresh stock data (${apiCallsRemaining}/25 calls remaining today)`
                : 'Daily API limit reached'
            }
          >
            {cooldownRemaining > 0 && !isAdmin ? (
              <>
                <Clock size={14} />{' '}
                <span className="ml-1">{cooldownRemaining}m</span>
              </>
            ) : cooldownRemaining > 0 && isAdmin ? (
              <ShieldAlert size={14} className="text-yellow-400" /> // Admin override icon
            ) : (
              <RefreshCw
                size={14}
                className={isRefreshing ? 'animate-spin' : ''}
              />
            )}
          </button>
        </div>

        {!isMarketOpen() && (
          <div className="mt-1 text-yellow-500 text-xs">
            {getMarketStatusMessage()}
          </div>
        )}
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
    </div>
  );
};

export default memo(CompactStockDisplay);
