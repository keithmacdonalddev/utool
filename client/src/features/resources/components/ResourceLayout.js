import React from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ResourceLayout Component
 *
 * A consistent layout wrapper for resource pages that provides:
 * - A standard header with back navigation, title, and action buttons
 * - A two-column layout with sidebar for navigation and main content area
 * - Responsive design that maintains consistent spacing and styling
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Main content to display in the right panel
 * @param {React.ReactNode} props.sidebar - Sidebar content for the left panel
 * @param {string} props.title - Page title displayed in the header
 * @param {React.ReactNode} props.actions - Action buttons/controls to display in the header
 * @param {string} props.activeTab - Currently active tab identifier
 * @param {Function} props.setActiveTab - Function to change the active tab
 * @returns {React.ReactElement} The ResourceLayout component
 */
const ResourceLayout = ({
  children,
  sidebar,
  title,
  actions,
  activeTab,
  setActiveTab,
  tabs,
}) => {
  return (
    <div className="container mx-auto p-4 h-full flex flex-col">
      {/* Header with back button, title, and action buttons */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm text-accent-purple font-bold hover:text-accent-blue hover:underline"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">{title}</h1>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {/* Tabs */}
      {tabs && (
        <div className="flex border-b border-dark-600 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`py-2 px-4 font-medium ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon && <tab.icon size={18} className="inline-block mr-2" />}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content area with resource navigation sidebar and content */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Resource navigation sidebar */}
        {sidebar && (
          <div className="w-64 flex flex-col bg-app-sidebar rounded-lg border border-sidebar-border shadow-xl p-2">
            {/* Navigation container with scroll */}
            <div className="flex-1 overflow-y-auto min-h-0">{sidebar}</div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-grow flex flex-col min-h-0 bg-app-sidebar rounded-lg border border-sidebar-border shadow-xl p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

ResourceLayout.propTypes = {
  children: PropTypes.node.isRequired,
  sidebar: PropTypes.node,
  title: PropTypes.string.isRequired,
  actions: PropTypes.node,
  activeTab: PropTypes.string,
  setActiveTab: PropTypes.func,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
    })
  ),
};

export default ResourceLayout;
