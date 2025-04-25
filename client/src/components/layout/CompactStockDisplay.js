import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import useStockData from '../../hooks/useStockData';
import { getMarketStatusMessage } from '../../utils/marketUtils';

/**
 * A space-efficient stock display component for the navigation bar
 * Shows minimal information by default, with expandable detailed view
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
    return <span className="text-xs italic">Loading...</span>;
  }

  // Error state with minimal display
  if (error && !stock) {
    return (
      <span className="text-xs text-gray-400" title={error}>
        Stock N/A
      </span>
    );
  }

  // No stock data available
  if (!stock) {
    return null;
  }

  // Price with up/down indicator - compact display
  const priceDisplay = (
    <div className="flex items-center">
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
            onClick={fetchStock}
            disabled={
              isRefreshing ||
              apiCallsRemaining <= 0 ||
              cooldownRemaining > 0 ||
              !isMarketOpen()
            }
            className={`text-xs focus:outline-none ${
              isRefreshing || cooldownRemaining > 0 || !isMarketOpen()
                ? 'text-gray-500 cursor-not-allowed'
                : 'text-blue-400 hover:text-blue-300'
            } flex items-center`}
            title={
              !isMarketOpen()
                ? getMarketStatusMessage()
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
              <>
                <Clock size={14} />{' '}
                <span className="ml-1">{cooldownRemaining}m</span>
              </>
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
    </div>
  );
};

export default CompactStockDisplay;
