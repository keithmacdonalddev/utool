import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

const NotesPage = () => {
  const dispatch = useDispatch();
  const { notes, pinned, favorites, archived, isLoading, isError, message } =
    useSelector((state) => state.notes);

  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [showEditor, setShowEditor] = useState(false);

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

  return (
    <div className="min-h-screen bg-dark-800 text-text pb-12">
      {/* Minimal Header */}
      <div className="max-w-5xl mx-auto px-4 pb-4 flex flex-col sm:flex-row items-center justify-between">
        <h1 className="text-3xl font-bold text-[#F8FAFC] flex items-center gap-2">
          <span className="text-accent-purple">📝</span> Notes
        </h1>
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
            ) : (
              <NotesListView
                notes={notes}
                onEdit={(note) => {
                  dispatch(setSelectedNote(note));
                  setShowEditor(true);
                }}
              />
            )}
          </>
        )}
      </div>
      {showEditor && <NoteEditorModal onClose={() => setShowEditor(false)} />}
    </div>
  );
};

export default NotesPage;
