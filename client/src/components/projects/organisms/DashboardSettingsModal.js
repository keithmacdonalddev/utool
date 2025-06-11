import React, { useState } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';

/**
 * Dashboard Settings Modal
 *
 * Provides granular control over dashboard preferences including:
 * - Auto-refresh settings
 * - Default view mode
 * - Default sorting
 * - Notification preferences
 * - Display options
 */
const DashboardSettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    // Reset to default settings
    const defaultSettings = {
      autoRefresh: {
        enabled: false,
        interval: 30000, // 30 seconds
      },
      defaultView: 'grid',
      defaultSort: {
        field: 'updatedAt',
        direction: 'desc',
      },
      notifications: {
        showToasts: true,
        showConnectionStatus: true,
        playSound: false,
      },
      display: {
        showProjectStats: true,
        showLastUpdate: true,
        compactMode: false,
        showEmptyStates: true,
      },
    };
    setLocalSettings(defaultSettings);
  };

  const handleSettingChange = (path, value) => {
    setLocalSettings((prev) => {
      const newSettings = { ...prev };
      const pathArray = path.split('.');
      let current = newSettings;

      for (let i = 0; i < pathArray.length - 1; i++) {
        if (!current[pathArray[i]]) {
          current[pathArray[i]] = {};
        }
        current = current[pathArray[i]];
      }

      current[pathArray[pathArray.length - 1]] = value;
      return newSettings;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-dark-600">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <h2 className="text-2xl font-bold text-white">Dashboard Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Auto-Refresh Settings */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">
              Auto-Refresh
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localSettings.autoRefresh?.enabled || false}
                  onChange={(e) =>
                    handleSettingChange('autoRefresh.enabled', e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">Enable automatic refresh</span>
              </label>

              {localSettings.autoRefresh?.enabled && (
                <div className="ml-7">
                  <label className="block text-sm text-gray-400 mb-2">
                    Refresh interval
                  </label>
                  <select
                    value={localSettings.autoRefresh?.interval || 30000}
                    onChange={(e) =>
                      handleSettingChange(
                        'autoRefresh.interval',
                        parseInt(e.target.value)
                      )
                    }
                    className="bg-dark-700 border border-dark-500 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  >
                    <option value={15000}>15 seconds</option>
                    <option value={30000}>30 seconds</option>
                    <option value={60000}>1 minute</option>
                    <option value={300000}>5 minutes</option>
                    <option value={600000}>10 minutes</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Default View Settings */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">
              Default View
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Default view mode
                </label>
                <select
                  value={localSettings.defaultView || 'grid'}
                  onChange={(e) =>
                    handleSettingChange('defaultView', e.target.value)
                  }
                  className="bg-dark-700 border border-dark-500 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="grid">Grid View</option>
                  <option value="list">List View</option>
                  <option value="kanban">Kanban View</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Default sort field
                </label>
                <select
                  value={localSettings.defaultSort?.field || 'updatedAt'}
                  onChange={(e) =>
                    handleSettingChange('defaultSort.field', e.target.value)
                  }
                  className="bg-dark-700 border border-dark-500 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="updatedAt">Last Updated</option>
                  <option value="createdAt">Date Created</option>
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                  <option value="priority">Priority</option>
                  <option value="progress.percentage">Progress</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Default sort direction
                </label>
                <select
                  value={localSettings.defaultSort?.direction || 'desc'}
                  onChange={(e) =>
                    handleSettingChange('defaultSort.direction', e.target.value)
                  }
                  className="bg-dark-700 border border-dark-500 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </section>

          {/* Notification Settings */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">
              Notifications
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localSettings.notifications?.showToasts !== false}
                  onChange={(e) =>
                    handleSettingChange(
                      'notifications.showToasts',
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">Show toast notifications</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={
                    localSettings.notifications?.showConnectionStatus !== false
                  }
                  onChange={(e) =>
                    handleSettingChange(
                      'notifications.showConnectionStatus',
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">Show connection status</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localSettings.notifications?.playSound || false}
                  onChange={(e) =>
                    handleSettingChange(
                      'notifications.playSound',
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">Play notification sounds</span>
              </label>
            </div>
          </section>

          {/* Display Settings */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4">
              Display Options
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localSettings.display?.showProjectStats !== false}
                  onChange={(e) =>
                    handleSettingChange(
                      'display.showProjectStats',
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">
                  Show project statistics bar
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localSettings.display?.showLastUpdate !== false}
                  onChange={(e) =>
                    handleSettingChange(
                      'display.showLastUpdate',
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">
                  Show last update timestamp
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localSettings.display?.compactMode || false}
                  onChange={(e) =>
                    handleSettingChange('display.compactMode', e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">
                  Compact mode (smaller cards/rows)
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={localSettings.display?.showEmptyStates !== false}
                  onChange={(e) =>
                    handleSettingChange(
                      'display.showEmptyStates',
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-blue-600 bg-dark-700 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-gray-300">
                  Show helpful empty state messages
                </span>
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-dark-600">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettingsModal;
