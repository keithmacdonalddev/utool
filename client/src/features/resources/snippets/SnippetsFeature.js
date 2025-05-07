import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import {
  Clipboard,
  Plus,
  Minus,
  X,
  Edit,
  Trash2,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { useNotifications } from '../../../context/NotificationContext';
import Button from '../../../components/common/Button';
import ResourceSearch from '../components/ResourceSearch';
import {
  createSnippet,
  updateSnippet,
  deleteSnippet,
} from '../../../features/snippets/snippetSlice';
import { getCategories } from '../../../features/snippets/snippetCategorySlice';

/**
 * SnippetsFeature Component
 *
 * A comprehensive code snippets management feature that includes:
 * - Code snippets listing with search functionality
 * - Category-based organization
 * - Create, view, edit, delete, and manage snippet capabilities
 * - Integration with the ResourcesPage layout
 *
 * This component encapsulates all the snippet-specific functionality
 * that was previously in the ResourcesPage.
 *
 * @param {Object} props - Component props
 * @param {Object} props.activeCategory - Currently selected category
 * @param {Function} props.setActiveCategory - Function to set the active category
 * @param {Object} ref - Forwarded ref from parent component
 * @returns {React.ReactElement} The SnippetsFeature component
 */
const SnippetsFeature = forwardRef(
  ({ activeCategory, setActiveCategory }, ref) => {
    const dispatch = useDispatch();
    const { showNotification } = useNotifications();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [snippetToEdit, setSnippetToEdit] = useState(null);
    const [snippetToDelete, setSnippetToDelete] = useState(null);
    const [tooltipFontSize, setTooltipFontSize] = useState(12); // State for tooltip font size
    const [newSnippet, setNewSnippet] = useState({
      title: '',
      content: '',
      category: '',
      tags: [],
    });

    // Get data from Redux store
    const {
      snippets,
      isLoading: snippetsLoading,
      isError: snippetsError,
      message: snippetsMessage,
    } = useSelector((state) => state.snippets);

    const { categories } = useSelector((state) => state.snippetCategories);

    // Fetch categories when component mounts
    useEffect(() => {
      dispatch(getCategories());
    }, [dispatch]);

    /**
     * Handles opening the create snippet modal
     */
    const openCreateModal = () => {
      setIsCreateModalOpen(true);
      // Set the active category as default if one is selected
      if (activeCategory) {
        setNewSnippet((prev) => ({
          ...prev,
          category: activeCategory._id,
        }));
      }
    };

    /**
     * Expose methods to parent component via ref
     * This allows the parent component to call these methods directly
     */
    useImperativeHandle(ref, () => ({
      openCreateModal,
      closeCreateModal,
      handleCopy,
      openEditModal,
      openDeleteDialog,
    }));

    /**
     * Handles closing the create snippet modal and resets form state
     */
    const closeCreateModal = () => {
      setIsCreateModalOpen(false);
      setNewSnippet({
        title: '',
        content: '',
        category: '',
        tags: [],
      });
    };

    /**
     * Handles opening the edit snippet modal and sets the current snippet data
     *
     * @param {Object} snippet - The snippet object to edit
     */
    const openEditModal = (snippet) => {
      // Find which category this snippet belongs to
      let category = '';
      if (snippet.category) {
        category = snippet.category;
      }

      setSnippetToEdit({
        ...snippet,
        category,
        // Ensure tags is an array even if it's undefined in the original
        tags: snippet.tags || [],
      });
      setIsEditModalOpen(true);
    };

    /**
     * Handles closing the edit snippet modal and resets the snippet to edit
     */
    const closeEditModal = () => {
      setIsEditModalOpen(false);
      setSnippetToEdit(null);
    };

    /**
     * Opens the delete confirmation dialog for a snippet
     *
     * @param {Object} snippet - The snippet to delete
     */
    const openDeleteDialog = (snippet) => {
      setSnippetToDelete(snippet);
      setIsDeleteDialogOpen(true);
    };

    /**
     * Closes the delete confirmation dialog and resets the snippet to delete
     */
    const closeDeleteDialog = () => {
      setIsDeleteDialogOpen(false);
      setSnippetToDelete(null);
    };

    /**
     * Updates the new snippet form state based on input changes
     *
     * @param {Event} e - The change event from the input
     */
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setNewSnippet((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    /**
     * Updates the edit snippet form state based on input changes
     *
     * @param {Event} e - The change event from the input
     */
    const handleEditInputChange = (e) => {
      const { name, value } = e.target;
      setSnippetToEdit((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    /**
     * Handles the form submission for creating a new snippet
     * Dispatches the createSnippet action to Redux
     *
     * @param {Event} e - The form submission event
     */
    const handleCreateSubmit = (e) => {
      e.preventDefault();

      const snippetData = { ...newSnippet };

      // Add category information if selected
      if (snippetData.category) {
        // Store category for backend processing
        snippetData.category = snippetData.category;
      }

      dispatch(createSnippet(snippetData))
        .unwrap()
        .then(() => {
          showNotification('Snippet created successfully!', 'success');
          closeCreateModal();
        })
        .catch((error) => {
          showNotification(`Failed to create snippet: ${error}`, 'error');
        });
    };

    /**
     * Handles the form submission for updating an existing snippet
     * Dispatches the updateSnippet action to Redux
     *
     * @param {Event} e - The form submission event
     */
    const handleEditSubmit = (e) => {
      e.preventDefault();

      const updatedSnippet = { ...snippetToEdit };

      // Prepare the data for the API
      const snippetData = {
        id: updatedSnippet._id,
        snippetData: {
          title: updatedSnippet.title,
          content: updatedSnippet.content,
          category: updatedSnippet.category || null,
        },
      };

      dispatch(updateSnippet(snippetData))
        .unwrap()
        .then(() => {
          showNotification('Snippet updated successfully!', 'success');
          closeEditModal();
        })
        .catch((error) => {
          showNotification(`Failed to update snippet: ${error}`, 'error');
        });
    };

    /**
     * Confirms the deletion of a snippet
     * Dispatches the deleteSnippet action to Redux
     */
    const confirmDelete = () => {
      if (!snippetToDelete) return;

      dispatch(deleteSnippet(snippetToDelete._id))
        .unwrap()
        .then(() => {
          showNotification('Snippet deleted successfully!', 'success');
          closeDeleteDialog();
        })
        .catch((error) => {
          showNotification(`Failed to delete snippet: ${error}`, 'error');
        });
    };

    /**
     * Handles copying snippet content to clipboard
     * Shows notification on success or failure
     *
     * @param {string} text - The text content to copy to clipboard
     */
    const handleCopy = (text) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showNotification('Copied to clipboard!', 'success');
        })
        .catch((err) => {
          showNotification('Failed to copy: ' + err, 'error');
        });
    };

    /**
     * Increases the tooltip font size
     * Prevents font size from exceeding a max size (18px)
     *
     * @param {Event} e - The click event
     */
    const increaseTooltipFontSize = (e) => {
      e.stopPropagation(); // Prevent event from bubbling up to parent elements
      setTooltipFontSize((prev) => Math.min(prev + 2, 18)); // Increase by 2px with a max of 18px
    };

    /**
     * Decreases the tooltip font size
     * Prevents font size from becoming too small (8px)
     *
     * @param {Event} e - The click event
     */
    const decreaseTooltipFontSize = (e) => {
      e.stopPropagation(); // Prevent event from bubbling up to parent elements
      setTooltipFontSize((prev) => Math.max(prev - 2, 8)); // Decrease by 2px with a min of 8px
    };

    /**
     * Resets the tooltip font size to the default value (12px)
     *
     * @param {Event} e - The click event
     */
    const resetTooltipFontSize = (e) => {
      e.stopPropagation(); // Prevent event from bubbling up to parent elements
      setTooltipFontSize(12); // Reset to default font size (12px)
    };

    // Filter snippets based on search term and active category
    const filteredSnippets = snippets.filter((snippet) => {
      // Filter by search term
      const matchesSearch =
        snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snippet.content.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by category
      // If activeCategory is null, show all snippets
      // Otherwise, show only snippets in the active category
      const matchesCategory = activeCategory
        ? snippet.category === activeCategory._id
        : true;

      return matchesSearch && matchesCategory;
    });

    /**
     * Renders the snippet table with the provided snippets
     *
     * @param {Array} snippetsToRender - The snippets to display in the table
     * @returns {JSX.Element} The snippet table component
     */
    const renderSnippetTable = (snippetsToRender) => (
      <div className="overflow-visible rounded-lg border border-dark-700">
        <table className="min-w-full divide-y divide-dark-700">
          <thead>
            <tr className="bg-primary bg-opacity-20">
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-dark-700">
            {snippetsToRender.map((snippet) => (
              <tr
                key={snippet._id}
                className="hover:bg-dark-700 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                  {snippet.title}
                </td>
                <td className="px-6 py-4 max-w-xs text-sm text-[#C7C9D1]">
                  <div className="relative group max-w-xs">
                    <span className="block truncate">{snippet.content}</span>
                    <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-50 w-64 bg-dark-800 text-white text-xs p-2 rounded shadow-lg whitespace-pre-wrap break-words">
                      {/* Font size adjustment controls at top of tooltip */}
                      <div className="flex justify-end mb-2 border-b border-dark-600 pb-1">
                        <button
                          onClick={decreaseTooltipFontSize}
                          className="text-gray-400 hover:text-white mr-2"
                          title="Decrease text size"
                          aria-label="Decrease snippet text size"
                        >
                          <Minus size={14} />
                        </button>
                        {/* Display current zoom level as percentage */}
                        <span className="text-gray-400 mx-1 text-xs">
                          {Math.round((tooltipFontSize / 12) * 100)}%
                        </span>
                        <button
                          onClick={increaseTooltipFontSize}
                          className="text-gray-400 hover:text-white ml-2"
                          title="Increase text size"
                          aria-label="Increase snippet text size"
                        >
                          <Plus size={14} />
                        </button>
                        {/* Reset zoom button */}
                        <button
                          onClick={resetTooltipFontSize}
                          className="text-gray-400 hover:text-white ml-3"
                          title="Reset to default text size"
                          aria-label="Reset to default text size"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                      {/* Snippet content with dynamic font size */}
                      <div style={{ fontSize: `${tooltipFontSize}px` }}>
                        {snippet.content}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleCopy(snippet.content)}
                      className="text-gray-400 hover:text-white"
                      title="Copy snippet content"
                      aria-label={`Copy content of snippet: ${snippet.title}`}
                    >
                      <Clipboard size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(snippet)}
                      className="text-gray-400 hover:text-blue-400"
                      title="Edit snippet"
                      aria-label={`Edit snippet: ${snippet.title}`}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(snippet)}
                      className="text-gray-400 hover:text-red-500"
                      title="Delete snippet"
                      aria-label={`Delete snippet: ${snippet.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    /**
     * Renders the category selection dropdown
     *
     * @param {string} id - The HTML ID for the select element
     * @param {string} name - The name attribute for the form
     * @param {string} value - The currently selected value
     * @param {Function} onChange - Function to handle value changes
     * @param {boolean} required - Whether the field is required
     * @returns {JSX.Element} The category dropdown component
     */
    const renderCategorySelect = (
      id,
      name,
      value,
      onChange,
      required = false
    ) => (
      <div className="mb-4">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[#F8FAFC] mb-1"
        >
          Category {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-[#F8FAFC]"
          aria-label="Select a category for this snippet"
        >
          <option value="">No Category</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
    );

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <ResourceSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            resourceType="snippets"
          />
          <Button
            onClick={openCreateModal}
            variant="primary"
            className="flex items-center"
            aria-label="Create new snippet"
          >
            <Plus size={16} className="mr-1" />
            Add Snippet
          </Button>
        </div>

        {snippetsLoading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-foreground">Loading snippets...</p>
          </div>
        ) : snippetsError ? (
          <div className="text-center text-red-500 py-6">
            {snippetsMessage || 'Error loading snippets'}
          </div>
        ) : activeCategory ? (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[#F8FAFC] flex items-center">
                <Tag size={20} className="mr-2 text-primary" />
                {activeCategory.name}
              </h2>
              <p className="text-sm text-gray-400 ml-7">
                {filteredSnippets.length} snippet
                {filteredSnippets.length !== 1 ? 's' : ''}
              </p>
            </div>

            {filteredSnippets.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                No snippets in this category yet.
              </div>
            ) : (
              renderSnippetTable(filteredSnippets)
            )}
          </>
        ) : filteredSnippets.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            {searchTerm
              ? 'No snippets match your search'
              : 'No snippets yet. Create your first one!'}
          </div>
        ) : (
          renderSnippetTable(filteredSnippets)
        )}

        {/* Create Snippet Modal */}
        {isCreateModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-snippet-title"
          >
            <div className="bg-dark-800 rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2
                  id="create-snippet-title"
                  className="text-xl font-semibold text-[#F8FAFC]"
                >
                  Create New Snippet
                </h2>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-[#F8FAFC] mb-1"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newSnippet.title}
                    onChange={handleInputChange}
                    className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-[#F8FAFC]"
                    required
                    aria-required="true"
                  />
                </div>

                {/* Category Selector */}
                {renderCategorySelect(
                  'category',
                  'category',
                  newSnippet.category,
                  handleInputChange
                )}

                <div className="mb-4">
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-[#F8FAFC] mb-1"
                  >
                    Content
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    value={newSnippet.content}
                    onChange={handleInputChange}
                    rows={8}
                    className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-[#F8FAFC]"
                    required
                    aria-required="true"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    onClick={closeCreateModal}
                    variant="secondary"
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="px-4 py-2">
                    Save Snippet
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Snippet Modal */}
        {isEditModalOpen && snippetToEdit && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-snippet-title"
          >
            <div className="bg-dark-800 rounded-lg p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2
                  id="edit-snippet-title"
                  className="text-xl font-semibold text-[#F8FAFC]"
                >
                  Edit Snippet
                </h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close edit modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="edit-title"
                    className="block text-sm font-medium text-[#F8FAFC] mb-1"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="edit-title"
                    name="title"
                    value={snippetToEdit.title}
                    onChange={handleEditInputChange}
                    className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-[#F8FAFC]"
                    required
                    aria-required="true"
                  />
                </div>

                {/* Category Selector */}
                {renderCategorySelect(
                  'edit-category',
                  'category',
                  snippetToEdit.category || '',
                  handleEditInputChange
                )}

                <div className="mb-4">
                  <label
                    htmlFor="edit-content"
                    className="block text-sm font-medium text-[#F8FAFC] mb-1"
                  >
                    Content
                  </label>
                  <textarea
                    id="edit-content"
                    name="content"
                    value={snippetToEdit.content}
                    onChange={handleEditInputChange}
                    rows={8}
                    className="w-full bg-dark-700 border border-dark-600 rounded-md px-3 py-2 text-[#F8FAFC]"
                    required
                    aria-required="true"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    onClick={closeEditModal}
                    variant="secondary"
                    className="px-4 py-2"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="px-4 py-2">
                    Save Snippet
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Snippet Confirmation Dialog */}
        {isDeleteDialogOpen && snippetToDelete && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
              <div className="mb-4">
                <h2
                  id="delete-dialog-title"
                  className="text-xl font-semibold text-[#F8FAFC]"
                >
                  Delete Snippet
                </h2>
                <p className="mt-2 text-gray-300">
                  Are you sure you want to delete "
                  <span className="font-semibold">{snippetToDelete.title}</span>
                  "? This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={closeDeleteDialog}
                  variant="secondary"
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmDelete}
                  variant="danger"
                  className="px-4 py-2"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SnippetsFeature.propTypes = {
  activeCategory: PropTypes.object,
  setActiveCategory: PropTypes.func,
};

export default SnippetsFeature;
