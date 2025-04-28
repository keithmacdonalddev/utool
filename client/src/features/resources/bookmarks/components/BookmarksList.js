import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import {
  ExternalLink,
  Search,
  Plus,
  Tags,
  Edit,
  Trash,
  Folder,
  X,
  FolderCopy,
} from 'lucide-react';
import {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  filterBookmarks,
} from '../../../../features/bookmarks/bookmarkSlice';
import NoDataMessage from '../../components/NoDataMessage';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { useNotifications } from '../../../../context/NotificationContext';

/**
 * BookmarksList Component
 *
 * Displays a list of bookmarks with functionality to:
 * - View all bookmarks or folder-specific bookmarks
 * - Search and filter bookmarks
 * - Create, edit, and delete bookmarks
 * - Open bookmarks in new tabs
 * - Move bookmarks between folders
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeFolder - Currently selected folder (null for all bookmarks)
 * @returns {React.ReactElement} The BookmarksList component
 */
const BookmarksList = ({ activeFolder }) => {
  const dispatch = useDispatch();
  const { showNotification } = useNotifications();

  // Local state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBookmark, setNewBookmark] = useState({
    title: '',
    url: '',
    description: '',
    tags: '',
    folderId: activeFolder?._id || '',
  });

  // Get data from Redux store
  const { bookmarks, isLoading, isError, message } = useSelector(
    (state) => state.bookmarks
  );

  const { folders } = useSelector((state) => state.bookmarkFolders);

  // Load bookmarks when component mounts or active folder changes
  useEffect(() => {
    dispatch(getBookmarks(activeFolder?._id));
  }, [dispatch, activeFolder]);

  // Filter bookmarks when search term changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      dispatch(
        filterBookmarks({
          folderId: activeFolder?._id,
          searchTerm: searchTerm.trim(),
        })
      );
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchTerm, dispatch, activeFolder]);

  // Handle creating a new bookmark
  const handleCreateBookmark = (e) => {
    e.preventDefault();

    // Validate URL format
    if (!isValidUrl(newBookmark.url)) {
      showNotification(
        'Please enter a valid URL (include http:// or https://)',
        'error'
      );
      return;
    }

    // Convert tags string to array
    const tagsArray = newBookmark.tags
      ? newBookmark.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    dispatch(
      createBookmark({
        ...newBookmark,
        tags: tagsArray,
        // If no folder is selected but a folder is chosen in the form, use that
        folderId: newBookmark.folderId || activeFolder?._id || null,
      })
    )
      .unwrap()
      .then(() => {
        setShowAddModal(false);
        resetBookmarkForm();
        showNotification('Bookmark created successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to create bookmark', 'error');
      });
  };

  // Handle updating a bookmark
  const handleUpdateBookmark = (e) => {
    e.preventDefault();

    if (!isValidUrl(newBookmark.url)) {
      showNotification(
        'Please enter a valid URL (include http:// or https://)',
        'error'
      );
      return;
    }

    const tagsArray = newBookmark.tags
      ? typeof newBookmark.tags === 'string'
        ? newBookmark.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : newBookmark.tags
      : [];

    dispatch(
      updateBookmark({
        id: editingBookmark._id,
        bookmarkData: {
          ...newBookmark,
          tags: tagsArray,
        },
      })
    )
      .unwrap()
      .then(() => {
        setShowEditModal(false);
        resetBookmarkForm();
        setEditingBookmark(null);
        showNotification('Bookmark updated successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to update bookmark', 'error');
      });
  };

  // Handle deleting a bookmark
  const handleDeleteBookmark = () => {
    if (!editingBookmark) return;

    dispatch(deleteBookmark(editingBookmark._id))
      .unwrap()
      .then(() => {
        setShowDeleteModal(false);
        setEditingBookmark(null);
        showNotification('Bookmark deleted successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to delete bookmark', 'error');
      });
  };

  // Handle moving a bookmark to another folder
  const handleMoveBookmark = (e) => {
    e.preventDefault();

    dispatch(
      updateBookmark({
        id: editingBookmark._id,
        bookmarkData: {
          folderId: newBookmark.folderId || null,
        },
      })
    )
      .unwrap()
      .then(() => {
        setShowMoveModal(false);
        resetBookmarkForm();
        setEditingBookmark(null);
        showNotification('Bookmark moved successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to move bookmark', 'error');
      });
  };

  // Open bookmark in new tab
  const openBookmark = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Open edit modal
  const openEditModal = (bookmark) => {
    setEditingBookmark(bookmark);
    setNewBookmark({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || '',
      tags: bookmark.tags
        ? Array.isArray(bookmark.tags)
          ? bookmark.tags.join(', ')
          : bookmark.tags
        : '',
      folderId: bookmark.folderId || '',
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (bookmark) => {
    setEditingBookmark(bookmark);
    setShowDeleteModal(true);
  };

  // Open move modal
  const openMoveModal = (bookmark) => {
    setEditingBookmark(bookmark);
    setNewBookmark({
      ...newBookmark,
      folderId: bookmark.folderId || '',
    });
    setShowMoveModal(true);
  };

  // Reset bookmark form
  const resetBookmarkForm = () => {
    setNewBookmark({
      title: '',
      url: '',
      description: '',
      tags: '',
      folderId: activeFolder?._id || '',
    });
  };

  // Helper to validate URL format
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBookmark({ ...newBookmark, [name]: value });
  };

  // Open add modal and pre-fill with active folder if any
  const handleOpenAddModal = () => {
    resetBookmarkForm();
    if (activeFolder) {
      setNewBookmark((prev) => ({ ...prev, folderId: activeFolder._id }));
    }
    setShowAddModal(true);
  };

  // Render add/edit bookmark form
  const renderBookmarkForm = (isEdit = false, onSubmit) => {
    const title = isEdit ? 'Edit Bookmark' : 'Add New Bookmark';
    const submitText = isEdit ? 'Save Changes' : 'Add Bookmark';

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Title*
          </label>
          <input
            type="text"
            name="title"
            value={newBookmark.title}
            onChange={handleInputChange}
            placeholder="Enter bookmark title"
            className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            URL*
          </label>
          <input
            type="text"
            name="url"
            value={newBookmark.url}
            onChange={handleInputChange}
            placeholder="https://example.com"
            className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Include http:// or https:// in the URL
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={newBookmark.description}
            onChange={handleInputChange}
            placeholder="Optional description"
            className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
            rows="3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tags
          </label>
          <input
            type="text"
            name="tags"
            value={newBookmark.tags}
            onChange={handleInputChange}
            placeholder="tag1, tag2, tag3"
            className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-gray-400 mt-1">
            Separate tags with commas
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Folder
          </label>
          <select
            name="folderId"
            value={newBookmark.folderId}
            onChange={handleInputChange}
            className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
          >
            <option value="">No Folder</option>
            {folders.map((folder) => (
              <option key={folder._id} value={folder._id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() =>
              isEdit ? setShowEditModal(false) : setShowAddModal(false)
            }
            className="px-4 py-2 rounded-md bg-dark-600 text-[#F8FAFC] hover:bg-dark-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-primary text-[#F8FAFC] hover:bg-primary-dark transition-colors"
          >
            {submitText}
          </button>
        </div>
      </form>
    );
  };

  // Render add bookmark modal
  const renderAddBookmarkModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            Add New Bookmark
          </h3>
          {renderBookmarkForm(false, handleCreateBookmark)}
        </div>
      </div>
    );
  };

  // Render edit bookmark modal
  const renderEditBookmarkModal = () => {
    if (!showEditModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            Edit Bookmark
          </h3>
          {renderBookmarkForm(true, handleUpdateBookmark)}
        </div>
      </div>
    );
  };

  // Render delete bookmark confirmation modal
  const renderDeleteBookmarkModal = () => {
    if (!showDeleteModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-sm">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            Delete Bookmark
          </h3>
          <p className="text-gray-300 mb-6">
            Are you sure you want to delete "{editingBookmark?.title}"? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 rounded-md bg-dark-600 text-[#F8FAFC] hover:bg-dark-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteBookmark}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render move bookmark modal
  const renderMoveBookmarkModal = () => {
    if (!showMoveModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-sm">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            Move Bookmark
          </h3>
          <form onSubmit={handleMoveBookmark}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Select Folder
              </label>
              <select
                name="folderId"
                value={newBookmark.folderId}
                onChange={handleInputChange}
                className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
              >
                <option value="">No Folder</option>
                {folders.map((folder) => (
                  <option key={folder._id} value={folder._id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 rounded-md bg-dark-600 text-[#F8FAFC] hover:bg-dark-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-primary text-[#F8FAFC] hover:bg-primary-dark transition-colors"
              >
                Move
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[#F8FAFC]">
          {activeFolder ? activeFolder.name : 'All Bookmarks'}
        </h2>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-md transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Add Bookmark
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search bookmarks by title, URL, or tags..."
          className="w-full pl-10 pr-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X size={18} className="text-gray-400 hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Bookmarks list */}
      <div className="flex-grow overflow-y-auto">
        {isLoading ? (
          <LoadingSpinner message="Loading bookmarks..." />
        ) : isError ? (
          <div className="text-center text-red-500 py-4">
            {message || 'Error loading bookmarks'}
          </div>
        ) : bookmarks.length === 0 ? (
          <NoDataMessage
            title="No bookmarks found"
            message={
              searchTerm
                ? 'No bookmarks match your search. Try different keywords.'
                : activeFolder
                ? `You don't have any bookmarks in this folder yet.`
                : `You don't have any bookmarks yet.`
            }
            icon={<ExternalLink size={40} className="text-gray-400" />}
            buttonText="Add Your First Bookmark"
            onButtonClick={handleOpenAddModal}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark._id}
                className="bg-dark-800 rounded-lg p-4 hover:bg-dark-700 transition-colors border border-dark-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-[#F8FAFC] font-medium text-lg cursor-pointer hover:text-primary truncate"
                      onClick={() => openBookmark(bookmark.url)}
                    >
                      {bookmark.title}
                    </h3>
                    <a
                      href={bookmark.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400 text-sm truncate block mt-1"
                    >
                      {bookmark.url}
                    </a>
                    {bookmark.description && (
                      <p className="text-gray-300 mt-2 line-clamp-2">
                        {bookmark.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center ml-4">
                    <button
                      onClick={() => openBookmark(bookmark.url)}
                      className="p-1.5 rounded-full text-gray-400 hover:text-primary hover:bg-dark-600"
                      title="Open bookmark"
                    >
                      <ExternalLink size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-wrap gap-2">
                    {bookmark.folderId && (
                      <div
                        className="flex items-center text-xs bg-dark-600 text-blue-400 px-2 py-1 rounded"
                        title="Folder"
                      >
                        <Folder size={14} className="mr-1" />
                        {folders.find((f) => f._id === bookmark.folderId)
                          ?.name || 'Unknown folder'}
                      </div>
                    )}

                    {bookmark.tags && bookmark.tags.length > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <Tags size={14} className="text-gray-400" />
                        {Array.isArray(bookmark.tags) ? (
                          bookmark.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-dark-600 text-gray-300 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">{bookmark.tags}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openMoveModal(bookmark)}
                      className="p-1.5 rounded-full text-gray-400 hover:text-gray-300 hover:bg-dark-600"
                      title="Move bookmark"
                    >
                      <FolderCopy size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(bookmark)}
                      className="p-1.5 rounded-full text-gray-400 hover:text-gray-300 hover:bg-dark-600"
                      title="Edit bookmark"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(bookmark)}
                      className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-dark-600"
                      title="Delete bookmark"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {renderAddBookmarkModal()}
      {renderEditBookmarkModal()}
      {renderDeleteBookmarkModal()}
      {renderMoveBookmarkModal()}
    </div>
  );
};

BookmarksList.propTypes = {
  activeFolder: PropTypes.object,
};

export default BookmarksList;
