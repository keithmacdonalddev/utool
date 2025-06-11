import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { ExternalLink, Clipboard, Plus, Edit, Trash } from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';
import Button from '../../../components/common/Button';
import ResourceSearch from '../components/ResourceSearch';
import {
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../../../features/bookmarks/bookmarkSlice';

/**
 * BookmarksFeature Component
 *
 * A comprehensive bookmarks management feature that includes:
 * - Bookmarks listing with search functionality
 * - Folder-based organization
 * - Create, view, edit, and delete bookmark capabilities
 * - Integration with the ResourcesPage layout
 * - Support for favorite bookmarks
 *
 * This component encapsulates all the bookmark-specific functionality
 * that was previously in the ResourcesPage.
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeFolder - Currently selected folder
 * @param {Function} props.setActiveFolder - Function to set the active folder
 * @returns {React.ReactElement} The BookmarksFeature component
 */
const BookmarksFeature = ({ activeFolder, setActiveFolder }) => {
  const dispatch = useDispatch();
  const { showNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState(false);
  const [showEditBookmarkModal, setShowEditBookmarkModal] = useState(false);
  const [bookmarkToEdit, setBookmarkToEdit] = useState(null);
  const [editedBookmark, setEditedBookmark] = useState({
    title: '',
    url: '',
    folderId: null,
    favorite: false,
  });
  const [newBookmark, setNewBookmark] = useState({
    title: '',
    url: '',
    folderId: null,
    favorite: false,
  });
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Memoized selectors to prevent Redux rerender warnings
  const selectBookmarks = useMemo(() => (state) => state.bookmarks, []);

  const {
    bookmarks,
    categories,
    tags,
    isLoading: bookmarksLoading,
    error: bookmarksError,
    message: bookmarksMessage,
    searchResults,
    isSearching,
  } = useSelector(selectBookmarks);

  // Show add bookmark modal when custom event is triggered
  useEffect(() => {
    const handleShowAddBookmarkModal = () => {
      setShowAddBookmarkModal(true);
    };

    document.addEventListener(
      'showAddBookmarkModal',
      handleShowAddBookmarkModal
    );

    return () => {
      document.removeEventListener(
        'showAddBookmarkModal',
        handleShowAddBookmarkModal
      );
    };
  }, []);

  /**
   * Opens the edit bookmark modal and populates it with the selected bookmark's data
   * @param {Object} bookmark - The bookmark object to edit
   */
  const handleOpenEditModal = (bookmark) => {
    setBookmarkToEdit(bookmark);
    setEditedBookmark({
      title: bookmark.title,
      url: bookmark.url,
      folderId: bookmark.folderId,
      favorite: bookmark.favorite,
    });
    setShowEditBookmarkModal(true);
    setIsConfirmingDelete(false);
  };

  /**
   * Handles the bookmark edit form submission
   * @param {Event} e - The form submission event
   */
  const handleEditBookmark = (e) => {
    e.preventDefault();

    if (!editedBookmark.title.trim() || !editedBookmark.url.trim()) {
      showNotification('Title and URL are required', 'error');
      return;
    }

    dispatch(
      updateBookmark({
        id: bookmarkToEdit._id,
        bookmarkData: editedBookmark,
      })
    )
      .unwrap()
      .then(() => {
        setShowEditBookmarkModal(false);
        showNotification('Bookmark updated successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to update bookmark', 'error');
      });
  };

  /**
   * Handles deleting a bookmark
   * @param {string} bookmarkId - The ID of the bookmark to delete
   */
  const handleDeleteBookmark = (bookmarkId) => {
    dispatch(deleteBookmark(bookmarkId))
      .unwrap()
      .then(() => {
        setShowEditBookmarkModal(false);
        showNotification('Bookmark deleted successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to delete bookmark', 'error');
      });
  };

  // Handle copy to clipboard
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

  // Toggle favorite status
  const handleToggleFavorite = (bookmark) => {
    dispatch(
      updateBookmark({
        id: bookmark._id,
        bookmarkData: { favorite: !bookmark.favorite },
      })
    )
      .unwrap()
      .then(() => {
        showNotification(
          `Bookmark ${
            bookmark.favorite ? 'removed from' : 'added to'
          } favorites`,
          'success'
        );
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to update bookmark', 'error');
      });
  };

  /**
   * Filter bookmarks based on search term
   * This filters all bookmarks in the Redux store by title or URL
   */
  const filteredBySearchTerm = bookmarks.filter(
    (bookmark) =>
      bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Get bookmarks for the current view based on local filtering
   * This eliminates the need for separate API calls when switching between folders
   * by filtering the already loaded bookmarks data
   */
  const folderBookmarks = activeFolder
    ? bookmarks.filter((bookmark) => bookmark.folderId === activeFolder._id)
    : [];

  /**
   * Get favorite bookmarks when on the Favorites view
   * Uses local filtering just like folder bookmarks
   */
  const favoriteBookmarks = !activeFolder
    ? bookmarks.filter((bookmark) => bookmark.favorite)
    : [];

  // Handle add bookmark
  const handleAddBookmark = (e) => {
    e.preventDefault();

    if (!newBookmark.title.trim() || !newBookmark.url.trim()) {
      showNotification('Title and URL are required', 'error');
      return;
    }

    // Set folderId if we're in a folder
    const bookmarkData = {
      ...newBookmark,
      folderId: activeFolder ? activeFolder._id : null,
    };

    dispatch(createBookmark(bookmarkData))
      .unwrap()
      .then(() => {
        setNewBookmark({
          title: '',
          url: '',
          folderId: activeFolder ? activeFolder._id : null,
          favorite: false,
        });
        setShowAddBookmarkModal(false);
        showNotification('Bookmark created successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to create bookmark', 'error');
      });
  };

  // Move bookmark to folder
  const handleMoveBookmark = (bookmarkId, folderId) => {
    dispatch(
      updateBookmark({
        id: bookmarkId,
        bookmarkData: { folderId },
      })
    )
      .unwrap()
      .then(() => {
        showNotification('Bookmark moved successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to move bookmark', 'error');
      });
  };

  // Bookmark modal
  const renderAddBookmarkModal = () => {
    if (!showAddBookmarkModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            {activeFolder
              ? `Add Bookmark to ${activeFolder.name}`
              : 'Add Bookmark'}
          </h3>
          <form onSubmit={handleAddBookmark}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={newBookmark.title}
                onChange={(e) =>
                  setNewBookmark({ ...newBookmark, title: e.target.value })
                }
                placeholder="Bookmark title"
                className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                URL
              </label>
              <input
                type="url"
                value={newBookmark.url}
                onChange={(e) =>
                  setNewBookmark({ ...newBookmark, url: e.target.value })
                }
                placeholder="https://example.com"
                className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newBookmark.favorite}
                  onChange={(e) =>
                    setNewBookmark({
                      ...newBookmark,
                      favorite: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-300">
                  Add to favorites
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowAddBookmarkModal(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Bookmark
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  /**
   * Renders the edit bookmark modal with delete functionality
   * @returns {React.ReactElement|null} The edit modal component or null if not shown
   */
  const renderEditBookmarkModal = () => {
    if (!showEditBookmarkModal || !bookmarkToEdit) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            Edit Bookmark
          </h3>
          {isConfirmingDelete ? (
            <div className="mb-6">
              <p className="text-red-400 mb-4">
                Are you sure you want to delete "{bookmarkToEdit.title}"? This
                action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDeleteBookmark(bookmarkToEdit._id)}
                  type="button"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEditBookmark}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editedBookmark.title}
                  onChange={(e) =>
                    setEditedBookmark({
                      ...editedBookmark,
                      title: e.target.value,
                    })
                  }
                  placeholder="Bookmark title"
                  className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={editedBookmark.url}
                  onChange={(e) =>
                    setEditedBookmark({
                      ...editedBookmark,
                      url: e.target.value,
                    })
                  }
                  placeholder="https://example.com"
                  className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedBookmark.favorite}
                    onChange={(e) =>
                      setEditedBookmark({
                        ...editedBookmark,
                        favorite: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-300">
                    Add to favorites
                  </span>
                </label>
              </div>
              <div className="flex justify-between items-center mt-6">
                <Button
                  variant="danger"
                  onClick={() => setIsConfirmingDelete(true)}
                  type="button"
                  className="flex items-center text-red-400 hover:text-red-300 bg-transparent hover:bg-red-900 hover:bg-opacity-20"
                >
                  <Trash size={16} className="mr-1" />
                  Delete
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowEditBookmarkModal(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // Component for the main content area that displays bookmarks
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {activeFolder && (
            <h2 className="text-xl font-semibold text-[#F8FAFC] mr-4">
              {activeFolder.name}{' '}
              <span className="text-sm text-gray-400">
                (
                {folderBookmarks.length === 0
                  ? '0'
                  : `${folderBookmarks.length}`}
                )
              </span>
            </h2>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <ResourceSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            resourceType="bookmarks"
            expandable={true}
          />
          <Button
            variant="primary"
            onClick={() => setShowAddBookmarkModal(true)}
            className="flex items-center"
            title="Add new bookmark"
            aria-label="Create new bookmark"
          >
            <Plus size={16} className="mr-1" />
            Add Bookmark
          </Button>
        </div>
      </div>

      {bookmarksLoading && !activeFolder ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground">Loading bookmarks...</p>
        </div>
      ) : bookmarksError && !activeFolder ? (
        <div className="text-center text-red-500 py-6">
          {bookmarksMessage || 'Error loading bookmarks'}
        </div>
      ) : activeFolder ? (
        <>
          {bookmarksLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-foreground">
                Loading folder bookmarks...
              </p>
            </div>
          ) : folderBookmarks.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              No bookmarks in this folder yet.
            </div>
          ) : (
            <div className="overflow-visible rounded-lg border border-dark-700">
              <table className="min-w-full divide-y divide-dark-700">
                <thead>
                  <tr className="bg-primary bg-opacity-20">
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-dark-700">
                  {folderBookmarks.map((bookmark) => (
                    <tr
                      key={bookmark._id}
                      className="hover:bg-dark-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC] text-left">
                        {bookmark.title}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-sm text-[#C7C9D1] text-left">
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline flex items-center"
                        >
                          {bookmark.url}
                          <ExternalLink size={14} className="ml-1" />
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleCopy(bookmark.url)}
                            className="text-gray-400 hover:text-white"
                            title="Copy URL"
                            aria-label="Copy URL to clipboard"
                          >
                            <Clipboard size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(bookmark)}
                            className="text-gray-400 hover:text-white"
                            title="Edit bookmark"
                            aria-label="Edit bookmark"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : !activeFolder && favoriteBookmarks.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          {searchTerm
            ? 'No bookmarks match your search'
            : 'No favorite bookmarks yet. Create your first one!'}
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-dark-700">
          <table className="min-w-full divide-y divide-dark-700">
            <thead>
              <tr className="bg-primary bg-opacity-20">
                <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-dark-700">
              {(searchTerm ? filteredBySearchTerm : favoriteBookmarks).map(
                (bookmark) => (
                  <tr
                    key={bookmark._id}
                    className="hover:bg-dark-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC] text-left">
                      {bookmark.title}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-sm text-[#C7C9D1] text-left">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary hover:underline flex items-center"
                      >
                        {bookmark.url}
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCopy(bookmark.url)}
                          className="text-gray-400 hover:text-white"
                          title="Copy URL"
                          aria-label="Copy URL to clipboard"
                        >
                          <Clipboard size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(bookmark)}
                          className="text-gray-400 hover:text-white"
                          title="Edit bookmark"
                          aria-label="Edit bookmark"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
      {renderAddBookmarkModal()}
      {renderEditBookmarkModal()}
    </div>
  );
};

BookmarksFeature.propTypes = {
  activeFolder: PropTypes.object,
  setActiveFolder: PropTypes.func,
};

export default BookmarksFeature;
