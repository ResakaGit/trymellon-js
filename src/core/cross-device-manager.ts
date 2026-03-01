import type { ApiClient } from './api';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { createError, mapWebAuthnError } from '../errors';
import type { TryMellonError } from '../errors';
import type {
  CrossDeviceInitResult,
  CrossDeviceContextAuth,
  CrossDeviceContextRegistration,
} from '../types';
import { createAuthenticationOptions, createRegistrationOptions } from './webauthn';
import { serializeCredentialForAuth, serializeCredentialForRegister } from './webauthn-utils';
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
   * Initializes a cross-device registration session (create account via QR).
   * Typically called by the desktop side to get a QR code URL for new users.
   */
  async initRegistration(options: {
    externalUserId: string;
  }): Promise<Result<CrossDeviceInitResult, TryMellonError>> {
    return this.apiClient.initCrossDeviceRegistration(options);
  }

  /**
   * High-level helper to poll for session status until it is completed.
   * Typically called by the desktop side after showing the QR code.
   * Pass pollingToken from init() result so the backend can verify the poller is the initiator.
   */
  async waitForSession(
    sessionId: string,
    signal?: AbortSignal,
    pollingToken?: string | null
  ): Promise<Result<{ session_token: string; user_id: string }, TryMellonError>> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (signal?.aborted) {
        return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
      }

      const statusResult = await this.apiClient.getCrossDeviceStatus(sessionId, pollingToken);
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
   * Branches by context type: registration → credentials.create + verify-registration;
   * auth → credentials.get + verify.
   */
  async approve(sessionId: string): Promise<Result<void, TryMellonError>> {
    const contextResult = await this.apiClient.getCrossDeviceContext(sessionId);
    if (!contextResult.ok) return err(contextResult.error);

    const context = contextResult.value;

    if (context.type === 'registration') {
      return this.executeRegistrationApproval(sessionId, context);
    }
    return this.executeAuthApproval(sessionId, context);
  }

  /**
   * Executes the registration branch: create credential and verify-registration.
   */
  private async executeRegistrationApproval(
    sessionId: string,
    context: CrossDeviceContextRegistration
  ): Promise<Result<void, TryMellonError>> {
    const creationOptionsResult = createRegistrationOptions(context.options);
    if (!creationOptionsResult.ok) return err(creationOptionsResult.error);

    let credential: Credential | null;
    try {
      credential = await navigator.credentials.create(creationOptionsResult.value);
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    try {
      validateCredentialStructure(credential, 'create');
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    let serializedCredential;
    try {
      serializedCredential = serializeCredentialForRegister(credential as PublicKeyCredential);
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    return this.apiClient.verifyCrossDeviceRegistration({
      session_id: sessionId,
      credential: serializedCredential,
    });
  }

  /**
   * Executes the auth branch: get credential and verify.
   */
  private async executeAuthApproval(
    sessionId: string,
    context: CrossDeviceContextAuth
  ): Promise<Result<void, TryMellonError>> {
    const requestOptionsResult = createAuthenticationOptions(context.options);
    if (!requestOptionsResult.ok) return err(requestOptionsResult.error);

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
