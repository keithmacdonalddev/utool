// File: src/components/Editor/Toolbar.jsx

import React, { useEffect, useState } from 'react';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $createParagraphNode,
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode } from '@lexical/rich-text';

// Import icons from lucide-react
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  List as ListIcon,
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  X,
  Type as ParagraphIcon,
} from 'lucide-react';

const Toolbar = () => {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [activeBlockType, setActiveBlockType] = useState('paragraph');

  // Track selection formatting to toggle button state (highlighted or not)
  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // Update text formatting states
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));

          // Get selected node to determine block type
          const anchorNode = selection.anchor.getNode();
          const element =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : anchorNode.getTopLevelElementOrThrow();
          const elementKey = element.getKey();
          const elementDOM = editor.getElementByKey(elementKey);

          if (elementDOM) {
            if (elementDOM.tagName === 'P') {
              setActiveBlockType('paragraph');
            } else if (elementDOM.tagName === 'H1') {
              setActiveBlockType('h1');
            } else if (elementDOM.tagName === 'H2') {
              setActiveBlockType('h2');
            }
          }
        }
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  const applyFormat = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const insertLink = () => {
    const url = prompt('Enter the URL');
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  };

  const setBlockType = (type) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        switch (type) {
          case 'paragraph':
            $setBlocksType(selection, () => $createParagraphNode());
            break;
          case 'h1':
          case 'h2':
            $setBlocksType(selection, () => $createHeadingNode(type));
            break;
          default:
            // Default case to handle any other types
            $setBlocksType(selection, () => $createParagraphNode());
            break;
        }
      }
    });
  };

  const buttonClasses = (isActive) =>
    `p-1 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-200' : ''}`;

  return (
    <div className="flex flex-wrap gap-2 border-b px-2 py-1 bg-gray-50 sticky top-0 z-10">
      {/* Text formatting */}
      <button
        onClick={() => applyFormat('bold')}
        className={buttonClasses(isBold)}
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => applyFormat('italic')}
        className={buttonClasses(isItalic)}
        title="Italic"
      >
        <Italic size={18} />
      </button>
      <button
        onClick={() => applyFormat('underline')}
        className={buttonClasses(isUnderline)}
        title="Underline"
      >
        <Underline size={18} />
      </button>

      <div className="h-6 w-px mx-1 bg-gray-200" />

      {/* Headings */}
      <button
        onClick={() => setBlockType('paragraph')}
        className={buttonClasses(activeBlockType === 'paragraph')}
        title="Paragraph"
      >
        <ParagraphIcon size={18} />
      </button>
      <button
        onClick={() => setBlockType('h1')}
        className={buttonClasses(activeBlockType === 'h1')}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </button>
      <button
        onClick={() => setBlockType('h2')}
        className={buttonClasses(activeBlockType === 'h2')}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </button>

      <div className="h-6 w-px mx-1 bg-gray-200" />

      {/* Lists */}
      <button
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND)}
        className={buttonClasses(false)}
        title="Bullet List"
      >
        <ListIcon size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND)}
        className={buttonClasses(false)}
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(REMOVE_LIST_COMMAND)}
        className={buttonClasses(false)}
        title="Remove List"
      >
        <X size={18} />
      </button>

      <div className="h-6 w-px mx-1 bg-gray-200" />

      {/* Link */}
      <button
        onClick={insertLink}
        className={buttonClasses(false)}
        title="Insert Link"
      >
        <LinkIcon size={18} />
      </button>

      <div className="h-6 w-px mx-1 bg-gray-200" />

      {/* Undo/Redo */}
      <button
        onClick={() => editor.dispatchCommand(UNDO_COMMAND)}
        className={buttonClasses(false)}
        title="Undo"
      >
        <Undo size={18} />
      </button>
      <button
        onClick={() => editor.dispatchCommand(REDO_COMMAND)}
        className={buttonClasses(false)}
        title="Redo"
      >
        <Redo size={18} />
      </button>
    </div>
  );
};

export default Toolbar;
