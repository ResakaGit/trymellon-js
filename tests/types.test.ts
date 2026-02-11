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
} from '../src/types';
import type { TryMellonError } from '../src/errors';

describe('Types - TryMellonConfig', () => {
  it('should require appId and publishableKey', () => {
    const config: TryMellonConfig = {
      appId: 'app_live_xxx',
      publishableKey: 'key_live_xxx',
    };
    expectTypeOf(config).toMatchTypeOf<TryMellonConfig>();
    expect(config.appId).toBe('app_live_xxx');
  });

  it('should accept config with optional properties', () => {
    const config: TryMellonConfig = {
      appId: 'app_1',
      publishableKey: 'key_1',
      apiBaseUrl: 'https://api.example.com',
      timeoutMs: 5000,
    };

    expect(config.apiBaseUrl).toBe('https://api.example.com');
    expect(config.timeoutMs).toBe(5000);
    expectTypeOf(config).toMatchTypeOf<TryMellonConfig>();
  });
});

describe('Types - RegisterOptions', () => {
  it('should accept minimal register options (snake_case)', () => {
    const options: RegisterOptions = {
      external_user_id: 'user_123',
    };

    expect(options.external_user_id).toBe('user_123');
    expectTypeOf(options).toMatchTypeOf<RegisterOptions>();
  });

  it('should accept register options with camelCase externalUserId', () => {
    const options: RegisterOptions = {
      externalUserId: 'user_123',
    };
    expect(options.externalUserId).toBe('user_123');
    expectTypeOf(options).toMatchTypeOf<RegisterOptions>();
  });

  it('should accept register options with authenticatorType', () => {
    const options: RegisterOptions = {
      external_user_id: 'user_123',
      authenticatorType: 'platform',
    };

    expect(options.authenticatorType).toBe('platform');
    expectTypeOf(options.authenticatorType).toEqualTypeOf<
      'platform' | 'cross-platform' | undefined
    >();
  });

  it('should accept register options with AbortSignal', () => {
    const controller = new AbortController();
    const options: RegisterOptions = {
      external_user_id: 'user_123',
      signal: controller.signal,
    };

    expect(options.signal).toBe(controller.signal);
    expectTypeOf(options.signal).toEqualTypeOf<AbortSignal | undefined>();
  });
});

describe('Types - RegisterResult', () => {
  it('should have all required properties', () => {
    const result: RegisterResult = {
      success: true,
      credential_id: 'cred_123',
      status: 'verified',
      session_token: 'session_token_123',
      user: {
        user_id: 'user_uuid_123',
        external_user_id: 'user_123',
      },
    };

    expect(result.success).toBe(true);
    expect(result.credential_id).toBe('cred_123');
    expect(result.status).toBe('verified');
    expect(result.session_token).toBe('session_token_123');
    expectTypeOf(result.success).toEqualTypeOf<true>();
    expectTypeOf(result).toMatchTypeOf<RegisterResult>();
  });
});

describe('Types - AuthenticateOptions', () => {
  it('should accept authenticate options with external_user_id', () => {
    const options: AuthenticateOptions = {
      external_user_id: 'user_123',
    };

    expect(options.external_user_id).toBe('user_123');
    expectTypeOf(options).toMatchTypeOf<AuthenticateOptions>();
  });

  it('should accept authenticate options with hint', () => {
    const options: AuthenticateOptions = {
      external_user_id: 'user_123',
      hint: 'user@example.com',
    };

    expect(options.hint).toBe('user@example.com');
    expect(options.external_user_id).toBe('user_123');
    expectTypeOf(options.hint).toBeString();
  });

  it('should accept externalUserId or external_user_id', () => {
    const optionsSnake: AuthenticateOptions = {
      external_user_id: 'user_123',
    };
    const optionsCamel: AuthenticateOptions = {
      externalUserId: 'user_123',
    };
    expectTypeOf(optionsSnake).toMatchTypeOf<AuthenticateOptions>();
    expectTypeOf(optionsCamel).toMatchTypeOf<AuthenticateOptions>();
  });
});

describe('Types - AuthenticateResult', () => {
  it('should require all properties', () => {
    const result: AuthenticateResult = {
      authenticated: true,
      session_token: 'tm_sess_123',
      user: {
        user_id: 'user_uuid_123',
        external_user_id: 'ext_123',
      },
      signals: {
        userVerification: true,
        backupEligible: true,
        backupStatus: false,
      },
    };

    expect(result.authenticated).toBe(true);
    expect(result.session_token).toBe('tm_sess_123');
    expect(result.user.external_user_id).toBe('ext_123');
    expectTypeOf(result.authenticated).toBeBoolean();
    expectTypeOf(result.session_token).toBeString();
    expectTypeOf(result.signals).toMatchTypeOf<{
      userVerification?: boolean;
      backupEligible?: boolean;
      backupStatus?: boolean;
    }>();
  });
});

describe('Types - ClientStatus', () => {
  it('should have all required properties', () => {
    const status: ClientStatus = {
      isPasskeySupported: true,
      platformAuthenticatorAvailable: true,
      recommendedFlow: 'passkey',
    };

    expect(status.isPasskeySupported).toBe(true);
    expect(status.platformAuthenticatorAvailable).toBe(true);
    expect(status.recommendedFlow).toBe('passkey');
    expectTypeOf(status).toMatchTypeOf<ClientStatus>();
  });

  it('should allow fallback as recommendedFlow', () => {
    const status: ClientStatus = {
      isPasskeySupported: false,
      platformAuthenticatorAvailable: false,
      recommendedFlow: 'fallback',
    };

    expect(status.recommendedFlow).toBe('fallback');
    expectTypeOf(status.recommendedFlow).toEqualTypeOf<'passkey' | 'fallback'>();
  });
});

describe('Types - TryMellonEvent', () => {
  it('should be a union of specific string literals', () => {
    const events: TryMellonEvent[] = ['start', 'success', 'error', 'cancelled'];

    expect(events).toHaveLength(4);
    expectTypeOf<TryMellonEvent>().toEqualTypeOf<'start' | 'success' | 'error' | 'cancelled'>();
  });
});

describe('Types - EventPayload', () => {
  it('should accept start event payload', () => {
    const payload: EventPayload = {
      type: 'start',
      operation: 'register',
    };

    expect(payload.type).toBe('start');
    expect(payload.operation).toBe('register');
    expectTypeOf(payload).toMatchTypeOf<EventPayload>();
  });

  it('should accept success event payload', () => {
    const payload: EventPayload = {
      type: 'success',
      operation: 'authenticate',
    };

    expect(payload.type).toBe('success');
    expectTypeOf(payload).toMatchTypeOf<EventPayload>();
  });

  it('should accept error event payload', () => {
    const error = Object.assign(new Error('Test error'), {
      code: 'TEST_ERROR',
      isTryMellonError: true,
    }) as TryMellonError;
    const payload: EventPayload = {
      type: 'error',
      error,
    };

    expect(payload.type).toBe('error');
    expectTypeOf(payload).toMatchTypeOf<EventPayload>();
  });

  it('should accept cancelled event payload', () => {
    const payload: EventPayload = {
      type: 'cancelled',
      operation: 'register',
    };

    expect(payload.type).toBe('cancelled');
    expectTypeOf(payload).toMatchTypeOf<EventPayload>();
  });
});

describe('Types - EventHandler', () => {
  it('should be a function that accepts EventPayload', () => {
    const handler: EventHandler = (payload) => {
      expectTypeOf(payload).toMatchTypeOf<EventPayload>();
    };

    expectTypeOf(handler).toBeFunction();
    expectTypeOf(handler).parameter(0).toMatchTypeOf<EventPayload>();
  });
});

describe('Types - EmailFallbackStartOptions', () => {
  it('should require userId', () => {
    const options: EmailFallbackStartOptions = {
      userId: 'user_123',
    };

    expect(options.userId).toBe('user_123');
    expectTypeOf(options).toMatchTypeOf<EmailFallbackStartOptions>();
    expectTypeOf(options.userId).toBeString();
  });
});

describe('Types - EmailFallbackVerifyOptions', () => {
  it('should require userId and code', () => {
    const options: EmailFallbackVerifyOptions = {
      userId: 'user_123',
      code: '123456',
    };

    expect(options.userId).toBe('user_123');
    expect(options.code).toBe('123456');
    expectTypeOf(options).toMatchTypeOf<EmailFallbackVerifyOptions>();
  });
});

describe('Types - EmailFallbackVerifyResult', () => {
  it('should require sessionToken', () => {
    const result: EmailFallbackVerifyResult = {
      sessionToken: 'tm_sess_123',
    };

    expect(result.sessionToken).toBe('tm_sess_123');
    expectTypeOf(result).toMatchTypeOf<EmailFallbackVerifyResult>();
    expectTypeOf(result.sessionToken).toBeString();
  });
});

describe('Types - Type Safety', () => {
  it('should prevent invalid config values', () => {
    expectTypeOf<{ timeoutMs: string }>().not.toMatchTypeOf<TryMellonConfig>();
  });

  it('should prevent invalid register options', () => {
    expectTypeOf<{ external_user_id: number }>().not.toMatchTypeOf<RegisterOptions>();
    expectTypeOf<{
      external_user_id: string;
      authenticatorType: 'invalid';
    }>().not.toMatchTypeOf<RegisterOptions>();
  });

  it('should prevent invalid event types', () => {
    expectTypeOf<'invalid'>().not.toMatchTypeOf<TryMellonEvent>();
  });

  it('should prevent invalid recommendedFlow', () => {
    expectTypeOf<{
      isPasskeySupported: boolean;
      platformAuthenticatorAvailable: boolean;
      recommendedFlow: 'invalid';
    }>().not.toMatchTypeOf<ClientStatus>();
  });
});
