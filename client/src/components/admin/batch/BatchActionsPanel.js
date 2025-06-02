import React, { useState } from 'react';
import {
  Users,
  CheckSquare,
  Square,
  MoreHorizontal,
  Edit3,
  UserCheck,
  UserX,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Clock,
} from 'lucide-react';

/**
 * BatchActionsPanel Component
 *
 * Comprehensive interface for batch operations on selected users. Provides
 * intuitive controls for bulk updates, progress tracking, and operation
 * management with proper confirmation workflows.
 *
 * Part of Milestone 4: Batch Operations & User Management
 *
 * @param {Object} props - Component props
 * @param {Array} props.selectedItems - Array of selected user IDs
 * @param {number} props.selectedCount - Number of selected items
 * @param {boolean} props.selectionMode - Whether selection mode is active
 * @param {Function} props.onToggleSelectionMode - Toggle selection mode
 * @param {Function} props.onSelectAll - Select all items
 * @param {Function} props.onClearSelection - Clear all selections
 * @param {Object} props.userOperations - User operation functions
 * @param {Array} props.activeOperations - Currently running operations
 * @param {Function} props.onCancelOperation - Cancel operation function
 * @param {Array} props.allUsers - All available users for selection context
 * @returns {React.ReactElement} The BatchActionsPanel component
 */
const BatchActionsPanel = ({
  selectedItems = [],
  selectedCount = 0,
  selectionMode = false,
  onToggleSelectionMode,
  onSelectAll,
  onClearSelection,
  userOperations = {},
  activeOperations = [],
  onCancelOperation,
  allUsers = [],
}) => {
  // State for various modal dialogs
  const [showBulkRoleModal, setShowBulkRoleModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkVerificationModal, setShowBulkVerificationModal] =
    useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // State for form inputs
  const [bulkRole, setBulkRole] = useState('');
  const [bulkStatus, setBulkStatus] = useState(true);
  const [bulkVerification, setBulkVerification] = useState(true);
  const [exportFormat, setExportFormat] = useState('csv');
  const [includePersonalData, setIncludePersonalData] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // Operation loading states
  const [operationLoading, setOperationLoading] = useState({});

  /**
   * Handle bulk role update
   */
  const handleBulkRoleUpdate = async () => {
    if (!bulkRole || selectedItems.length === 0) return;

    setOperationLoading({ ...operationLoading, roleUpdate: true });

    try {
      await userOperations.bulkUpdateRoles(selectedItems, bulkRole);
      setShowBulkRoleModal(false);
      setBulkRole('');
      onClearSelection();
    } catch (error) {
      console.error('Bulk role update failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, roleUpdate: false });
    }
  };

  /**
   * Handle bulk status update
   */
  const handleBulkStatusUpdate = async () => {
    if (selectedItems.length === 0) return;

    setOperationLoading({ ...operationLoading, statusUpdate: true });

    try {
      await userOperations.bulkUpdateStatus(selectedItems, bulkStatus);
      setShowBulkStatusModal(false);
      onClearSelection();
    } catch (error) {
      console.error('Bulk status update failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, statusUpdate: false });
    }
  };

  /**
   * Handle bulk verification update
   */
  const handleBulkVerificationUpdate = async () => {
    if (selectedItems.length === 0) return;

    setOperationLoading({ ...operationLoading, verificationUpdate: true });

    try {
      await userOperations.bulkUpdateVerification(
        selectedItems,
        bulkVerification
      );
      setShowBulkVerificationModal(false);
      onClearSelection();
    } catch (error) {
      console.error('Bulk verification update failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, verificationUpdate: false });
    }
  };

  /**
   * Handle bulk delete
   */
  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    setOperationLoading({ ...operationLoading, delete: true });

    try {
      await userOperations.bulkDeleteUsers(selectedItems);
      setShowBulkDeleteModal(false);
      onClearSelection();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, delete: false });
    }
  };

  /**
   * Handle user export
   */
  const handleExport = async () => {
    setOperationLoading({ ...operationLoading, export: true });

    try {
      const result = await userOperations.exportUsers(selectedItems, {
        format: exportFormat,
        includePersonalData,
      });

      // Trigger download
      if (result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShowExportModal(false);
      onClearSelection();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, export: false });
    }
  };

  /**
   * Handle user import
   */
  const handleImport = async () => {
    if (!importFile) return;

    setOperationLoading({ ...operationLoading, import: true });

    try {
      await userOperations.importUsers(importFile);
      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setOperationLoading({ ...operationLoading, import: false });
    }
  };

  /**
   * Get operation status color
   */
  const getOperationStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'in_progress':
        return 'text-blue-400';
      case 'failed':
        return 'text-red-400';
      case 'cancelled':
        return 'text-gray-400';
      case 'partial_success':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  /**
   * Get operation status icon
   */
  const getOperationStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'in_progress':
        return <Clock size={16} className="text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'cancelled':
        return <X size={16} className="text-gray-400" />;
      case 'partial_success':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Selection Header */}
      <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg border border-border-secondary">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSelectionMode}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
              selectionMode
                ? 'bg-brand-primary text-white'
                : 'bg-surface-secondary text-heading hover:bg-surface-secondary/80'
            }`}
          >
            {selectionMode ? (
              <CheckSquare size={16} className="mr-2" />
            ) : (
              <Square size={16} className="mr-2" />
            )}
            Selection Mode
          </button>

          {selectionMode && (
            <div className="flex items-center space-x-2">
              <span className="text-caption text-sm">
                {selectedCount} of {allUsers.length} selected
              </span>

              <button
                onClick={onSelectAll}
                className="text-brand-primary hover:text-brand-primary-dark text-sm font-medium transition-colors duration-200"
              >
                Select All
              </button>

              {selectedCount > 0 && (
                <button
                  onClick={onClearSelection}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors duration-200"
                >
                  Clear Selection
                </button>
              )}
            </div>
          )}
        </div>

        {selectionMode && selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-heading text-sm font-medium">
              {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
        )}
      </div>

      {/* Batch Actions */}
      {selectionMode && selectedCount > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border-secondary">
          <h3 className="text-heading text-lg font-semibold mb-4">
            Batch Actions ({selectedCount} users)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Bulk Role Update */}
            <button
              onClick={() => setShowBulkRoleModal(true)}
              className="flex flex-col items-center p-3 bg-surface-secondary hover:bg-brand-primary/10 rounded-lg transition-colors duration-200 group"
            >
              <Edit3
                size={20}
                className="text-purple-400 group-hover:text-brand-primary mb-2"
              />
              <span className="text-caption text-xs text-center">
                Update Roles
              </span>
            </button>

            {/* Bulk Status Update */}
            <button
              onClick={() => setShowBulkStatusModal(true)}
              className="flex flex-col items-center p-3 bg-surface-secondary hover:bg-brand-primary/10 rounded-lg transition-colors duration-200 group"
            >
              <UserCheck
                size={20}
                className="text-green-400 group-hover:text-brand-primary mb-2"
              />
              <span className="text-caption text-xs text-center">
                Update Status
              </span>
            </button>

            {/* Bulk Verification */}
            <button
              onClick={() => setShowBulkVerificationModal(true)}
              className="flex flex-col items-center p-3 bg-surface-secondary hover:bg-brand-primary/10 rounded-lg transition-colors duration-200 group"
            >
              <UserX
                size={20}
                className="text-blue-400 group-hover:text-brand-primary mb-2"
              />
              <span className="text-caption text-xs text-center">
                Verification
              </span>
            </button>

            {/* Export Users */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex flex-col items-center p-3 bg-surface-secondary hover:bg-brand-primary/10 rounded-lg transition-colors duration-200 group"
            >
              <Download
                size={20}
                className="text-orange-400 group-hover:text-brand-primary mb-2"
              />
              <span className="text-caption text-xs text-center">Export</span>
            </button>

            {/* Import Users */}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex flex-col items-center p-3 bg-surface-secondary hover:bg-brand-primary/10 rounded-lg transition-colors duration-200 group"
            >
              <Upload
                size={20}
                className="text-cyan-400 group-hover:text-brand-primary mb-2"
              />
              <span className="text-caption text-xs text-center">Import</span>
            </button>

            {/* Bulk Delete */}
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex flex-col items-center p-3 bg-surface-secondary hover:bg-red-500/10 rounded-lg transition-colors duration-200 group"
            >
              <Trash2
                size={20}
                className="text-red-400 group-hover:text-red-400 mb-2"
              />
              <span className="text-caption text-xs text-center">Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Operations */}
      {activeOperations.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border-secondary">
          <h3 className="text-heading text-lg font-semibold mb-4">
            Active Operations ({activeOperations.length})
          </h3>

          <div className="space-y-3">
            {activeOperations.map((operation) => (
              <div
                key={operation.operationId}
                className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getOperationStatusIcon(operation.status)}
                  <div>
                    <div className="text-heading text-sm font-medium">
                      {operation.type.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-caption text-xs">
                      {operation.processedItems || 0} of{' '}
                      {operation.totalItems || 0} completed
                      {operation.estimatedTimeRemaining && (
                        <span className="ml-2">
                          •{' '}
                          {Math.round(operation.estimatedTimeRemaining / 1000)}s
                          remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Progress Bar */}
                  <div className="w-32 bg-surface-primary rounded-full h-2">
                    <div
                      className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${operation.progress || 0}%` }}
                    />
                  </div>

                  <span className="text-caption text-xs font-medium w-10 text-right">
                    {operation.progress || 0}%
                  </span>

                  {/* Cancel Button */}
                  {operation.status === 'in_progress' && (
                    <button
                      onClick={() => onCancelOperation(operation.operationId)}
                      className="text-red-400 hover:text-red-300 transition-colors duration-200"
                      title="Cancel Operation"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Role Update Modal */}
      {showBulkRoleModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <Edit3 className="mr-2 h-5 w-5 text-purple-400" />
              <h3 className="text-heading text-lg font-semibold">
                Update User Roles
              </h3>
            </div>

            <p className="text-caption mb-4">
              Update the role for {selectedCount} selected user
              {selectedCount !== 1 ? 's' : ''}.
            </p>

            <div className="mb-4">
              <label className="block text-heading text-sm font-medium mb-2">
                New Role
              </label>
              <select
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value)}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Pro User">Pro User</option>
                <option value="Regular User">Regular User</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkRoleUpdate}
                disabled={!bulkRole || operationLoading.roleUpdate}
                className="flex-1 bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.roleUpdate ? 'Updating...' : 'Update Roles'}
              </button>
              <button
                onClick={() => setShowBulkRoleModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <UserCheck className="mr-2 h-5 w-5 text-green-400" />
              <h3 className="text-heading text-lg font-semibold">
                Update User Status
              </h3>
            </div>

            <p className="text-caption mb-4">
              Update the status for {selectedCount} selected user
              {selectedCount !== 1 ? 's' : ''}.
            </p>

            <div className="mb-4">
              <label className="block text-heading text-sm font-medium mb-2">
                New Status
              </label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value === 'true')}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkStatusUpdate}
                disabled={operationLoading.statusUpdate}
                className="flex-1 bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.statusUpdate
                  ? 'Updating...'
                  : 'Update Status'}
              </button>
              <button
                onClick={() => setShowBulkStatusModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Verification Modal */}
      {showBulkVerificationModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <UserX className="mr-2 h-5 w-5 text-blue-400" />
              <h3 className="text-heading text-lg font-semibold">
                Update Verification Status
              </h3>
            </div>

            <p className="text-caption mb-4">
              Update verification status for {selectedCount} selected user
              {selectedCount !== 1 ? 's' : ''}.
            </p>

            <div className="mb-4">
              <label className="block text-heading text-sm font-medium mb-2">
                Verification Status
              </label>
              <select
                value={bulkVerification}
                onChange={(e) => setBulkVerification(e.target.value === 'true')}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value={true}>Verified</option>
                <option value={false}>Unverified</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkVerificationUpdate}
                disabled={operationLoading.verificationUpdate}
                className="flex-1 bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.verificationUpdate
                  ? 'Updating...'
                  : 'Update Verification'}
              </button>
              <button
                onClick={() => setShowBulkVerificationModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-400" />
              <h3 className="text-heading text-lg font-semibold">
                Delete Users
              </h3>
            </div>

            <div className="bg-red-500/10 border border-red-400/20 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">
                <strong>Warning:</strong> This action will permanently delete{' '}
                {selectedCount} user{selectedCount !== 1 ? 's' : ''} and all
                associated data. This cannot be undone.
              </p>
            </div>

            <p className="text-caption mb-4">
              Are you sure you want to delete these users? Type "DELETE" to
              confirm.
            </p>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleBulkDelete}
                disabled={operationLoading.delete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.delete ? 'Deleting...' : 'Delete Users'}
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <Download className="mr-2 h-5 w-5 text-orange-400" />
              <h3 className="text-heading text-lg font-semibold">
                Export Users
              </h3>
            </div>

            <p className="text-caption mb-4">
              Export {selectedCount > 0 ? selectedCount + ' selected' : 'all'}{' '}
              user{selectedCount !== 1 ? 's' : ''}.
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-heading text-sm font-medium mb-2">
                  Export Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="xlsx">Excel (XLSX)</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includePersonalData"
                  checked={includePersonalData}
                  onChange={(e) => setIncludePersonalData(e.target.checked)}
                  className="mr-2"
                />
                <label
                  htmlFor="includePersonalData"
                  className="text-heading text-sm"
                >
                  Include personal data
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                disabled={operationLoading.export}
                className="flex-1 bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.export ? 'Exporting...' : 'Export'}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-lg border border-border-secondary p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <Upload className="mr-2 h-5 w-5 text-cyan-400" />
              <h3 className="text-heading text-lg font-semibold">
                Import Users
              </h3>
            </div>

            <p className="text-caption mb-4">Import users from a CSV file.</p>

            <div className="mb-4">
              <label className="block text-heading text-sm font-medium mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-secondary rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleImport}
                disabled={!importFile || operationLoading.import}
                className="flex-1 bg-brand-primary hover:bg-brand-primary-dark text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {operationLoading.import ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 bg-surface-secondary hover:bg-surface-secondary/80 text-heading px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchActionsPanel;
