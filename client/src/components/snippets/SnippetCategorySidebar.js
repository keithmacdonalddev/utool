import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  resetCategoryStatus,
} from '../../features/snippets/snippetCategorySlice';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFolder,
  FaFolderOpen,
} from 'react-icons/fa';

/**
 * SnippetCategorySidebar Component
 *
 * A sidebar component for displaying and managing snippet categories.
 * Allows users to:
 * - View a list of all categories
 * - Create new categories
 * - Edit existing categories
 * - Delete categories
 * - Select a category to filter snippets
 *
 * @param {Object} props - Component props
 * @param {Function} props.onCategorySelect - Function to call when a category is selected
 * @param {string} props.selectedCategoryId - The ID of the currently selected category
 */
const SnippetCategorySidebar = ({ onCategorySelect, selectedCategoryId }) => {
  const dispatch = useDispatch();
  const { categories, isLoading } = useSelector(
    (state) => state.snippetCategories
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editedName, setEditedName] = useState('');

  /**
   * Fetch categories when component mounts
   */
  useEffect(() => {
    dispatch(getCategories());
    // Clean up on component unmount
    return () => {
      dispatch(resetCategoryStatus());
    };
  }, [dispatch]);

  /**
   * Handle form submission for creating a new category
   *
   * @param {Event} e - The form submission event
   */
  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      dispatch(createCategory({ name: newCategoryName.trim() }));
      setNewCategoryName('');
      setShowAddForm(false);
    }
  };

  /**
   * Handle form submission for updating a category
   *
   * @param {Event} e - The form submission event
   */
  const handleUpdateCategory = (e) => {
    e.preventDefault();
    if (editedName.trim() && editingCategory) {
      dispatch(
        updateCategory({
          id: editingCategory._id,
          categoryData: { name: editedName.trim() },
        })
      );
      setEditingCategory(null);
      setEditedName('');
      setShowEditForm(false);
    }
  };

  /**
   * Set up editing for a category
   *
   * @param {Object} category - The category to edit
   */
  const handleEditClick = (category) => {
    setEditingCategory(category);
    setEditedName(category.name);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  /**
   * Handle category deletion with confirmation
   *
   * @param {string} id - The ID of the category to delete
   */
  const handleDeleteCategory = (id) => {
    if (
      window.confirm(
        'Are you sure you want to delete this category? Snippets in this category will be moved to "Uncategorized".'
      )
    ) {
      dispatch(deleteCategory(id));
      // If the deleted category is currently selected, reset selection
      if (id === selectedCategoryId) {
        onCategorySelect(null);
      }
    }
  };

  /**
   * Handle category selection
   *
   * @param {string} id - The ID of the category to select
   */
  const handleCategorySelect = (id) => {
    onCategorySelect(id === selectedCategoryId ? null : id);
  };

  /**
   * Cancel any active forms
   */
  const handleCancel = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setNewCategoryName('');
    setEditedName('');
    setEditingCategory(null);
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Categories
        </h3>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowEditForm(false);
          }}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          aria-label="Add category"
        >
          <FaPlus />
        </button>
      </div>

      {/* Add Category Form */}
      {showAddForm && (
        <form onSubmit={handleCreateCategory} className="mb-4">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
              aria-label="New category name"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Edit Category Form */}
      {showEditForm && editingCategory && (
        <form onSubmit={handleUpdateCategory} className="mb-4">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Category name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
              aria-label="Edit category name"
            />
          </div>
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Categories List */}
      <ul className="space-y-2">
        <li>
          <button
            onClick={() => onCategorySelect(null)}
            className={`w-full text-left p-2 rounded-md flex items-center ${
              !selectedCategoryId
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
            aria-label="Show all snippets"
          >
            {!selectedCategoryId ? (
              <FaFolderOpen className="mr-2" />
            ) : (
              <FaFolder className="mr-2" />
            )}
            All Snippets
          </button>
        </li>
        {categories.map((category) => (
          <li key={category._id}>
            <div className="flex items-center justify-between group">
              <button
                onClick={() => handleCategorySelect(category._id)}
                className={`flex-grow text-left p-2 rounded-md flex items-center ${
                  selectedCategoryId === category._id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                aria-label={`Select ${category.name} category`}
              >
                {selectedCategoryId === category._id ? (
                  <FaFolderOpen className="mr-2" />
                ) : (
                  <FaFolder className="mr-2" />
                )}
                {category.name}
              </button>
              <div className="hidden group-hover:flex">
                <button
                  onClick={() => handleEditClick(category)}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label={`Edit ${category.name} category`}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category._id)}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  aria-label={`Delete ${category.name} category`}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SnippetCategorySidebar;
