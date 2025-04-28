import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ExternalLink, Clipboard, Plus, Star } from 'lucide-react';
import Button from '../components/common/Button';
import { getBookmarks } from '../features/bookmarks/bookmarkSlice';
import { getSnippets } from '../features/snippets/snippetSlice';
import { getFolders } from '../features/bookmarks/bookmarkFolderSlice';
import ResourceLayout from '../features/resources/components/ResourceLayout';
import BookmarksFeature from '../features/resources/bookmarks/BookmarksFeature';
import SnippetsFeature from '../features/resources/snippets/SnippetsFeature';
import BookmarksSidebar from '../features/resources/bookmarks/components/BookmarksSidebar';
import SnippetsSidebar from '../features/resources/snippets/components/SnippetsSidebar';

/**
 * ResourcesPage Component
 *
 * A comprehensive page for managing various types of resources including:
 * - Favorites (bookmarks)
 * - Code snippets
 *
 * This component has been refactored to use a more modular approach with
 * separate feature components for each resource type.
 *
 * @returns {React.ReactElement} The ResourcesPage component
 */
const ResourcesPage = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('bookmarks');
  const [activeFolder, setActiveFolder] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  // Track which resource types have been loaded
  const [loadedResources, setLoadedResources] = useState({
    bookmarks: false,
    snippets: false,
  });

  // Reset active selection when changing tabs
  useEffect(() => {
    setActiveFolder(null);
    setActiveCategory(null);
  }, [activeTab]);

  /**
   * On-demand data loading based on active tab
   * Only loads data for a tab the first time it's selected
   * This prevents unnecessary API calls while ensuring data is available when needed
   */
  useEffect(() => {
    if (activeTab === 'bookmarks' && !loadedResources.bookmarks) {
      // Only load bookmarks data the first time the bookmarks tab is activated
      dispatch(getBookmarks());
      dispatch(getFolders());
      setLoadedResources((prev) => ({ ...prev, bookmarks: true }));
    } else if (activeTab === 'snippets' && !loadedResources.snippets) {
      // Only load snippets data the first time the snippets tab is activated
      dispatch(getSnippets());
      setLoadedResources((prev) => ({ ...prev, snippets: true }));
    }
  }, [activeTab, loadedResources, dispatch]);

  // Tab configuration
  const tabs = [
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Star,
    },
    {
      id: 'snippets',
      label: 'Snippets',
      icon: Clipboard,
    },
  ];

  // Determine which action button to show based on active tab
  const renderActionButton = () => {
    switch (activeTab) {
      case 'bookmarks':
        // Return null for the bookmarks tab to remove the duplicate Add Bookmark button
        // The main Add Bookmark button is already in the BookmarksFeature component beside the search bar
        return null;
      case 'snippets':
        return (
          <Button
            variant="primary"
            onClick={() => alert('Add Snippet modal')}
            title="Add new snippet"
          >
            <Plus size={18} className="mr-2" />
            Add Snippet
          </Button>
        );
      default:
        return null;
    }
  };

  // Determine which sidebar to render based on active tab
  const renderSidebar = () => {
    switch (activeTab) {
      case 'bookmarks':
        return (
          <BookmarksSidebar
            activeFolder={activeFolder}
            setActiveFolder={setActiveFolder}
          />
        );
      case 'snippets':
        return (
          <SnippetsSidebar
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        );
      default:
        return null;
    }
  };

  // Determine which content to render based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'bookmarks':
        return (
          <BookmarksFeature
            activeFolder={activeFolder}
            setActiveFolder={setActiveFolder}
          />
        );
      case 'snippets':
        return (
          <SnippetsFeature
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg text-gray-400">Select a resource type</p>
          </div>
        );
    }
  };

  return (
    <ResourceLayout
      title="Resources"
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebar={renderSidebar()}
      actions={renderActionButton()}
    >
      {renderContent()}
    </ResourceLayout>
  );
};

export default ResourcesPage;
