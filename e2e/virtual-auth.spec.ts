import { expect } from '@playwright/test';
import { test } from './fixtures/auth-fixtures.js';

/**
 * E2E: Virtual Authenticator — TryMellon SDK passkey flow.
 *
 * Uses Chrome DevTools Protocol to inject a software CTAP2 authenticator.
 * Backend calls are intercepted with page.route() — no real server required.
 *
 * Covers:
 * - Virtual authenticator fixture setup / teardown
 * - navigator.credentials.create() responds via virtual CTAP2 device
 * - SDK register() correctly chains API → WebAuthn → API
 * - SDK authenticate() works after a registered credential exists
 */

const PK = 'pk-virtual-auth-e2e-test';
const EXT_USER_ID = 'e2e-virtual-user-001';

// challenge values encoded as base64url (server format)
const REG_CHALLENGE = Buffer.from('virtual-reg-challenge').toString('base64url');
const AUTH_CHALLENGE = Buffer.from('virtual-auth-challenge').toString('base64url');
const USER_ID_B64 = Buffer.from('virtual-user-id-001').toString('base64url');

function mockRegStartResponse(): string {
  return JSON.stringify({
    ok: true,
    resultado: {
      session_id: 'sess-virtual-reg-001',
      challenge: {
        rp: { id: 'localhost', name: 'Virtual Auth Test' },
        user: { id: USER_ID_B64, name: EXT_USER_ID, displayName: EXT_USER_ID },
        challenge: REG_CHALLENGE,
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [],
        authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' },
      },
    },
  });
}

function mockRegFinishResponse(): string {
  return JSON.stringify({
    ok: true,
    resultado: {
      session_token: 'virtual-session-token-reg',
      credential_id: 'virtual-cred-001',
      status: 'registered',
      user: { user_id: 'virtual-uid-001', external_user_id: EXT_USER_ID },
    },
  });
}

function mockAuthStartResponse(): string {
  return JSON.stringify({
    ok: true,
    resultado: {
      session_id: 'sess-virtual-auth-001',
      challenge: {
        challenge: AUTH_CHALLENGE,
        allowCredentials: [],
        timeout: 60000,
        rpId: 'localhost',
        userVerification: 'required',
      },
    },
  });
}

function mockAuthFinishResponse(): string {
  return JSON.stringify({
    ok: true,
    resultado: {
      session_token: 'virtual-session-token-auth',
      authenticated: true,
      user: { user_id: 'virtual-uid-001', external_user_id: EXT_USER_ID },
      signals: {},
    },
  });
}

test.describe('Virtual Authenticator — TryMellon SDK', () => {
  test('Given a virtual CTAP2 authenticator, When navigator.credentials.create() is called, Then it resolves', async ({
    page,
    authenticatorId,
  }) => {
    // Given
    await page.goto('http://localhost:3123/e2e/webauthn.html');

    // When — call WebAuthn directly, bypassing the SDK
    const result = await page.evaluate(async () => {
      try {
        const cred = await navigator.credentials.create({
          publicKey: {
            rp: { id: 'localhost', name: 'Test' },
            user: {
              id: new Uint8Array([1, 2, 3, 4]),
              name: 'test-user',
              displayName: 'test-user',
            },
            challenge: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            timeout: 5000,
            authenticatorSelection: { userVerification: 'required' },
          },
        });
        return { success: cred !== null };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    });

    // Then
    expect(authenticatorId).toBeTruthy();
    expect(result.success).toBe(true);
  });

  test('Given SDK + virtual authenticator + mocked API, When register() is called, Then returns session_token', async ({
    page,
    authenticatorId: _authenticatorId,
  }) => {
    // Given — intercept passkey API routes
    await page.route('**/v1/passkeys/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/register/start')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockRegStartResponse() });
      }
      if (url.includes('/register/finish')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockRegFinishResponse() });
      }
      return route.abort('failed');
    });

    await page.goto('http://localhost:3123/e2e/webauthn.html');

    // When
    const result = await page.evaluate(
      async ({ pk, extUserId }) => {
        const apiBaseUrl = window.location.origin;
        return (window as any).__sdk.register(
          { appId: 'app-virtual-e2e', publishableKey: pk, apiBaseUrl },
          { externalUserId: extUserId }
        );
      },
      { pk: PK, extUserId: EXT_USER_ID }
    );

    // Then
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sessionToken).toBe('virtual-session-token-reg');
    }
  });

  test('Given registered credential in virtual authenticator, When authenticate() is called, Then returns session_token', async ({
    page,
    authenticatorId: _authenticatorId,
  }) => {
    // Given — intercept all passkey routes
    await page.route('**/v1/passkeys/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/register/start')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockRegStartResponse() });
      }
      if (url.includes('/register/finish')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockRegFinishResponse() });
      }
      if (url.includes('/auth/start')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockAuthStartResponse() });
      }
      if (url.includes('/auth/finish')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: mockAuthFinishResponse() });
      }
      return route.abort('failed');
    });

    await page.goto('http://localhost:3123/e2e/webauthn.html');

    const config = { appId: 'app-virtual-e2e', publishableKey: PK, apiBaseUrl: '' };

    // Register first — creates credential in the virtual authenticator's store
    await page.evaluate(
      async ({ pk, extUserId }) => {
        const apiBaseUrl = window.location.origin;
        return (window as any).__sdk.register(
          { appId: 'app-virtual-e2e', publishableKey: pk, apiBaseUrl },
          { externalUserId: extUserId }
        );
      },
      { pk: PK, extUserId: EXT_USER_ID }
    );

    // When — authenticate using the stored credential
    const result = await page.evaluate(
      async ({ pk, extUserId }) => {
        const apiBaseUrl = window.location.origin;
        return (window as any).__sdk.authenticate(
          { appId: 'app-virtual-e2e', publishableKey: pk, apiBaseUrl },
          { externalUserId: extUserId }
        );
      },
      { pk: PK, extUserId: EXT_USER_ID }
    );

    // Then
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sessionToken).toBe('virtual-session-token-auth');
    }
  });
});
