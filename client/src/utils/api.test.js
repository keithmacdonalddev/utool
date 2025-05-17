// c:\Users\macdo\Documents\Cline\utool\client\src\utils\api.test.js
import MockAdapter from 'axios-mock-adapter';
import api from './api'; // Your pre-configured axios instance
import { store as realStore } from '../app/store'; // Actual store to dispatch actions
import { refreshToken, logoutUser } from '../features/auth/authSlice';

// Mock the store and its dispatch method
const mockDispatch = jest.fn();
let mockGetState = jest.fn(() => ({
  auth: { accessToken: null, user: null, isAuthenticated: false },
}));

jest.mock('../app/store', () => ({
  __esModule: true,
  get store() {
    return {
      dispatch: mockDispatch,
      getState: mockGetState,
    };
  },
}));

const axiosMock = new MockAdapter(api);

describe('Axios Interceptors', () => {
  beforeEach(() => {
    axiosMock.reset();
    mockDispatch.mockClear();
    mockGetState.mockClear();
    // Mock localStorage for these tests as well
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header if accessToken exists', async () => {
      const mockToken = 'mockTestToken';
      mockGetState = jest.fn(() => ({ auth: { accessToken: mockToken } }));

      axiosMock.onGet('/test-protected').reply(200, { data: 'success' });

      await api.get('/test-protected');

      expect(axiosMock.history.get[0].headers.Authorization).toBe(
        `Bearer ${mockToken}`
      );
    });

    it('should not add Authorization header for /auth/refresh-token', async () => {
      mockGetState = jest.fn(() => ({ auth: { accessToken: 'someToken' } }));
      axiosMock
        .onPost('/api/v1/auth/refresh-token')
        .reply(200, { token: 'new' });

      await api.post('/api/v1/auth/refresh-token');

      expect(axiosMock.history.post[0].headers.Authorization).toBeUndefined();
    });

    it('should not add Authorization header if no accessToken', async () => {
      mockGetState = jest.fn(() => ({ auth: { accessToken: null } }));
      axiosMock.onGet('/test-public').reply(200, { data: 'success' });

      await api.get('/test-public');

      expect(axiosMock.history.get[0].headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor - 401 Error Handling', () => {
    const originalRequestConfig = { url: '/test-401', method: 'get' };

    it('should attempt to refresh token, retry original request, and succeed', async () => {
      const newAccessToken = 'newRefreshedAccessToken';
      mockGetState = jest
        .fn()
        .mockReturnValueOnce({ auth: { accessToken: 'oldExpiredToken' } }) // For initial failed call
        .mockReturnValueOnce({ auth: { accessToken: 'oldExpiredToken' } }) // During refreshToken dispatch
        .mockReturnValue({ auth: { accessToken: newAccessToken } }); // After successful refresh for retry

      // 1. Initial request fails with 401
      axiosMock
        .onGet(originalRequestConfig.url)
        .replyOnce(401, { error: 'Token expired' });
      // 2. Refresh token call succeeds
      axiosMock
        .onPost('/api/v1/auth/refresh-token')
        .replyOnce(200, { success: true, token: newAccessToken });
      // 3. Retried original request succeeds with new token
      axiosMock
        .onGet(originalRequestConfig.url)
        .replyOnce(200, { data: 'success after refresh' });

      // Mock dispatch to simulate refreshToken thunk behavior
      mockDispatch.mockImplementation((action) => {
        if (action.type === refreshToken.pending.type) return Promise.resolve();
        if (action.type === refreshToken.fulfilled.type) {
          // Simulate state update from refreshToken.fulfilled
          localStorage.setItem('accessToken', newAccessToken);
          return Promise.resolve({
            type: refreshToken.fulfilled.type,
            payload: { token: newAccessToken },
          });
        }
        return Promise.resolve();
      });

      const response = await api.request(originalRequestConfig);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: refreshToken.pending.type })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: refreshToken.fulfilled.type })
      );
      expect(axiosMock.history.post.length).toBe(1); // Refresh token call
      expect(axiosMock.history.get.length).toBe(2); // Original failed, then retried
      expect(axiosMock.history.get[1].headers.Authorization).toBe(
        `Bearer ${newAccessToken}`
      );
      expect(response.data).toEqual({ data: 'success after refresh' });
    });

    it('should attempt to refresh token, fail refresh, and dispatch logoutUser', async () => {
      mockGetState = jest.fn(() => ({
        auth: { accessToken: 'oldExpiredToken' },
      }));

      // 1. Initial request fails with 401
      axiosMock
        .onGet(originalRequestConfig.url)
        .replyOnce(401, { error: 'Token expired' });
      // 2. Refresh token call fails
      axiosMock
        .onPost('/api/v1/auth/refresh-token')
        .replyOnce(401, { success: false, error: 'Invalid refresh token' });
      // Mock logout server call if any
      axiosMock.onPost('/api/v1/auth/logout').replyOnce(200, { success: true });

      // Mock dispatch for refreshToken and logoutUser
      mockDispatch.mockImplementation((action) => {
        if (action.type === refreshToken.pending.type) return Promise.resolve();
        if (action.type === refreshToken.rejected.type) {
          // Simulate the internal dispatch of logoutUser from refreshToken's rejection
          mockDispatch(logoutUser.pending());
          mockDispatch(logoutUser.fulfilled()); // Assuming logout clears client state
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          return Promise.reject({
            type: refreshToken.rejected.type,
            error: { message: 'Refresh failed' },
          });
        }
        if (action.type === logoutUser.pending.type) return Promise.resolve();
        if (action.type === logoutUser.fulfilled.type) return Promise.resolve();
        return Promise.resolve();
      });

      try {
        await api.request(originalRequestConfig);
      } catch (error) {
        expect(error.message).toContain('Request failed with status code 401'); // Or whatever error api.js throws after failed retry
      }

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: refreshToken.pending.type })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: refreshToken.rejected.type })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: logoutUser.pending.type })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: logoutUser.fulfilled.type })
      );
      expect(axiosMock.history.post.length).toBe(1); // Refresh token call
      expect(axiosMock.history.get.length).toBe(1); // Only the initial failed call
    });

    it('should queue and process multiple requests after successful token refresh', async () => {
      const newAccessToken = 'multiRequestNewToken';
      mockGetState = jest
        .fn()
        .mockReturnValueOnce({ auth: { accessToken: 'expiredToken' } }) // For first failed call
        .mockReturnValueOnce({ auth: { accessToken: 'expiredToken' } }) // During refreshToken dispatch
        .mockReturnValue({ auth: { accessToken: newAccessToken } }); // After successful refresh

      // All initial calls fail with 401
      axiosMock.onGet('/test-multi-1').replyOnce(401);
      axiosMock.onGet('/test-multi-2').replyOnce(401);
      // Refresh token call succeeds
      axiosMock
        .onPost('/api/v1/auth/refresh-token')
        .replyOnce(200, { success: true, token: newAccessToken });
      // Retried calls succeed
      axiosMock
        .onGet('/test-multi-1')
        .replyOnce(200, { data: 'multi-1 success' });
      axiosMock
        .onGet('/test-multi-2')
        .replyOnce(200, { data: 'multi-2 success' });

      mockDispatch.mockImplementation((action) => {
        if (action.type === refreshToken.pending.type) return Promise.resolve();
        if (action.type === refreshToken.fulfilled.type) {
          localStorage.setItem('accessToken', newAccessToken);
          return Promise.resolve({
            type: refreshToken.fulfilled.type,
            payload: { token: newAccessToken },
          });
        }
        return Promise.resolve();
      });

      const promise1 = api.get('/test-multi-1');
      const promise2 = api.get('/test-multi-2');

      const [response1, response2] = await Promise.all([promise1, promise2]);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: refreshToken.pending.type })
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: refreshToken.fulfilled.type })
      );
      expect(axiosMock.history.post.length).toBe(1); // One refresh call
      expect(
        axiosMock.history.get.filter((req) => req.url === '/test-multi-1')
          .length
      ).toBe(2);
      expect(
        axiosMock.history.get.filter((req) => req.url === '/test-multi-2')
          .length
      ).toBe(2);
      expect(response1.data).toEqual({ data: 'multi-1 success' });
      expect(response2.data).toEqual({ data: 'multi-2 success' });
    });
  });
});
