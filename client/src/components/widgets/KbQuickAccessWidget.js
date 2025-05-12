import React, { memo } from 'react';
import { Link } from 'react-router-dom'; // To link to articles later
import Button from '../common/Button';
import useKbArticles from '../../hooks/useKbArticles';

const KbQuickAccessWidget = () => {
  // Use our custom hook with caching instead of direct Redux dispatches
  const { articles, isLoading, error, refetchArticles } = useKbArticles({
    cacheTimeout: 5 * 60 * 1000, // 5 minutes cache for KB articles
    backgroundRefresh: true, // Enable background refresh for better UX
    smartRefresh: true, // Enable smart comparison to prevent unnecessary re-renders
    queryParams: { sort: '-createdAt', limit: 3 }, // Get most recent articles, limited to 3
  });

  /**
   * Handle manual refresh of KB articles
   * This provides a way for users to force refresh the data if needed
   */
  const handleRefresh = () => {
    refetchArticles(true); // Force a refresh regardless of cache
  };

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-app-card text-text">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-[#F8FAFC]">Knowledge Base</h3>
        {/* Add refresh button */}
        <button
          onClick={handleRefresh}
          className="text-sm text-gray-400 hover:text-white p-1 rounded-full hover:bg-dark-600"
          title="Refresh KB data"
          aria-label="Refresh KB data"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </button>
      </div>

      {isLoading && <p className="text-[#C7C9D1]">Loading articles...</p>}
      {error && (
        <p className="text-red-400 text-sm">
          {error || 'Error loading articles.'}
        </p>
      )}
      {!isLoading && !error && (
        <ul className="space-y-2">
          {articles && articles.length > 0 ? (
            // Show top 3 articles
            articles.slice(0, 3).map((article) => (
              <li
                key={article._id}
                className="border-b border-dark-700 pb-1 last:border-b-0"
              >
                <Link
                  to={`/kb/${article._id}`}
                  className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline truncate block"
                >
                  {article.title}
                </Link>
                <p className="text-xs text-[#C7C9D1]">
                  By {article.author?.name || 'Unknown'} on{' '}
                  {new Date(article.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))
          ) : (
            <p className="text-sm text-[#C7C9D1]">No articles found.</p>
          )}
        </ul>
      )}
      {/* Links for View All and New Article */}
      <div className="mt-3 flex justify-between items-center">
        <Link
          to="/kb"
          className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline"
        >
          View All Articles
        </Link>
        <Link
          to="/kb/new"
          className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline"
        >
          + New Article
        </Link>
      </div>
    </div>
  );
};

export default memo(KbQuickAccessWidget);
