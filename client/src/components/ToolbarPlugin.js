// src/components/ToolbarPlugin.js

import React from 'react';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $wrapLeafNodesInElements } from '@lexical/selection';

const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();

  const applyFormat = (format) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.formatText(format);
      }
    });
  };

  return (
    <div className="flex gap-2 mb-2">
      <button
        type="button"
        onClick={() => applyFormat('bold')}
        className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
      >
        Bold
      </button>
      <button
        type="button"
        onClick={() => applyFormat('italic')}
        className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
      >
        Italic
      </button>
      <button
        type="button"
        onClick={() => applyFormat('underline')}
        className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
      >
        Underline
      </button>
    </div>
  );
};

export default ToolbarPlugin;

/*
🔍 EDUCATIONAL NOTES:

- useLexicalComposerContext() gives us access to the editor instance from Lexical.
- FORMAT_TEXT_COMMAND lets us apply styles like bold/italic/underline.
- The $isRangeSelection and $getSelection help us safely handle selected text ranges.
- Tailwind CSS is used for simple UI styling here.
*/
