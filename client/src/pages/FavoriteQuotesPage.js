import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Star, Trash2, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const FavoriteQuotesPage = () => {
  const [favoriteQuotes, setFavoriteQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { handleNotificationClick } = useNotifications();

  // Using handleNotificationClick as a replacement for showNotification
  const showNotification = (message, type = 'info') => {
    const notificationObj = {
      _id: Date.now().toString(),
      title: type === 'error' ? 'Error' : 'Success',
      message,
      type,
    };
    handleNotificationClick(notificationObj);
  };

  useEffect(() => {
    fetchFavoriteQuotes();
  }, []);

  const fetchFavoriteQuotes = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/quotes/favorite');
      setFavoriteQuotes(response.data.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching favorite quotes:', error);
      setError('Failed to load your favorite quotes. Please try again later.');
      showNotification('Error loading favorite quotes', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveQuote = async (quoteId) => {
    try {
      await api.delete(`/quotes/favorite/${quoteId}`);
      setFavoriteQuotes(
        favoriteQuotes.filter((quote) => quote.quoteId !== quoteId)
      );
      showNotification('Quote removed from favorites');
    } catch (error) {
      console.error('Error removing favorite quote:', error);
      showNotification('Error removing quote from favorites', 'error');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#F8FAFC]">
            My Favorite Quotes
          </h1>
          <button
            onClick={fetchFavoriteQuotes}
            className="text-blue-500 hover:text-blue-400 flex items-center"
            title="Refresh favorites"
          >
            <RefreshCw
              size={16}
              className={`mr-1 ${isLoading ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-800 rounded-md p-4 text-center text-red-300">
            {error}
          </div>
        ) : favoriteQuotes.length === 0 ? (
          <div className="bg-dark-700/30 border border-dark-600 rounded-md p-8 text-center">
            <Star size={40} className="mx-auto mb-4 text-gray-500" />
            <p className="text-lg text-[#C7C9D1] mb-2">
              No favorite quotes yet
            </p>
            <p className="text-sm text-gray-500">
              Click the star icon next to quotes on the dashboard to save them
              as favorites
            </p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 w-full">
            {favoriteQuotes.map((quote) => (
              <div
                key={quote._id}
                className="bg-card rounded-lg p-5 border border-dark-700 shadow-sm flex flex-col w-full"
              >
                <div className="flex justify-between">
                  <p className="text-[#F8FAFC] italic text-lg flex-grow">
                    "{quote.text}"
                  </p>
                  <button
                    onClick={() => handleRemoveQuote(quote.quoteId)}
                    className="text-gray-500 hover:text-red-500 transition-colors ml-4 flex-shrink-0 self-start"
                    title="Remove from favorites"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex justify-end mt-3">
                  <span className="text-sm text-[#C7C9D1]">
                    — {quote.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoriteQuotesPage;
