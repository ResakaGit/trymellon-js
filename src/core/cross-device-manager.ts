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
import { waitWithAbort, withSseFallback } from './polling-utils';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // ~3 minutes
const RATE_LIMIT_BACKOFF_MS = 8000; // wait longer when backend asks to slow down

type CompletedResult = Result<
  { sessionToken: string; userId: string; redirectUrl?: string },
  TryMellonError
>;

/** Parses an SSE message for the cross-device status stream. Returns null for non-terminal events. */
function parseCrossDeviceMessage(event: MessageEvent): CompletedResult | null {
  try {
    const raw = typeof event.data === 'string' ? event.data : String(event.data);
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object') return null;
    const p = parsed as Record<string, unknown>;
    if (p.status !== 'completed') return null;
    return toCompletedResult({
      session_token: typeof p.session_token === 'string' ? p.session_token : undefined,
      user_id: typeof p.user_id === 'string' ? p.user_id : undefined,
      redirect_url: typeof p.redirect_url === 'string' ? p.redirect_url : undefined,
    });
  } catch {
    return null;
  }
}

/** Maps a completed status payload to the public result. Pure — single source of truth for both SSE and polling paths. */
function toCompletedResult(value: {
  session_token?: string;
  user_id?: string;
  redirect_url?: string;
}): CompletedResult {
  if (!value.session_token || !value.user_id) {
    return err(createError('UNKNOWN_ERROR', 'Missing data in completed session'));
  }
  const redirectUrl =
    value.redirect_url != null && value.redirect_url !== '' ? value.redirect_url : undefined;
  return ok({
    sessionToken: value.session_token,
    userId: value.user_id,
    ...(redirectUrl !== undefined && { redirectUrl }),
  });
}

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
   * Pass externalUserId for known users; omit for anonymous registration.
   */
  async initRegistration(options?: {
    externalUserId?: string;
  }): Promise<Result<CrossDeviceInitResult, TryMellonError>> {
    return this.apiClient.initCrossDeviceRegistration(options);
  }

  /**
   * High-level helper to wait for a cross-device session to complete.
   * In browser: uses SSE (EventSource) when available; falls back to polling on SSE error.
   * In Node.js (no EventSource): uses polling only.
   * Pass pollingToken from init() so the backend can verify the poller is the initiator.
   * opts.useSse defaults to true; set to false to force polling (testing/debugging).
   */
  async waitForSession(
    sessionId: string,
    signal?: AbortSignal,
    pollingToken?: string | null,
    opts?: { useSse?: boolean }
  ): Promise<
    Result<{ sessionToken: string; userId: string; redirectUrl?: string }, TryMellonError>
  > {
    if (signal?.aborted) {
      return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
    }

    const pollUntilCompleted = async (): Promise<CompletedResult> => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        const statusResult = await this.apiClient.getCrossDeviceStatus(sessionId, pollingToken);
        if (!statusResult.ok) {
          if (statusResult.error.code === 'RATE_LIMIT_EXCEEDED') {
            const waitResult = await waitWithAbort(RATE_LIMIT_BACKOFF_MS, signal);
            if (waitResult === 'aborted')
              return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
            continue;
          }
          return err(statusResult.error);
        }

        if (statusResult.value.status === 'completed') {
          return toCompletedResult(statusResult.value);
        }

        const waitResult = await waitWithAbort(POLL_INTERVAL_MS, signal);
        if (waitResult === 'aborted') {
          return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
        }
      }
      return err(createError('TIMEOUT', 'Cross-device authentication timed out'));
    };

    const useSse = opts?.useSse ?? true;

    if (useSse && typeof EventSource !== 'undefined') {
      const url = this.apiClient.getCrossDeviceStatusUrl(sessionId, pollingToken);
      return withSseFallback(url, pollUntilCompleted, parseCrossDeviceMessage, signal);
    }

    return pollUntilCompleted();
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
