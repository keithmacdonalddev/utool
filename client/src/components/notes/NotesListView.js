import React from 'react';
import { useDispatch } from 'react-redux';
import { hardDeleteNote } from '../../features/notes/noteSlice';

const NotesListView = ({ notes, onEdit }) => {
  const dispatch = useDispatch();

  const handlePermanentDelete = (note) => {
    if (window.confirm('Permanently delete this note? This cannot be undone.')) {
      dispatch(hardDeleteNote(note._id));
    }
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full bg-card text-text border border-dark-700 rounded-xl shadow-card">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Tags</th>
            <th className="px-3 py-2 text-left">Pinned</th>
            <th className="px-3 py-2 text-left">Favorite</th>
            <th className="px-3 py-2 text-left">Archived</th>
            <th className="px-3 py-2 text-left">Reminder</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr key={note._id} className="border-t border-dark-700 hover:bg-[#282A36] hover:shadow-lg hover:shadow-accent-purple/20 transition">
              <td className="px-3 py-2 font-medium">{note.title}</td>
              <td className="px-3 py-2">
                {note.tags && note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full text-xs mr-1"
                  >
                    {tag}
                  </span>
                ))}
              </td>
              <td className="px-3 py-2 text-center">{note.pinned ? '📌' : ''}</td>
              <td className="px-3 py-2 text-center">{note.favorite ? '★' : ''}</td>
              <td className="px-3 py-2 text-center">{note.archived ? '🗄️' : ''}</td>
              <td className="px-3 py-2 text-xs">
                {note.reminder ? new Date(note.reminder).toLocaleString() : ''}
              </td>
              <td className="px-3 py-2">
                <button
                  className="text-accent-blue hover:underline text-xs mr-2"
                  onClick={() => onEdit(note)}
                  aria-label="Edit note"
                >
                  Edit
                </button>
                {note.deletedAt && (
                  <button
                    className="text-red-400 hover:underline text-xs"
                    onClick={() => handlePermanentDelete(note)}
                    aria-label="Delete permanently"
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {notes.length === 0 && (
        <div className="text-center text-gray-500 py-8">No notes found.</div>
      )}
    </div>
  );
};

export default NotesListView;
