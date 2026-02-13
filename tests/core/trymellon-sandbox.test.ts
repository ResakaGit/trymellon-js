import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TryMellon } from '../../src/core/trymellon';
import { SANDBOX_SESSION_TOKEN } from '../../src/core/constants';
import * as webauthnModule from '../../src/core/webauthn';

vi.mock('../../src/core/api');

describe('TryMellon sandbox mode', () => {
  const registerPasskeySpy = vi.spyOn(webauthnModule, 'registerPasskey');
  const authenticatePasskeySpy = vi.spyOn(webauthnModule, 'authenticatePasskey');

  beforeEach(() => {
    vi.clearAllMocks();
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
        expect(result.value.user_id).toBe('sandbox-user');
        expect(result.value.external_user_id).toBe('sandbox');
      }
    });
  });
});
