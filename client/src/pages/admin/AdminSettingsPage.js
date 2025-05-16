// client/src/pages/admin/AdminSettingsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api'; // Import the API utility

/**
 * AdminSettingsPage Component
 *
 * This page allows administrators to manage global site settings.
 * Currently, it supports toggling guest access for the application.
 *
 * State Variables:
 * - guestAccessEnabled (boolean): Stores the current state of guest access.
 * - isLoading (boolean): True when initially fetching settings.
 * - isUpdating (boolean): True when an update request is in progress.
 * - error (string | null): Stores error messages from API calls.
 * - successMessage (string | null): Stores success messages from API calls.
 *
 * Functions:
 * - getAuthToken(): Placeholder for retrieving the authentication token.
 *                   In a real application, this would likely come from a Redux store or secure context.
 * - fetchSettings(): Fetches the current guest access status from the public API endpoint.
 * - handleToggleChange(newStatus): Handles the toggle action, sending a PUT request to the admin API endpoint
 *                                  to update the guest access status. It includes the auth token.
 *
 * Effects:
 * - useEffect (fetchSettings): Calls fetchSettings on component mount to get the initial state.
 *
 * UI:
 * - Displays a loading message while fetching initial data.
 * - Shows error or success messages based on API responses.
 * - Provides a labeled checkbox to toggle guest access.
 * - Shows an "Updating..." message during the PUT request.
 */
const AdminSettingsPage = () => {
  const [guestAccessEnabled, setGuestAccessEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  /**
   * Retrieves the authentication token.
   * @returns {string | null} The JWT token or null if not found.
   */
  const getAuthToken = () => {
    return localStorage.getItem('token'); // The token is stored directly in localStorage with key 'token'
  };

  /**
   * Fetches the current guest access settings from the server.
   * Uses the public endpoint GET /api/v1/settings/guest-access-status.
   * Updates isLoading, error, and guestAccessEnabled states.
   */ const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // Clear previous success message when refetching
    // setSuccessMessage(null);
    try {
      const response = await api.get('/settings/guest-access-status');

      if (
        response.data.success &&
        typeof response.data.data.guestAccessEnabled === 'boolean'
      ) {
        setGuestAccessEnabled(response.data.data.guestAccessEnabled);
      } else {
        throw new Error('Received invalid data structure for settings.');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(`Failed to fetch settings. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // This effect runs once on component mount to fetch initial settings.
    fetchSettings();
  }, [fetchSettings]); // fetchSettings is memoized with useCallback

  /**
   * Handles the change event of the guest access toggle.
   * Sends a PUT request to /api/v1/admin/settings/guest-access.
   * Requires an admin authentication token.
   * @param {boolean} newStatus The new desired state for guest access.
   */ const handleToggleChange = async (newStatus) => {
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.put('/admin/settings/guest-access', {
        guestAccessEnabled: newStatus,
      });

      const result = response.data;

      // On successful update, update the local state and show a success message.
      if (
        result.success &&
        typeof result.data.guestAccessEnabled === 'boolean'
      ) {
        setGuestAccessEnabled(result.data.guestAccessEnabled);
        setSuccessMessage(result.message || 'Settings updated successfully.');
      } else {
        throw new Error('Received invalid data structure after update.');
      }
    } catch (err) {
      console.error('Error updating settings:', err);
      const message = err.response?.data?.message || err.message;
      setError(`Failed to update settings. ${message}`);
      // If update fails, refetch the current settings from the server to ensure UI consistency.
      fetchSettings();
    } finally {
      setIsUpdating(false);
    }
  };

  // Display a loading message while initial settings are being fetched.
  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading site settings...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: 'auto',
      }}
    >
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        Admin Site Settings
      </h2>

      {/* Display error messages */}
      {error && (
        <div
          style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '10px',
            marginBottom: '15px',
            borderRadius: '4px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
      {/* Display success messages */}
      {successMessage && (
        <div
          style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '10px',
            marginBottom: '15px',
            borderRadius: '4px',
          }}
        >
          {successMessage}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '15px',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      >
        <label
          htmlFor="guestAccessToggle"
          style={{ marginRight: '15px', fontWeight: 'bold', flexShrink: 0 }}
        >
          Enable Guest Access:
        </label>
        <input
          type="checkbox"
          id="guestAccessToggle"
          checked={guestAccessEnabled}
          onChange={(e) => handleToggleChange(e.target.checked)}
          disabled={isUpdating}
          style={{
            height: '20px',
            width: '20px',
            marginRight: '10px',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontStyle: 'italic' }}>
          {guestAccessEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {/* Display an updating message when a PUT request is in progress */}
      {isUpdating && (
        <div style={{ textAlign: 'center', padding: '10px', color: '#555' }}>
          Updating settings...
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPage;
