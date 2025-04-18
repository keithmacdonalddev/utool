import React from 'react';
import { useDispatch } from 'react-redux';
import { updateNote, softDeleteNote } from '../../features/notes/noteSlice';
import { Edit, Trash2, Pin, Star, Archive } from 'lucide-react';

const NoteCard = ({ note, onEdit }) => {
  const dispatch = useDispatch();

  const handleToggle = (field) => {
    dispatch(updateNote({ id: note._id, updates: { [field]: !note[field] } }));
  };

  const handleDelete = () => {
    dispatch(softDeleteNote(note._id));
  };

  return (
    <div
      className={`rounded-xl shadow-card p-4 relative transition-all duration-200 bg-card text-text hover:shadow-lg hover:shadow-accent-purple/20 border border-dark-700`}
      style={note.color ? { backgroundColor: note.color } : {}}
      aria-label={`Note: ${note.title}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-lg truncate text-text">{note.title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleToggle('pinned')}
            className={`text-yellow-400 hover:text-yellow-300 transition ${
              note.pinned ? 'scale-110' : ''
            }`}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin
              className="h-4 w-4"
              fill={note.pinned ? 'currentColor' : 'none'}
            />
          </button>
          <button
            onClick={() => handleToggle('favorite')}
            className={`text-pink-500 hover:text-pink-400 transition ${
              note.favorite ? 'scale-110' : ''
            }`}
            aria-label={note.favorite ? 'Unfavorite note' : 'Favorite note'}
            title={note.favorite ? 'Unfavorite' : 'Favorite'}
          >
            <Star
              className="h-4 w-4"
              fill={note.favorite ? 'currentColor' : 'none'}
            />
          </button>
          <button
            onClick={() => handleToggle('archived')}
            className={`text-text-muted hover:text-text transition ${
              note.archived ? 'scale-110' : ''
            }`}
            aria-label={note.archived ? 'Unarchive note' : 'Archive note'}
            title={note.archived ? 'Unarchive' : 'Archive'}
          >
            <Archive
              className="h-4 w-4"
              fill={note.archived ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      </div>

      <div
        className="mb-2 text-sm cursor-pointer text-text"
        onClick={onEdit}
        title="Edit note"
        tabIndex={0}
        role="button"
        aria-label="Edit note"
      >
        {note.content && note.content.length > 120
          ? note.content.slice(0, 120) + '...'
          : note.content}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {note.tags &&
          note.tags.map((tag) => (
            <span
              key={tag}
              className="bg-dark border border-dark-600 text-text-muted px-2 py-0.5 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
      </div>

      {note.reminder && (
        <div className="text-xs text-text-muted mb-1 flex items-center">
          <span className="mr-1">⏰</span>{' '}
          {new Date(note.reminder).toLocaleString()}
        </div>
      )}

      <div className="flex justify-between items-center mt-3 pt-2 border-t border-dark-600">
        <button
          onClick={onEdit}
          className="text-accent-purple hover:text-accent-blue transition flex items-center gap-1"
          aria-label="Edit note"
        >
          <Edit className="h-4 w-4" />
          <span className="text-xs">Edit</span>
        </button>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-400 transition flex items-center gap-1"
          aria-label="Delete note"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">Delete</span>
        </button>
      </div>
    </div>
  );
};

export default NoteCard;
