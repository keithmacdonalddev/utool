import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { Folder, FolderPlus, Star, Pencil } from 'lucide-react';
import ResourceSidebar from '../../components/ResourceSidebar';
import { useNotifications } from '../../../../context/NotificationContext';
import {
  createFolder,
  updateFolder,
  deleteFolder,
} from '../../../../features/bookmarks/bookmarkFolderSlice';

/**
 * BookmarksSidebar Component
 *
 * A specialized sidebar for bookmark navigation that displays:
 * - Favorites option for favorite bookmarks
 * - List of user's bookmark folders
 * - Controls to edit and delete folders with a simple pencil icon
 *
 * This component works in conjunction with the BookmarksFeature to
 * provide folder-based organization and navigation of bookmarks.
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeFolder - Currently selected folder
 * @param {Function} props.setActiveFolder - Function to set active folder
 * @returns {React.ReactElement} The BookmarksSidebar component
 */
const BookmarksSidebar = ({ activeFolder, setActiveFolder }) => {
  const dispatch = useDispatch();
  const { showNotification } = useNotifications();

  // Local state
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState(null);

  // Get folders from Redux store
  const {
    folders,
    isLoading: foldersLoading,
    isError: foldersError,
    message: foldersMessage,
  } = useSelector((state) => state.bookmarkFolders);

  // Handle selecting a folder
  const handleSelectFolder = (folder) => {
    setActiveFolder(folder);
  };

  // Handle showing all bookmarks (clear active folder)
  const handleShowAllBookmarks = () => {
    setActiveFolder(null);
  };

  // Handle add folder
  const handleAddFolder = (e) => {
    e.preventDefault();

    if (!newFolderName.trim()) {
      showNotification('Folder name cannot be empty', 'error');
      return;
    }

    dispatch(createFolder({ name: newFolderName.trim() }))
      .unwrap()
      .then(() => {
        setNewFolderName('');
        setShowAddFolderModal(false);
        showNotification('Folder created successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to create folder', 'error');
      });
  };

  // Handle edit folder
  const handleEditFolder = (e) => {
    e.preventDefault();

    if (!newFolderName.trim()) {
      showNotification('Folder name cannot be empty', 'error');
      return;
    }

    dispatch(
      updateFolder({
        id: editingFolder._id,
        folderData: { name: newFolderName.trim() },
      })
    )
      .unwrap()
      .then(() => {
        setShowEditFolderModal(false);
        setEditingFolder(null);
        setNewFolderName('');
        showNotification('Folder updated successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to update folder', 'error');
      });
  };

  // Handle delete folder
  const handleDeleteFolder = () => {
    if (!editingFolder) return;

    dispatch(deleteFolder({ id: editingFolder._id }))
      .unwrap()
      .then(() => {
        // If the deleted folder was the active folder, reset active folder
        if (activeFolder && activeFolder._id === editingFolder._id) {
          setActiveFolder(null);
        }

        setShowEditFolderModal(false);
        setEditingFolder(null);
        showNotification('Folder deleted successfully', 'success');
      })
      .catch((error) => {
        showNotification(error.message || 'Failed to delete folder', 'error');
      });
  };

  // Open edit folder modal
  const openEditFolderModal = (folder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setShowEditFolderModal(true);
  };

  // Render add folder modal
  const renderAddFolderModal = () => {
    if (!showAddFolderModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-sm">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            Create New Folder
          </h3>
          <form onSubmit={handleAddFolder}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddFolderModal(false)}
                className="px-4 py-2 rounded-md bg-dark-600 text-[#F8FAFC] hover:bg-dark-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-primary text-[#F8FAFC] hover:bg-primary-dark transition-colors"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render edit folder modal with both rename and delete options
  const renderEditFolderModal = () => {
    if (!showEditFolderModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-dark-800 rounded-lg p-6 w-full max-w-sm">
          <h3 className="text-lg font-medium text-[#F8FAFC] mb-4">
            Edit Folder
          </h3>
          <form onSubmit={handleEditFolder}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full py-2 px-3 bg-dark-700 border border-dark-600 rounded-md text-[#F8FAFC] focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-3 mt-6">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditFolderModal(false)}
                  className="px-4 py-2 rounded-md bg-dark-600 text-[#F8FAFC] hover:bg-dark-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-primary text-[#F8FAFC] hover:bg-primary-dark transition-colors"
                >
                  Rename
                </button>
              </div>
              <div className="border-t border-dark-600 pt-4 mt-2">
                <p className="text-sm text-gray-400 mb-3">
                  Danger zone: This action cannot be undone
                </p>
                <button
                  type="button"
                  onClick={handleDeleteFolder}
                  className="w-full px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  Delete Folder
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <ResourceSidebar
      title="Bookmarks"
      addButtonIcon={<FolderPlus size={14} />}
      onAddClick={() => setShowAddFolderModal(true)}
      addButtonTitle="Create new folder"
    >
      {/* Default 'Favorites' option */}
      <button
        onClick={handleShowAllBookmarks}
        className={`w-full flex items-center text-sm text-left px-3 py-2 rounded-md mb-1 ${
          !activeFolder
            ? 'bg-primary bg-opacity-20 text-primary'
            : 'text-gray-300 hover:bg-dark-700'
        }`}
      >
        <Star size={16} className="mr-2" />
        Favorites
      </button>

      {/* Folders loading state */}
      {foldersLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-400">Loading folders...</p>
        </div>
      ) : foldersError ? (
        <div className="text-center text-red-500 py-4">
          {foldersMessage || 'Error loading folders'}
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          No folders yet. Create your first one!
        </div>
      ) : (
        <div className="space-y-1">
          {folders.map((folder) => (
            <div key={folder._id} className="relative group">
              {/* Unified folder row with combined hover effect */}
              <div
                className={`flex items-center px-1 rounded-md ${
                  activeFolder && activeFolder._id === folder._id
                    ? 'bg-primary bg-opacity-20'
                    : 'hover:bg-dark-700'
                }`}
              >
                {/* Folder content area (expands to fill available space) */}
                <div
                  className="flex-grow flex items-center cursor-pointer py-2 px-2"
                  onClick={() => handleSelectFolder(folder)}
                >
                  <Folder
                    size={16}
                    className={`mr-2 flex-shrink-0 ${
                      activeFolder && activeFolder._id === folder._id
                        ? 'text-primary'
                        : 'text-gray-300'
                    }`}
                  />
                  <span
                    className={`truncate ${
                      activeFolder && activeFolder._id === folder._id
                        ? 'text-primary'
                        : 'text-gray-300'
                    }`}
                  >
                    {folder.name}
                  </span>
                </div>

                {/* Edit button (part of the same row) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditFolderModal(folder);
                  }}
                  className="p-1.5 rounded-full text-gray-400 hover:text-blue-400 hover:bg-dark-600"
                  title="Edit folder"
                  aria-label="Edit folder"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {renderAddFolderModal()}
      {renderEditFolderModal()}
    </ResourceSidebar>
  );
};

BookmarksSidebar.propTypes = {
  activeFolder: PropTypes.object,
  setActiveFolder: PropTypes.func.isRequired,
};

export default BookmarksSidebar;
