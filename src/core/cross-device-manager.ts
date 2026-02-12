import type { ApiClient } from './api';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { createError, mapWebAuthnError } from '../errors';
import type { TryMellonError } from '../errors';
import type { CrossDeviceInitResult } from '../types';
import { createAuthenticationOptions } from './webauthn';
import { serializeCredentialForAuth } from './webauthn-utils';
import { validateCredentialStructure } from '../utils/validation';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // ~2 minutes

export class CrossDeviceManager {
  constructor(private readonly apiClient: ApiClient) {}

  /**
   * Initializes a cross-device authentication session.
   * Typically called by the desktop side to get a QR code URL.
   */
  async init(): Promise<Result<CrossDeviceInitResult, TryMellonError>> {
    return this.apiClient.initCrossDeviceAuth();
  }

  /**
   * High-level helper to poll for session status until it is completed.
   * Typically called by the desktop side after showing the QR code.
   */
  async waitForSession(
    sessionId: string,
    signal?: AbortSignal
  ): Promise<Result<{ session_token: string; user_id: string }, TryMellonError>> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (signal?.aborted) {
        return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
      }

      const statusResult = await this.apiClient.getCrossDeviceStatus(sessionId);
      if (!statusResult.ok) return err(statusResult.error);

      if (statusResult.value.status === 'completed') {
        if (!statusResult.value.session_token || !statusResult.value.user_id) {
          return err(createError('UNKNOWN_ERROR', 'Missing data in completed session'));
        }
        return ok({
          session_token: statusResult.value.session_token,
          user_id: statusResult.value.user_id,
        });
      }

      // Wait with abort check
      if (signal?.aborted) {
        return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
      }
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(null);
          signal?.removeEventListener('abort', onAbort);
        }, POLL_INTERVAL_MS);

        const onAbort = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        signal?.addEventListener('abort', onAbort);
      });

      if (signal?.aborted) {
        return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
      }
    }

    return err(createError('TIMEOUT', 'Cross-device authentication timed out'));
  }

  /**
   * Approves a cross-device session.
   * Typically called by the mobile side after scanning a QR code.
   * 1. Fetches WebAuthn options for the session.
   * 2. Triggers navigator.credentials.get().
   * 3. Sends the signature to the server to verify and transition the session.
   */
  async approve(sessionId: string): Promise<Result<void, TryMellonError>> {
    // 1. Get WebAuthn options
    const contextResult = await this.apiClient.getCrossDeviceContext(sessionId);
    if (!contextResult.ok) return err(contextResult.error);

    // 2. Create WebAuthn request options
    const requestOptionsResult = createAuthenticationOptions(contextResult.value.options);
    if (!requestOptionsResult.ok) return err(requestOptionsResult.error);

    // 3. Trigger WebAuthn API
    let credential: Credential | null;
    try {
      credential = await navigator.credentials.get(requestOptionsResult.value);
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    try {
      validateCredentialStructure(credential, 'get');
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    // 4. Serialize and verify
    let serializedCredential;
    try {
      serializedCredential = serializeCredentialForAuth(credential as PublicKeyCredential);
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    return this.apiClient.verifyCrossDeviceAuth({
      session_id: sessionId,
      credential: serializedCredential,
    });
  }
}
