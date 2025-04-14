// File: src/components/Editor/plugins/ListPlugin.jsx

import { ListPlugin as LexicalListPlugin } from '@lexical/react/LexicalListPlugin';

const ListPlugin = () => {
  return <LexicalListPlugin />;
};

export default ListPlugin;
export {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
export { REMOVE_LIST_COMMAND } from '@lexical/list';
