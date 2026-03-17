import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { TryMellon } from '../../src/core/trymellon';
import { SANDBOX_SESSION_TOKEN } from '../../src/core/constants';
import * as webauthnModule from '../../src/core/webauthn';

vi.mock('../../src/core/api');

const MINIMAL_CONFIG = { appId: 'sandbox', publishableKey: 'sandbox' } as const;

function setWindowOrigin(origin: string): void {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, origin },
    writable: true,
    configurable: true,
  });
}

describe('TryMellon sandbox mode', () => {
  const registerPasskeySpy = vi.spyOn(webauthnModule, 'registerPasskey');
  const authenticatePasskeySpy = vi.spyOn(webauthnModule, 'authenticatePasskey');

  let locationDescriptor: PropertyDescriptor | undefined;

  beforeAll(() => {
    locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (locationDescriptor) {
      Object.defineProperty(window, 'location', locationDescriptor);
    }
  });

  describe('SANDBOX_SESSION_TOKEN', () => {
    it('is a non-empty string', () => {
      expect(typeof SANDBOX_SESSION_TOKEN).toBe('string');
      expect(SANDBOX_SESSION_TOKEN.length).toBeGreaterThan(0);
    });

    it('has a stable, documented value for backend comparison', () => {
      expect(SANDBOX_SESSION_TOKEN).toBe('trymellon_sandbox_session_token_v1');
    });
  });

  describe('TryMellon.create with sandbox: true', () => {
    it('returns ok(instance) with placeholder appId and publishableKey', () => {
      const result = TryMellon.create({
        sandbox: true,
        appId: 'sandbox',
        publishableKey: 'sandbox',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeInstanceOf(TryMellon);
      }
    });

    it('returns ok(instance) with sandbox and explicit apiBaseUrl', () => {
      const result = TryMellon.create({
        sandbox: true,
        appId: 'sandbox',
        publishableKey: 'sandbox',
        apiBaseUrl: 'https://api.example.com',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBeInstanceOf(TryMellon);
      }
    });

    it('returns err when sandbox true but appId empty', () => {
      const result = TryMellon.create({
        sandbox: true,
        appId: '',
        publishableKey: 'sandbox',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/appId/);
      }
    });

    it('returns err when sandbox true but publishableKey empty', () => {
      const result = TryMellon.create({
        sandbox: true,
        appId: 'sandbox',
        publishableKey: '',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/publishableKey/);
      }
    });
  });

  describe('register() in sandbox mode', () => {
    it('returns success with sandbox token without calling registerPasskey', async () => {
      const createResult = TryMellon.create({
        sandbox: true,
        appId: 'sandbox',
        publishableKey: 'sandbox',
      });
      if (!createResult.ok) throw new Error('expected ok');
      const client = createResult.value;
      const result = await client.register({ externalUserId: 'dev_user_1' });

      expect(registerPasskeySpy).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe(SANDBOX_SESSION_TOKEN);
        expect(result.value.success).toBe(true);
        expect(result.value.status).toBe('sandbox');
        expect(result.value.user.externalUserId).toBe('dev_user_1');
      }
    });

    it('uses custom sandboxToken when provided', async () => {
      const createResult = TryMellon.create({
        sandbox: true,
        appId: 'sandbox',
        publishableKey: 'sandbox',
        sandboxToken: 'my_custom_sandbox_token',
      });
      if (!createResult.ok) throw new Error('expected ok');
      const client = createResult.value;
      const result = await client.register({ externalUserId: 'u1' });

      expect(registerPasskeySpy).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe('my_custom_sandbox_token');
      }
    });
  });

  describe('authenticate() in sandbox mode', () => {
    it('returns success with sandbox token without calling authenticatePasskey', async () => {
      const createResult = TryMellon.create({
        sandbox: true,
        appId: 'sandbox',
        publishableKey: 'sandbox',
      });
      if (!createResult.ok) throw new Error('expected ok');
      const client = createResult.value;
      const result = await client.authenticate({ externalUserId: 'dev_user_1' });

      expect(authenticatePasskeySpy).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.sessionToken).toBe(SANDBOX_SESSION_TOKEN);
        expect(result.value.authenticated).toBe(true);
        expect(result.value.user.externalUserId).toBe('dev_user_1');
      }
    });
  });

  describe('validateSession() in sandbox mode', () => {
    it('returns valid mock response when token is sandbox token', async () => {
      const createResult = TryMellon.create({
        sandbox: true,
        appId: 'sandbox',
        publishableKey: 'sandbox',
      });
      if (!createResult.ok) throw new Error('expected ok');
      const client = createResult.value;
      const result = await client.validateSession(SANDBOX_SESSION_TOKEN);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.valid).toBe(true);
        expect(result.value.userId).toBe('sandbox-user');
        expect(result.value.externalUserId).toBe('sandbox');
      }
    });
  });

  describe('sandbox console warning (warnIfSandboxOnProd)', () => {
    it('calls console.warn with message containing "Sandbox mode is ON" when sandbox true and origin is production', () => {
      setWindowOrigin('https://myapp.com');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = TryMellon.create({
        ...MINIMAL_CONFIG,
        sandbox: true,
      });

      expect(result.ok).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Sandbox mode is ON'));
    });

    it('does not call console.warn when sandbox true and origin is localhost', () => {
      setWindowOrigin('http://localhost:3000');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      TryMellon.create({
        ...MINIMAL_CONFIG,
        sandbox: true,
      });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not call console.warn when sandbox false', () => {
      setWindowOrigin('https://myapp.com');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      TryMellon.create({
        ...MINIMAL_CONFIG,
        sandbox: false,
      });

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
