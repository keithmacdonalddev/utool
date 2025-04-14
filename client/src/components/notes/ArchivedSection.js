import React from 'react';
import NoteCard from './NoteCard';
import NotesListView from './NotesListView';

const ArchivedSection = ({ notes, view }) => {
  if (!notes || notes.length === 0) return null;
  return (
    <section className="mb-6 bg-dark-800 rounded-xl p-4 shadow-card">
      <h3 className="text-lg font-bold mb-2 text-[#F8FAFC]">Archived</h3>
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {notes.map((note) => (
            <NoteCard key={note._id} note={note} />
          ))}
        </div>
      ) : (
        <NotesListView notes={notes} />
      )}
    </section>
  );
};

export default ArchivedSection;
