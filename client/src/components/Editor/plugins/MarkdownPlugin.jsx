// File: src/components/Editor/plugins/MarkdownPlugin.jsx

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TRANSFORMERS, registerMarkdownShortcuts } from '@lexical/markdown';

const MarkdownPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerMarkdownShortcuts(editor, TRANSFORMERS);
  }, [editor]);

  return null;
};

export default MarkdownPlugin;
