// src/pages/KbListPage.jsx (or .js)

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux'; // Import useSelector
import api from '../utils/api';
import { Tag, Layers, ArrowLeft, Eye } from 'lucide-react'; // Removed Trash2 and AlertTriangle since we're removing the delete functionality
import KbSearchBar from '../components/kb/KbSearchBar';
import Button from '../components/common/Button';

const KbListPage = () => {
  const [articles, setArticles] = useState([]);
  const [currentSearch, setCurrentSearch] = useState({}); // State to hold search params
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');

  // Get user from Redux store
  const { user } = useSelector((state) => state.auth);
  // Helper function to check if user is an admin
  const isAdmin = user && user.role === 'Admin';

  const navigate = useNavigate();

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
        {/* Articles Grid - Render only if not loading and articles exist */}
        {!isLoading && !message && articles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {' '}
            {/* Reduced gap */}
            {/* Map over articles */}
            {articles.map((article) => (
              // *** Wrap the entire card content in a Link component ***
              <Link
                key={article._id}
                to={`/kb/${article._id}`}
                // Apply card styling and interaction states directly to the Link
                className="block bg-card border border-dark-700 shadow-card rounded-xl p-4 text-white flex flex-col justify-between transition duration-300 ease-in-out hover:shadow-lg hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400"
              >
                {/* Inner content container */}
                <div className="flex-grow">
                  {' '}
                  {/* Added flex-grow */}
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
                      {' '}
                      {/* Added items-center */}
                      <Tag
                        size={14}
                        className="text-gray-500 mr-1 flex-shrink-0"
                      />
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
                      {' '}
                      {/* Added items-center */}
                      <Layers
                        size={14}
                        className="text-gray-500 mr-1 flex-shrink-0"
                      />
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

                {/* Action Buttons Area */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end items-center">
                  {/* Subtle View Cue */}
                  <span className="text-xs text-gray-400">
                    Click card to view
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>{' '}
      {/* Closing tag for scrollable content area */}
    </div> // Closing tag for the main flex container
  );
};

export default KbListPage;
