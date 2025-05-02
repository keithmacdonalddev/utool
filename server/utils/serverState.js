// filepath: c:\Users\macdo\Documents\Cline\mern-productivity-app\server\utils\serverState.js
/**
 * Utility module to track server state variables
 * This prevents circular dependencies between server.js and middleware
 */

// Server shutdown flag
export let isShuttingDown = false;

/**
 * Set the server shutdown state
 * @param {boolean} state - Whether the server is shutting down
 */
export const setShuttingDown = (state) => {
  isShuttingDown = state;
};
