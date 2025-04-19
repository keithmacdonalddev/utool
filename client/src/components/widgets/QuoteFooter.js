import React, { useEffect, useState } from 'react';
import { Star, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { useNotifications } from '../../context/NotificationContext';

const QuoteFooter = () => {
  const [quote, setQuote] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Updated to use the correct hook name
  const { markAsRead, markAllAsRead } = useNotifications();

  // Create a showNotification function since it doesn't exist in useNotifications
  const showNotification = (message, type = 'info') => {
    // For now we'll just log to console since the real notification system
    // doesn't have a direct showNotification method
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  // Check if we need to fetch a new quote
  const shouldFetchNewQuote = () => {
    const storedQuote = localStorage.getItem('dailyQuote');

    if (!storedQuote) {
      return true;
    }

    try {
      const { timestamp } = JSON.parse(storedQuote);
      const storedDate = new Date(timestamp);
      const currentDate = new Date();

      // Return true if stored date is from a previous day
      return storedDate.toDateString() !== currentDate.toDateString();
    } catch (error) {
      console.error('Error parsing stored quote:', error);
      return true;
    }
  };

  // Load quote from localStorage or fetch a new one
  useEffect(() => {
    const loadOrFetchQuote = async () => {
      // If we have a stored quote from today, use it
      const storedQuote = localStorage.getItem('dailyQuote');

      if (storedQuote && !shouldFetchNewQuote()) {
        try {
          const parsedQuote = JSON.parse(storedQuote);
          setQuote(parsedQuote.quote);

          // Check if this stored quote is a favorite
          await checkIfFavorite(parsedQuote.quote.quoteId);
          return;
        } catch (error) {
          console.error('Error loading stored quote:', error);
        }
      }

      // If no valid stored quote, fetch a new one
      fetchQuote();
    };

    loadOrFetchQuote();
  }, []);

  const fetchQuote = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch(
        'https://api.quotable.io/random?tags=motivational|inspirational|success|productivity'
      );

      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }

      const data = await response.json();

      const newQuote = {
        text: data.content,
        author: data.author,
        quoteId: data._id,
      };

      // Store in state
      setQuote(newQuote);

      // Save to localStorage with timestamp
      localStorage.setItem(
        'dailyQuote',
        JSON.stringify({
          quote: newQuote,
          timestamp: new Date().toISOString(),
        })
      );

      // Check if this quote is already a favorite
      await checkIfFavorite(newQuote.quoteId);
    } catch (error) {
      console.error('Error fetching quote:', error);

      // Use fallback quote
      const fallbackQuote = {
        text: 'Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.',
        author: 'Paul J. Meyer',
        quoteId: 'fallback-quote',
      };

      setQuote(fallbackQuote);

      // Save fallback to localStorage
      localStorage.setItem(
        'dailyQuote',
        JSON.stringify({
          quote: fallbackQuote,
          timestamp: new Date().toISOString(),
        })
      );

      await checkIfFavorite(fallbackQuote.quoteId);
    } finally {
      setIsRefreshing(false);
    }
  };

  const checkIfFavorite = async (quoteId) => {
    try {
      const response = await api.get(`/quotes/favorite/${quoteId}`);
      setIsFavorite(response.data.success);
    } catch (error) {
      // If the quote is not found in favorites or there's another error
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    if (!quote) return;

    setIsSubmitting(true);

    try {
      if (isFavorite) {
        // Remove from favorites
        await api.delete(`/quotes/favorite/${quote.quoteId}`);
        setIsFavorite(false);
        showNotification('Quote removed from favorites');
      } else {
        // Add to favorites
        await api.post('/quotes/favorite', {
          quoteId: quote.quoteId,
          text: quote.text,
          author: quote.author,
        });
        setIsFavorite(true);
        showNotification('Quote added to favorites');
      }
    } catch (error) {
      showNotification('Error saving favorite quote', 'error');
      console.error('Error toggling favorite quote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to manually refresh the quote
  const handleRefreshQuote = () => {
    fetchQuote();
    showNotification('New quote refreshed for today');
  };

  return (
    <div className="py-2 mt-auto w-full border-t border-gray-800">
      <div className="text-center px-4">
        <span className="text-base text-[#C7C9D1] italic">
          {quote ? `"${quote.text}"` : 'Loading quote...'}
        </span>
        {quote && (
          <div className="text-xs text-[#C7C9D1] mt-2 flex items-center justify-center">
            <span>— {quote.author}</span>
            <div className="flex items-center ml-2">
              {/* Star button for favorites */}
              <button
                onClick={toggleFavorite}
                disabled={isSubmitting}
                className="focus:outline-none mr-2"
                title={
                  isFavorite ? 'Remove from favorites' : 'Add to favorites'
                }
              >
                <Star
                  size={16}
                  className={`
                    ${
                      isFavorite
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-500 hover:text-yellow-400'
                    } 
                    ${isSubmitting ? 'opacity-50' : 'opacity-100'}
                    transition-colors
                  `}
                />
              </button>

              {/* Refresh button for fetching a new quote */}
              <button
                onClick={handleRefreshQuote}
                disabled={isRefreshing}
                className="focus:outline-none"
                title="Get a new quote"
              >
                <RefreshCw
                  size={14}
                  className={`
                    text-gray-500 hover:text-blue-400
                    ${isRefreshing ? 'opacity-50 animate-spin' : 'opacity-100'}
                    transition-colors
                  `}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteFooter;
