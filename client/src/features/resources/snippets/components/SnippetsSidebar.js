import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { Tag, Plus } from 'lucide-react';
import ResourceSidebar from '../../components/ResourceSidebar';
import { useNotifications } from '../../../../context/NotificationContext';
import {
  getCategories,
  createCategory,
} from '../../../../features/snippets/snippetCategorySlice';

/**
 * SnippetsSidebar Component
 *
 * A specialized sidebar for code snippet organization that provides:
 * - A category-based organization system for snippets
 * - Category selection functionality
 * - Visual indicators for the active category
 * - Add category functionality
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeCategory - The currently active category
 * @param {Function} props.setActiveCategory - Function to set the active category
 * @returns {React.ReactElement} The SnippetsSidebar component
 */
const SnippetsSidebar = ({ activeCategory, setActiveCategory }) => {
  const dispatch = useDispatch();
  const { showNotification } = useNotifications();

  // Get categories from Redux store
  const { categories, isLoading } = useSelector(
    (state) => state.snippetCategories
  );

  // Fetch categories when component mounts
  useEffect(() => {
    dispatch(getCategories());
  }, [dispatch]);

  // Handle add category click
  const handleAddCategory = () => {
    // This implementation could be enhanced with a modal to input category details
    // For now, we'll use prompt for simplicity
    const categoryName = window.prompt('Enter new category name:');
    if (categoryName?.trim()) {
      dispatch(createCategory({ name: categoryName.trim() }))
        .unwrap()
        .then(() => {
          showNotification('Category created successfully!', 'success');
        })
        .catch((error) => {
          showNotification(`Failed to create category: ${error}`, 'error');
        });
    }
  };

  // Calculate total snippet count
  const totalSnippetCount = categories.reduce((acc, category) => {
    // Category count might be stored in snippetCount field depending on API
    return acc + (category.snippetCount || category.count || 0);
  }, 0);

  return (
    <ResourceSidebar
      title="Categories"
      onAddClick={handleAddCategory}
      addButtonIcon={<Plus size={16} />}
      addButtonTitle="Add Category"
    >
      <div className="space-y-1">
        <div
          className={`flex items-center py-1.5 px-2 rounded-md hover:bg-dark-700 cursor-pointer ${
            !activeCategory ? 'bg-dark-700 text-primary' : 'text-[#F8FAFC]'
          }`}
          onClick={() => setActiveCategory(null)}
        >
          <Tag
            size={16}
            className={`mr-2 ${
              !activeCategory ? 'text-primary' : 'text-gray-400'
            }`}
          />
          <span className="flex-grow text-sm">All Snippets</span>
          <span className="text-xs text-gray-400 bg-dark-600 rounded-full px-2 py-0.5">
            {totalSnippetCount}
          </span>
        </div>

        {/* Separator */}
        <div className="border-b border-dark-600 my-2"></div>

        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-4 w-4 border-t-2 border-primary mx-auto"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-4 text-gray-400">
            No categories yet
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category._id}
              className={`flex items-center py-1.5 px-2 rounded-md hover:bg-dark-700 cursor-pointer ${
                activeCategory?._id === category._id
                  ? 'bg-dark-700 text-primary'
                  : 'text-[#F8FAFC]'
              }`}
              onClick={() => setActiveCategory(category)}
            >
              <Tag
                size={16}
                className={`mr-2 ${
                  activeCategory?._id === category._id
                    ? 'text-primary'
                    : 'text-gray-400'
                }`}
              />
              <span className="flex-grow text-sm">{category.name}</span>
              <span className="text-xs text-gray-400 bg-dark-600 rounded-full px-2 py-0.5">
                {category.snippetCount || category.count || 0}
              </span>
            </div>
          ))
        )}
      </div>
    </ResourceSidebar>
  );
};

SnippetsSidebar.propTypes = {
  activeCategory: PropTypes.object,
  setActiveCategory: PropTypes.func.isRequired,
};

export default SnippetsSidebar;
