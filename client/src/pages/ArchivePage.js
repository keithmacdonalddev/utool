// ArchivePage.js - A React page component that displays archived items and productivity metrics
//
// KEY CONCEPTS:
// 1. Archive Display: Shows completed tasks, projects, notes, etc. in a unified archive
// 2. Productivity Analysis: Provides metrics and visualizations for productivity tracking
// 3. Filtering: Allows filtering by time period, item type, and
// 4. Data Comparison: Enables comparison between different time periods

import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Calendar,
  Clock,
  Filter,
  BarChart2,
  ChevronDown,
  ChevronUp,
  List,
  Grid,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import api from '../utils/api';
import { useNotifications } from '../context/NotificationContext';

/**
 * ArchivePage Component
 *
 * This page shows archived items and productivity metrics allowing users to:
 * - View their completed tasks, projects, notes, etc.
 * - Restore items from the archive back to their original collections
 * - Track their productivity over time with visualizations
 * - Filter and search archived items
 * - Compare productivity between different time periods
 */
const ArchivePage = () => {
  // State for archived items and metrics
  const [archivedItems, setArchivedItems] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Add state for tracking restoration in progress
  const [restoringItems, setRestoringItems] = useState({});

  // Navigation hook for the back button
  const navigate = useNavigate();

  // State for filters
  const [filters, setFilters] = useState({
    itemType: 'all',
    period: 'today', // Set 'today' as the default period
    startDate: new Date().toISOString().split('T')[0], // Default to today
    endDate: new Date().toISOString().split('T')[0], // Default to today
    project: null,
  });

  // State for UI display options
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [sortOption, setSortOption] = useState('newest'); // 'newest', 'oldest', etc.
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('archive'); // 'archive' or 'metrics'
  const [selectedTimeframe, setSelectedTimeframe] = useState('month'); // day, week, month, year
  const [customDateRange, setCustomDateRange] = useState(false); // Track if custom date range is active

  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonPeriods, setComparisonPeriods] = useState({
    period1: {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
        .toISOString()
        .split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
    period2: {
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 2))
        .toISOString()
        .split('T')[0],
      endDate: new Date(new Date().setMonth(new Date().getMonth() - 1))
        .toISOString()
        .split('T')[0],
    },
  });

  const { showNotification } = useNotifications();

  // User data from Redux store
  const { user } = useSelector((state) => state.auth);

  /**
   * Restore an archived item back to its original collection
   * @param {string} itemId - The ID of the archived item
   * @param {string} itemType - The type of the archived item (task, project, etc.)
   */
  const handleRestoreItem = async (itemId, itemType) => {
    try {
      // Mark this item as being restored
      setRestoringItems((prev) => ({ ...prev, [itemId]: true }));

      // Call the API to restore the item
      await api.post(`/archive/restore/${itemId}`);

      // Show success notification
      showNotification(
        `${
          itemType.charAt(0).toUpperCase() + itemType.slice(1)
        } restored successfully`,
        'success'
      );

      // Remove the restored item from the archived items list
      setArchivedItems(archivedItems.filter((item) => item._id !== itemId));

      // If we're looking at metrics, refresh them since we've changed the data
      if (activeTab === 'metrics') {
        fetchProductivityMetrics();
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || `Error restoring ${itemType}`,
        'error'
      );
    } finally {
      // Remove the restoring flag
      setRestoringItems((prev) => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    }
  };

  // Fetch archived items
  const fetchArchivedItems = async () => {
    try {
      console.group('Archive Fetch Operation');
      console.log('Starting fetch operation with state:', {
        filterPeriod: filters.period,
        startDate: filters.startDate,
        endDate: filters.endDate,
        itemType: filters.itemType,
        loading: loading,
      });

      setLoading(true);

      // Build query parameters based on filters
      const params = new URLSearchParams();
      if (filters.itemType && filters.itemType !== 'all')
        params.append('itemType', filters.itemType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.project) params.append('project', filters.project);

      // Sort option
      if (sortOption === 'newest') params.append('sort', '-completedAt');
      else if (sortOption === 'oldest') params.append('sort', 'completedAt');

      // Add a unique timestamp to prevent caching issues
      const timestamp = Date.now();
      params.append('_t', timestamp);

      console.log('Request details:', {
        url: `/archive?${params.toString()}`,
        params: Object.fromEntries(params),
        timestamp,
      });

      // Fix the URL path by removing the duplicate /api/v1/ prefix
      const response = await api.get(`/archive?${params.toString()}`);

      console.log(`Retrieved ${response.data.data.length} archived items:`, {
        items: response.data.data.map((item) => ({
          id: item._id,
          title: item.title,
          completedAt: item.completedAt,
          itemType: item.itemType,
        })),
      });

      setArchivedItems(response.data.data);
      setError(null);
      console.log('Archive state updated successfully');
    } catch (err) {
      console.error('Error fetching archive items:', err);
      setError(err.response?.data?.message || 'Failed to fetch archived items');
      showNotification('Error loading archive data', 'error');
    } finally {
      setLoading(false);
      console.log('Loading state set to false');
      console.groupEnd();
    }
  };

  // Fetch productivity metrics
  const fetchProductivityMetrics = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('period', selectedTimeframe);
      if (filters.project) params.append('project', filters.project);

      // Fix the URL path by removing the duplicate /api/v1/ prefix
      const response = await api.get(`/archive/metrics?${params.toString()}`);
      setMetrics(response.data.data);
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to fetch productivity metrics'
      );
      showNotification('Error loading productivity metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Compare productivity between time periods
  const fetchComparisonData = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('period1Start', comparisonPeriods.period1.startDate);
      params.append('period1End', comparisonPeriods.period1.endDate);
      params.append('period2Start', comparisonPeriods.period2.startDate);
      params.append('period2End', comparisonPeriods.period2.endDate);

      // Fix the URL path by removing the duplicate /api/v1/ prefix
      const response = await api.get(`/archive/compare?${params.toString()}`);
      setComparisonData(response.data.data);
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to fetch comparison data'
      );
      showNotification('Error comparing time periods', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper function to set date filters based on predefined periods
   * @param {string} period - The predefined period ('today', 'thisWeek', 'lastWeek', etc.)
   */
  const setDateFilterByPeriod = (period) => {
    console.group('Date Filter Change');
    console.log(`Filter changing from "${filters.period}" to "${period}"`);

    // Create a new Date object for calculations
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    // Reset time to start of day for consistent date ranges
    today.setHours(0, 0, 0, 0);

    switch (period) {
      case 'today':
        // Start and end are both today
        startDate = today;
        endDate = new Date(today);
        // End of day for the end date
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'thisWeek':
        // Start is the first day of current week (Sunday)
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        // End is current day, end of day
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'lastWeek':
        // Start is the first day of last week
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() - 7);
        // End is the last day of last week (Saturday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'thisMonth':
        // Start is the first day of current month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        // End is current day, end of day
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'lastMonth':
        // Start is the first day of last month
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        // End is the last day of last month
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'thisYear':
        // Start is the first day of current year
        startDate = new Date(today.getFullYear(), 0, 1);
        // End is current day, end of day
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'custom':
        // Keep existing date range, just mark it as custom
        setCustomDateRange(true);
        console.groupEnd();
        return;

      default:
        // Default to today if period is unknown
        startDate = today;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    // Format dates as ISO strings (YYYY-MM-DD)
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];

    console.log(`New date range: ${formattedStartDate} to ${formattedEndDate}`);

    // Create new filters object (don't modify the old one)
    const newFilters = {
      ...filters,
      period,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    };

    // Turn off custom date range mode
    setCustomDateRange(false);

    // Update state with new filters
    setFilters(newFilters);

    // Explicitly force a fetch with the new filters
    // This is the key part - we directly trigger a fetch instead of relying on effect dependencies
    setTimeout(() => {
      console.log('Triggering explicit data fetch with new filters');
      fetchArchivedItemsWithFilters(newFilters);
      console.groupEnd();
    }, 0);
  };

  /**
   * Explicitly fetch archived items with the given filters
   * This function allows us to bypass React's state update batching
   * @param {Object} filterParams - The filter parameters to use
   */
  const fetchArchivedItemsWithFilters = (filterParams) => {
    try {
      console.group('Explicit Archive Fetch');
      console.log('Fetching with explicit filters:', filterParams);

      setLoading(true);

      // Build query parameters based on provided filters
      const params = new URLSearchParams();
      if (filterParams.itemType && filterParams.itemType !== 'all')
        params.append('itemType', filterParams.itemType);
      if (filterParams.startDate)
        params.append('startDate', filterParams.startDate);
      if (filterParams.endDate) params.append('endDate', filterParams.endDate);
      if (filterParams.project) params.append('project', filterParams.project);

      // Sort option
      if (sortOption === 'newest') params.append('sort', '-completedAt');
      else if (sortOption === 'oldest') params.append('sort', 'completedAt');

      // Add a unique timestamp to prevent caching issues
      const timestamp = Date.now();
      params.append('_t', timestamp);

      console.log('Explicit request details:', {
        url: `/archive?${params.toString()}`,
        params: Object.fromEntries(params),
        timestamp,
      });

      // Make the API request
      api
        .get(`/archive?${params.toString()}`)
        .then((response) => {
          console.log(
            `Retrieved ${response.data.data.length} items in explicit fetch`
          );
          // Important: Update the state with the fetched data
          setArchivedItems(response.data.data);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error in explicit fetch:', err);
          setError(
            err.response?.data?.message || 'Failed to fetch archived items'
          );
          showNotification('Error loading archive data', 'error');
          setLoading(false);
        })
        .finally(() => {
          console.groupEnd();
        });
    } catch (err) {
      console.error('Exception in explicit fetch:', err);
      setLoading(false);
      console.groupEnd();
    }
  };

  // Fetch archive data when filters change - now just used as a backup
  // Our explicit fetch method is the primary way we load data
  useEffect(() => {
    console.log('Filter effect triggered');
    if (activeTab === 'archive') {
      // The direct fetch calls will handle most cases, but this is a safety net
      fetchArchivedItems();
    } else if (activeTab === 'metrics') {
      fetchProductivityMetrics();
    }
  }, [filters, activeTab, selectedTimeframe]); // Removed sortOption to prevent server calls when only sorting changes

  // Fetch comparison data when in comparison mode and periods change
  useEffect(() => {
    if (comparisonMode) {
      fetchComparisonData();
    }
  }, [comparisonMode, comparisonPeriods]);

  // Set default date filter on initial load
  useEffect(() => {
    setDateFilterByPeriod('today');
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get item icon based on type
  const getItemIcon = (itemType) => {
    switch (itemType) {
      case 'task':
        return (
          <div className="bg-blue-500 p-2 rounded">
            <List size={16} className="text-white" />
          </div>
        );
      case 'project':
        return (
          <div className="bg-green-500 p-2 rounded">
            <Grid size={16} className="text-white" />
          </div>
        );
      case 'note':
        return (
          <div className="bg-yellow-500 p-2 rounded">
            <span className="text-white">📝</span>
          </div>
        );
      case 'bookmark':
        return (
          <div className="bg-purple-500 p-2 rounded">
            <span className="text-white">🔖</span>
          </div>
        );
      case 'snippet':
        return (
          <div className="bg-teal-500 p-2 rounded">
            <span className="text-white">{`</>`}</span>
          </div>
        );
      default:
        return (
          <div className="bg-gray-500 p-2 rounded">
            <span className="text-white">❓</span>
          </div>
        );
    }
  };

  // Format time duration for display (ms to readable format)
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Prepare data for the charts
  const chartData = useMemo(() => {
    if (!metrics) return [];

    // Extract data based on the selected timeframe
    switch (selectedTimeframe) {
      case 'day':
        return Object.entries(metrics.hourlyBreakdown || {}).map(
          ([hour, count]) => ({
            name: `${hour}:00`,
            value: count,
          })
        );
      case 'week':
        return Object.entries(metrics.dayOfWeekBreakdown || {}).map(
          ([day, count]) => ({
            name: day.substring(0, 3), // Abbreviate day names
            value: count,
          })
        );
      case 'month':
        return Object.entries(metrics.dayOfMonthBreakdown || {}).map(
          ([day, count]) => ({
            name: day,
            value: count,
          })
        );
      case 'year':
        return Object.entries(metrics.monthlyBreakdown || {}).map(
          ([month, count]) => ({
            name: month.substring(0, 3), // Abbreviate month names
            value: count,
          })
        );
      default:
        return [];
    }
  }, [metrics, selectedTimeframe]);

  // Prepare data for the pie chart (item distribution by type)
  const pieChartData = useMemo(() => {
    if (!metrics || !metrics.itemsByType) return [];

    return Object.entries(metrics.itemsByType).map(([type, count]) => ({
      name: type,
      value: count,
    }));
  }, [metrics]);

  /**
   * Sort archived items client-side based on the current sortOption
   * This prevents unnecessary server calls when changing sort order
   * @returns {Array} Sorted copy of the archived items
   */
  const sortedArchivedItems = useMemo(() => {
    if (!archivedItems.length) return [];
    
    // Create a copy to avoid mutating the original state
    const itemsCopy = [...archivedItems];
    
    // Sort based on the current sort option
    return itemsCopy.sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.completedAt) - new Date(a.completedAt);
      } else {
        return new Date(a.completedAt) - new Date(b.completedAt);
      }
    });
  }, [archivedItems, sortOption]);

  return (
    <div className="container mx-auto p-4 bg-background text-foreground">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 p-2 rounded-full hover:bg-dark-700 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-primary" />
            </button>
            <h1 className="text-3xl font-bold text-primary">Archive</h1>
          </div>
          <div className="flex-grow text-center">
            <p className="text-muted-foreground">
              Your completed items and productivity metrics
            </p>
          </div>
          {/* Empty div to balance the layout */}
          <div className="invisible" style={{ width: '140px' }}></div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex border-b border-dark-700">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'archive'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('archive')}
        >
          Archived Items
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'metrics'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('metrics')}
        >
          Productivity Metrics
        </button>
      </div>

      {/* Action Bar with Filters and View Options */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-card hover:bg-dark-700 text-foreground px-4 py-2 rounded-md transition-colors"
          >
            <Filter size={18} />
            Filters
            {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* Active Filters Display - Now shown regardless of filter panel state */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active filters:</span>

            {/* Date filter pill */}
            <div className="bg-dark-800 text-foreground px-3 py-1 rounded-full flex items-center">
              <Calendar size={14} className="mr-1" />
              {filters.period === 'today' && 'Today'}
              {filters.period === 'thisWeek' && 'This Week'}
              {filters.period === 'lastWeek' && 'Last Week'}
              {filters.period === 'thisMonth' && 'This Month'}
              {filters.period === 'lastMonth' && 'Last Month'}
              {filters.period === 'thisYear' && 'This Year'}
              {filters.period === 'custom' &&
                `${formatDate(filters.startDate)} - ${formatDate(
                  filters.endDate
                )}`}
            </div>

            {/* Item type filter pill - only show if not "all" */}
            {filters.itemType !== 'all' && (
              <div className="bg-dark-800 text-foreground px-3 py-1 rounded-full flex items-center">
                {filters.itemType === 'task' && (
                  <List size={14} className="mr-1" />
                )}
                {filters.itemType === 'project' && (
                  <Grid size={14} className="mr-1" />
                )}
                <span className="capitalize">{filters.itemType}s</span>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'archive' && (
          <div className="flex gap-2">
            <select
              className="bg-card border border-dark-700 text-foreground rounded-md px-3 py-2"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            <div className="flex border border-dark-700 rounded-md overflow-hidden">
              <button
                className={`px-3 py-2 ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-dark-700'
                }`}
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </button>
              <button
                className={`px-3 py-2 ${
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-dark-700'
                }`}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={18} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="flex gap-2">
            <select
              className="bg-card border border-dark-700 text-foreground rounded-md px-3 py-2"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>

            <button
              className={`px-4 py-2 rounded-md ${
                comparisonMode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-dark-700'
              }`}
              onClick={() => setComparisonMode(!comparisonMode)}
            >
              {comparisonMode ? 'Hide Comparison' : 'Compare Periods'}
            </button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card p-4 mb-6 rounded-md border border-dark-700">
          <h3 className="font-medium text-lg mb-3">Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Item Type</label>
              <select
                className="w-full bg-card border border-dark-700 rounded-md px-3 py-2"
                value={filters.itemType}
                onChange={(e) =>
                  setFilters({ ...filters, itemType: e.target.value })
                }
              >
                <option value="all">All Types</option>
                <option value="task">Tasks</option>
                <option value="project">Projects</option>
                <option value="note">Notes</option>
                <option value="bookmark">Bookmarks</option>
                <option value="snippet">Snippets</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Date Range</label>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => setDateFilterByPeriod('today')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.period === 'today'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-dark-700 text-foreground hover:bg-dark-600'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilterByPeriod('thisWeek')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.period === 'thisWeek'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-dark-700 text-foreground hover:bg-dark-600'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setDateFilterByPeriod('lastWeek')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.period === 'lastWeek'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-dark-700 text-foreground hover:bg-dark-600'
                  }`}
                >
                  Last Week
                </button>
                <button
                  onClick={() => setDateFilterByPeriod('thisMonth')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.period === 'thisMonth'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-dark-700 text-foreground hover:bg-dark-600'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setDateFilterByPeriod('lastMonth')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.period === 'lastMonth'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-dark-700 text-foreground hover:bg-dark-600'
                  }`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => setDateFilterByPeriod('thisYear')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filters.period === 'thisYear'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-dark-700 text-foreground hover:bg-dark-600'
                  }`}
                >
                  This Year
                </button>
                <button
                  onClick={() => setDateFilterByPeriod('custom')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    customDateRange
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-dark-700 text-foreground hover:bg-dark-600'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Start Date</label>
              <input
                type="date"
                className={`w-full bg-card border ${
                  customDateRange ? 'border-primary' : 'border-dark-700'
                } rounded-md px-3 py-2`}
                value={filters.startDate || ''}
                onChange={(e) => {
                  setCustomDateRange(true);
                  setFilters({
                    ...filters,
                    period: 'custom',
                    startDate: e.target.value || null,
                  });
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">End Date</label>
              <input
                type="date"
                className={`w-full bg-card border ${
                  customDateRange ? 'border-primary' : 'border-dark-700'
                } rounded-md px-3 py-2`}
                value={filters.endDate || ''}
                onChange={(e) => {
                  setCustomDateRange(true);
                  setFilters({
                    ...filters,
                    period: 'custom',
                    endDate: e.target.value || null,
                  });
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              className="bg-dark-800 hover:bg-dark-700 text-foreground px-4 py-2 rounded-md mr-2"
              onClick={() =>
                setFilters({
                  itemType: 'all',
                  period: 'month',
                  startDate: null,
                  endDate: null,
                  project: null,
                })
              }
            >
              Reset Filters
            </button>
            <button
              className="bg-primary hover:bg-primary-dark text-primary-foreground px-4 py-2 rounded-md"
              onClick={() => setShowFilters(false)}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-500 p-4 rounded-md mb-6 flex items-center">
          <AlertTriangle size={20} className="mr-2" />
          {error}
        </div>
      )}

      {/* Archive Items Tab */}
      {activeTab === 'archive' && !loading && !error && (
        <>
          {archivedItems.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-md border border-dark-700">
              <h3 className="text-lg font-medium mb-2">
                No Archived Items Found
              </h3>
              <p className="text-muted-foreground">
                When you complete tasks, projects, or other items, they will
                appear here.
              </p>
            </div>
          ) : (
            <>
              {/* List View */}
              {viewMode === 'list' && (
                <div className="bg-card rounded-md border border-dark-700 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-dark-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Completed On
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Time to Complete
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                      {sortedArchivedItems.map((item) => (
                        <tr key={item._id} className="hover:bg-dark-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getItemIcon(item.itemType)}
                              <span className="ml-2 capitalize">
                                {item.itemType}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">
                              {item.title}
                            </div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(item.completedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDuration(item.completionTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.priority ? (
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  item.priority === 'High'
                                    ? 'bg-red-500 text-white'
                                    : item.priority === 'Medium'
                                    ? 'bg-yellow-500 text-dark'
                                    : 'bg-blue-500 text-white'
                                }`}
                              >
                                {item.priority}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() =>
                                handleRestoreItem(item._id, item.itemType)
                              }
                              disabled={restoringItems[item._id]}
                              className={`flex items-center text-sm px-3 py-1 rounded-md 
                                ${
                                  restoringItems[item._id]
                                    ? 'bg-dark-700 text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary-dark'
                                }`}
                            >
                              {restoringItems[item._id] ? (
                                <>
                                  <RefreshCw
                                    size={14}
                                    className="mr-1 animate-spin"
                                  />
                                  Restoring...
                                </>
                              ) : (
                                <>
                                  <RefreshCw size={14} className="mr-1" />
                                  Restore
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedArchivedItems.map((item) => (
                    <div
                      key={item._id}
                      className="bg-card p-4 rounded-md border border-dark-700 hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        {getItemIcon(item.itemType)}
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            item.priority === 'High'
                              ? 'bg-red-500 text-white'
                              : item.priority === 'Medium'
                              ? 'bg-yellow-500 text-dark'
                              : item.priority === 'Low'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-500 text-white'
                          }`}
                        >
                          {item.priority || 'None'}
                        </span>
                      </div>

                      <h3 className="text-lg font-medium mt-3 mb-1">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex flex-col text-sm text-muted-foreground mt-3 pt-3 border-t border-dark-700">
                        <div className="flex items-center mb-1">
                          <Calendar size={14} className="mr-2" />
                          Completed: {formatDate(item.completedAt)}
                        </div>
                        <div className="flex items-center">
                          <Clock size={14} className="mr-2" />
                          Duration: {formatDuration(item.completionTime)}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-dark-700">
                        <button
                          onClick={() =>
                            handleRestoreItem(item._id, item.itemType)
                          }
                          disabled={restoringItems[item._id]}
                          className={`w-full flex items-center justify-center text-sm px-3 py-2 rounded-md 
                            ${
                              restoringItems[item._id]
                                ? 'bg-dark-700 text-muted-foreground cursor-not-allowed'
                                : 'bg-primary text-primary-foreground hover:bg-primary-dark'
                            }`}
                        >
                          {restoringItems[item._id] ? (
                            <>
                              <RefreshCw
                                size={14}
                                className="mr-1 animate-spin"
                              />
                              Restoring...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={14} className="mr-1" />
                              Restore {item.itemType}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Productivity Metrics Tab */}
      {activeTab === 'metrics' && !loading && !error && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics Summary */}
          <div className="bg-card rounded-md border border-dark-700 p-4">
            <h3 className="text-lg font-medium mb-4">Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Items Completed:
                </span>
                <span className="font-medium">{metrics.totalItems}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Most Productive Day:
                </span>
                <span className="font-medium">
                  {metrics.mostProductiveDay
                    ? formatDate(metrics.mostProductiveDay)
                    : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Most Productive Hour:
                </span>
                <span className="font-medium">
                  {metrics.mostProductiveHour !== null
                    ? `${metrics.mostProductiveHour}:00`
                    : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Avg. Completion Time:
                </span>
                <span className="font-medium">
                  {formatDuration(metrics.averageCompletionTime)}
                </span>
              </div>

              <div className="border-t border-dark-700 pt-3 mt-3">
                <h4 className="text-sm font-medium mb-2">Completed by Type</h4>
                {metrics.itemsByType &&
                  Object.entries(metrics.itemsByType).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex justify-between text-sm mb-1"
                    >
                      <span className="capitalize">{type}s:</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-dark-700 pt-3 mt-3">
                <h4 className="text-sm font-medium mb-2">
                  Priority Distribution
                </h4>
                {metrics.priorityDistribution &&
                  Object.entries(metrics.priorityDistribution).map(
                    ([priority, count]) => (
                      <div
                        key={priority}
                        className="flex justify-between text-sm mb-1"
                      >
                        <span>{priority}:</span>
                        <span>{count}</span>
                      </div>
                    )
                  )}
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-card rounded-md border border-dark-700 p-4 lg:col-span-2">
            <h3 className="text-lg font-medium mb-4">Activity Distribution</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#333',
                      border: '1px solid #555',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Completed Items" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-muted-foreground">
                  No activity data available for this period
                </p>
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Items by Type</h4>
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#333',
                        border: '1px solid #555',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value, name) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-32">
                  <p className="text-muted-foreground">
                    No type distribution data available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Comparison Section (conditionally displayed) */}
          {comparisonMode && (
            <div className="lg:col-span-3 bg-card rounded-md border border-dark-700 p-4">
              <h3 className="text-lg font-medium mb-4">Period Comparison</h3>

              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-2">Period 1</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-card border border-dark-700 rounded-md px-3 py-2"
                        value={comparisonPeriods.period1.startDate}
                        onChange={(e) =>
                          setComparisonPeriods({
                            ...comparisonPeriods,
                            period1: {
                              ...comparisonPeriods.period1,
                              startDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-card border border-dark-700 rounded-md px-3 py-2"
                        value={comparisonPeriods.period1.endDate}
                        onChange={(e) =>
                          setComparisonPeriods({
                            ...comparisonPeriods,
                            period1: {
                              ...comparisonPeriods.period1,
                              endDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-2">Period 2</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-card border border-dark-700 rounded-md px-3 py-2"
                        value={comparisonPeriods.period2.startDate}
                        onChange={(e) =>
                          setComparisonPeriods({
                            ...comparisonPeriods,
                            period2: {
                              ...comparisonPeriods.period2,
                              startDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        className="w-full bg-card border border-dark-700 rounded-md px-3 py-2"
                        value={comparisonPeriods.period2.endDate}
                        onChange={(e) =>
                          setComparisonPeriods({
                            ...comparisonPeriods,
                            period2: {
                              ...comparisonPeriods.period2,
                              endDate: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {comparisonData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h4 className="text-base font-medium mb-3">
                      Completion Counts
                    </h4>
                    <div className="bg-dark-800 p-4 rounded-md">
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Period 1:</span>
                        <span>
                          {comparisonData.period1.metrics.totalItems} items
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-muted-foreground">Period 2:</span>
                        <span>
                          {comparisonData.period2.metrics.totalItems} items
                        </span>
                      </div>
                      <div className="border-t border-dark-700 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Difference:</span>
                          <span
                            className={`font-medium ${
                              comparisonData.differences.totalItems > 0
                                ? 'text-green-500'
                                : comparisonData.differences.totalItems < 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {comparisonData.differences.totalItems > 0 && '+'}
                            {comparisonData.differences.totalItems} items
                          </span>
                        </div>
                        {comparisonData.differences.percentageChange !==
                          null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Percentage Change:
                            </span>
                            <span
                              className={`${
                                comparisonData.differences.percentageChange > 0
                                  ? 'text-green-500'
                                  : comparisonData.differences
                                      .percentageChange < 0
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {comparisonData.differences.percentageChange >
                                0 && '+'}
                              {comparisonData.differences.percentageChange.toFixed(
                                1
                              )}
                              %
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-medium mb-3">
                      Items by Type
                    </h4>
                    <div className="bg-dark-800 p-4 rounded-md">
                      {comparisonData.differences.itemsByType &&
                        Object.entries(
                          comparisonData.differences.itemsByType
                        ).map(([type, diff]) => (
                          <div key={type} className="flex justify-between mb-2">
                            <span className="text-muted-foreground capitalize">
                              {type}s:
                            </span>
                            <span
                              className={`${
                                diff > 0
                                  ? 'text-green-500'
                                  : diff < 0
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {diff > 0 && '+'}
                              {diff}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Select date ranges to compare productivity
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
