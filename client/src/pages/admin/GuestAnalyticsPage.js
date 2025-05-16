import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import api from '../../utils/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register the chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Error types for more specific handling
 */
const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  SERVER: 'server',
  TIMEOUT: 'timeout',
  DATA_FORMAT: 'data_format',
  UNKNOWN: 'unknown',
};

/**
 * Admin dashboard for viewing guest usage analytics
 * Displays metrics and charts about guest user behavior
 */
const GuestAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/analytics/guest-summary', {
        timeout: 30000, // 30 second timeout for analytics which might be intensive
      });

      // More defensive checks for nested properties
      if (response?.data?.data) {
        setAnalytics(response.data.data);
      } else {
        console.warn('Unexpected response format:', response);
        setError({
          type: ERROR_TYPES.DATA_FORMAT,
          message: 'Invalid response format from server',
          details: 'The server returned data in an unexpected format',
        });
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);

      // Determine error type for more specific handling
      let errorType = ERROR_TYPES.UNKNOWN;
      let errorMessage = 'An unexpected error occurred';
      let errorDetails = err.message || 'No additional details available';

      if (!navigator.onLine) {
        errorType = ERROR_TYPES.NETWORK;
        errorMessage = 'Network connection unavailable';
      } else if (
        err.code === 'ECONNABORTED' ||
        err.message?.includes('timeout')
      ) {
        errorType = ERROR_TYPES.TIMEOUT;
        errorMessage = 'Request timed out while loading analytics data';
      } else if (err.response) {
        // Server responded with error
        const status = err.response.status;

        if (status === 401 || status === 403) {
          errorType = ERROR_TYPES.AUTH;
          errorMessage = 'You do not have permission to view analytics data';
        } else if (status >= 500) {
          errorType = ERROR_TYPES.SERVER;
          errorMessage = 'Analytics server is currently unavailable';
        }

        // Include server error message if available
        if (err.response.data?.message) {
          errorDetails = err.response.data.message;
        }
      }

      setError({
        type: errorType,
        message: errorMessage,
        details: errorDetails,
        raw: err,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Render error message with appropriate styling based on error type
  const renderError = () => {
    if (!error) return null;

    // Different variant depending on error type
    let bgColor = 'bg-red-100 border-red-500 text-red-700'; // default danger
    let icon = '⚠️';
    let actionButton = null;

    switch (error.type) {
      case ERROR_TYPES.NETWORK:
        bgColor = 'bg-yellow-100 border-yellow-500 text-yellow-700'; // warning
        icon = '📶';
        actionButton = (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        );
        break;
      case ERROR_TYPES.TIMEOUT:
        bgColor = 'bg-yellow-100 border-yellow-500 text-yellow-700'; // warning
        icon = '⏱️';
        break;
      case ERROR_TYPES.AUTH:
        bgColor = 'bg-blue-100 border-blue-500 text-blue-700'; // info
        icon = '🔒';
        break;
      case ERROR_TYPES.DATA_FORMAT:
        bgColor = 'bg-gray-100 border-gray-500 text-gray-700'; // secondary
        icon = '📊';
        break;
      default:
        bgColor = 'bg-red-100 border-red-500 text-red-700'; // danger
    }

    return (
      <div className={`border-l-4 p-4 mb-4 rounded ${bgColor}`}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold">
            {icon} {error.message}
          </h4>
        </div>
        <p className="mb-0">{error.details}</p>
        {actionButton && <div className="mt-2">{actionButton}</div>}
        <div className="flex justify-end mt-3">
          <button
            onClick={fetchAnalytics}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="flex justify-center items-center p-5">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="sr-only">Loading analytics data...</span>
      </div>
    );

  if (error) return renderError();
  if (!analytics)
    return (
      <div className="bg-blue-100 text-blue-700 p-4 rounded">
        No analytics data available
      </div>
    );

  // Format data for charts
  const sessionData = {
    labels: analytics.sessionsByDate.map(
      (item) => `${item._id.month}/${item._id.day}/${item._id.year}`
    ),
    datasets: [
      {
        label: 'Guest Sessions',
        data: analytics.sessionsByDate.map((item) => item.count),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const pagesData = {
    labels: analytics.topPages.map((item) => {
      // Truncate long URLs
      const path = item._id;
      return path.length > 30 ? path.substring(0, 27) + '...' : path;
    }),
    datasets: [
      {
        label: 'Page Views',
        data: analytics.topPages.map((item) => item.count),
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="guest-analytics-page">
      <h1 className="text-2xl font-bold mb-6">Guest Usage Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="col-span-1">
          <div className="bg-white shadow rounded-lg p-4 text-center">
            <h2 className="text-lg font-semibold text-gray-700">
              Total Guest Sessions
            </h2>
            <p className="text-3xl font-bold">{analytics.totalSessions}</p>
          </div>
        </div>
        <div className="col-span-1">
          <div className="bg-white shadow rounded-lg p-4 text-center">
            <h2 className="text-lg font-semibold text-gray-700">
              Avg. Session Duration
            </h2>
            <p className="text-3xl font-bold">
              {(analytics.avgDuration / 1000 / 60).toFixed(2)} mins
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Guest Sessions (Last 30 Days)
          </h2>
          <div className="h-[300px]">
            <Line
              data={sessionData}
              options={{
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Most Viewed Pages
          </h2>
          <div className="h-[300px]">
            <Bar
              data={pagesData}
              options={{
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Top Write Operation Attempts
        </h2>
        {analytics.topWriteAttempts && analytics.topWriteAttempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">Feature</th>
                  <th className="py-2 px-4 border-b text-left">
                    Number of Attempts
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.topWriteAttempts.map((item, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="py-2 px-4 border-b">{item._id}</td>
                    <td className="py-2 px-4 border-b">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No write attempts recorded</p>
        )}
      </div>
    </div>
  );
};

export default GuestAnalyticsPage;
