// src/pages/KbListPage.jsx (or .js)

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux'; // Import useSelector
import api from '../utils/api';
import {
  Tag,
  Layers,
  ArrowLeft,
  Eye,
  Grid,
  List,
  AlignJustify,
} from 'lucide-react'; // Added AlignJustify icon
import KbSearchBar from '../components/kb/KbSearchBar';
import Button from '../components/common/Button';

// LocalStorage key for view preference
const VIEW_PREFERENCE_KEY = 'kb_view_preference';

// Helper functions for localStorage with error handling
const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
};

const getFromLocalStorage = (key, defaultValue) => {
  try {
    const savedValue = localStorage.getItem(key);
    return savedValue !== null && savedValue !== undefined
      ? savedValue
      : defaultValue;
  } catch (error) {
    console.error('Failed to get from localStorage:', error);
    return defaultValue;
  }
};

const KbListPage = () => {
  // Initialize viewMode from localStorage immediately
  const defaultViewMode = getFromLocalStorage(VIEW_PREFERENCE_KEY, 'grid');
  const [articles, setArticles] = useState([]);
  const [currentSearch, setCurrentSearch] = useState({}); // State to hold search params
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');
  // View mode state with default from localStorage
  const [viewMode, setViewMode] = useState(defaultViewMode);

  // Memoized selector to prevent Redux rerender warnings
  const selectAuth = useMemo(() => (state) => state.auth, []);

  // Get user from Redux store
  const { user } = useSelector(selectAuth);
  // Helper function to check if user is an admin
  const isAdmin = user && user.role === 'Admin';

  const navigate = useNavigate();

  // Custom setter for viewMode that also updates localStorage
  const setViewModeWithStorage = (newMode) => {
    setViewMode(newMode);
    saveToLocalStorage(VIEW_PREFERENCE_KEY, newMode);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // --- Fetch/Search Articles ---
  // Use useCallback to memoize the fetch function
  const fetchOrSearchArticles = useCallback(async (searchParams = {}) => {
    setIsLoading(true);
    setIsError(false);
    setMessage('');
    const isSearching =
      Object.keys(searchParams).length > 0 &&
      (searchParams.query ||
        searchParams.tags?.length > 0 ||
        searchParams.categories?.length > 0);

    try {
      let response;
      if (isSearching) {
        response = await api.post('/kb/search', searchParams); // Use POST for search
      } else {
        response = await api.get('/kb'); // Default GET for all articles
      }

      if (response.data?.success && Array.isArray(response.data.data)) {
        setArticles(response.data.data);
      } else {
        // Handle cases where search might return success: false or non-array data
        console.warn('Received unexpected data for articles:', response.data);
        setArticles([]);
        // Optionally set a message if search returns no results but is successful
        if (response.data?.success && response.data.data.length === 0) {
          setMessage('No articles found matching your criteria.');
        } else if (!response.data?.success) {
          throw new Error(
            response.data?.message ||
              (isSearching ? 'Search failed.' : 'Fetch failed.')
          );
        }
      }
    } catch (error) {
      console.error('Fetch/Search Error:', error);
      setIsError(true);
      setMessage(
        error.message ||
          (isSearching
            ? 'Failed to perform search.'
            : 'Failed to fetch articles.')
      );
      setArticles([]); // Clear articles on error
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  // Initial fetch on component mount
  useEffect(() => {
    fetchOrSearchArticles(); // Fetch all initially
  }, [fetchOrSearchArticles]); // Depend on the memoized function

  // --- Search Handler ---
  const handleSearch = (searchParams) => {
    setCurrentSearch(searchParams); // Update search state
    fetchOrSearchArticles(searchParams); // Trigger fetch/search
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Loading articles...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
          role="alert"
        >
          <strong className="font-bold">Loading Error!</strong> {message}
        </div>
      </div>
    );
  }

  // Render a single article in list view
  const renderListItem = (article) => (
    <Link
      key={article._id}
      to={`/kb/${article._id}`}
      className="block bg-card border border-dark-700 rounded-lg p-4 mb-3 hover:bg-dark-700 transition-colors"
    >
      <div className="flex justify-between">
        <div className="flex-grow">
          <h2
            className="text-xl font-semibold text-white mb-2"
            title={article.title}
          >
            {article.title}
          </h2>

          <div className="flex items-center text-xs text-gray-400 mb-3">
            <Eye size={14} className="mr-1" />
            <span>{article.views || 0} views</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {article.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center mr-3">
                <Tag size={14} className="text-gray-500 mr-1 flex-shrink-0" />
                {article.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {article.tags.length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{article.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {article.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                <Layers
                  size={14}
                  className="text-gray-500 mr-1 flex-shrink-0"
                />
                {article.categories.slice(0, 2).map((category, index) => (
                  <span
                    key={index}
                    className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full text-xs"
                  >
                    {category}
                  </span>
                ))}
                {article.categories.length > 2 && (
                  <span className="text-xs text-gray-400">
                    +{article.categories.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center ml-4">
          <span className="text-xs text-gray-400">Click to view</span>
        </div>
      </div>
    </Link>
  );

  // Render a single article in grid view (existing card implementation)
  const renderGridItem = (article) => (
    <Link
      key={article._id}
      to={`/kb/${article._id}`}
      className="block bg-card border border-dark-700 shadow-card rounded-xl p-4 text-white flex flex-col justify-between transition duration-300 ease-in-out hover:shadow-lg hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
    >
      {/* Inner content container */}
      <div className="flex-grow">
        {/* Title */}
        <h2
          className="text-xl font-semibold text-white mb-2 truncate"
          title={article.title}
        >
          {article.title}
        </h2>
        {/* View count */}
        <div className="flex items-center text-xs text-gray-400 mb-2">
          <Eye size={14} className="mr-1" />
          <span>{article.views || 0} views</span>
        </div>
        {/* Tags */}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 text-xs items-center">
            <Tag size={14} className="text-gray-500 mr-1 flex-shrink-0" />
            {article.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Categories */}
        {article.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 text-xs items-center">
            <Layers size={14} className="text-gray-500 mr-1 flex-shrink-0" />
            {article.categories.map((category, index) => (
              <span
                key={index}
                className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );

  // Render a single article as a table row
  const renderTableItem = (article) => (
    <tr
      key={article._id}
      className="hover:bg-dark-700 transition-colors cursor-pointer"
      onClick={() => (window.location.href = `/kb/${article._id}`)}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F8FAFC] text-left">
        {article.title}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
        <div className="flex flex-wrap gap-1">
          {article.tags?.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
          {article.tags?.length > 2 && (
            <span className="text-xs text-gray-400">
              +{article.tags.length - 2}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
        <div className="flex items-center">
          <Eye size={14} className="mr-1" />
          <span>{article.views || 0}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
        {article.updatedAt ? formatDate(article.updatedAt) : 'Not updated'}
      </td>
    </tr>
  );

  return (
    // Use flex column layout for the page, taking full height available in <main>
    <div className="flex flex-col h-full">
      {/* Fixed Header Section */}
      {/* Header Row: Back Link, Title, Create Button */}
      <div className="flex justify-between items-center mb-3 px-4 md:px-0 pt-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Knowledge Base</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle Buttons */}
          <div className="bg-dark-700 rounded-lg p-1 flex">
            <button
              onClick={() => setViewModeWithStorage('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewModeWithStorage('list')}
              className={`p-2 rounded-md ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewModeWithStorage('table')}
              className={`p-2 rounded-md ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Table View"
            >
              <AlignJustify size={18} />
            </button>
          </div>

          {/* Only show New Article button to admin users */}
          {isAdmin && (
            <Button
              variant="primary"
              className="py-2 px-6 text-base font-bold shadow"
              style={{ color: '#F8FAFC' }}
              onClick={() => (window.location.href = '/kb/new')}
            >
              + New Article
            </Button>
          )}
        </div>
      </div>
      {/* Search Bar - Standalone, no background */}
      <div className="px-4 md:px-0 mt-2">
        <KbSearchBar onSearch={handleSearch} />
      </div>
      {/* Scrollable Content Area */}
      <div className="flex-grow overflow-y-auto p-4 md:px-0">
        {/* Loading State */}
        {isLoading && (
          <p className="text-center text-gray-500 py-10">Loading articles...</p>
        )}
        {/* Error/No Results Message */}
        {!isLoading && message && (
          <p
            className={`text-center ${
              isError ? 'text-red-500' : 'text-gray-500'
            } mt-10`}
          >
            {message}
          </p>
        )}
        {/* Articles Grid/List/Table View - Render only if not loading and articles exist */}
        {!isLoading &&
          !message &&
          articles.length > 0 &&
          (viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article) => renderGridItem(article))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="flex flex-col px-2 overflow-hidden">
              <div className="overflow-y-auto -mx-2 px-2 pt-2 pb-2">
                {articles.map((article) => renderListItem(article))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto bg-dark-800 rounded-lg border border-dark-700">
              <table className="min-w-full divide-y divide-dark-700">
                <thead>
                  <tr className="bg-primary bg-opacity-20">
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Tags
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Views
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-dark-700"
                    >
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-dark-700">
                  {articles.map((article) => renderTableItem(article))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </div>
  );
};

export default KbListPage;
