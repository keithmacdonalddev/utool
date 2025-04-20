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
import FormInput from '../common/FormInput';
import FormTextarea from '../common/FormTextarea';
import FormCheckbox from '../common/FormCheckbox';
import Button from '../common/Button';
import Card from '../common/Card';
import { X } from 'lucide-react';

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

      // Fix for timezone issue when formatting reminder date
      if (selectedNote.reminder) {
        const reminderDate = new Date(selectedNote.reminder);
        const year = reminderDate.getFullYear();
        const month = String(reminderDate.getMonth() + 1).padStart(2, '0');
        const day = String(reminderDate.getDate()).padStart(2, '0');
        const hours = String(reminderDate.getHours()).padStart(2, '0');
        const minutes = String(reminderDate.getMinutes()).padStart(2, '0');

        // Format as YYYY-MM-DDThh:mm (format required by datetime-local input)
        setReminder(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setReminder('');
      }

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
    if (
      selectedNote &&
      window.confirm('Permanently delete this note? This cannot be undone.')
    ) {
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
      <Card className="w-full max-w-lg p-6 relative border-2 border-dark-700">
        <button
          className="absolute top-4 right-4 text-text-muted hover:text-text focus:outline-none"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-text flex items-center gap-2">
          {selectedNote ? (
            <>
              <span>Edit Note</span>
              {isTrashed && (
                <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded animate-pulse">
                  In Trash
                </span>
              )}
            </>
          ) : (
            'New Note'
          )}
        </h2>

        <form onSubmit={handleSubmit}>
          <FormInput
            id="title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            disabled={isTrashed}
            placeholder="Note title"
          />

          <FormTextarea
            id="content"
            label="Content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isTrashed}
            rows={4}
            placeholder="Note content"
          />

          <div className="mb-4">
            <label className="block text-text text-sm font-bold mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-dark-800 border border-dark-600 text-text px-2 py-0.5 rounded-full text-xs flex items-center"
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
            <div className="flex gap-2">
              <FormInput
                value={tagInput}
                onChange={(e) =>
                  setTagInput(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''))
                }
                placeholder="Add tag"
                maxLength={20}
                disabled={isTrashed}
                className="mb-0 flex-grow"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleTagAdd}
                disabled={!tagInput || isTrashed}
                className="flex-shrink-0"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-text text-sm font-bold mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {COLORS.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${
                    color === c
                      ? 'border-accent-purple scale-110 ring-2 ring-accent-purple/40'
                      : 'border-dark-600'
                  }`}
                  style={
                    c ? { backgroundColor: c } : { backgroundColor: '#23242B' }
                  }
                  onClick={() => setColor(c)}
                  aria-label={c ? `Set color ${c}` : 'No color'}
                  disabled={isTrashed}
                />
              ))}
            </div>
          </div>

          <FormInput
            id="reminder"
            label="Reminder"
            type="datetime-local"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            disabled={isTrashed}
          />

          <div className="grid grid-cols-3 gap-2 mb-6">
            <FormCheckbox
              id="pinned"
              label="📌 Pin"
              checked={pinned}
              onChange={() => setPinned((v) => !v)}
              disabled={isTrashed}
              labelClassName="text-yellow-500"
            />

            <FormCheckbox
              id="favorite"
              label="★ Favorite"
              checked={favorite}
              onChange={() => setFavorite((v) => !v)}
              disabled={isTrashed}
              labelClassName="text-pink-500"
            />

            <FormCheckbox
              id="archived"
              label="🗄️ Archive"
              checked={archived}
              onChange={() => setArchived((v) => !v)}
              disabled={isTrashed}
              labelClassName="text-gray-500"
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            {isTrashed ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRestore}
                  disabled={isLoading}
                >
                  <span className="mr-1">♻️</span> Restore
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handlePermanentDelete}
                  disabled={isLoading}
                >
                  <span className="mr-1">🗑️</span> Delete Permanently
                </Button>
              </>
            ) : (
              <Button type="submit" variant="primary" disabled={isLoading}>
                {selectedNote ? 'Save Changes' : 'Create Note'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default NoteEditorModal;
