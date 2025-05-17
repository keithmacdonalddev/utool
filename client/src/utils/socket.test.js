// c:\Users\macdo\Documents\Cline\utool\client\src\utils\socket.test.js
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { getSocket, disconnectSocket } from './socket'; // The module we're testing
import { refreshToken, logoutUser } from '../features/auth/authSlice';
import { store as appStore } from '../app/store'; // To mock its dispatch and getState

// Mock the socket.io-client library
const mockSocketInstance = {
  on: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  auth: { token: null }, // Mock the auth object socket.io-client uses
  id: 'mockSocketId',
};
jest.mock('socket.io-client', () => {
  return {
    __esModule: true,
    default: jest.fn(() => mockSocketInstance), // Mock the default export (io)
    io: jest.fn(() => mockSocketInstance), // Also mock a named export if used like `import { io } from ...`
  };
});

// Mock the Redux store from app/store
const mockDispatch = jest.fn();
let mockGetStateImplementation = () => ({
  auth: { accessToken: null, user: null, isAuthenticated: false },
});

jest.mock('../app/store', () => ({
  __esModule: true,
  get store() {
    return {
      dispatch: mockDispatch,
      getState: jest.fn(() => mockGetStateImplementation()),
    };
  },
}));

const middlewares = [thunk];
const mockReduxStore = configureMockStore(middlewares)(); // For local thunk dispatches if needed, though main dispatches are via mocked appStore

describe('Socket Utility', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockSocketInstance.on.mockClear();
    mockSocketInstance.connect.mockClear();
    mockSocketInstance.disconnect.mockClear();
    require('socket.io-client').default.mockClear(); // Clear the main io mock
    mockDispatch.mockClear();

    // Reset socket.auth.token for each test if getSocket modifies it directly
    mockSocketInstance.auth = { token: null };

    // Reset localStorage mocks
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    // Ensure disconnectSocket nullifies its internal reference for a clean slate
    disconnectSocket();
  });

  describe('getSocket', () => {
    it('should initialize socket with token from store if available', () => {
      const mockToken = 'initialTestToken';
      mockGetStateImplementation = () => ({ auth: { accessToken: mockToken } });

      getSocket();

      expect(require('socket.io-client').default).toHaveBeenCalledWith(
        process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
        expect.objectContaining({
          auth: { token: mockToken },
        })
      );
      expect(mockSocketInstance.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function)
      );
      expect(mockSocketInstance.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function)
      );
      expect(mockSocketInstance.on).toHaveBeenCalledWith(
        'connect_error',
        expect.any(Function)
      );
    });

    it('should handle auth-related connect_error by dispatching refreshToken', async () => {
      mockGetStateImplementation = () => ({
        auth: { accessToken: 'oldToken' },
      });
      getSocket(); // Initialize socket and attach listeners

      // Find the connect_error handler passed to socket.on
      const connectErrorHandler = mockSocketInstance.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )[1];

      // Simulate an auth error
      const authError = new Error('Token expired');

      // Mock refreshToken thunk behavior
      mockDispatch.mockImplementation((action) => {
        if (action.type === refreshToken.pending.type) return Promise.resolve();
        if (action.type === refreshToken.fulfilled.type) {
          mockGetStateImplementation = () => ({
            auth: { accessToken: 'newRefreshedToken' },
          });
          return Promise.resolve({
            type: refreshToken.fulfilled.type,
            payload: { token: 'newRefreshedToken' },
          });
        }
        return Promise.resolve();
      });

      await connectErrorHandler(authError);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: refreshToken.pending.type })
      );
      // Further checks depend on refreshToken thunk resolving
    });

    it('should update socket.auth.token and call socket.connect() on successful token refresh', async () => {
      const newMockToken = 'newlyRefreshedTokenForSocket';
      mockGetStateImplementation = () => ({
        auth: { accessToken: 'oldToken' },
      });
      getSocket();
      const connectErrorHandler = mockSocketInstance.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )[1];
      const authError = new Error('Authentication error');

      mockDispatch.mockImplementation(async (action) => {
        if (typeof action === 'function') {
          // It's a thunk
          // Simulate dispatching the thunk which returns a promise
          // For refreshToken, simulate it being fulfilled
          if (action.name.includes('refreshToken')) {
            // A bit fragile, better to check action type if possible before dispatch
            appStore.dispatch(refreshToken.pending());
            // Simulate successful refresh by updating the mock store state for the next getState call
            mockGetStateImplementation = () => ({
              auth: { accessToken: newMockToken },
            });
            appStore.dispatch(refreshToken.fulfilled({ token: newMockToken }));
            return {
              type: refreshToken.fulfilled.type,
              payload: { token: newMockToken },
            };
          }
        }
        return action; // For plain actions
      });

      await connectErrorHandler(authError);

      expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function)); // refreshToken thunk
      // Need to ensure the mock store state reflects the new token *before* socket.auth is set
      expect(mockSocketInstance.auth.token).toBe(newMockToken);
      expect(mockSocketInstance.connect).toHaveBeenCalled();
    });

    it('should dispatch logoutUser if token refresh fails', async () => {
      mockGetStateImplementation = () => ({
        auth: { accessToken: 'oldToken' },
      });
      getSocket();
      const connectErrorHandler = mockSocketInstance.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )[1];
      const authError = new Error('Invalid token');

      mockDispatch.mockImplementation(async (action) => {
        if (typeof action === 'function') {
          if (action.name.includes('refreshToken')) {
            appStore.dispatch(refreshToken.pending());
            // Simulate failed refresh
            appStore.dispatch(refreshToken.rejected(null, 'some error'));
            // refreshToken itself should dispatch logoutUser upon rejection
            // So we check if logoutUser was dispatched by the mocked appStore.dispatch
            return {
              type: refreshToken.rejected.type,
              error: { message: 'Refresh failed' },
            };
          }
          if (action.name.includes('logoutUser')) {
            appStore.dispatch(logoutUser.pending());
            appStore.dispatch(logoutUser.fulfilled());
            return { type: logoutUser.fulfilled.type };
          }
        }
        return action;
      });

      // Simulate the internal dispatch of logoutUser from refreshToken's rejection
      const logoutUserThunk = logoutUser(); // Get the thunk
      const logoutUserPendingAction = {
        type: logoutUser.pending.type,
        meta: logoutUserThunk().meta,
      };
      const logoutUserFulfilledAction = {
        type: logoutUser.fulfilled.type,
        meta: logoutUserThunk().meta,
      };

      await connectErrorHandler(authError);

      expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function)); // refreshToken thunk
      // Check if logoutUser (or its pending/fulfilled actions) was dispatched
      // This part is tricky because the actual dispatch happens inside the mocked appStore.dispatch
      // We need to verify that the mockDispatch (representing appStore.dispatch) was called with logoutUser actions.
      // A more robust way is to check the sequence of actions if the mockStore was used for the thunk itself.
      // For now, we assume the logic within refreshToken handles dispatching logoutUser.
      // A simple check could be:
      const logoutActionDispatched = mockDispatch.mock.calls.some(
        (callArgs) =>
          (typeof callArgs[0] === 'function' &&
            callArgs[0].name.includes('logoutUser')) || // thunk itself
          (callArgs[0] &&
            (callArgs[0].type === logoutUser.pending.type ||
              callArgs[0].type === logoutUser.fulfilled.type))
      );
      expect(logoutActionDispatched).toBe(true);
    });

    it('should not attempt token refresh for non-auth connect_error', async () => {
      getSocket();
      const connectErrorHandler = mockSocketInstance.on.mock.calls.find(
        (call) => call[0] === 'connect_error'
      )[1];
      const nonAuthError = new Error('Server unavailable');

      await connectErrorHandler(nonAuthError);

      const refreshTokenDispatched = mockDispatch.mock.calls.some(
        (callArgs) =>
          (typeof callArgs[0] === 'function' &&
            callArgs[0].name.includes('refreshToken')) ||
          (callArgs[0] && callArgs[0].type === refreshToken.pending.type)
      );
      expect(refreshTokenDispatched).toBe(false);
    });
  });

  describe('disconnectSocket', () => {
    it('should call socket.disconnect() if socket exists and is connected', () => {
      // Simulate socket being connected by setting the internal variable via getSocket()
      getSocket();
      mockSocketInstance.connected = true; // Manually set connected state for the mock

      disconnectSocket();

      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
      // Also test that the internal socket variable in socket.js becomes null
      // This is harder to test directly without exporting it, but subsequent getSocket calls should create a new one.
      require('socket.io-client').default.mockClear();
      getSocket();
      expect(require('socket.io-client').default).toHaveBeenCalledTimes(1); // Proves a new one was created
    });

    it('should not call socket.disconnect() if socket does not exist', () => {
      // Ensure socket is null initially (disconnectSocket in beforeEach handles this)
      disconnectSocket(); // Call it again to be sure
      mockSocketInstance.disconnect.mockClear(); // Clear from previous test if any

      disconnectSocket();
      expect(mockSocketInstance.disconnect).not.toHaveBeenCalled();
    });
  });
});
