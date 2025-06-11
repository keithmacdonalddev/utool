/**
 * Data Synchronization Middleware
 *
 * MILESTONE 0: Foundation & Architecture
 * Handles optimistic updates, conflict resolution, and data consistency
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';

/**
 * Configuration for data synchronization
 */
const SYNC_CONFIG = {
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  conflictResolutionStrategy: 'server-wins',
  optimisticUpdateTimeout: 5000, // 5 seconds
};

/**
 * Create the data synchronization middleware
 */
export const dataSynchronizationMiddleware = createListenerMiddleware();

/**
 * Optimistic update tracking
 */
class OptimisticUpdateTracker {
  constructor() {
    this.pendingUpdates = new Map();
    this.timeouts = new Map();
  }

  /**
   * Track an optimistic update
   */
  track(id, originalData, optimisticData) {
    this.pendingUpdates.set(id, {
      originalData,
      optimisticData,
      timestamp: Date.now(),
    });

    // Set timeout to rollback if not confirmed
    const timeout = setTimeout(() => {
      this.rollback(id);
    }, SYNC_CONFIG.optimisticUpdateTimeout);

    this.timeouts.set(id, timeout);
  }

  /**
   * Confirm an optimistic update (remove from tracking)
   */
  confirm(id) {
    this.pendingUpdates.delete(id);
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * Rollback an optimistic update
   */
  rollback(id) {
    const update = this.pendingUpdates.get(id);
    if (update) {
      console.warn(`Rolling back optimistic update for ${id}`);
      // TODO: Dispatch rollback action to restore original data
      this.pendingUpdates.delete(id);
    }

    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * Check if an item has pending optimistic updates
   */
  hasPendingUpdate(id) {
    return this.pendingUpdates.has(id);
  }

  /**
   * Clear all pending updates
   */
  clear() {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.pendingUpdates.clear();
    this.timeouts.clear();
  }
}

/**
 * Retry mechanism for failed operations
 */
class RetryManager {
  constructor() {
    this.retryQueue = new Map();
  }

  /**
   * Schedule operation retry with exponential backoff
   */
  scheduleRetry(operationId, operation, attempt = 0) {
    if (attempt >= SYNC_CONFIG.retryAttempts) {
      console.error(`Max retry attempts reached for operation ${operationId}`);
      return;
    }

    const delay = SYNC_CONFIG.retryDelay * Math.pow(2, attempt);

    setTimeout(() => {
      console.log(`Retrying operation ${operationId}, attempt ${attempt + 1}`);
      operation().catch(() => {
        this.scheduleRetry(operationId, operation, attempt + 1);
      });
    }, delay);
  }

  /**
   * Cancel a scheduled retry
   */
  cancelRetry(operationId) {
    this.retryQueue.delete(operationId);
  }
}

// Global instances
const optimisticTracker = new OptimisticUpdateTracker();
const retryManager = new RetryManager();

/**
 * Initialize data synchronization
 */
export const initializeDataSync = (store) => {
  console.log('Initializing data synchronization middleware');

  // Setup cleanup on app shutdown
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      optimisticTracker.clear();
    });
  }

  return {
    optimisticTracker,
    retryManager,
  };
};

/**
 * Utilities for components to interact with sync middleware
 */
export const syncUtils = {
  /**
   * Check if an item has pending optimistic updates
   */
  hasPendingUpdate: (id) => optimisticTracker.hasPendingUpdate(id),

  /**
   * Get sync statistics
   */
  getSyncStats: () => ({
    pendingUpdates: optimisticTracker.pendingUpdates.size,
    retryQueue: retryManager.retryQueue.size,
  }),
};

export default dataSynchronizationMiddleware;
