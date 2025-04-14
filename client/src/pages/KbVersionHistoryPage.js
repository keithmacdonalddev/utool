import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { ArrowLeft, History, AlertTriangle } from 'lucide-react'; // Icons

// --- Lexical Imports for Viewer ---
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
// *** Import ALL other nodes used by your editor (e.g., CodeNode) ***

// --- Theme Configuration (Should match KbDetailsPage and Editor) ---
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'mb-1 text-left text-sm', // Adjusted for smaller preview
  heading: {
    h1: 'text-xl font-bold my-2',
    h2: 'text-lg font-bold my-1',
    h3: 'text-base font-bold my-1',
  },
  list: {
    ul: 'list-disc ml-4 mb-1 text-left text-sm',
    ol: 'list-decimal ml-4 mb-1 text-left text-sm',
    listitem: 'mb-0.5 text-left text-sm',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    code: 'bg-gray-100 text-xs font-mono px-1 py-0.5 rounded mx-0.5',
  },
  link: 'text-blue-500 hover:underline cursor-pointer text-sm',
  quote: 'border-l-4 border-gray-300 pl-2 italic my-1 text-sm',
};

// --- Registered Nodes List (Should match KbDetailsPage and Editor) ---
const editorNodes = [
  HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode,
  // ... Add any other nodes used
];

// --- Enhanced Lexical Viewer Component ---
const LexicalViewer = ({ editorStateString, versionNumber }) => {
  const initialConfig = {
    namespace: `KbVersionViewer-${versionNumber}`, // Unique namespace per version
    theme: theme,
    nodes: editorNodes,
    onError: (error) => {
      console.error(`Lexical Viewer Error (Version ${versionNumber}):`, error);
      // Maybe set an error state specific to this viewer instance if needed
    },
    editable: false, // Read-only
    editorState: editorStateString, // Load the specific version's state
  };

  if (!editorStateString) {
    return <p className="italic text-gray-500 text-sm p-2">No content available for this version.</p>;
  }

  // Attempt to parse the state first to avoid crashing LexicalComposer
  try {
    JSON.parse(editorStateString); // Just validate JSON format
  } catch (error) {
     console.error(`Error parsing editor state for Version ${versionNumber}:`, error);
     return <p className="text-red-500 italic text-sm p-2">Invalid content format for this version.</p>;
  }


  return (
    <div className="text-sm border rounded bg-gray-50 overflow-auto max-h-60 p-2 mt-1">
       {/* Added max-h-60 for better height control */}
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="read-only-content-area outline-none" // Added outline-none
              aria-readonly={true}
              role="article"
            />
          }
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </div>
  );
};


const KbVersionHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [articleTitle, setArticleTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [message, setMessage] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [versionToRestore, setVersionToRestore] = useState(null); // For confirmation modal

  useEffect(() => {
    const fetchVersions = async () => {
      setIsLoading(true);
      setIsError(false);
      setMessage('');
      setRestoreError('');
      try {
        // Fetch article details first to get the title
        const articleRes = await api.get(`/kb/${id}`);
        if (articleRes.data?.success) {
          setArticleTitle(articleRes.data.data.title);
        } else {
          throw new Error(articleRes.data?.message || 'Failed to fetch article title');
        }

        // Fetch versions
        const versionsRes = await api.get(`/kb/${id}/versions`);
        if (versionsRes.data?.success && Array.isArray(versionsRes.data.data)) {
          // Sort versions descending by version number (most recent first)
          setVersions(versionsRes.data.data.sort((a, b) => b.versionNumber - a.versionNumber));
        } else {
          throw new Error(versionsRes.data?.message || 'Failed to fetch versions');
        }
      } catch (error) {
        console.error('Fetch Error (Version History):', error);
        setIsError(true);
        setMessage(error.message || 'Failed to load version history.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchVersions();
    } else {
      setIsLoading(false);
      setIsError(true);
      setMessage('Article ID is missing.');
    }
  }, [id]);

  const handleRestore = async () => {
    if (!id || !versionToRestore) {
      setRestoreError('Missing article ID or version ID.');
      return;
    }
    setIsRestoring(true);
    setRestoreError('');
    try {
      await api.post(`/kb/${id}/versions/${versionToRestore.versionNumber}/restore`);
      setVersionToRestore(null); // Close modal
      // Optionally show a success message before navigating
      alert('Article restored successfully!');
      navigate(`/kb/${id}`); // Navigate back to the article details page
    } catch (error) {
      console.error('Restore Error:', error);
      setRestoreError(error.response?.data?.message || 'Failed to restore version.');
      // Keep modal open on error
    } finally {
      setIsRestoring(false);
    }
  };

  const openRestoreModal = (version) => {
    setVersionToRestore(version);
    setRestoreError('');
  };

  const closeRestoreModal = () => {
    setVersionToRestore(null);
    setRestoreError('');
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading version history...</div>;
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
          <strong className="font-bold">Loading Error!</strong> {message}
        </div>
        <Link to={`/kb/${id}`} className="mt-4 inline-flex items-center text-blue-600 hover:underline">
          <ArrowLeft size={16} className="mr-1" /> Back to Article
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link to={`/kb/${id}`} className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline">
          <ArrowLeft size={16} className="mr-1" /> Back to Article
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1 text-gray-800">Version History</h1>
      <h2 className="text-lg text-gray-600 mb-6">For: {articleTitle || 'Article'}</h2>

      {versions.length === 0 ? (
        <p className="text-gray-500">No version history found for this article.</p>
      ) : (
        <div className="space-y-6">
          {versions.map((version) => (
            <div key={version.versionNumber} className="border rounded-lg p-4 shadow-sm bg-white">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold">Version {version.versionNumber}</h3>
                  <p className="text-sm text-gray-500">
                    Saved on: {new Date(version.savedAt).toLocaleString()}
                  </p>
                  {/* Consider adding 'Saved by: user' if available */}
                </div>
                <button
                  onClick={() => openRestoreModal(version)}
                  className="bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-1 px-3 rounded shadow-sm transition duration-150 ease-in-out disabled:opacity-50"
                  disabled={isRestoring}
                >
                  <History size={14} className="inline mr-1" /> Restore
                </button>
              </div>
              {/* Enhanced Content Preview */}
              <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:underline">View Content</summary>
                  {/* Pass versionNumber for unique namespace */}
                  <LexicalViewer editorStateString={version.content} versionNumber={version.versionNumber} />
              </details>
            </div>
          ))}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {versionToRestore && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <AlertTriangle size={24} className="text-yellow-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Restore Version</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to restore the article to Version {versionToRestore.versionNumber}? The current content will be overwritten with this version.
                </p>
              </div>
              {restoreError && (
                <div className="mt-2 px-7 py-1 text-sm text-red-600">
                  Error: {restoreError}
                </div>
              )}
              <div className="items-center px-4 py-3 mt-4 flex justify-center gap-4">
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="px-4 py-2 bg-green-600 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Confirm Restore'}
                </button>
                <button
                  onClick={closeRestoreModal}
                  disabled={isRestoring}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KbVersionHistoryPage;
