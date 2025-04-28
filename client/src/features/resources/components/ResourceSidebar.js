import React from 'react';
import PropTypes from 'prop-types';
import Button from '../../../components/common/Button';
import { Plus } from 'lucide-react';

/**
 * ResourceSidebar Component
 *
 * A reusable sidebar component for resource features that provides:
 * - Consistent header with title and optional add button
 * - Container for sidebar content with proper styling
 * - Standardized add button interface
 * - Support for modal forms and confirmations within the sidebar
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Title displayed at the top of the sidebar
 * @param {React.ReactNode} props.children - Content to display in the sidebar
 * @param {Function} props.onAddClick - Handler for when the add button is clicked
 * @param {React.ReactNode} props.addButtonIcon - Icon to display in the add button
 * @param {string} props.addButtonTitle - Title for the add button tooltip
 * @param {boolean} props.hideAddButton - Whether to hide the add button
 * @param {React.ReactNode} props.extraContent - Additional content to display at the bottom of the sidebar
 * @returns {React.ReactElement} The ResourceSidebar component
 */
const ResourceSidebar = ({
  title,
  children,
  onAddClick,
  addButtonIcon = <Plus size={16} />,
  addButtonTitle = 'Add New',
  hideAddButton = false,
  extraContent,
}) => {
  return (
    <>
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="text-[#F8FAFC] font-semibold">{title}</h3>
        {!hideAddButton && (
          <Button
            variant="ghost"
            size="sm"
            title={addButtonTitle}
            onClick={onAddClick}
          >
            {addButtonIcon}
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
      {extraContent && <div className="mt-2">{extraContent}</div>}
    </>
  );
};

ResourceSidebar.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  onAddClick: PropTypes.func,
  addButtonIcon: PropTypes.node,
  addButtonTitle: PropTypes.string,
  hideAddButton: PropTypes.bool,
  extraContent: PropTypes.node,
};

export default ResourceSidebar;
