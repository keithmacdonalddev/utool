// src/components/Editor/LexicalEditor.jsx

import React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
// import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'; // Consider removing/disabling for edit page
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// --- Node Imports ---
// IMPORTANT: Ensure these imports match EXACTLY between your editor, viewer, and edit page.
// Use standard imports unless you have intentionally created custom node files.
import { LinkNode } from '@lexical/link';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
// *** Import ALL other nodes your editor uses (e.g., CodeNode, CodeHighlightNode) ***
// Example: import { CodeNode, CodeHighlightNode } from '@lexical/code';

import Toolbar from './Toolbar'; // Assuming Toolbar is correctly set up

// --- Theme Configuration ---
// Define centrally or ensure this exact object is used everywhere (Editor, Viewer, Edit Page).
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  paragraph: 'mb-2 text-left', // Ensure left alignment
  heading: {
    h1: 'text-3xl font-bold my-4',
    h2: 'text-2xl font-bold my-3',
    h3: 'text-xl font-bold my-2',
    // h4, h5, h6... if used
  },
  list: {
    ul: 'list-disc ml-6 mb-2',
    ol: 'list-decimal ml-6 mb-2',
    listitem: 'mb-1',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through', // If used
    code: 'bg-gray-100 text-sm font-mono px-1 py-0.5 rounded mx-0.5', // For inline code
  },
  link: 'text-blue-600 hover:underline cursor-pointer',
  quote: 'border-l-4 border-gray-300 pl-4 italic my-4',
  // code: 'bg-gray-100 block p-2 my-2 font-mono text-sm overflow-x-auto rounded border', // For code blocks (if using CodeNode)
  // ... other theme keys needed
};

// --- Registered Nodes ---
// List ALL nodes used in the editor/viewer here. Must match everywhere.
const editorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  // ... Add other nodes like CodeNode if used
];

// Helper function to safely prepare the initial state string for Lexical
const editorStateFromJSON = (jsonString) => {
  try {
    // Check if it's a non-empty string that looks like it might be JSON state
    if (
      jsonString &&
      typeof jsonString === 'string' &&
      jsonString.trim() !== '' &&
      jsonString !== '{}' &&
      jsonString !== 'null'
    ) {
      // Lexical's initialConfig.editorState will handle the actual parsing/validation
      return jsonString;
    }
  } catch (e) {
    console.error('Error processing initial editor state string:', e);
  }
  // Return null if input is invalid/empty, so Lexical starts with a default empty state
  return null;
};

// --- LexicalEditor Component ---
const LexicalEditor = ({
  onContentChange,
  initialEditorStateString = null, // Prop to receive initial content JSON string
}) => {
  // Define initialConfig INSIDE the component function to access props
  const initialConfig = {
    // Use a dynamic namespace to help ensure clean state, especially if multiple editors could exist
    namespace: 'KbEditor-' + Math.random().toString(36).substring(7),
    theme: theme, // Use the consistent theme object
    onError: (error) =>
      console.error('Lexical Initialization/Runtime Error:', error),
    nodes: editorNodes, // Use the consistent node list
    // Pass the validated initial state string to LexicalComposer
    editorState: editorStateFromJSON(initialEditorStateString),
  };

  // State Change Handler
  const handleEditorChange = (editorState, editor) => {
    const currentJsonString = JSON.stringify(editorState);

    // Get the string representation of the initial state that was passed in
    const initialJsonString = editorStateFromJSON(initialEditorStateString);

    // Call onContentChange only if the state is actually different from the initial state
    // or if there was no valid initial state provided (i.e., it started empty).
    // This prevents firing the callback immediately on load with the initial content.
    if (currentJsonString !== initialJsonString || !initialJsonString) {
      if (onContentChange) {
        onContentChange(currentJsonString);
      }
    }
  };

  return (
    // Pass the dynamically created initialConfig
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container border border-gray-300 rounded-lg shadow-sm bg-white">
        <Toolbar />{' '}
        {/* Assumes Toolbar uses useLexicalComposerContext correctly */}
        {/* Apply padding to the inner div containing ContentEditable */}
        <div className="editor-inner relative p-4">
          <RichTextPlugin
            contentEditable={
              // Apply editor styling here, no padding needed as parent has it
              <ContentEditable className="editor-input min-h-[200px] focus:outline-none block w-full text-left resize-y" /> // Added resize-y example
            }
            placeholder={
              // Align placeholder with the parent's padding (top-4, left-4 matches p-4)
              <div className="editor-placeholder text-gray-400 absolute top-4 left-4 pointer-events-none select-none">
                Enter content here...
              </div>
            }
            // Use LexicalErrorBoundary to catch rendering errors within the editor UI
            ErrorBoundary={LexicalErrorBoundary}
          />
          {/* Pass the specific onChange handler */}
          {/* ignoreInitialChange helps prevent immediate firing on load */}
          <OnChangePlugin
            onChange={handleEditorChange}
            ignoreInitialChange={true}
          />
          <HistoryPlugin /> {/* Enables Undo/Redo */}
          {/* <AutoFocusPlugin /> */} {/* Usually not wanted on edit pages */}
          <LinkPlugin /> {/* Required for link functionality */}
          <ListPlugin /> {/* Required for list functionality */}
          {/* *** Add other essential plugins (e.g., CodeHighlightPlugin) *** */}
        </div>
      </div>
    </LexicalComposer>
  );
};

export default LexicalEditor; // Use default export (can switch to named if needed for circular deps)
