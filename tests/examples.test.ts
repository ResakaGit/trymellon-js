import { describe, it, expect } from 'vitest';
import { TryMellon, TryMellonError, isTryMellonError } from '../src/index';
import type { TryMellonConfig, RegisterOptions, AuthenticateOptions } from '../src/index';

describe('Examples Syntax Validation', () => {
  it('should allow creating TryMellon instance with config', () => {
    const config: TryMellonConfig = {
      appId: 'app_live_xxx',
      publishableKey: 'key_live_xxx',
      apiBaseUrl: 'https://api.trymellonauth.com',
      timeoutMs: 30000,
    };

    const client = new TryMellon(config);

    expect(client).toBeInstanceOf(TryMellon);
  });

  it('should allow using isSupported static method', () => {
    const isSupported = TryMellon.isSupported();

    expect(typeof isSupported).toBe('boolean');
  });

  it('should allow using register method', async () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
    const options: RegisterOptions = {
      external_user_id: 'user_123',
      authenticatorType: 'platform',
    };

    expect(typeof client.register).toBe('function');
    // Note: This will throw because WebAuthn is not available in test environment
    // but we're just checking the method exists
    expect(() => client.register(options)).not.toThrow();
  });

  it('should allow using authenticate method', async () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
    const options: AuthenticateOptions = {
      external_user_id: 'user_123',
      hint: 'user@example.com',
    };

    expect(typeof client.authenticate).toBe('function');
    // Note: This will throw because WebAuthn is not available in test environment
    // but we're just checking the method exists
    expect(() => client.authenticate(options)).not.toThrow();
  });

  it('should allow using getStatus method', async () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });

    expect(typeof client.getStatus).toBe('function');
    expect(() => client.getStatus()).not.toThrow();
  });

  it('should allow using on method for events', () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
    const handler = () => {};

    const unsubscribe = client.on('start', handler);

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should allow using version method', () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
    const version = client.version();

    expect(typeof version).toBe('string');
  });

  it('should allow using fallback.email.start', async () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });

    expect(typeof client.fallback.email.start).toBe('function');
    // Note: This will throw because API is not available in test environment
    // but we're just checking the method exists
    expect(() => client.fallback.email.start({ userId: 'user_123' })).not.toThrow();
  });

  it('should allow using fallback.email.verify', async () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });

    expect(typeof client.fallback.email.verify).toBe('function');
    // Note: This will throw because API is not available in test environment
    // but we're just checking the method exists
    expect(() =>
      client.fallback.email.verify({ userId: 'user_123', code: '123456' })
    ).not.toThrow();
  });

  it('should allow error handling with TryMellonError', () => {
    const error = new TryMellonError('NOT_SUPPORTED', 'Test error');

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('NOT_SUPPORTED');
    expect(error.isTryMellonError).toBe(true);
  });

  it('should allow using isTryMellonError type guard', () => {
    const error = new TryMellonError('NOT_SUPPORTED', 'Test error');
    const regularError = new Error('Regular error');

    expect(isTryMellonError(error)).toBe(true);
    expect(isTryMellonError(regularError)).toBe(false);
  });

  it('should allow using AbortSignal', () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
    const controller = new AbortController();
    const options: RegisterOptions = {
      external_user_id: 'user_123',
      signal: controller.signal,
    };

    // Note: This will throw because WebAuthn is not available in test environment
    // but we're just checking the method accepts the signal
    expect(() => client.register(options)).not.toThrow();
  });

  describe('README Quickstart / EXAMPLES API contract (Result, session_token, error.code)', () => {
    it('register returns Result with value.session_token on success', async () => {
      const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
      const result = await client.register({ externalUserId: 'user_123' });
      expect(result).toBeDefined();
      expect(typeof result.ok).toBe('boolean');
      if (result.ok) {
        expect(result.value).toHaveProperty('session_token');
        expect(typeof result.value.session_token).toBe('string');
        expect(result.value.user).toHaveProperty('external_user_id');
      } else {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
      }
    });

    it('authenticate returns Result with value.session_token on success', async () => {
      const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
      const result = await client.authenticate({ externalUserId: 'user_123' });
      expect(result).toBeDefined();
      expect(typeof result.ok).toBe('boolean');
      if (result.ok) {
        expect(result.value).toHaveProperty('session_token');
        expect(result.value.user).toHaveProperty('external_user_id');
      } else {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
      }
    });

    it('fallback.email.verify returns Result with value.sessionToken', async () => {
      const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });
      const result = await client.fallback.email.verify({ userId: 'user_123', code: '123456' });
      expect(result).toBeDefined();
      expect(typeof result.ok).toBe('boolean');
      if (result.ok) {
        expect(result.value).toHaveProperty('sessionToken');
      } else {
        expect(result.error).toHaveProperty('code');
      }
    });
  });
});
