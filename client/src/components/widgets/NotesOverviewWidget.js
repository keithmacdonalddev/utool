import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotes } from '../../features/notes/noteSlice';

const NotesOverviewWidget = () => {
  const dispatch = useDispatch();
  // Get notes state from Redux store
  const { notes, isLoading, isError, message } = useSelector(
    (state) => state.notes
  );

  useEffect(() => {
    // Fetch the 5 most recently updated notes
    dispatch(fetchNotes({ sort: '-updatedAt', limit: 5 }));
  }, [dispatch]);

  const recentNotes = notes.slice(0, 5);

  return (
    <div className="p-4 border border-dark-700 rounded-xl shadow-card bg-app-card text-text">
      <h3 className="text-lg font-bold mb-3 text-[#F8FAFC]">Recent Notes</h3>
      {isLoading && <p className="text-[#C7C9D1]">Loading notes...</p>}
      {isError && (
        <p className="text-red-400 text-sm">
          {message || 'Error loading notes.'}
        </p>
      )}
      {!isLoading && !isError && (
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
      {/* TODO: Add link to view all notes later */}
    </div>
  );
};

export default NotesOverviewWidget;
