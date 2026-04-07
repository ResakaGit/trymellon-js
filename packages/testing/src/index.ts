/**
 * @trymellon/testing
 *
 * Node-only package for integration testing with TryMellon WebAuthn test mode.
 * NEVER import this in browser bundles — it uses node:crypto.
 *
 * Requires WEBAUTHN_TEST_MODE=true + TEST_AUTHENTICATOR_SECRET set in the target server.
 *
 * @example
 * ```ts
 * const authenticator = createTestAuthenticator({
 *   secret: process.env.TEST_AUTHENTICATOR_SECRET!,
 *   publishableKey: process.env.TRYMELLON_PUBLISHABLE_KEY!,
 * });
 *
 * const regHeaders = authenticator.getRegisterHeaders('user-abc');
 * const authHeaders = authenticator.getAuthenticateHeaders('user-abc');
 * ```
 */
import { createHmac } from 'node:crypto';

export interface TestAuthenticatorOptions {
  /** HMAC-SHA256 secret — must match TEST_AUTHENTICATOR_SECRET on the server. */
  secret: string;
  /** Publishable key for the TryMellon application. */
  publishableKey: string;
}

export interface TestAuthenticatorHeaders {
  Authorization: string;
  'Content-Type': 'application/json';
  'X-Test-Authenticator': string;
}

export interface TestAuthenticator {
  /**
   * Returns HTTP headers for a test registration request.
   * Include these on POST /v1/passkeys/register/finish.
   */
  getRegisterHeaders(externalUserId: string): TestAuthenticatorHeaders;
  /**
   * Returns HTTP headers for a test authentication request.
   * Include these on POST /v1/passkeys/auth/finish.
   */
  getAuthenticateHeaders(externalUserId: string): TestAuthenticatorHeaders;
}

function buildTestHeader(
  secret: string,
  externalUserId: string,
  operation: 'register' | 'authenticate'
): string {
  const ts = Math.floor(Date.now() / 1000);
  const message = `${externalUserId}|${operation}|${ts}`;
  const sig = createHmac('sha256', secret).update(message).digest('base64url');
  const envelope = JSON.stringify({ externalUserId, operation, ts, sig });
  return Buffer.from(envelope).toString('base64url');
}

/**
 * Creates a test authenticator that generates signed X-Test-Authenticator headers
 * for bypassing WebAuthn ceremonies in CI/integration tests.
 *
 * The server must have WEBAUTHN_TEST_MODE=true and TEST_AUTHENTICATOR_SECRET set
 * to the same secret provided here.
 */
export function createTestAuthenticator(options: TestAuthenticatorOptions): TestAuthenticator {
  const { secret, publishableKey } = options;

  return {
    getRegisterHeaders(externalUserId: string): TestAuthenticatorHeaders {
      return {
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
        'X-Test-Authenticator': buildTestHeader(secret, externalUserId, 'register'),
      };
    },
    getAuthenticateHeaders(externalUserId: string): TestAuthenticatorHeaders {
      return {
        Authorization: `Bearer ${publishableKey}`,
        'Content-Type': 'application/json',
        'X-Test-Authenticator': buildTestHeader(secret, externalUserId, 'authenticate'),
      };
    },
  };
}
