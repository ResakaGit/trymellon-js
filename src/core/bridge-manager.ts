import type { ApiClient, BridgeKind } from './api';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { createError, createInvalidArgumentError, mapWebAuthnError } from '../errors';
import type { TryMellonError } from '../errors';
import { waitWithAbort, withSseFallback } from './polling-utils';
import type {
  BridgeContextResponse,
  BridgeChallengeResponse,
  BridgeResult,
  BridgeEnrollmentResult,
  BridgeAuthResult,
  BridgeCompleteOptions,
  BridgeStatusSnapshot,
} from '../types';
import type {
  BridgeCompleteEnrollmentResult,
  BridgeCompleteAuthResult,
  RegisterStartResponse,
  AuthStartResponse,
} from '../types';
import type { StorageLike } from './context-hash';
import { getOrCreateContextHash, createInMemoryStorage } from './context-hash';
import { createRegistrationOptions, createAuthenticationOptions } from './webauthn';
import { serializeCredentialForRegister, serializeCredentialForAuth } from './webauthn-utils';
import { validateCredentialStructure } from '../utils/validation';

// ---------------------------------------------------------------------------
// Pure helpers (stateless, testable)
// ---------------------------------------------------------------------------

const BRIDGE_TERMINAL_STATUSES: ReadonlySet<BridgeStatusSnapshot['status']> = new Set([
  'pin_locked',
  'completed',
  'expired',
  'cancelled',
]);

const BRIDGE_POLL_INTERVAL_MS = 1500;
const BRIDGE_WAIT_DEFAULT_TIMEOUT_MS = 300_000;
/** Hard cap on poll iterations regardless of timeoutMs. 300s / 1.5s = 200 max attempts. */
const MAX_BRIDGE_POLL_ATTEMPTS = 200;

function isTerminalBridgeStatus(status: BridgeStatusSnapshot['status']): boolean {
  return BRIDGE_TERMINAL_STATUSES.has(status);
}

/** Parses an SSE message for the bridge status stream. Returns null for non-terminal events. */
function parseBridgeStatusMessage(
  event: MessageEvent | { data: string }
): Result<BridgeStatusSnapshot, TryMellonError> | null {
  try {
    const raw = typeof event.data === 'string' ? event.data : String(event.data);
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== 'object' || !('status' in parsed)) return null;
    const p = parsed as Record<string, unknown>;
    if (typeof p.status !== 'string') return null;
    const status = p.status as BridgeStatusSnapshot['status'];
    if (!isTerminalBridgeStatus(status)) return null;
    const ts = p.ts;
    return ok({ status, ...(typeof ts === 'string' && { ts }) });
  } catch {
    return null;
  }
}

/** Validates sessionId for bridge calls. Single place for guard. */
export function validateBridgeSessionId(sessionId: unknown): Result<string, TryMellonError> {
  if (sessionId == null || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return err(createInvalidArgumentError('sessionId', 'must be a non-empty string'));
  }
  return ok(sessionId.trim());
}

/** Maps API complete-enrollment response to public result. Pure. */
export function toBridgeEnrollmentResult(
  apiResult: BridgeCompleteEnrollmentResult
): BridgeEnrollmentResult {
  return {
    kind: 'enrollment',
    sessionToken: apiResult.session_token,
    credentialId: apiResult.credential_id,
    userId: apiResult.user_id,
    entityId: apiResult.entity_id,
  };
}

/** Maps API complete-auth response to public result. Pure. */
export function toBridgeAuthResult(apiResult: BridgeCompleteAuthResult): BridgeAuthResult {
  return { kind: 'auth', sessionToken: apiResult.session_token };
}

/** Resolves PIN from options and calls verifyBridgePin. Single async step for PIN flow. */
async function resolvePinAndVerify(
  apiClient: ApiClient,
  sessionId: string,
  kind: BridgeKind,
  options: BridgeCompleteOptions
): Promise<Result<BridgeChallengeResponse, TryMellonError>> {
  const presencePin =
    options.presencePin != null && options.presencePin !== '' ? options.presencePin : null;
  const pin =
    presencePin ??
    (typeof options.onPinRequired === 'function' ? await options.onPinRequired() : null);
  if (pin == null || pin === '') {
    return err(
      createError(
        'INVALID_ARGUMENT',
        'Bridge requires PIN: provide presencePin or onPinRequired in options'
      )
    );
  }
  return apiClient.verifyBridgePin(sessionId, pin, kind);
}

export class BridgeManager {
  /** Per-instance in-memory fallback avoids sharing hash state across SSR requests. */
  private readonly _inMemoryFallback: StorageLike = createInMemoryStorage();

  constructor(
    private readonly apiClient: ApiClient,
    private readonly storage?: StorageLike
  ) {}

  /**
   * Waits until bridge status is terminal (pin_verified | pin_locked | completed).
   * In browser: uses SSE (EventSource) when useSse !== false and EventSource is available; falls back to polling on SSE error or when EventSource is undefined.
   * In Node.js EventSource is not defined (no built-in); only polling is used. No extra dependency is added.
   * Polling: GET status at BRIDGE_POLL_INTERVAL_MS until terminal or timeout.
   * @see BRIDGE_WAIT_DEFAULT_TIMEOUT_MS — default 5 min; pass options.timeoutMs to override.
   */
  async waitForResult(
    sessionId: string,
    options?: { useSse?: boolean; kind?: BridgeKind; timeoutMs?: number; signal?: AbortSignal }
  ): Promise<Result<BridgeStatusSnapshot, TryMellonError>> {
    const sid = validateBridgeSessionId(sessionId);
    if (!sid.ok) return err(sid.error);

    const kind: BridgeKind = options?.kind ?? 'enrollment';
    const useSse = options?.useSse !== false;
    const timeoutMs = options?.timeoutMs ?? BRIDGE_WAIT_DEFAULT_TIMEOUT_MS;
    const signal = options?.signal;

    if (signal?.aborted) {
      return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
    }

    const pollUntilTerminal = async (
      startAt: number
    ): Promise<Result<BridgeStatusSnapshot, TryMellonError>> => {
      for (let attempts = 0; attempts < MAX_BRIDGE_POLL_ATTEMPTS; attempts++) {
        if (signal?.aborted) {
          return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
        }
        const statusResult = await this.apiClient.getBridgeStatus(sid.value, kind);
        if (!statusResult.ok) return err(statusResult.error);
        if (isTerminalBridgeStatus(statusResult.value.status)) return ok(statusResult.value);
        if (Date.now() - startAt >= timeoutMs) {
          return err(createError('TIMEOUT', 'Bridge status wait timed out'));
        }
        const waitResult = await waitWithAbort(BRIDGE_POLL_INTERVAL_MS, signal);
        if (waitResult === 'aborted') {
          return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
        }
      }
      return err(createError('TIMEOUT', 'Bridge status wait exceeded maximum poll attempts'));
    };

    if (useSse && typeof EventSource !== 'undefined') {
      const url = this.apiClient.getBridgeStatusUrl(sid.value, kind);
      return withSseFallback(
        url,
        () => pollUntilTerminal(Date.now()),
        parseBridgeStatusMessage,
        signal
      );
    }

    return pollUntilTerminal(Date.now());
  }

  /**
   * Fetches bridge context (type + WebAuthn options). Use kind from the init flow (enrollment-bridge vs auth-bridge).
   */
  async getContext(
    sessionId: string,
    kind: BridgeKind
  ): Promise<Result<BridgeContextResponse, TryMellonError>> {
    const sid = validateBridgeSessionId(sessionId);
    if (!sid.ok) return err(sid.error);
    return this.apiClient.getBridgeContext(sid.value, kind);
  }

  /**
   * Verifies presence PIN. Returns challenge and registration/authentication options for the next step.
   */
  async verifyPin(
    sessionId: string,
    pin: string,
    kind: BridgeKind
  ): Promise<Result<BridgeChallengeResponse, TryMellonError>> {
    const sid = validateBridgeSessionId(sessionId);
    if (!sid.ok) return err(sid.error);
    if (pin == null || typeof pin !== 'string' || pin === '') {
      return err(createInvalidArgumentError('pin', 'must be a non-empty string'));
    }
    return this.apiClient.verifyBridgePin(sid.value, pin, kind);
  }

  /**
   * Runs the full bridge flow: getContext → (PIN if needed) → verifyPin → WebAuthn ceremony → complete.
   * For enrollment: options.ticketId and options.entityId are required.
   */
  async complete(
    sessionId: string,
    options?: BridgeCompleteOptions
  ): Promise<Result<BridgeResult, TryMellonError>> {
    const sid = validateBridgeSessionId(sessionId);
    if (!sid.ok) return err(sid.error);

    const kind: BridgeKind = options?.kind ?? 'enrollment';

    if (options?.signal?.aborted) {
      return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
    }

    const contextResult = await this.apiClient.getBridgeContext(sid.value, kind);
    if (!contextResult.ok) return err(contextResult.error);

    const context = contextResult.value;

    const challengeResult = await resolvePinAndVerify(
      this.apiClient,
      sid.value,
      kind,
      options ?? { kind }
    );
    if (!challengeResult.ok) return err(challengeResult.error);
    const challengeResponse = challengeResult.value;

    if (options?.signal?.aborted) {
      return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
    }

    const expectedKind: BridgeKind = context.type === 'registration' ? 'enrollment' : 'auth';
    if (kind !== expectedKind) {
      return err(
        createError(
          'INVALID_ARGUMENT',
          `Bridge context type "${context.type}" does not match kind "${kind}"`
        )
      );
    }

    if (context.type === 'registration') {
      if (!options?.ticketId?.trim() || !options?.entityId?.trim()) {
        return err(
          createInvalidArgumentError('ticketId/entityId', 'required for enrollment bridge complete')
        );
      }

      const registrationOptions = challengeResponse.registration_options;
      if (!registrationOptions || typeof registrationOptions !== 'object') {
        return err(
          createError('UNKNOWN_ERROR', 'Bridge verify response missing registration_options')
        );
      }

      const creationOptionsResult = createRegistrationOptions(
        registrationOptions as RegisterStartResponse['challenge']
      );
      if (!creationOptionsResult.ok) return err(creationOptionsResult.error);

      const creationOptions: CredentialCreationOptions = {
        ...creationOptionsResult.value,
        ...(options.signal !== undefined && { signal: options.signal }),
      };

      let credential: Credential | null;
      try {
        credential = await navigator.credentials.create(creationOptions);
      } catch (e) {
        return err(mapWebAuthnError(e));
      }

      try {
        validateCredentialStructure(credential, 'create');
      } catch (e) {
        return err(mapWebAuthnError(e));
      }

      const serialized = serializeCredentialForRegister(credential as PublicKeyCredential);

      const effectiveStorage =
        this.storage ??
        (typeof sessionStorage !== 'undefined' ? sessionStorage : this._inMemoryFallback);
      const contextHash = getOrCreateContextHash(effectiveStorage);

      const completeResult = await this.apiClient.completeBridgeEnrollment({
        session_id: sid.value,
        ticket_id: options.ticketId,
        entity_id: options.entityId,
        context_hash: contextHash,
        registration_response: {
          id: serialized.id,
          rawId: serialized.rawId,
          response: serialized.response,
          type: serialized.type,
        },
      });

      if (!completeResult.ok) return err(completeResult.error);
      return ok(toBridgeEnrollmentResult(completeResult.value));
    }

    const authOptions = challengeResponse.authentication_options;
    if (!authOptions || typeof authOptions !== 'object') {
      return err(
        createError('UNKNOWN_ERROR', 'Bridge verify response missing authentication_options')
      );
    }

    const requestOptionsResult = createAuthenticationOptions(
      authOptions as AuthStartResponse['challenge']
    );
    if (!requestOptionsResult.ok) return err(requestOptionsResult.error);

    const requestOptions: CredentialRequestOptions = {
      ...requestOptionsResult.value,
      ...(options?.signal !== undefined && { signal: options.signal }),
    };

    let authCredential: Credential | null;
    try {
      authCredential = await navigator.credentials.get(requestOptions);
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    try {
      validateCredentialStructure(authCredential, 'get');
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    const serializedAuth = serializeCredentialForAuth(authCredential as PublicKeyCredential);

    const completeAuthResult = await this.apiClient.completeBridgeAuth({
      session_id: sid.value,
      credential: {
        id: serializedAuth.id,
        rawId: serializedAuth.rawId,
        response: serializedAuth.response,
        type: serializedAuth.type,
      },
    });

    if (!completeAuthResult.ok) return err(completeAuthResult.error);
    return ok(toBridgeAuthResult(completeAuthResult.value));
  }
}
