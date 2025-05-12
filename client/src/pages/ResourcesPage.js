import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { ExternalLink, Clipboard, Plus, Star, Quote } from 'lucide-react';
import Button from '../components/common/Button';
import { getBookmarks } from '../features/bookmarks/bookmarkSlice';
import { getSnippets } from '../features/snippets/snippetSlice';
import { getFolders } from '../features/bookmarks/bookmarkFolderSlice';
import { getFavoriteQuotes } from '../features/quotes/quoteSlice';
import ResourceLayout from '../features/resources/components/ResourceLayout';
import BookmarksFeature from '../features/resources/bookmarks/BookmarksFeature';
import SnippetsFeature from '../features/resources/snippets/SnippetsFeature';
import FavoriteQuotesFeature from '../features/resources/quotes/FavoriteQuotesFeature';
import BookmarksSidebar from '../features/resources/bookmarks/components/BookmarksSidebar';
import SnippetsSidebar from '../features/resources/snippets/components/SnippetsSidebar';
import QuotesSidebar from '../features/resources/quotes/components/QuotesSidebar';

/**
 * ResourcesPage Component
 *
 * A comprehensive page for managing various types of resources including:
 * - Favorites (bookmarks)
 * - Code snippets
 * - Favorite quotes
 *
 * This component has been refactored to use a more modular approach with
 * separate feature components for each resource type.
 *
 * @returns {React.ReactElement} The ResourcesPage component
 */
const ResourcesPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  // If coming from a redirect with state, use the activeTab from state
  // This handles the redirect from /favorite-quotes to /resources with the quotes tab active
  const initialTab = location.state?.activeTab || 'bookmarks';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeFolder, setActiveFolder] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeQuoteCategory, setActiveQuoteCategory] = useState(null);

  // Refs to control child component functions
  const quotesFeatureRef = useRef(null);
  const snippetsFeatureRef = useRef(null);

  // Track which resource types have been loaded
  const [loadedResources, setLoadedResources] = useState({
    bookmarks: false,
    snippets: false,
    quotes: false,
  });

  // Reset active selection when changing tabs
  useEffect(() => {
    setActiveFolder(null);
    setActiveCategory(null);
    setActiveQuoteCategory(null);
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
    } else if (activeTab === 'quotes' && !loadedResources.quotes) {
      // Only load quotes data the first time the quotes tab is activated
      dispatch(getFavoriteQuotes());
      setLoadedResources((prev) => ({ ...prev, quotes: true }));
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
    {
      id: 'quotes',
      label: 'Favorite Quotes',
      icon: Quote,
    },
  ];

  /**
   * Opens the Add Snippet modal in the SnippetsFeature component
   * Uses the ref to call the child component's method
   */
  const handleOpenAddSnippetModal = () => {
    if (
      snippetsFeatureRef.current &&
      snippetsFeatureRef.current.openCreateModal
    ) {
      snippetsFeatureRef.current.openCreateModal();
    }
  };

  // Determine which action button to show based on active tab
  const renderActionButton = () => {
    switch (activeTab) {
      case 'bookmarks':
        // Return null for the bookmarks tab to remove the duplicate Add Bookmark button
        // The main Add Bookmark button is already in the BookmarksFeature component beside the search bar
        return null;
      case 'snippets':
        // Return null for the snippets tab to remove the duplicate Add Snippet button
        // The main Add Snippet button is already in the SnippetsFeature component beside the search bar
        return null;
      case 'quotes':
        // No action button for quotes tab since quotes come from favoriting daily quotes
        return null;
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
      case 'quotes':
        return (
          <QuotesSidebar
            activeCategory={activeQuoteCategory}
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
            ref={snippetsFeatureRef}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        );
      case 'quotes':
        return (
          <FavoriteQuotesFeature
            ref={quotesFeatureRef}
            activeCategory={activeQuoteCategory}
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

  /**
   * useEffect hook to synchronize the component's active tab with `location.state.activeTab`.
   * This is primarily intended to handle initial tab setting when navigating to this page
   * with a specific tab pre-selected via `NavLink` state (e.g., from a sidebar submenu).
   *
   * How it works:
   * 1. It runs when the `location` object changes (e.g., on navigation or history manipulation like `replaceState`)
   *    or when `setActiveTab` reference changes (which is stable from `useState`, so `location` is the main trigger).
   * 2. It checks if `location.state?.activeTab` (referred to as `stateActiveTab`) is present.
   * 3. If `stateActiveTab` exists:
   *    a. It calls `setActiveTab(stateActiveTab)` to update the component's `activeTab` state.
   *       This ensures the page reflects the tab specified in the navigation state.
   *    b. It then immediately clears `activeTab` from `location.state` using `window.history.replaceState`.
   *       This is crucial. It makes `location.state.activeTab` a "one-time" instruction.
   *       Once processed, it's removed to prevent this effect from re-applying the same tab if the
   *       component re-renders for other reasons (e.g., user clicking an on-page tab, other state changes).
   *       The `replaceState` call itself will cause the `location` object to update (its `key` changes),
   *       triggering this effect to run again. On that subsequent run, `location.state.activeTab` will
   *       be gone, so the `if (stateActiveTab)` block will be skipped, achieving stability.
   *
   * This mechanism ensures that on-page tab clicks (which only call `setActiveTab` and don't change `location.state`)
   * are not overridden by this effect, as `location.state.activeTab` will be null/undefined at that point.
   */
  useEffect(() => {
    const stateActiveTab = location.state?.activeTab;

    if (stateActiveTab) {
      // A tab was specified in the navigation state. Update the component's activeTab.
      setActiveTab(stateActiveTab);

      // Clear activeTab from location.state to make it a one-time instruction.
      // location.state is guaranteed non-null here because stateActiveTab was derived from it.
      // Also ensure location.state itself is not null before attempting to destructure from it,
      // though the outer if (stateActiveTab) should already guarantee location.state is not null.
      if (location.state) {
        const { activeTab: _, ...newStateWithoutActiveTab } = location.state;
        window.history.replaceState(
          Object.keys(newStateWithoutActiveTab).length > 0
            ? newStateWithoutActiveTab
            : null,
          document.title,
          location.pathname // Preserve the current path
        );
      }
    }
  }, [location, setActiveTab]); // Dependencies: `location` object and `setActiveTab` function.

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
