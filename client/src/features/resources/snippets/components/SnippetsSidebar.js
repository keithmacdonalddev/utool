import React from 'react';
import PropTypes from 'prop-types';
import { Tag, Plus } from 'lucide-react';
import Button from '../../../../components/common/Button';
import ResourceSidebar from '../../components/ResourceSidebar';
import { useNotifications } from '../../../../context/NotificationContext';

/**
 * SnippetsSidebar Component
 *
 * A specialized sidebar for code snippet organization that provides:
 * - A category-based organization system for snippets
 * - Category selection functionality
 * - Visual indicators for the active category
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeCategory - The currently active category
 * @param {Function} props.setActiveCategory - Function to set the active category
 * @returns {React.ReactElement} The SnippetsSidebar component
 */
const SnippetsSidebar = ({ activeCategory, setActiveCategory }) => {
  const { showNotification } = useNotifications();

  // This is a placeholder for snippet categories/folders
  // In a real implementation, these would come from the Redux store
  const demoCategories = [
    { id: 'js', name: 'JavaScript', count: 5 },
    { id: 'css', name: 'CSS', count: 3 },
    { id: 'react', name: 'React', count: 7 },
    { id: 'node', name: 'Node.js', count: 4 },
  ];

  // Handle add category click
  const handleAddCategory = () => {
    // This is a placeholder that would be replaced with actual implementation
    showNotification('Snippet categories coming soon', 'info');
  };

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
            {demoCategories.reduce((acc, cat) => acc + cat.count, 0)}
          </span>
        </div>

        {/* Separator */}
        <div className="border-b border-dark-600 my-2"></div>

        {demoCategories.map((category) => (
          <div
            key={category.id}
            className={`flex items-center py-1.5 px-2 rounded-md hover:bg-dark-700 cursor-pointer ${
              activeCategory?.id === category.id
                ? 'bg-dark-700 text-primary'
                : 'text-[#F8FAFC]'
            }`}
            onClick={() => setActiveCategory(category)}
          >
            <Tag
              size={16}
              className={`mr-2 ${
                activeCategory?.id === category.id
                  ? 'text-primary'
                  : 'text-gray-400'
              }`}
            />
            <span className="flex-grow text-sm">{category.name}</span>
            <span className="text-xs text-gray-400 bg-dark-600 rounded-full px-2 py-0.5">
              {category.count}
            </span>
          </div>
        ))}
      </div>
    </ResourceSidebar>
  );
};

SnippetsSidebar.propTypes = {
  activeCategory: PropTypes.object,
  setActiveCategory: PropTypes.func.isRequired,
};

export default SnippetsSidebar;
