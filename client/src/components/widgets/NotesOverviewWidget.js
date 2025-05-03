import React from 'react';
import Spinner from '../common/Spinner';
import useNotes from '../../hooks/useNotes';

/**
 * NotesOverviewWidget Component
 *
 * Displays a widget with the user's most recent notes.
 * Uses intelligent caching to prevent redundant API calls.
 *
 * @component
 * @returns {JSX.Element} The rendered NotesOverviewWidget component
 */
const NotesOverviewWidget = () => {
  // Use our custom hook with caching instead of direct Redux dispatches
  const { notes, isLoading, error, refetchNotes } = useNotes({
    cacheTimeout: 2 * 60 * 1000, // 2 minutes cache for notes
    queryParams: { sort: '-updatedAt', limit: 5 },
  });

  // Get the 5 most recent notes
  const recentNotes = notes && notes.length ? notes.slice(0, 5) : [];

  /**
   * Handle manual refresh of notes data
   * This provides a way for users to force refresh the data if needed
   */
  const handleRefresh = () => {
    refetchNotes(true); // Force a refresh regardless of cache
  };

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-app-card text-text">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-[#F8FAFC]">Recent Notes</h3>
        {/* Add refresh button */}
        <button
          onClick={handleRefresh}
          className="text-sm text-gray-400 hover:text-white p-1 rounded-full hover:bg-dark-600"
          title="Refresh notes data"
          aria-label="Refresh notes data"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-2">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">
          {error || 'Error loading notes.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {recentNotes.length > 0 ? (
            recentNotes.map((note) => (
              <li
                key={note._id}
                className="border-b border-dark-700 pb-1 last:border-b-0"
              >
                <p className="text-sm text-[#F8FAFC] truncate">
                  {note.content}
                </p>
                <p className="text-xs text-[#C7C9D1]">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
              </li>
            ))
          ) : (
            <p className="text-sm text-[#C7C9D1]">No recent notes found.</p>
          )}
        </ul>
      )}
    </div>
  );
};

export default NotesOverviewWidget;
