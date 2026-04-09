import type { ApiClient } from './api';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { createError, createInvalidArgumentError, mapWebAuthnError } from '../errors';
import type { TryMellonError } from '../errors';
import type { ActionSignOptions, ActionSignResult, AuthStartResponse } from '../types';
import { createAuthenticationOptions } from './webauthn';
import { serializeCredentialForAuth } from './webauthn-utils';
import { validateCredentialStructure } from '../utils/validation';

/** namespace:verb — e.g. 'approve:transfer', 'finance:wire_transfer' */
const ACTION_TYPE_RE = /^[a-z0-9_]+:[a-z0-9_]+$/;
/** 64-char lowercase hex — SHA-256 output */
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

export class ActionManager {
  constructor(private readonly apiClient: ApiClient) {}

  /**
   * Signs an action with the user's passkey.
   *
   * Flow:
   *   1. Validate inputs client-side (guard clauses).
   *   2. POST /v1/actions/challenges — get WebAuthn options bound to actionType+payloadHash.
   *   3. navigator.credentials.get — trigger biometric prompt.
   *   4. POST /v1/actions/:challengeId/verify — server verifies assertion + payload binding.
   *   5. Return short-lived action token (120s JWT).
   *
   * Security invariants:
   *   - payloadHash is validated to be 64-char lowercase hex before any HTTP call.
   *   - signal is checked on entry and passed to credentials.get; HTTP calls are not aborted.
   *   - The action token is never stored or logged by the SDK.
   */
  async sign(opts: ActionSignOptions): Promise<Result<ActionSignResult, TryMellonError>> {
    // --- Input guards (fail fast, before any I/O) ---
    if (opts.signal?.aborted) {
      return err(createError('ABORT_ERROR'));
    }

    if (!opts.actionType || !ACTION_TYPE_RE.test(opts.actionType)) {
      return err(
        createInvalidArgumentError(
          'actionType',
          "must follow 'namespace:verb' format with lowercase alphanumeric/underscores (e.g. 'approve:transfer')"
        )
      );
    }

    if (!opts.payloadHash || !SHA256_HEX_RE.test(opts.payloadHash)) {
      return err(
        createInvalidArgumentError('payloadHash', 'must be a 64-char lowercase hex SHA-256')
      );
    }

    if (!opts.rpId || opts.rpId.trim() === '') {
      return err(createInvalidArgumentError('rpId', 'must be a non-empty string'));
    }

    // --- Issue challenge ---
    const issueResult = await this.apiClient.issueActionChallenge({
      action_type: opts.actionType,
      payload_hash: opts.payloadHash,
      rp_id: opts.rpId.trim(),
      ...(opts.ttlSeconds !== undefined && { ttl_seconds: opts.ttlSeconds }),
    });

    if (!issueResult.ok) return err(issueResult.error);

    if (opts.signal?.aborted) {
      return err(createError('ABORT_ERROR'));
    }

    const { challenge_id, webauthn_options } = issueResult.value;

    // Map webauthn_options to the shape createAuthenticationOptions expects.
    // The server challenge is already base64url — no re-encoding needed.
    const authChallenge: AuthStartResponse['challenge'] = {
      challenge: webauthn_options.challenge,
      rpId: webauthn_options.rpId,
      allowCredentials: webauthn_options.allowCredentials ?? [],
      ...(webauthn_options.timeout !== undefined && { timeout: webauthn_options.timeout }),
      ...(webauthn_options.userVerification !== undefined && {
        userVerification: webauthn_options.userVerification,
      }),
    };

    const requestOptionsResult = createAuthenticationOptions(authChallenge);
    if (!requestOptionsResult.ok) return err(requestOptionsResult.error);

    const requestOptions: CredentialRequestOptions = {
      ...requestOptionsResult.value,
      ...(opts.signal !== undefined && { signal: opts.signal }),
    };

    // --- WebAuthn ceremony ---
    let credential: Credential | null;
    try {
      credential = await navigator.credentials.get(requestOptions);
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    try {
      validateCredentialStructure(credential, 'get');
    } catch (e) {
      return err(mapWebAuthnError(e));
    }

    const serialized = serializeCredentialForAuth(credential as PublicKeyCredential);

    // --- Verify signature ---
    const verifyResult = await this.apiClient.verifyActionSignature(challenge_id, {
      authentication_response: {
        id: serialized.id,
        rawId: serialized.rawId,
        response: serialized.response,
        type: serialized.type,
      },
      rp_id: opts.rpId.trim(),
    });

    if (!verifyResult.ok) return err(verifyResult.error);

    return ok({
      token: verifyResult.value.token,
      verifiedAt: verifyResult.value.verified_at,
      actionType: verifyResult.value.action_type,
      credentialId: verifyResult.value.credential_id,
    });
  }
}
