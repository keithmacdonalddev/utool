import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom'; // To link to articles later
import { getKbArticles } from '../../features/kb/kbSlice'; // Import the action
import Button from '../common/Button';

const KbQuickAccessWidget = () => {
  const dispatch = useDispatch();
  // Get KB state from Redux store
  const { articles, isLoading, isError, message } = useSelector((state) => state.kb);

  useEffect(() => {
    // Dispatch action to fetch KB articles when component mounts
    // We might want a specific action for "recent" or "popular" later
    dispatch(getKbArticles());
  }, [dispatch]);

    return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-card text-text">
      <h3 className="text-lg font-bold mb-3 text-[#F8FAFC]">Knowledge Base</h3>
      {isLoading && <p className="text-[#C7C9D1]">Loading articles...</p>}
      {isError && <p className="text-red-400 text-sm">{message || 'Error loading articles.'}</p>}
      {!isLoading && !isError && (
        <ul className="space-y-2">
          {articles.length > 0 ? (
            // Show top 3 articles
            articles.slice(0, 3).map((article) => (
              <li key={article._id} className="border-b border-dark-700 pb-1 last:border-b-0">
                <Link to={`/kb/${article._id}`} className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline truncate block">
                  {article.title}
                </Link>
                <p className="text-xs text-[#C7C9D1]">
                  By {article.author?.name || 'Unknown'} on {new Date(article.createdAt).toLocaleDateString()}
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
         <Link to="/kb" className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline">
            View All Articles
         </Link>
         <Link to="/kb/new" className="text-sm text-[#F8FAFC] font-bold hover:text-accent-purple hover:underline">
            + New Article
         </Link>
       </div>
    </div>
  );
};

export default KbQuickAccessWidget;
