import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  TryMellonConfig,
  RegisterOptions,
  RegisterResult,
  AuthenticateOptions,
  AuthenticateResult,
  ClientStatus,
  TryMellonEvent,
  EventPayload,
  EventHandler,
  EmailFallbackStartOptions,
  EmailFallbackVerifyOptions,
  EmailFallbackVerifyResult,
  TryMellonErrorCode,
} from '../src/index';
import {
  TryMellon,
  SANDBOX_SESSION_TOKEN,
  TryMellonError,
  isTryMellonError,
  createError,
  createNotSupportedError,
  createUserCancelledError,
  createNetworkError,
  createTimeoutError,
  createInvalidArgumentError,
  mapWebAuthnError,
  ok,
  err,
} from '../src/index';
import type { Result } from '../src/index';

describe('Public API Exports', () => {
  it('should export TryMellon class', () => {
    expect(TryMellon).toBeDefined();
    expect(typeof TryMellon).toBe('function');
  });

  it('should export SANDBOX_SESSION_TOKEN constant', () => {
    expect(SANDBOX_SESSION_TOKEN).toBeDefined();
    expect(typeof SANDBOX_SESSION_TOKEN).toBe('string');
    expect(SANDBOX_SESSION_TOKEN).toBe('trymellon_sandbox_session_token_v1');
  });

  it('should export TryMellonConfig type', () => {
    expectTypeOf<TryMellonConfig>().toMatchTypeOf<{
      apiBaseUrl?: string;
      timeoutMs?: number;
      maxRetries?: number;
      retryDelayMs?: number;
    }>();
  });

  it('should export RegisterOptions type', () => {
    expectTypeOf<RegisterOptions>().toMatchTypeOf<{
      external_user_id: string;
      authenticatorType?: 'platform' | 'cross-platform';
      signal?: AbortSignal;
    }>();
  });

  it('should export RegisterResult type', () => {
    expectTypeOf<RegisterResult>().toMatchTypeOf<{
      success: true;
      credential_id: string;
      status: string;
      session_token: string;
      user: {
        user_id: string;
        external_user_id: string;
        email?: string;
        metadata?: Record<string, unknown>;
      };
    }>();
  });

  it('should export AuthenticateOptions type', () => {
    expectTypeOf<AuthenticateOptions>().toMatchTypeOf<{
      external_user_id: string;
      hint?: string;
      signal?: AbortSignal;
    }>();
  });

  it('should export AuthenticateResult type', () => {
    expectTypeOf<AuthenticateResult>().toMatchTypeOf<{
      authenticated: boolean;
      session_token: string;
      user: {
        user_id: string;
        external_user_id: string;
        email?: string;
        metadata?: Record<string, unknown>;
      };
      signals: {
        userVerification?: boolean;
        backupEligible?: boolean;
        backupStatus?: boolean;
      };
    }>();
  });

  it('should export ClientStatus type', () => {
    expectTypeOf<ClientStatus>().toMatchTypeOf<{
      isPasskeySupported: boolean;
      platformAuthenticatorAvailable: boolean;
      recommendedFlow: 'passkey' | 'fallback';
    }>();
  });

  it('should export TryMellonEvent type', () => {
    expectTypeOf<TryMellonEvent>().toEqualTypeOf<'start' | 'success' | 'error' | 'cancelled'>();
  });

  it('should export EventPayload type', () => {
    expectTypeOf<EventPayload>().toMatchTypeOf<
      | { type: 'start'; operation: 'register' | 'authenticate' }
      | { type: 'success'; operation: 'register' | 'authenticate' }
      | { type: 'error'; error: TryMellonError }
      | { type: 'cancelled'; operation: 'register' | 'authenticate' }
    >();
  });

  it('should export EventHandler type', () => {
    expectTypeOf<EventHandler>().toMatchTypeOf<(payload: EventPayload) => void>();
  });

  it('should export EmailFallbackStartOptions type', () => {
    expectTypeOf<EmailFallbackStartOptions>().toMatchTypeOf<{
      userId: string;
      email: string;
    }>();
  });

  it('should export EmailFallbackVerifyOptions type', () => {
    expectTypeOf<EmailFallbackVerifyOptions>().toMatchTypeOf<{
      userId: string;
      code: string;
    }>();
  });

  it('should export EmailFallbackVerifyResult type', () => {
    expectTypeOf<EmailFallbackVerifyResult>().toMatchTypeOf<{
      sessionToken: string;
    }>();
  });

  it('should export TryMellonError class', () => {
    expect(TryMellonError).toBeDefined();
    expect(typeof TryMellonError).toBe('function');
  });

  it('should export TryMellonErrorCode type', () => {
    expectTypeOf<TryMellonErrorCode>().toEqualTypeOf<
      | 'NOT_SUPPORTED'
      | 'USER_CANCELLED'
      | 'PASSKEY_NOT_FOUND'
      | 'SESSION_EXPIRED'
      | 'NETWORK_FAILURE'
      | 'INVALID_ARGUMENT'
      | 'TIMEOUT'
      | 'ABORTED'
      | 'UNKNOWN_ERROR'
    >();
  });

  it('should export isTryMellonError function', async () => {
    const module = await import('../src/index');

    expect(module.isTryMellonError).toBeDefined();
    expect(typeof module.isTryMellonError).toBe('function');
  });

  it('should export createError function', async () => {
    const module = await import('../src/index');

    expect(module.createError).toBeDefined();
    expect(typeof module.createError).toBe('function');
  });

  it('should export createNotSupportedError function', async () => {
    const module = await import('../src/index');

    expect(module.createNotSupportedError).toBeDefined();
    expect(typeof module.createNotSupportedError).toBe('function');
  });

  it('should export createUserCancelledError function', async () => {
    const module = await import('../src/index');

    expect(module.createUserCancelledError).toBeDefined();
    expect(typeof module.createUserCancelledError).toBe('function');
  });

  it('should export createNetworkError function', async () => {
    const module = await import('../src/index');

    expect(module.createNetworkError).toBeDefined();
    expect(typeof module.createNetworkError).toBe('function');
  });

  it('should export createTimeoutError function', async () => {
    const module = await import('../src/index');

    expect(module.createTimeoutError).toBeDefined();
    expect(typeof module.createTimeoutError).toBe('function');
  });

  it('should export createInvalidArgumentError function', async () => {
    const module = await import('../src/index');

    expect(module.createInvalidArgumentError).toBeDefined();
    expect(typeof module.createInvalidArgumentError).toBe('function');
  });

  it('should export mapWebAuthnError function', async () => {
    const module = await import('../src/index');

    expect(module.mapWebAuthnError).toBeDefined();
    expect(typeof module.mapWebAuthnError).toBe('function');
  });

  it('should export isTryMellonError function', () => {
    expect(isTryMellonError).toBeDefined();
    expect(typeof isTryMellonError).toBe('function');
  });

  it('should export createError function', () => {
    expect(createError).toBeDefined();
    expect(typeof createError).toBe('function');
  });

  it('should export createNotSupportedError function', () => {
    expect(createNotSupportedError).toBeDefined();
    expect(typeof createNotSupportedError).toBe('function');
  });

  it('should export createUserCancelledError function', () => {
    expect(createUserCancelledError).toBeDefined();
    expect(typeof createUserCancelledError).toBe('function');
  });

  it('should export createNetworkError function', () => {
    expect(createNetworkError).toBeDefined();
    expect(typeof createNetworkError).toBe('function');
  });

  it('should export createTimeoutError function', () => {
    expect(createTimeoutError).toBeDefined();
    expect(typeof createTimeoutError).toBe('function');
  });

  it('should export createInvalidArgumentError function', () => {
    expect(createInvalidArgumentError).toBeDefined();
    expect(typeof createInvalidArgumentError).toBe('function');
  });

  it('should export mapWebAuthnError function', () => {
    expect(mapWebAuthnError).toBeDefined();
    expect(typeof mapWebAuthnError).toBe('function');
  });

  it('should allow creating TryMellon instance', () => {
    const client = new TryMellon({ appId: 'app_test', publishableKey: 'key_test' });

    expect(client).toBeInstanceOf(TryMellon);
  });

  it('should allow using TryMellonError', () => {
    const error = createError('NOT_SUPPORTED');

    expect(error).toBeInstanceOf(TryMellonError);
    expect(error.code).toBe('NOT_SUPPORTED');
  });

  it('should allow using isTryMellonError', () => {
    const error = createError('NOT_SUPPORTED');
    const regularError = new Error('Regular error');

    expect(isTryMellonError(error)).toBe(true);
    expect(isTryMellonError(regularError)).toBe(false);
  });

  it('should export Result type and ok, err helpers', () => {
    expect(ok).toBeDefined();
    expect(err).toBeDefined();
    expect(typeof ok).toBe('function');
    expect(typeof err).toBe('function');
    const success = ok(42);
    expect(success.ok).toBe(true);
    if (success.ok) expect(success.value).toBe(42);
    const failure = err('oops');
    expect(failure.ok).toBe(false);
    if (!failure.ok) expect(failure.error).toBe('oops');
    expectTypeOf(success).toMatchTypeOf<Result<number, string>>();
    expectTypeOf(failure).toMatchTypeOf<Result<number, string>>();
  });
});
