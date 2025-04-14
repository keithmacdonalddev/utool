import React, { useState } from 'react';
import { Search, Tag, Layers, ChevronDown, ChevronUp } from 'lucide-react'; // Added Chevron icons
import Button from '../common/Button';

const KbSearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false); // State for advanced options visibility

  const handleSearch = (e) => {
    e.preventDefault();
    const searchParams = {
      query: query.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(t => t), // Split and clean tags
      categories: categories.split(',').map(c => c.trim()).filter(c => c), // Split and clean categories
    };
    onSearch(searchParams);
  };

  const clearSearch = () => {
    setQuery('');
    setTags('');
    setCategories('');
    setShowAdvanced(false); // Hide advanced on clear
    onSearch({});
  };

  return (
    // Reduced margin-bottom and padding
    <form onSubmit={handleSearch} className="mb-4 p-3 bg-dark-800 border border-dark-700 rounded-lg shadow-card">
      {/* Basic Search Row - Reduced gap and margin-bottom */}
      <div className="flex flex-wrap gap-2 items-end mb-3">
        {/* Search Query */}
        <div className="flex-grow min-w-[150px]"> {/* Added min-width */}
          {/* Removed Label */}
          <div className="relative">
            <input
              type="text"
              id="kb-search-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or content..."
              className="shadow-lg focus:ring-accent-purple focus:border-accent-purple block w-full text-base border-[#393A41] bg-[#282A36] text-[#F8FAFC] placeholder-[#C7C9D1] rounded-full pl-8 pr-2 py-2"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
          </div>
        </div>
        {/* Search Button */}
        <Button
          type="submit"
          variant="primary"
          className="rounded-xl px-5 py-2 ml-2 flex items-center gap-2"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Search
        </Button>
        {/* Advanced Search Toggle */}
        <Button
          type="button"
          variant={showAdvanced ? 'primary' : 'secondary'}
          className="rounded-xl px-5 py-2 ml-2 flex items-center gap-2"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced
        </Button>
      </div>

       {/* Advanced Search Options (Conditional) */}
      {showAdvanced && (
        // Reduced gap, padding-top, margin-top
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end border-t pt-3 mt-3">
          {/* Tags Filter */}
          <div className="min-w-[150px]"> {/* Added min-width */}
            <label htmlFor="kb-search-tags" className="block text-xs font-medium text-[#F8FAFC] mb-1"> {/* Smaller label */}
              Tags (comma-separated)
          </label>
           <div className="relative">
            <input
              type="text"
              id="kb-search-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., react, nodejs"
              // Smaller text, padding, and rounded corners
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border-gray-300 rounded pl-8 pr-2 py-1.5"
            />
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Tag className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
          </div>
        </div>

          {/* Categories Filter */}
          <div className="min-w-[150px]"> {/* Added min-width */}
            <label htmlFor="kb-search-categories" className="block text-xs font-medium text-[#F8FAFC] mb-1"> {/* Smaller label */}
              Categories (comma-separated)
          </label>
           <div className="relative">
            <input
              type="text"
              id="kb-search-categories"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="e.g., frontend, backend"
              // Smaller text, padding, and rounded corners
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full text-sm border-gray-300 rounded pl-8 pr-2 py-1.5"
            />
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Layers className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
          </div>
        </div>

          {/* Clear Button - Show only in advanced */}
          <div className="md:col-span-2 flex justify-end items-end"> {/* Span 2 cols on medium+ */}
              <button
                type="button"
                onClick={clearSearch}
                // Smaller padding and text
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
          </div>
        </div>
      )}
    </form>
  );
};

export default KbSearchBar;
