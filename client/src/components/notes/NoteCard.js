import React from 'react';
import { useDispatch } from 'react-redux';
import {
  updateNote,
  softDeleteNote,
} from '../../features/notes/noteSlice';
import { Edit, Trash2 } from 'lucide-react';

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
      className={`rounded-xl shadow-2xl p-4 relative transition-all duration-200 bg-[#23242B] text-[#F8FAFC] hover:shadow-lg hover:shadow-accent-purple/20 hover:bg-[#23243B] ${
        note.color ? '' : ''
      }`}
      style={note.color ? { backgroundColor: note.color } : {}}
      aria-label={`Note: ${note.title}`}
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-lg truncate text-[#F8FAFC]">{note.title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleToggle('pinned')}
            className={`text-yellow-500 ${note.pinned ? 'font-bold' : ''}`}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            📌
          </button>
          <button
            onClick={() => handleToggle('favorite')}
            className={`text-pink-500 ${note.favorite ? 'font-bold' : ''}`}
            aria-label={note.favorite ? 'Unfavorite note' : 'Favorite note'}
            title={note.favorite ? 'Unfavorite' : 'Favorite'}
          >
            ★
          </button>
          <button
            onClick={() => handleToggle('archived')}
            className={`text-gray-500 ${note.archived ? 'font-bold' : ''}`}
            aria-label={note.archived ? 'Unarchive note' : 'Archive note'}
            title={note.archived ? 'Unarchive' : 'Archive'}
          >
            🗄️
          </button>
        </div>
      </div>
      <div
        className="mb-2 text-sm cursor-pointer text-[#F8FAFC]"
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
              className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
      </div>
      {note.reminder && (
        <div className="text-xs text-[#C7C9D1] mb-1">
          ⏰ Reminder: {new Date(note.reminder).toLocaleString()}
        </div>
      )}
      <div className="flex justify-between items-center mt-2">
        <button
          onClick={onEdit}
          className="text-accent-purple hover:text-accent-blue transition flex items-center"
          aria-label="Edit note"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 transition flex items-center"
          aria-label="Delete note"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default NoteCard;
