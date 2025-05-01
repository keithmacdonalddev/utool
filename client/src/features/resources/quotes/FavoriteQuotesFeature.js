import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { Quote, Star, Trash2, Copy } from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';
import ResourceSearch from '../components/ResourceSearch';
import {
  getFavoriteQuotes,
  deleteFavoriteQuote,
} from '../../../features/quotes/quoteSlice';

/**
 * FavoriteQuotesFeature Component
 *
 * A component for displaying and managing favorite quotes that were added
 * from the daily quote on the dashboard. Features include:
 * - Quotes listing with search functionality
 * - Category-based organization (optional)
 * - View, copy, and delete favorite quotes capabilities
 * - Integration with the ResourcesPage layout
 *
 * This component uses forwardRef to expose methods to the parent component,
 * allowing the parent to control this component's behavior.
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeCategory - Currently selected category (optional)
 * @param {Function} props.setActiveCategory - Function to set the active category
 * @param {React.Ref} ref - Forwarded ref from parent component
 * @returns {React.ReactElement} The FavoriteQuotesFeature component
 */
const FavoriteQuotesFeature = forwardRef(
  ({ activeCategory, setActiveCategory }, ref) => {
    const dispatch = useDispatch();
    const { showNotification } = useNotifications();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [quoteToDelete, setQuoteToDelete] = useState(null);

    // Get data from Redux store
    const { favoriteQuotes, isLoading, isError, message } = useSelector(
      (state) => state.quotes
    );

    // Expose methods to parent component via ref - kept for future compatibility
    useImperativeHandle(ref, () => ({}));

    // Filter quotes based on search term and active category
    const filteredQuotes = favoriteQuotes.filter((quote) => {
      // Filter by search term
      const matchesSearch =
        quote.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.author.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by category if implemented in the future
      const matchesCategory = activeCategory
        ? quote.category === activeCategory.id
        : true;

      return matchesSearch && matchesCategory;
    });

    /**
     * Opens the delete confirmation dialog for a quote
     *
     * @param {Object} quote - The quote to delete
     */
    const openDeleteDialog = (quote) => {
      setQuoteToDelete(quote);
      setIsDeleteDialogOpen(true);
    };

    /**
     * Closes the delete confirmation dialog and resets the quote to delete
     */
    const closeDeleteDialog = () => {
      setIsDeleteDialogOpen(false);
      setQuoteToDelete(null);
    };

    /**
     * Confirms the deletion of a quote
     * Dispatches the deleteFavoriteQuote action to Redux
     */
    const confirmDelete = () => {
      if (!quoteToDelete) return;

      dispatch(deleteFavoriteQuote(quoteToDelete._id))
        .unwrap()
        .then(() => {
          showNotification('Quote removed from favorites', 'success');
          closeDeleteDialog();
        })
        .catch((error) => {
          showNotification(`Failed to remove quote: ${error}`, 'error');
        });
    };

    /**
     * Handles copying quote content to clipboard
     *
     * @param {string} text - The text content to copy to clipboard
     */
    const handleCopy = (text) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showNotification('Copied to clipboard!', 'success');
        })
        .catch((err) => {
          showNotification('Failed to copy: ' + err, 'error');
        });
    };

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <ResourceSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            resourceType="quotes"
          />
          {/* "Add Quote" button removed since quotes are only added from favoriting daily quotes */}
        </div>

        {isLoading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-foreground">Loading favorite quotes...</p>
          </div>
        ) : isError ? (
          <div className="text-center text-red-500 py-6">
            {message || 'Error loading quotes'}
          </div>
        ) : (
          <>
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-10">
                <Quote size={48} className="mx-auto text-gray-400 mb-2" />
                <h3 className="text-xl font-medium text-gray-300 mb-2">
                  {searchTerm
                    ? 'No quotes match your search'
                    : 'No favorite quotes yet'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : 'Favorite a daily quote from the dashboard to see it here'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredQuotes.map((quote) => (
                  <div
                    key={quote._id}
                    className="bg-dark-800 rounded-lg p-4 border border-dark-700 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Quote size={20} className="text-primary" />
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleCopy(`"${quote.text}" — ${quote.author}`)
                          }
                          className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-dark-600"
                          title="Copy quote"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(quote)}
                          className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-dark-600"
                          title="Remove from favorites"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <blockquote className="mb-2 italic text-white">
                      "{quote.text}"
                    </blockquote>
                    <footer className="text-right text-sm text-gray-400">
                      — {quote.author}
                    </footer>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        {isDeleteDialogOpen && quoteToDelete && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
              <div className="mb-4">
                <h2
                  id="delete-dialog-title"
                  className="text-xl font-semibold text-[#F8FAFC]"
                >
                  Remove Quote
                </h2>
                <p className="mt-2 text-gray-300">
                  Are you sure you want to remove this quote from your
                  favorites?
                </p>
                <blockquote className="mt-4 p-3 bg-dark-700 rounded italic border-l-4 border-primary">
                  "{quoteToDelete.text}"
                  <footer className="text-right text-sm text-gray-400 mt-2">
                    — {quoteToDelete.author}
                  </footer>
                </blockquote>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  className="px-4 py-2 bg-dark-700 text-white rounded-md hover:bg-dark-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

FavoriteQuotesFeature.propTypes = {
  activeCategory: PropTypes.object,
  setActiveCategory: PropTypes.func,
};

// Add a display name for better debugging
FavoriteQuotesFeature.displayName = 'FavoriteQuotesFeature';

export default FavoriteQuotesFeature;
