// src/pages/KbDetailsPage.jsx (or .js)

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux'; // Import useSelector to access Redux state
import api from '../utils/api';

// --- Icon Import for Back Link ---
import { ArrowLeft, AlertTriangle } from 'lucide-react';

// *** LEXICAL IMPORTS START ***
import { LexicalComposer } from '@lexical/react/LexicalComposer';
// ... (other lexical imports remain) ...
import CommentList from '../components/comments/CommentList'; // Import the CommentList component
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// --- Node Imports ---
// IMPORTANT: These MUST exactly match the nodes registered in LexicalEditor.jsx
import { LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
// *** Import ALL other nodes used by your editor (e.g., CodeNode) ***

// --- Theme Configuration for Viewer ---
// IMPORTANT: Should ideally be imported from a central config file shared with the Editor.
// Ensure consistency with the theme used in LexicalEditor.jsx.
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'mb-2 text-left text-white', // Added text-white
  heading: {
    h1: 'text-3xl font-bold my-4 text-white', // Added text-white
    h2: 'text-2xl font-bold my-3 text-white',
    h3: 'text-xl font-bold my-2 text-white',
    // h4, h5, h6... if used
  },
  list: {
    ul: 'list-disc ml-6 mb-2 text-left text-white', // Added text-white
    ol: 'list-decimal ml-6 mb-2 text-left text-white', // Added text-white
    listitem: 'mb-1 text-left text-white',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through', // If used
    code: 'bg-dark-700 text-sm font-mono px-1 py-0.5 rounded mx-0.5 text-accent-blue', // Updated for dark theme
  },
  link: 'text-accent-purple hover:underline cursor-pointer', // Updated to match dark theme accent color
  quote: 'border-l-4 border-gray-600 pl-4 italic my-4 text-gray-300', // Updated for dark theme
  // ... other theme keys if needed (e.g., code block styles)
};

// --- Registered Nodes List ---
// IMPORTANT: Must exactly match the nodes registered in LexicalEditor.jsx
const editorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  // ... Add any other nodes used
];
// *** LEXICAL IMPORTS END ***

const KbDetailsPage = () => {
  const { id } = useParams(); // Get ID from URL
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchError, setIsFetchError] = useState(false); // State for fetch errors
  const [message, setMessage] = useState('');
  const [renderError, setRenderError] = useState(''); // Specific state for Lexical rendering errors
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State for delete confirmation modal
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation loading
  const [deleteError, setDeleteError] = useState(''); // State for delete errors

  // Create useRef at component level to track API calls
  const apiCalledRef = React.useRef(false);

  // Get user from Redux store
  const { user } = useSelector((state) => state.auth);
  // Helper function to check if user is an admin
  const isAdmin = user && user.role === 'Admin';

  const navigate = useNavigate(); // Hook for navigation

  // --- Fetch Article Data ---
  useEffect(() => {
    const fetchArticle = async () => {
      // Skip if this effect has already run in this render cycle (prevents StrictMode double calls)
      if (apiCalledRef.current) return;
      apiCalledRef.current = true;

      // Reset states
      setIsLoading(true);
      setIsFetchError(false);
      setMessage('');
      setRenderError('');
      setArticle(null);

      if (!id) {
        setIsLoading(false);
        setIsFetchError(true);
        setMessage('Article ID is missing.');
        return;
      }

      console.log(`[DEBUG Client] Fetching article with ID: ${id}`);

      try {
        const response = await api.get(`/kb/${id}`);
        console.log(`[DEBUG Client] API call completed for article ID: ${id}`);

        // Validate response data
        if (
          response.data &&
          typeof response.data.data === 'object' &&
          response.data.data !== null &&
          response.data.data.content // Checking content exists, adjust if needed
        ) {
          console.log(
            `[DEBUG Client] Setting article with views: ${response.data.data.views}`
          );
          setArticle(response.data.data);
        } else {
          throw new Error('Invalid article data received.');
        }
      } catch (error) {
        console.error('Fetch Error (Details Page):', error);
        setIsFetchError(true);
        setMessage(
          error.response?.data?.message ||
            error.message ||
            'Failed to fetch article.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    console.log(`[DEBUG Client] useEffect triggered with id: ${id}`);
    fetchArticle();

    // Add cleanup function to track component unmounting
    return () => {
      console.log(`[DEBUG Client] Component unmounting for article ID: ${id}`);
      // Reset flag when component unmounts
      apiCalledRef.current = false;
    };
  }, [id]); // Re-fetch only if ID changes

  // --- Delete Handler ---
  const handleDelete = async () => {
    if (!id) {
      setDeleteError('Article ID is missing.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/kb/${id}`);
      setShowConfirmModal(false);
      navigate('/kb'); // Redirect to list page after successful deletion
    } catch (error) {
      console.error('Delete Error:', error);
      setDeleteError(
        error.response?.data?.message || 'Failed to delete article.'
      );
      setIsDeleting(false); // Keep modal open on error
    }
    // No finally block needed here as we only close modal on success or handle error state
  };

  // --- Lexical Configuration for Read-Only Viewer ---
  const initialConfig = {
    // Use a unique namespace for the viewer instance
    namespace: `KbViewer-${id}`,
    theme: theme, // Pass the theme object with the listitem fix
    nodes: editorNodes, // Pass the consistent node list
    onError: (error, editor) => {
      // Catch Lexical errors
      console.error('Lexical Viewer Rendering Error:', error);
      setRenderError(
        `Failed to render article content. Error: ${error.message}`
      );
    },
    editable: false, // CRITICAL: Set to read-only
  };
  // --- End Lexical Config ---

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        Loading article...
      </div>
    );
  }

  // Display error if fetching failed
  if (isFetchError) {
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

  // Display if article data is missing after loading/fetch attempt
  if (!article) {
    return (
      <div className="container mx-auto p-4 text-center">
        Article not found or data invalid.
      </div>
    );
  }

  // Display Article Details
  return (
    <div className="container mx-auto p-4">
      {/* *** ADDED BACK LINK HERE *** */}
      <div className="mb-4">
        {' '}
        {/* Using mb-4 as requested originally */}
        <Link
          to="/kb" // Link to the main KB list page route
          className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline transition duration-150 ease-in-out"
        >
          <ArrowLeft size={16} className="mr-1" /> {/* Optional icon */}
          Back to Knowledge Base List
        </Link>
      </div>
      {/* *** END BACK LINK *** */}

      {/* Header */}
      <h1 className="text-3xl font-bold mb-2 text-white">{article.title}</h1>

      {/* Display Lexical Rendering Error if occurs */}
      {renderError && (
        <div
          className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Content Display Issue:</strong>{' '}
          {renderError}
        </div>
      )}

      {/* Lexical Content Renderer */}
      {/* Apply prose for typography defaults, wrapped in a styled container */}
      <div className="prose lg:prose-xl max-w-none mb-6 p-6 bg-card border border-dark-700 shadow-card rounded-lg text-white">
        {/* Check if content exists before attempting render */}
        {article.content ? (
          <LexicalComposer
            initialConfig={{
              ...initialConfig, // Spread base config (includes theme, nodes, editable: false)
              editorState: article.content, // Load content state from fetched JSON string
            }}
          >
            <RichTextPlugin
              contentEditable={
                // Render content in a non-editable element
                <ContentEditable
                  className="read-only-content-area text-white"
                  aria-readonly={true}
                  role="article"
                  // editable={false} // Removed non-boolean attribute warning
                />
              }
              placeholder={null} // No placeholder needed for viewer
              ErrorBoundary={LexicalErrorBoundary} // Catch errors during rendering
            />
            {/* No other plugins like History, OnChange needed for viewing */}
          </LexicalComposer>
        ) : (
          <p className="italic text-gray-400">Article content is empty.</p>
        )}
      </div>
      {/* End Lexical Renderer */}

      {/* Metadata Display - Placed after content renderer as per your code */}
      <div className="mb-6 text-sm text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
        {article.categories?.length > 0 && (
          <span>Categories: {article.categories.join(', ')}</span>
        )}
        {article.tags?.length > 0 && (
          <span>Tags: {article.tags.join(', ')}</span>
        )}
      </div>

      {/* Action Buttons - Only show for Admin users */}
      {isAdmin && (
        <div className="mt-6 border-t pt-4 flex flex-wrap gap-3 items-center">
          {' '}
          {/* Added flex-wrap and items-center */}
          <Link
            // Ensure article._id is the correct field from your API
            to={`/kb/${article._id || id}/edit`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow-sm transition duration-150 ease-in-out"
          >
            Edit
          </Link>
          {/* Version History Button */}
          <Link
            to={`/kb/${article._id || id}/versions`} // Link to a potential versions page/modal trigger
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded shadow-sm transition duration-150 ease-in-out"
          >
            View History
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal - Removed */}

      {/* --- Comment Section --- */}
      {/* Render CommentList only if article ID is available */}
      {id && <CommentList articleId={id} />}
      {/* --- End Comment Section --- */}
    </div>
  );
};

export default KbDetailsPage;
