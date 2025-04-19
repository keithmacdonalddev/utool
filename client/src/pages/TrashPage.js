import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotes,
  restoreNote,
  hardDeleteNote,
  setSelectedNote,
} from '../features/notes/noteSlice';
import NotesListView from '../components/notes/NotesListView';
import NoteEditorModal from '../components/notes/NoteEditorModal';

const TrashPage = () => {
  const dispatch = useDispatch();
  const { trash, isLoading, selectedNote } = useSelector(
    (state) => state.notes
  );
  const [showEditor, setShowEditor] = useState(false);

  // Fetch notes when component mounts
  useEffect(() => {
    dispatch(fetchNotes());
    console.log('Fetching notes for trash page');
  }, [dispatch]);

  const handleEdit = (note) => {
    dispatch(setSelectedNote(note));
    setShowEditor(true);
  };

  const handleRestore = (note) => {
    dispatch(restoreNote(note._id));
  };

  const handlePermanentDelete = (note) => {
    if (
      window.confirm('Permanently delete this note? This cannot be undone.')
    ) {
      dispatch(hardDeleteNote(note._id));
    }
  };

  return (
    <div className="container mx-auto px-2 py-4">
      <div className="mb-2">
        <a
          href="/notes"
          className="inline-block px-4 py-2 rounded-lg border border-gray-400 bg-dark-700 text-[#F8FAFC] hover:bg-dark-600 transition mb-2"
          aria-label="Back to Notes"
          style={{ textDecoration: 'none' }}
        >
          ← Back to Notes
        </a>
      </div>
      <h1 className="text-2xl font-bold mb-4">Trash</h1>
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : trash.length === 0 ? (
        <div className="text-center text-gray-500 py-8">Trash is empty.</div>
      ) : (
        <NotesListView notes={trash} onEdit={handleEdit} />
      )}
      {showEditor && <NoteEditorModal onClose={() => setShowEditor(false)} />}
      {trash.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <ul className="list-disc ml-6 text-sm text-gray-600">
            <li>
              <span className="font-medium">Restore:</span> Click "Edit" on a
              note, then "Restore" in the editor.
            </li>
            <li>
              <span className="font-medium">Permanent Delete:</span> Click
              "Edit" on a note, then "Delete" in the editor, or use the delete
              button in the list.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TrashPage;
