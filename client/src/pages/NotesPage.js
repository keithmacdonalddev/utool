import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchNotes,
  resetNoteStatus,
  setSelectedNote,
} from '../features/notes/noteSlice';
import NoteCard from '../components/notes/NoteCard';
import NoteEditorModal from '../components/notes/NoteEditorModal';
import NotesListView from '../components/notes/NotesListView';
import FilterBar from '../components/notes/FilterBar';
import PinnedSection from '../components/notes/PinnedSection';
import FavoritesSection from '../components/notes/FavoritesSection';
import ArchivedSection from '../components/notes/ArchivedSection';
import Button from '../components/common/Button';
import { ArrowLeft } from 'lucide-react';

const NotesPage = () => {
  const dispatch = useDispatch();
  const { notes, pinned, favorites, archived, isLoading, isError, message } =
    useSelector((state) => state.notes);

  // Get the saved view preference from localStorage or default to 'grid'
  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem('notesViewPreference');
    return savedView || 'grid'; // Default to 'grid' if no preference is saved
  });

  const [showEditor, setShowEditor] = useState(false);

  // Save the view preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('notesViewPreference', view);
  }, [view]);

  useEffect(() => {
    dispatch(fetchNotes());
    return () => {
      dispatch(resetNoteStatus());
    };
  }, [dispatch]);

  const handleCreate = () => {
    dispatch(setSelectedNote(null));
    setShowEditor(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Render note as a table row for the table view
  const renderTableView = () => {
    if (notes.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">No notes found.</div>
      );
    }

    return (
      <div className="overflow-x-auto bg-dark-800 rounded-lg border border-dark-700 mt-6">
        <table className="min-w-full divide-y divide-dark-700">
          <thead>
            <tr className="bg-primary bg-opacity-20">
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-dark-700">
            {notes.map((note) => (
              <tr
                key={note._id}
                className="hover:bg-dark-700 transition-colors cursor-pointer"
                onClick={() => {
                  dispatch(setSelectedNote(note));
                  setShowEditor(true);
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#F8FAFC] text-left">
                  {note.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                  <div className="flex flex-wrap gap-1 text-left">
                    {note.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {note.tags?.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{note.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                  {note.pinned && (
                    <span className="mr-2" title="Pinned">
                      📌
                    </span>
                  )}
                  {note.favorite && (
                    <span className="mr-2" title="Favorite">
                      ★
                    </span>
                  )}
                  {note.archived && (
                    <span className="mr-2" title="Archived">
                      🗄️
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#C7C9D1] text-left">
                  {formatDate(note.updatedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(setSelectedNote(note));
                      setShowEditor(true);
                    }}
                    className="text-accent-blue hover:underline mr-3"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-800 text-text pb-12">
      {/* Minimal Header */}
      <div className="max-w-5xl mx-auto px-4 pb-4 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Notes</h1>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button
            variant="primary"
            className="px-5 py-2 rounded-xl shadow"
            onClick={handleCreate}
            aria-label="Create new note"
          >
            <span className="mr-1">+</span> New Note
          </Button>
          {/* Notes Trash Link */}
          <a
            href="/notes/trash"
            className="px-5 py-2 rounded-xl border border-gray-500 text-[#F8FAFC] bg-dark-700 hover:bg-dark-600 flex items-center justify-center"
            aria-label="View notes trash"
            style={{ textDecoration: 'none' }}
          >
            <span className="mr-1">🗑️</span> Trash
          </a>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="max-w-5xl mx-auto px-4">
        <FilterBar view={view} setView={setView} />
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {isError && <div className="text-red-500 my-2">{message}</div>}
        {isLoading ? (
          <div className="text-center py-12 text-xl text-blue-600 animate-pulse">
            Loading your notes...
          </div>
        ) : (
          <>
            <PinnedSection notes={pinned} view={view} />
            <FavoritesSection notes={favorites} view={view} />
            <ArchivedSection notes={archived} view={view} />
            {view === 'grid' ? (
              notes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
                  {notes.map((note) => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      onEdit={() => {
                        dispatch(setSelectedNote(note));
                        setShowEditor(true);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-[#C7C9D1]">
                  <span className="text-5xl mb-4">🗒️</span>
                  <div className="text-xl font-bold mb-2 text-[#F8FAFC]">
                    No notes found
                  </div>
                  <div className="mb-2">
                    Click{' '}
                    <span className="font-bold text-accent-purple">
                      + New Note
                    </span>{' '}
                    to create your first note.
                  </div>
                  <div className="text-xs text-[#C7C9D1]">
                    Tip: Use tags, colors, and pin your most important notes for
                    quick access.
                  </div>
                </div>
              )
            ) : view === 'list' ? (
              <NotesListView
                notes={notes}
                onEdit={(note) => {
                  dispatch(setSelectedNote(note));
                  setShowEditor(true);
                }}
              />
            ) : (
              renderTableView()
            )}
          </>
        )}
      </div>
      {showEditor && <NoteEditorModal onClose={() => setShowEditor(false)} />}
    </div>
  );
};

export default NotesPage;
