import React from 'react';
import { useDispatch } from 'react-redux';
import { hardDeleteNote } from '../../features/notes/noteSlice';

const NotesListView = ({ notes, onEdit }) => {
  const dispatch = useDispatch();

  const handlePermanentDelete = (note) => {
    if (
      window.confirm('Permanently delete this note? This cannot be undone.')
    ) {
      dispatch(hardDeleteNote(note._id));
    }
  };

  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full bg-dark-800 text-text border border-dark-700 rounded-xl shadow-card divide-y divide-dark-700">
        <thead>
          <tr className="bg-primary bg-opacity-20">
            <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Tags
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Pinned
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Favorite
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Archived
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
              Reminder
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
              className="border-t border-dark-700 hover:bg-dark-700 transition-colors"
            >
              <td className="px-6 py-4 text-left whitespace-nowrap text-sm font-medium text-[#F8FAFC]">
                {note.title}
              </td>
              <td className="px-6 py-4 text-left whitespace-nowrap">
                {note.tags &&
                  note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#23242B] border border-[#393A41] text-[#F8FAFC] px-2 py-0.5 rounded-full text-xs mr-1"
                    >
                      {tag}
                    </span>
                  ))}
              </td>
              <td className="px-6 py-4 text-left whitespace-nowrap text-sm">
                {note.pinned ? '📌' : ''}
              </td>
              <td className="px-6 py-4 text-left whitespace-nowrap text-sm">
                {note.favorite ? '★' : ''}
              </td>
              <td className="px-6 py-4 text-left whitespace-nowrap text-sm">
                {note.archived ? '🗄️' : ''}
              </td>
              <td className="px-6 py-4 text-left whitespace-nowrap text-xs text-[#C7C9D1]">
                {note.reminder ? new Date(note.reminder).toLocaleString() : ''}
              </td>
              <td className="px-6 py-4 text-left whitespace-nowrap">
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
