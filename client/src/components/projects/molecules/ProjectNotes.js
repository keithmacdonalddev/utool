import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getProjectNotes,
  createProjectNote,
  deleteProjectNote,
  togglePinProjectNote,
  updateProjectNote,
  resetProjectNoteStatus,
} from '../../features/projectNotes/projectNoteSlice';
import { PlusCircle, Pin, Trash2, Edit2, Check } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const colors = [
  { name: 'Default', value: '', displayColor: 'bg-card border-dark-600' },
  {
    name: 'Blue',
    value: 'bg-blue-100 border-blue-300',
    displayColor: 'bg-blue-500',
  },
  {
    name: 'Green',
    value: 'bg-green-100 border-green-300',
    displayColor: 'bg-green-500',
  },
  {
    name: 'Yellow',
    value: 'bg-yellow-100 border-yellow-300',
    displayColor: 'bg-yellow-500',
  },
  {
    name: 'Red',
    value: 'bg-red-100 border-red-300',
    displayColor: 'bg-red-500',
  },
  {
    name: 'Purple',
    value: 'bg-purple-100 border-purple-300',
    displayColor: 'bg-purple-500',
  },
];

const ProjectNotes = ({ projectId }) => {
  const dispatch = useDispatch();
  const { showNotification } = useNotification();

  // Memoized selector to prevent Redux rerender warnings
  const selectProjectNotesState = useMemo(
    () => (state) => ({
      notes: state.projectNotes.notes,
      isLoading: state.projectNotes.isLoading,
      isError: state.projectNotes.isError,
      isSuccess: state.projectNotes.isSuccess,
      message: state.projectNotes.message,
    }),
    []
  );

  // Get project notes state from Redux
  const { notes, isLoading, isError, isSuccess, message } = useSelector(
    selectProjectNotesState
  );

  // Local state for form and UI
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    content: '',
    color: '',
  });
  const [editNoteId, setEditNoteId] = useState(null);

  // Fetch project notes on component mount
  useEffect(() => {
    if (projectId) {
      dispatch(getProjectNotes(projectId));
    }

    // Clean up on component unmount
    return () => {
      dispatch(resetProjectNoteStatus());
    };
  }, [dispatch, projectId]);

  // Handle status changes from API calls
  useEffect(() => {
    if (isError) {
      showNotification(message, 'error');
      dispatch(resetProjectNoteStatus());
    }

    if (isSuccess) {
      dispatch(resetProjectNoteStatus());
    }
  }, [isError, isSuccess, message, dispatch, showNotification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleColorSelect = (colorValue) => {
    setFormData((prev) => ({
      ...prev,
      color: colorValue,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Content is required
    if (!formData.content.trim()) {
      showNotification('Content is required', 'error');
      return;
    }

    // Create or update note
    if (editNoteId) {
      dispatch(
        updateProjectNote({
          projectId,
          noteId: editNoteId,
          noteData: formData,
        })
      )
        .unwrap()
        .then(() => {
          showNotification('Note updated successfully', 'success');
          resetForm();
        })
        .catch((error) => {
          showNotification(`Failed to update note: ${error}`, 'error');
        });
    } else {
      dispatch(createProjectNote({ projectId, noteData: formData }))
        .unwrap()
        .then(() => {
          showNotification('Note created successfully', 'success');
          resetForm();
        })
        .catch((error) => {
          showNotification(`Failed to create note: ${error}`, 'error');
        });
    }
  };

  const handleEdit = (note) => {
    setFormData({
      content: note.content || '',
      color: note.color || '',
    });
    setEditNoteId(note._id);
    setShowForm(true);
  };

  const handleDelete = (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      dispatch(deleteProjectNote({ projectId, noteId }))
        .unwrap()
        .then(() => {
          showNotification('Note deleted successfully', 'success');
        })
        .catch((error) => {
          showNotification(`Failed to delete note: ${error}`, 'error');
        });
    }
  };

  const handleTogglePin = (noteId) => {
    dispatch(togglePinProjectNote({ projectId, noteId }))
      .unwrap()
      .then(() => {
        // No notification needed for pin toggle
      })
      .catch((error) => {
        showNotification(`Failed to update note: ${error}`, 'error');
      });
  };

  const resetForm = () => {
    setFormData({
      content: '',
      color: '',
    });
    setEditNoteId(null);
    setShowForm(false);
  };

  // Generate the appropriate CSS classes based on the note's color
  const getNoteClasses = (color) => {
    if (!color) return 'bg-card border-dark-600';
    return `${color}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-primary">Project Notes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-md text-sm"
        >
          <PlusCircle size={16} />
          Add Note
        </button>
      </div>

      {/* Note form */}
      {showForm && (
        <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 mb-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Content
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={4}
                className="w-full p-2 bg-dark-700 border border-dark-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-white"
                placeholder="Note content"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    title={color.name}
                    onClick={() => handleColorSelect(color.value)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                      color.displayColor
                    } ${
                      formData.color === color.value
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800 scale-110'
                        : ''
                    }`}
                  >
                    {formData.color === color.value && (
                      <Check size={16} className="text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-dark-700 text-white rounded-md hover:bg-dark-600 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md text-sm"
              >
                {editNoteId ? 'Update Note' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}

      {/* No notes message */}
      {!isLoading && notes.length === 0 && (
        <div className="text-center py-8 bg-dark-800 rounded-lg border border-dark-700">
          <p className="text-gray-400">No notes added to this project yet.</p>
        </div>
      )}

      {/* Notes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {notes.map((note) => (
          <div
            key={note._id}
            className={`relative border rounded-lg p-4 shadow transition-shadow hover:shadow-lg ${getNoteClasses(
              note.color
            )}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex space-x-1 ml-auto">
                <button
                  onClick={() => handleTogglePin(note._id)}
                  className={`p-1 rounded-full hover:bg-dark-700 ${
                    note.pinned ? 'text-yellow-500' : 'text-gray-400'
                  }`}
                >
                  <Pin size={16} />
                </button>
                <button
                  onClick={() => handleEdit(note)}
                  className="p-1 rounded-full hover:bg-dark-700 text-gray-400"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(note._id)}
                  className="p-1 rounded-full hover:bg-dark-700 text-gray-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {note.pinned && (
              <span
                className="absolute top-1 right-1 text-yellow-500"
                title="Pinned"
              >
                <Pin size={14} fill="currentColor" />
              </span>
            )}
            <div className="text-sm text-gray-300 whitespace-pre-wrap mt-2">
              {note.content}
            </div>
            <div className="text-xs text-gray-500 mt-4">
              {new Date(note.updatedAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectNotes;
