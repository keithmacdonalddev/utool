// c:\Users\macdo\Documents\Cline\utool\client\src\features\auth\authSlice.test.js
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk'; // If your store uses redux-thunk middleware
import MockAdapter from 'axios-mock-adapter';
import api from '../../utils/api'; // Your pre-configured axios instance
import { refreshToken, logoutUser, initialState } from './authSlice';

const middlewares = [thunk]; // Add other middlewares if you use them
const mockStore = configureMockStore(middlewares);
const axiosMock = new MockAdapter(api);

describe('authSlice async thunks', () => {
  let store;

  beforeEach(() => {
    store = mockStore({ auth: initialState });
    axiosMock.reset();
    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
  });

  describe('refreshToken thunk', () => {
    it('should successfully refresh token and update state', async () => {
      const newAccessToken = 'newMockAccessToken';
      axiosMock.onPost('/api/v1/auth/refresh-token').reply(200, {
        success: true,
        token: newAccessToken,
      });

      const expectedActions = [
        refreshToken.pending.type,
        refreshToken.fulfilled.type,
      ];

      await store.dispatch(refreshToken());
      const actions = store.getActions().map((action) => action.type);
      expect(actions).toEqual(expectedActions);

      // Check state changes via the reducer (not directly testable with mockStore for fulfilled state)
      // but we can check localStorage was called
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'accessToken',
        newAccessToken
      );
    });

    it('should handle refresh token failure and dispatch logout', async () => {
      axiosMock.onPost('/api/v1/auth/refresh-token').reply(401, {
        success: false,
        error: 'Invalid refresh token',
      });
      // Mock the logoutUser thunk if it makes its own API call that needs mocking
      axiosMock.onPost('/api/v1/auth/logout').reply(200, { success: true });

      // We expect refreshToken.pending, then refreshToken.rejected
      // If refreshToken.rejected dispatches logoutUser, we expect logoutUser.pending and logoutUser.fulfilled (or rejected)
      // This depends on how logoutUser is structured and if it's directly called by refreshToken's rejection handling.
      // For simplicity, we'll check for refreshToken.rejected and assume logoutUser is handled within it or subsequently.

      // Due to the internal dispatch of logoutUser, the action sequence is more complex.
      // refreshToken.pending -> refreshToken.rejected -> logoutUser.pending -> logoutUser.fulfilled
      const expectedActionTypes = [
        refreshToken.pending.type,
        // logoutUser is dispatched from the rejected case of refreshToken
        logoutUser.pending.type, // This assumes logoutUser is dispatched immediately
        logoutUser.fulfilled.type, // Assuming logout call is successful
        refreshToken.rejected.type, // Finally, the refreshToken thunk itself is rejected
      ];

      try {
        await store.dispatch(refreshToken());
      } catch (e) {
        // Error is expected if the thunk itself throws after dispatching logout
      }
      const dispatchedActions = store.getActions().map((action) => action.type);

      // Check if the core sequence is present, order might vary slightly based on promise resolutions
      expect(dispatchedActions).toContain(refreshToken.pending.type);
      expect(dispatchedActions).toContain(refreshToken.rejected.type);
      expect(dispatchedActions).toContain(logoutUser.pending.type);
      // If logout is successful from the server:
      expect(dispatchedActions).toContain(logoutUser.fulfilled.type);

      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('logoutUser thunk', () => {
    it('should successfully logout user and clear state/localStorage', async () => {
      axiosMock.onPost('/api/v1/auth/logout').reply(200, { success: true });

      const expectedActions = [
        logoutUser.pending.type,
        logoutUser.fulfilled.type,
      ];

      await store.dispatch(logoutUser());
      const actions = store.getActions().map((action) => action.type);
      expect(actions).toEqual(expectedActions);

      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should still clear state/localStorage even if server logout call fails', async () => {
      axiosMock
        .onPost('/api/v1/auth/logout')
        .reply(500, { success: false, error: 'Server error' });

      const expectedActions = [
        logoutUser.pending.type,
        logoutUser.rejected.type, // Or fulfilled if you always clear client-side regardless of server
      ];

      // Depending on your logoutUser implementation, it might still fulfill on the client-side
      // by clearing local data, even if the server call fails. Adjust .type accordingly.
      // Assuming it still clears data and fulfills locally:
      const expectedFulfilledActions = [
        logoutUser.pending.type,
        logoutUser.fulfilled.type,
      ];

      try {
        await store.dispatch(logoutUser());
      } catch (e) {
        // If it rejects on server error
      }
      const actions = store.getActions().map((action) => action.type);

      // Check if it attempts to logout and then fulfills (by clearing local data)
      // or rejects if server call is critical for rejection.
      // Based on typical authSlice, it should fulfill locally by clearing data.
      expect(actions).toEqual(expectedFulfilledActions);

      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });
});
