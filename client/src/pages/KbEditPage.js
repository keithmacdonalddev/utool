// src/pages/KbEditPage.jsx (or .js)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux'; // Import useSelector
import api from '../utils/api';
import FormInput from '../components/common/FormInput';
import LexicalEditor from '../components/Editor/LexicalEditor';
import socket from '../utils/socket'; // Import the socket utility

const KbEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Add state for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get user from Redux store
  const { user } = useSelector((state) => state.auth);

  // State for standard form fields
  const [formData, setFormData] = useState({
    title: '',
    tags: '',
    categories: '',
  });
  // Separate state for the editor's JSON content string
  const [editorContent, setEditorContent] = useState(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected); // Track socket connection

  // Ref to prevent emitting changes received from socket
  const isRemoteUpdate = useRef(false);
  const socketInitialized = useRef(false);

  // Loading and Error States
  const [isError, setIsError] = useState(false); // Tracks general page errors (fetch or update)
  const [message, setMessage] = useState('');

  // --- Fetch existing article data ---
  useEffect(() => {
    // Check if user is admin, if not redirect to KB details page
    if (user && user.role !== 'Admin') {
      navigate(`/kb/${id}`);
      return;
    }

    const fetchArticle = async () => {
      // Reset states for new fetch
      setIsLoading(true);
      setIsEditorReady(false);
      setIsError(false);
      setMessage('');
      setEditorContent(null); // Crucial: Reset editor content

      if (!id) {
        setIsLoading(false);
        setIsError(true);
        setMessage('Article ID is missing.');
        return;
      }

      try {
        const response = await api.get(`/kb/${id}`);

        if (
          response.data &&
          typeof response.data.data === 'object' &&
          response.data.data !== null
        ) {
          const { title, content, tags, categories } = response.data.data;
          setFormData({
            title: title || '',
            tags: tags ? tags.join(',') : '',
            categories: categories ? categories.join(',') : '',
          });
          // Set content state, default to empty string if null/undefined from API
          setEditorContent(content || '');
          setIsEditorReady(true); // Mark as ready AFTER content is set
        } else {
          throw new Error('Invalid data structure received from API.');
        }
      } catch (error) {
        setIsError(true);
        setMessage(
          error.response?.data?.message ||
            error.message ||
            'Failed to fetch article.'
        );
        // Allow editor to load empty even if fetch fails
        setEditorContent('');
        setIsEditorReady(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticle();

    // --- Socket Connection Lifecycle ---
    if (id && !socketInitialized.current) {
      // Connect socket and join room only once per ID
      socket.connect();
      socket.emit('join_document', id);
      setIsSocketConnected(socket.connected);
      socketInitialized.current = true;

      // Listener for receiving changes from others
      const handleReceiveChanges = (receivedState) => {
        isRemoteUpdate.current = true; // Flag that this is a remote update
        setEditorContent(receivedState);
        // Reset the flag shortly after, allowing local changes again
        // Use setTimeout to ensure it happens after the current render cycle
        setTimeout(() => {
          isRemoteUpdate.current = false;
        }, 0);
      };

      // Listen for connection status changes
      const handleConnect = () => {
        setIsSocketConnected(true);
        // Rejoin room when reconnected
        socket.emit('join_document', id);
      };

      const handleDisconnect = () => setIsSocketConnected(false);

      socket.on('receive_changes', handleReceiveChanges);
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      // Cleanup on component unmount or ID change
      return () => {
        socket.off('receive_changes', handleReceiveChanges);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.emit('leave_document', id); // Explicitly leave the room
        socket.disconnect();
        setIsSocketConnected(false);
        socketInitialized.current = false;
      };
    }

    // --- End Socket Connection Lifecycle ---
  }, [id, navigate, user]); // Effect depends on article ID and user

  // --- Handle changes in standard form inputs ---
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);

  // --- Handle changes from the LexicalEditor component ---
  const handleEditorContentChange = useCallback(
    (newContent) => {
      // Update local state
      setEditorContent(newContent);

      // If the change was triggered by a remote update, don't emit it back
      if (isRemoteUpdate.current) {
        return;
      }

      // Emit local changes via socket if connected
      if (socket.connected && id) {
        socket.emit('send_changes', {
          documentId: id,
          editorState: newContent,
        });
      }
    },
    [id]
  ); // Depend on id to ensure it's available in the closure

  // --- Handle form submission ---
  const onSubmit = async (e) => {
    e.preventDefault();
    setIsError(false); // Reset error state for submission attempt
    setMessage('');

    // Validate required fields (including editor content)
    if (!formData.title.trim()) {
      setIsError(true);
      setMessage('Title is required.');
      return;
    }
    if (
      !editorContent ||
      editorContent.trim() === '' ||
      editorContent === '{}' ||
      editorContent === 'null'
    ) {
      setIsError(true);
      setMessage('Article content cannot be empty.');
      return;
    }

    // Prepare data for API
    const { title, tags, categories } = formData;
    const updatedArticle = {
      title,
      content: editorContent, // Use the state variable holding the editor's JSON
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
      categories: categories
        .split(',')
        .map((cat) => cat.trim())
        .filter((cat) => cat !== ''),
    };

    try {
      await api.put(`/kb/${id}`, updatedArticle);
      // Navigate after successful update
      navigate(`/kb/${id}`); // Redirect to the details page
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Failed to update article.');
    }
  };

  // --- Added Cancel Handler ---
  const handleCancel = () => {
    // Navigate back to the details page for the current article ID
    navigate(`/kb/${id}`);
  };
  // --- End Cancel Handler ---

  // --- Handle Delete Article ---
  const handleDelete = async () => {
    setIsDeleting(true);
    setIsError(false);
    setMessage('');

    try {
      await api.delete(`/kb/${id}`);
      // Close modal and navigate to KB list after successful deletion
      setShowDeleteModal(false);
      navigate('/kb');
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.message || 'Failed to delete article.');
      setIsDeleting(false);
    }
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Loading article data...
      </div>
    );
  }

  // Separate display for initial fetch error vs. submission error
  if (isError && !isEditorReady) {
    // Error occurred during initial fetch
    return (
      <div className="container mx-auto p-4">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
          role="alert"
        >
          <strong className="font-bold">Loading Error!</strong> {message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2 text-white">
        Edit Knowledge Base Article
      </h1>
      {/* Socket Connection Status Indicator */}
      <div className="mb-4 text-xs text-gray-300">
        Collaboration Status:
        <span
          className={`ml-2 font-semibold ${
            isSocketConnected ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isSocketConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Display submission/update errors */}
      {/* *** THIS IS THE CORRECTED BLOCK *** */}
      {isError &&
        message &&
        isEditorReady && ( // Only show if it's likely an update error
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Update Error!</strong> {message}
          </div>
        )}
      {/* *** END CORRECTION *** */}

      {/* Render form only when ready or if fetch failed (to show empty fields/editor) */}
      {isEditorReady && (
        <form
          onSubmit={onSubmit}
          className="bg-card border border-dark-700 shadow-card rounded-lg px-8 pt-6 pb-8 mb-4"
        >
          {/* Title Input */}
          <div className="mb-4">
            <FormInput
              id="title"
              label="Title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              placeholder="Article Title"
              required
            />
          </div>

          {/* Lexical Editor for Content */}
          <div className="mb-4">
            <label
              className="block text-white text-sm font-bold mb-2"
              htmlFor="content-editor" // Changed htmlFor to avoid conflict if needed, though not strictly necessary
            >
              Content
            </label>
            {editorContent !== null ? ( // Check if editorContent is explicitly set (even if empty string)
              <LexicalEditor
                initialEditorStateString={editorContent} // Pass initial JSON
                onContentChange={handleEditorContentChange} // Update state on changes
                key={id} // Force re-mount if ID changes (optional but can help)
              />
            ) : (
              // Shouldn't be reached if isEditorReady logic is correct, but good fallback
              <div className="border border-dark-700 rounded min-h-[240px] relative p-4 text-gray-300 bg-dark-800 flex items-center justify-center">
                <span>Initializing editor...</span>
              </div>
            )}
          </div>

          {/* Tags Input */}
          <div className="mb-4">
            <FormInput
              id="tags"
              label="Tags (comma separated)"
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleFormChange}
              placeholder="e.g., react, lexical, guide"
            />
          </div>

          {/* Categories Input */}
          <div className="mb-6">
            <FormInput
              id="categories"
              label="Categories (comma separated)"
              type="text"
              name="categories"
              value={formData.categories}
              onChange={handleFormChange}
              placeholder="e.g., Frontend, Documentation"
            />
          </div>

          {/* Action Buttons Container */}
          <div className="flex items-center justify-between pt-4">
            {/* Update & Cancel Buttons */}
            <div className="flex items-center gap-4">
              <button
                className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
                type="submit"
              >
                Update Article
              </button>
              <button
                className="bg-dark-700 hover:bg-dark-600 text-gray-200 font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
                type="button" // Important: type="button" to prevent form submission
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>

            {/* Delete Button - Only visible for Admin users */}
            {user && user.role === 'Admin' && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
              >
                Delete Article
              </button>
            )}
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full border border-dark-700">
            <h3 className="text-xl font-bold text-white mb-4">
              Delete Article
            </h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this article? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="bg-dark-700 hover:bg-dark-600 text-gray-200 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Use default export (can switch to named if needed for circular deps)
export default KbEditPage;
