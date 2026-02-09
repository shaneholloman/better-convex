import * as authClient from './index';

describe('auth-client public exports', () => {
  test('re-exports ConvexAuthProvider surface', () => {
    expect(typeof authClient.ConvexAuthProvider).toBe('function');
  });
});
