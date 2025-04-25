import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  ExternalLink,
  Clipboard,
  Search,
  Plus,
  Folder,
  FolderPlus,
  FolderMinus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash,
  List,
  Tag,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import Button from '../components/common/Button';
import {
  getBookmarks,
  createBookmark,
  updateBookmark,
} from '../features/bookmarks/bookmarkSlice';
import { getSnippets } from '../features/snippets/snippetSlice';
import {
  getFolders,
  createFolder,
  deleteFolder,
  updateFolder,
  getFolderBookmarks,
  setFolderExpanded,
} from '../features/bookmarks/bookmarkFolderSlice';

const ResourcesPage = () => {
  const dispatch = useDispatch();
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('bookmarks');
  const [searchTerm, setSearchTerm] = useState('');

  // Local UI state
  const [activeFolder, setActiveFolder] = useState(null);
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState(false);
  const [newBookmark, setNewBookmark] = useState({
    title: '',
    url: '',
    description: '',
    folderId: null,
  });

  // Get data from Redux store
  const {
    bookmarks,
    isLoading: bookmarksLoading,
    isError: bookmarksError,
    message: bookmarksMessage,
  } = useSelector((state) => state.bookmarks);

  const {
    folders,
    currentFolderBookmarks,
    isLoading: foldersLoading,
    isError: foldersError,
    message: foldersMessage,
  } = useSelector((state) => state.bookmarkFolders);

  const {
    snippets,
    isLoading: snippetsLoading,
    isError: snippetsError,
    message: snippetsMessage,
  } = useSelector((state) => state.snippets);

  // Reset active folder when changing tabs
  useEffect(() => {
    setActiveFolder(null);
  }, [activeTab]);

  // Load data on component mount
  useEffect(() => {
    dispatch(getBookmarks());
    dispatch(getSnippets());
    dispatch(getFolders());
  }, [dispatch]);

  // Load folder bookmarks when active folder changes
  useEffect(() => {
    if (activeTab === 'bookmarks' && activeFolder) {
      dispatch(getFolderBookmarks(activeFolder._id));
    }
    // For other resource types, we would add similar logic here
  }, [activeFolder, activeTab, dispatch]);

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

  // Filter bookmarks/snippets based on search term
  const filteredBookmarks = bookmarks.filter(
    (bookmark) =>
      bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSnippets = snippets.filter(
    (snippet) =>
      snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snippet.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      snippet.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get bookmarks for the current folder
  const folderBookmarks = activeFolder ? currentFolderBookmarks : [];

  // Toggle folder expanded state
  const toggleFolderExpanded = (folder) => {
    dispatch(
      setFolderExpanded({
        id: folder._id,
        expanded: !folder.expanded,
      })
    );
  };

  // Add new folder
  const handleAddFolder = () => {
    if (!newFolderName.trim()) {
      showNotification('Name cannot be empty', 'error');
      return;
    }

    const newFolder = {
      name: newFolderName.trim(),
      parentId: newFolderParentId,
      expanded: false,
    };

    dispatch(createFolder(newFolder))
      .unwrap()
      .then(() => {
        setNewFolderName('');
        setShowNewFolderForm(false);
        showNotification('Folder created successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to create folder', 'error');
      });
  };

  // Delete folder
  const handleDeleteFolder = () => {
    if (!folderToDelete) return;

    // Check if folder has children
    const hasChildren = folders.some(
      (folder) => folder.parentId === folderToDelete._id
    );

    // Check if folder has bookmarks
    const hasBookmarks = bookmarks.some(
      (bookmark) => bookmark.folderId === folderToDelete._id
    );

    const shouldConfirm = hasChildren || hasBookmarks;

    dispatch(
      deleteFolder({
        id: folderToDelete._id,
        confirm: shouldConfirm,
      })
    )
      .unwrap()
      .then(() => {
        if (activeFolder && activeFolder._id === folderToDelete._id) {
          setActiveFolder(null);
        }
        setFolderToDelete(null);
        setShowDeleteConfirm(false);
        showNotification('Folder deleted successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to delete folder', 'error');
      });
  };

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
          description: '',
          folderId: activeFolder ? activeFolder._id : null,
        });
        setShowAddBookmarkModal(false);
        showNotification('Bookmark created successfully', 'success');

        // Refresh folder bookmarks if needed
        if (activeFolder) {
          dispatch(getFolderBookmarks(activeFolder._id));
        }
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

        // Refresh bookmarks if needed
        if (activeFolder) {
          dispatch(getFolderBookmarks(activeFolder._id));
        }
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to move bookmark', 'error');
      });
  };

  // Get parent folders (folders with no parents)
  const parentFolders = folders.filter((folder) => !folder.parentId);

  // Render folder with its children - for bookmarks
  const renderBookmarkFolder = (folder) => {
    const childFolders = folders.filter((f) => f.parentId === folder._id);
    const hasChildren = childFolders.length > 0;
    const isActive = activeFolder?._id === folder._id;

    return (
      <div key={folder._id} className="mb-1">
        <div
          className={`flex items-center py-1 px-2 rounded-md hover:bg-dark-700 cursor-pointer group ${
            isActive ? 'bg-dark-700 text-primary' : 'text-[#F8FAFC]'
          }`}
        >
          <button
            className="mr-1 w-5 h-5 flex items-center justify-center text-gray-400"
            onClick={() => toggleFolderExpanded(folder)}
          >
            {hasChildren ? (
              folder.expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          <Folder
            size={16}
            className={`mr-2 ${isActive ? 'text-primary' : 'text-gray-400'}`}
          />

          <span
            className="flex-grow text-sm font-medium"
            onClick={() => setActiveFolder(folder)}
          >
            {folder.name}
          </span>

          {/* Fixed-width container for action buttons to prevent layout shifts */}
          <div className="w-14 flex justify-end">
            <div className="hidden group-hover:flex items-center">
              <button
                className="p-1 hover:bg-dark-600 rounded-full"
                title="Add subfolder"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewFolderParentId(folder._id);
                  setShowNewFolderForm(true);
                }}
              >
                <FolderPlus size={14} className="text-gray-400" />
              </button>
              <button
                className="p-1 hover:bg-dark-600 rounded-full"
                title="Delete folder"
                onClick={(e) => {
                  e.stopPropagation();
                  setFolderToDelete(folder);
                  setShowDeleteConfirm(true);
                }}
              >
                <FolderMinus size={14} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {folder.expanded && hasChildren && (
          <div className="pl-4 mt-1 border-l border-dark-600">
            {childFolders.map((childFolder) =>
              renderBookmarkFolder(childFolder)
            )}
          </div>
        )}
      </div>
    );
  };

  // Render snippet categories - placeholder for future implementation
  const renderSnippetCategories = () => {
    // This is a placeholder for snippet categories/folders
    const demoCategories = [
      { id: 'js', name: 'JavaScript', count: 5 },
      { id: 'css', name: 'CSS', count: 3 },
      { id: 'react', name: 'React', count: 7 },
      { id: 'node', name: 'Node.js', count: 4 },
    ];

    return (
      <div className="space-y-1">
        {demoCategories.map((category) => (
          <div
            key={category.id}
            className="flex items-center py-1.5 px-2 rounded-md hover:bg-dark-700 cursor-pointer"
          >
            <Tag size={16} className="mr-2 text-gray-400" />
            <span className="flex-grow text-sm text-[#F8FAFC]">
              {category.name}
            </span>
            <span className="text-xs text-gray-400 bg-dark-600 rounded-full px-2 py-0.5">
              {category.count}
            </span>
          </div>
        ))}
        <div className="text-center mt-4">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            <Plus size={14} className="mr-1" />
            Add Category
          </Button>
        </div>
      </div>
    );
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newBookmark.description}
                onChange={(e) =>
                  setNewBookmark({
                    ...newBookmark,
                    description: e.target.value,
                  })
                }
                placeholder="Add a description"
                className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary resize-none h-24"
              />
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

  // Get the appropriate container title based on active tab
  const getContainerTitle = () => {
    switch (activeTab) {
      case 'bookmarks':
        return 'Folders';
      case 'snippets':
        return 'Categories';
      default:
        return 'Navigation';
    }
  };

  // Get the appropriate add button based on active tab
  const getAddButtonTitle = () => {
    switch (activeTab) {
      case 'bookmarks':
        return 'Add Folder';
      case 'snippets':
        return 'Add Category';
      default:
        return 'Add New';
    }
  };

  // Handle add button click based on active tab
  const handleAddContainerItem = () => {
    switch (activeTab) {
      case 'bookmarks':
        setNewFolderParentId(null);
        setShowNewFolderForm(true);
        break;
      case 'snippets':
        // Future implementation for adding snippet categories
        showNotification('Snippet categories coming soon', 'info');
        break;
      default:
        break;
    }
  };

  // Render the appropriate container content based on active tab
  const renderContainerContent = () => {
    switch (activeTab) {
      case 'bookmarks':
        return foldersLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : foldersError ? (
          <div className="text-center text-red-500 py-4 text-sm">
            {foldersMessage || 'Failed to load folders'}
          </div>
        ) : (
          <div>
            {/* All Bookmarks option to return to root */}
            <div
              className={`flex items-center py-1 px-2 mb-2 rounded-md hover:bg-dark-700 cursor-pointer ${
                !activeFolder ? 'bg-dark-700 text-primary' : 'text-[#F8FAFC]'
              }`}
              onClick={() => setActiveFolder(null)}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <span className="w-4" />
              </span>
              <ExternalLink
                size={16}
                className={`mr-2 ${
                  !activeFolder ? 'text-primary' : 'text-gray-400'
                }`}
              />
              <span className="flex-grow text-sm font-medium">
                All Bookmarks
              </span>
            </div>

            {/* Separator */}
            <div className="border-b border-dark-600 my-2"></div>

            {parentFolders.length === 0 ? (
              <div className="text-center text-gray-400 py-4 text-sm">
                No folders created yet
              </div>
            ) : (
              parentFolders.map((folder) => renderBookmarkFolder(folder))
            )}
          </div>
        );

      case 'snippets':
        return renderSnippetCategories();

      default:
        return (
          <div className="text-center text-gray-400 py-4 text-sm">
            Select a resource type
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      {/* Header with back button, title, and add button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Resources</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'bookmarks' ? (
            <Button
              variant="primary"
              onClick={() => setShowAddBookmarkModal(true)}
              title="Add new bookmark"
            >
              <Plus size={18} className="mr-2" />
              Add Bookmark
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => alert('Add Snippet modal')}
              title="Add new snippet"
            >
              <Plus size={18} className="mr-2" />
              Add Snippet
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-600 mb-4">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'bookmarks'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('bookmarks')}
        >
          <ExternalLink size={18} className="inline-block mr-2" />
          Bookmarks
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'snippets'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('snippets')}
        >
          <Clipboard size={18} className="inline-block mr-2" />
          Snippets
        </button>
      </div>

      {/* Content area with resource navigation sidebar and content */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Resource navigation sidebar */}
        <div className="w-64 flex flex-col bg-app-sidebar rounded-lg border border-sidebar-border shadow-xl p-2">
          {/* Navigation container with scroll - adaptable to resource type */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Container header with dynamic title - moved inside the container */}
            <div className="flex justify-between items-center mb-2 px-1">
              <h3 className="text-[#F8FAFC] font-semibold">
                {getContainerTitle()}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                title={getAddButtonTitle()}
                onClick={handleAddContainerItem}
              >
                {activeTab === 'bookmarks' ? (
                  <FolderPlus size={16} />
                ) : (
                  <Plus size={16} />
                )}
              </Button>
            </div>

            {renderContainerContent()}

            {/* New folder/category form - only visible for bookmarks for now */}
            {activeTab === 'bookmarks' && showNewFolderForm && (
              <div className="bg-dark-700 rounded-md p-3 my-2 border border-dark-600">
                <h4 className="text-sm font-medium text-[#F8FAFC] mb-2">
                  {newFolderParentId ? 'New Subfolder' : 'New Folder'}
                </h4>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full py-1 px-2 mb-3 bg-dark-800 border border-dark-600 rounded-md text-[#F8FAFC] text-sm focus:outline-none focus:border-primary"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewFolderForm(false);
                      setNewFolderName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleAddFolder}>
                    Create
                  </Button>
                </div>
              </div>
            )}

            {/* Delete confirmation - only visible for bookmarks for now */}
            {activeTab === 'bookmarks' &&
              showDeleteConfirm &&
              folderToDelete && (
                <div className="bg-dark-700 rounded-md p-3 my-2 border border-dark-600">
                  <h4 className="text-sm font-medium text-[#F8FAFC] mb-2">
                    Delete Folder
                  </h4>
                  <p className="text-sm text-gray-300 mb-3">
                    Are you sure you want to delete "{folderToDelete.name}"?
                    {folders.some((f) => f.parentId === folderToDelete._id) && (
                      <span className="text-red-400 block mt-1">
                        Warning: This folder has subfolders that will also be
                        deleted.
                      </span>
                    )}
                    {bookmarks.some(
                      (b) => b.folderId === folderToDelete._id
                    ) && (
                      <span className="text-red-400 block mt-1">
                        Warning: This folder contains bookmarks that will also
                        be deleted.
                      </span>
                    )}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setFolderToDelete(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDeleteFolder}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-grow flex flex-col min-h-0 bg-app-sidebar rounded-lg border border-sidebar-border shadow-xl p-4">
          {/* Search bar moved to be above bookmarks area */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full py-2 px-4 pl-10 bg-app-input border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
            />
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-gray-400"
            />
          </div>

          {activeTab === 'bookmarks' && (
            <div className="flex-1 overflow-y-auto">
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
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-[#F8FAFC]">
                      {activeFolder.name}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {folderBookmarks.length === 0
                        ? 'No bookmarks in this folder yet'
                        : `${folderBookmarks.length} bookmark${
                            folderBookmarks.length === 1 ? '' : 's'
                          }`}
                    </p>
                  </div>

                  {foldersLoading ? (
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
                              Description
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                                {bookmark.title}
                              </td>
                              <td className="px-6 py-4 max-w-xs truncate text-sm text-[#C7C9D1]">
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
                              <td
                                className="px-6 py-4 max-w-xs text-sm text-[#C7C9D1] truncate"
                                title={bookmark.description}
                              >
                                {bookmark.description}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleCopy(bookmark.url)}
                                    className="text-gray-400 hover:text-white"
                                    title="Copy URL"
                                  >
                                    <Clipboard size={16} />
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
              ) : filteredBookmarks.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  {searchTerm
                    ? 'No bookmarks match your search'
                    : 'No bookmarks yet. Create your first one!'}
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
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-dark-700">
                      {filteredBookmarks.map((bookmark) => (
                        <tr
                          key={bookmark._id}
                          className="hover:bg-dark-700 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                            {bookmark.title}
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate text-sm text-[#C7C9D1]">
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
                          <td
                            className="px-6 py-4 max-w-xs text-sm text-[#C7C9D1] truncate"
                            title={bookmark.description}
                          >
                            {bookmark.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleCopy(bookmark.url)}
                                className="text-gray-400 hover:text-white"
                                title="Copy URL"
                              >
                                <Clipboard size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'snippets' && (
            <div className="flex-1 overflow-y-auto">
              {snippetsLoading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-foreground">Loading snippets...</p>
                </div>
              ) : snippetsError ? (
                <div className="text-center text-red-500 py-6">
                  {snippetsMessage || 'Error loading snippets'}
                </div>
              ) : filteredSnippets.length === 0 ? (
                <div className="text-center text-gray-400 py-10">
                  {searchTerm
                    ? 'No snippets match your search'
                    : 'No snippets yet. Create your first one!'}
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
                          Language
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                          Content
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-dark-700">
                      {filteredSnippets.map((snippet) => (
                        <tr
                          key={snippet._id}
                          className="hover:bg-dark-700 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                            {snippet.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1]">
                            {snippet.language}
                          </td>
                          <td className="px-6 py-4 max-w-xs text-sm text-[#C7C9D1]">
                            <div className="relative group max-w-xs">
                              <span className="block truncate">
                                {snippet.content}
                              </span>
                              <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-48 bg-dark-700 text-white text-xs p-2 rounded shadow-lg whitespace-normal break-words">
                                {snippet.content}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleCopy(snippet.content)}
                                className="text-gray-400 hover:text-white"
                                title="Copy snippet content"
                              >
                                <Clipboard size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Bookmark Modal */}
      {renderAddBookmarkModal()}
    </div>
  );
};

export default ResourcesPage;
