import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createNote,
  updateNote,
  fetchNotes,
  setSelectedNote,
  restoreNote,
  hardDeleteNote,
} from '../../features/notes/noteSlice';

const COLORS = [
  '',
  '#3B82F6', // deep blue
  '#6366F1', // indigo
  '#8B5CF6', // purple
  '#14B8A6', // teal
  '#F59E42', // orange
  '#EF4444', // red
  '#FBBF24', // yellow
  '#64748B', // slate
];

const NoteEditorModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { selectedNote, isLoading } = useSelector((state) => state.notes);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [color, setColor] = useState('');
  const [reminder, setReminder] = useState('');
  const [pinned, setPinned] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title || '');
      setContent(selectedNote.content || '');
      setTags(selectedNote.tags || []);
      setColor(selectedNote.color || '');
      setReminder(selectedNote.reminder ? new Date(selectedNote.reminder).toISOString().slice(0, 16) : '');
      setPinned(selectedNote.pinned || false);
      setFavorite(selectedNote.favorite || false);
      setArchived(selectedNote.archived || false);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
      setColor('');
      setReminder('');
      setPinned(false);
      setFavorite(false);
      setArchived(false);
    }
  }, [selectedNote]);

  const handleTagAdd = (e) => {
    e.preventDefault();
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  const handleTagRemove = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleRestore = async () => {
    if (selectedNote) {
      await dispatch(restoreNote(selectedNote._id));
      dispatch(fetchNotes());
      dispatch(setSelectedNote(null));
      onClose();
    }
  };

  const handlePermanentDelete = async () => {
    if (selectedNote && window.confirm('Permanently delete this note? This cannot be undone.')) {
      await dispatch(hardDeleteNote(selectedNote._id));
      dispatch(fetchNotes());
      dispatch(setSelectedNote(null));
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const noteData = {
      title,
      content,
      tags,
      color,
      reminder: reminder ? new Date(reminder) : null,
      pinned,
      favorite,
      archived,
    };
    if (selectedNote) {
      await dispatch(updateNote({ id: selectedNote._id, updates: noteData }));
    } else {
      await dispatch(createNote(noteData));
    }
    dispatch(fetchNotes());
    dispatch(setSelectedNote(null));
    onClose();
  };

  const isTrashed = !!(selectedNote && selectedNote.deletedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-card text-text rounded-2xl shadow-2xl w-full max-w-lg p-8 relative border-2 border-blue-200">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-blue-600 text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-6 text-[#F8FAFC] flex items-center gap-2">
          {selectedNote ? (
            <>
              <span>Edit Note</span>
              {isTrashed && (
                <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded ml-2 animate-pulse">
                  In Trash
                </span>
              )}
            </>
          ) : (
            'New Note'
          )}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block font-bold mb-1 text-[#F8FAFC]" htmlFor="title">
              Title<span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              className="w-full border-2 border-blue-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              aria-label="Note title"
              disabled={isTrashed}
            />
          </div>
          <div className="mb-3">
            <label className="block font-bold mb-1 text-[#F8FAFC]" htmlFor="content">
              Content
            </label>
            <textarea
              id="content"
              className="w-full border-2 border-blue-200 rounded px-3 py-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Note content"
              disabled={isTrashed}
            />
          </div>
          <div className="mb-3">
            <label className="block font-bold mb-1 text-[#F8FAFC]">Tags</label>
            <div className="flex gap-2 mb-1 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-2 py-0.5 rounded-full text-xs flex items-center shadow"
                >
                  #{tag}
                  <button
                    type="button"
                    className="ml-1 text-xs text-red-500 hover:text-red-700"
                    onClick={() => handleTagRemove(tag)}
                    aria-label={`Remove tag ${tag}`}
                    disabled={isTrashed}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <form onSubmit={handleTagAdd} className="flex gap-2">
              <input
                className="border-2 border-blue-200 rounded px-2 py-1 flex-1 bg-blue-50"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))}
                placeholder="Add tag"
                maxLength={20}
                aria-label="Add tag"
                disabled={isTrashed}
              />
              <button
                type="submit"
                className="btn btn-sm btn-secondary"
                disabled={!tagInput || isTrashed}
                aria-label="Add tag"
              >
                Add
              </button>
            </form>
          </div>
          <div className="mb-3">
            <label className="block font-bold mb-1 text-[#F8FAFC]">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all duration-150 ${color === c ? 'border-accent-purple scale-110 ring-2 ring-accent-purple/40' : 'border-[#393A41]'}`}
                  style={c ? { backgroundColor: c } : { backgroundColor: '#23242B' }}
                  onClick={() => setColor(c)}
                  aria-label={c ? `Set color ${c}` : 'No color'}
                  disabled={isTrashed}
                />
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="block font-bold mb-1 text-[#F8FAFC]" htmlFor="reminder">
              Reminder
            </label>
            <input
              id="reminder"
              type="datetime-local"
              className="border-2 border-blue-200 rounded px-2 py-1 bg-blue-50"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              aria-label="Reminder"
              disabled={isTrashed}
            />
          </div>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-1 font-bold text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={pinned}
                onChange={() => setPinned((v) => !v)}
                aria-label="Pin note"
                disabled={isTrashed}
              />
              <span className="text-yellow-500">📌 Pin</span>
            </label>
            <label className="flex items-center gap-1 font-bold text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={favorite}
                onChange={() => setFavorite((v) => !v)}
                aria-label="Favorite note"
                disabled={isTrashed}
              />
              <span className="text-pink-500">★ Favorite</span>
            </label>
            <label className="flex items-center gap-1 font-bold text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={archived}
                onChange={() => setArchived((v) => !v)}
                aria-label="Archive note"
                disabled={isTrashed}
              />
              <span className="text-gray-500">🗄️ Archive</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            {isTrashed ? (
              <>
                <button
                  type="button"
                  className="bg-green-100 text-green-800 font-semibold px-4 py-2 rounded hover:bg-green-200 transition"
                  onClick={handleRestore}
                  disabled={isLoading}
                  aria-label="Restore note"
                >
                  <span className="mr-1">♻️</span> Restore
                </button>
                <button
                  type="button"
                  className="bg-red-100 text-red-800 font-semibold px-4 py-2 rounded hover:bg-red-200 transition"
                  onClick={handlePermanentDelete}
                  disabled={isLoading}
                  aria-label="Delete permanently"
                >
                  <span className="mr-1">🗑️</span> Delete Permanently
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="bg-blue-600 text-white font-semibold px-6 py-2 rounded shadow hover:bg-blue-700 transition"
                disabled={isLoading}
                aria-label={selectedNote ? 'Save changes' : 'Create note'}
              >
                {selectedNote ? 'Save' : 'Create'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteEditorModal;
