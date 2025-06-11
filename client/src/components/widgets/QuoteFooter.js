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
      // Try the primary API first
      const response = await fetch(
        'https://api.quotable.io/random?tags=motivational|inspirational|success|productivity',
        {
          // Add timeout and handle SSL issues
          signal: AbortSignal.timeout(5000), // 5 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
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

      // Try alternative API source as fallback
      try {
        console.log('Trying alternative quote source...');
        const fallbackResponse = await fetch(
          'https://quotegarden.herokuapp.com/api/v3/quotes/random',
          {
            signal: AbortSignal.timeout(5000),
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.statusCode === 200 && fallbackData.data) {
            const newQuote = {
              text: fallbackData.data.quoteText.replace(/[""]/g, ''), // Remove quotes from text
              author: fallbackData.data.quoteAuthor,
              quoteId: `fallback-${Date.now()}`,
            };

            setQuote(newQuote);
            localStorage.setItem(
              'dailyQuote',
              JSON.stringify({
                quote: newQuote,
                timestamp: new Date().toISOString(),
              })
            );
            await checkIfFavorite(newQuote.quoteId);
            return; // Success with fallback
          }
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }

      // Use local fallback quotes as last resort
      const fallbackQuotes = [
        {
          text: 'Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.',
          author: 'Paul J. Meyer',
          quoteId: 'local-fallback-1',
        },
        {
          text: 'The way to get started is to quit talking and begin doing.',
          author: 'Walt Disney',
          quoteId: 'local-fallback-2',
        },
        {
          text: 'Innovation distinguishes between a leader and a follower.',
          author: 'Steve Jobs',
          quoteId: 'local-fallback-3',
        },
        {
          text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
          author: 'Winston Churchill',
          quoteId: 'local-fallback-4',
        },
      ];

      // Select a random fallback quote based on the day to provide variety
      const today = new Date().getDate();
      const fallbackQuote = fallbackQuotes[today % fallbackQuotes.length];

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
