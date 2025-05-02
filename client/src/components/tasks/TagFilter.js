// filepath: c:\Users\macdo\Documents\Cline\mern-productivity-app\client\src\components\tasks\TagFilter.js
import React, { useState, useEffect } from 'react';
import { Tag, X } from 'lucide-react';

/**
 * TagFilter Component
 *
 * A component that displays available tags from tasks and allows filtering
 * tasks by clicking on tags. Selected tags are highlighted and can be clicked
 * again to deselect.
 *
 * @param {Object} props - Component props
 * @param {Array} props.tasks - Array of task objects to extract tags from
 * @param {Array} props.selectedTags - Array of currently selected tags
 * @param {Function} props.onTagSelect - Callback when a tag is selected, receives tag string
 * @param {Function} props.onTagDeselect - Callback when a tag is deselected, receives tag string
 * @param {Function} props.onClearAll - Callback when all tags are cleared
 * @returns {JSX.Element} - The rendered component
 */
const TagFilter = ({
  tasks = [],
  selectedTags = [],
  onTagSelect,
  onTagDeselect,
  onClearAll,
}) => {
  const [availableTags, setAvailableTags] = useState([]);

  // Extract unique tags from all tasks
  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setAvailableTags([]);
      return;
    }

    // Collect all tags from all tasks
    const allTags = tasks.reduce((acc, task) => {
      if (task.tags && Array.isArray(task.tags)) {
        return [...acc, ...task.tags];
      }
      return acc;
    }, []);

    // Remove duplicates
    const uniqueTags = [...new Set(allTags)];
    setAvailableTags(uniqueTags);
  }, [tasks]);

  /**
   * Handle tag click
   * Selects or deselects a tag based on its current state
   *
   * @param {string} tag - The tag that was clicked
   */
  const handleTagClick = (tag) => {
    if (selectedTags.includes(tag)) {
      onTagDeselect(tag);
    } else {
      onTagSelect(tag);
    }
  };

  // If no tags are available, don't render the component
  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        <Tag size={16} className="text-primary mr-2" />
        <h3 className="text-sm font-medium text-foreground">Filter by Tags</h3>

        {selectedTags.length > 0 && (
          <button
            onClick={onClearAll}
            className="ml-auto text-xs text-gray-400 hover:text-primary"
            aria-label="Clear all tag filters"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`
              flex items-center text-xs px-2 py-1 rounded-full transition-colors
              ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-white'
                  : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
              }
            `}
            aria-label={
              selectedTags.includes(tag)
                ? `Remove tag filter: ${tag}`
                : `Filter by tag: ${tag}`
            }
            aria-pressed={selectedTags.includes(tag)}
          >
            {tag}
            {selectedTags.includes(tag) && <X size={12} className="ml-1" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagFilter;
