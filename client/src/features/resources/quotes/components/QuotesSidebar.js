import React from 'react';
import PropTypes from 'prop-types';
import { Quote } from 'lucide-react';
import ResourceSidebar from '../../components/ResourceSidebar';

/**
 * QuotesSidebar Component
 *
 * A simple sidebar for favorite quotes that provides:
 * - Display for all user's favorite quotes
 * - Visual indicators for selected quotes
 * - Future extensibility for additional categories when needed
 *
 * Currently simplified to only show "All Quotes" since quotes are only added
 * when a user favorites a daily quote from the dashboard.
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeCategory - The currently active category
 * @param {Function} props.setActiveCategory - Function to set the active category
 * @returns {React.ReactElement} The QuotesSidebar component
 */
const QuotesSidebar = ({ activeCategory, setActiveCategory }) => {
  // This is a simplified list with just "All Quotes" for now
  // In a future implementation, additional categories could be added
  const categories = [{ id: 'all', name: 'All Quotes', icon: Quote }];

  return (
    <ResourceSidebar
      title="Favorite Quotes"
      hideAddButton={true} // Hide the add button for categories
    >
      <div className="space-y-1">
        {categories.map((category) => {
          const IconComponent = category.icon;
          const isActive = activeCategory?.id === category.id;
          const isAllQuotes = category.id === 'all';

          return (
            <div
              key={category.id}
              className={`flex items-center py-1.5 px-2 rounded-md hover:bg-dark-700 cursor-pointer ${
                isActive || (isAllQuotes && !activeCategory)
                  ? 'bg-dark-700 text-primary'
                  : 'text-[#F8FAFC]'
              }`}
              onClick={() => setActiveCategory(isAllQuotes ? null : category)}
            >
              <IconComponent
                size={16}
                className={`mr-2 ${
                  isActive || (isAllQuotes && !activeCategory)
                    ? 'text-primary'
                    : 'text-gray-400'
                }`}
              />
              <span className="flex-grow text-sm">{category.name}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-dark-600 pt-4">
        <div className="text-xs text-gray-400">
          <p className="mb-2">
            Your favorite quotes from the daily dashboard will appear here.
          </p>
          <p>
            You can easily copy your favorite quotes to clipboard for use in
            other applications.
          </p>
        </div>
      </div>
    </ResourceSidebar>
  );
};

QuotesSidebar.propTypes = {
  activeCategory: PropTypes.object,
  setActiveCategory: PropTypes.func.isRequired,
};

export default QuotesSidebar;
