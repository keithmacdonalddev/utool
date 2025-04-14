// File: src/components/Editor/plugins/LinkPlugin.jsx

import { useEffect } from 'react';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

const LinkPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Optionally, we could set up a handler here for link behaviors
    return () => {};
  }, [editor]);

  return null;
};

export default LinkPlugin;
