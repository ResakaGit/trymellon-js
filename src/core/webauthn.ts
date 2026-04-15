import { createInvalidArgumentError, validateBase64Url, mapWebAuthnError } from '../errors';
import { base64UrlDecodeToArrayBuffer } from '../utils/base64url';
import type { ApiClient } from './api';
import type { EventEmitter } from './events';
import type {
  RegisterOptions,
  RegisterResult,
  AuthenticateOptions,
  AuthenticateResult,
  RegisterStartResponse,
  AuthStartResponse,
  RegisterFinishRequest,
} from '../types';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import type { TryMellonError } from '../errors';
import { serializeCredentialForAuth, serializeCredentialForRegister } from './webauthn-utils';
import { validateCredentialStructure } from '../utils/validation';
import { invokeCeremony } from './ceremony';

/**
 * Creates credential creation options for WebAuthn.
 * Converts server response to WebAuthn API format.
 * WebAuthn protocol: challenge and rp.id are taken from the server only; do not override.
 * Exported for use by OnboardingManager (same-device) and CrossDeviceManager (QR registration).
 *
 * @param serverChallengePayload - Value of the `.challenge` property from RegisterStartResponse
 *   (the nested object with challenge, user, rp, pubKeyCredParams, etc.). Not the full API response.
 */
export function createRegistrationOptions(
  serverChallengePayload: RegisterStartResponse['challenge'],
  authenticatorType?: 'platform' | 'cross-platform'
): Result<CredentialCreationOptions, TryMellonError> {
  try {
    validateBase64Url(serverChallengePayload.challenge, 'challenge');
    validateBase64Url(serverChallengePayload.user.id, 'user.id');

    const challengeBuffer = base64UrlDecodeToArrayBuffer(serverChallengePayload.challenge);
    const userIdBuffer = base64UrlDecodeToArrayBuffer(serverChallengePayload.user.id);

    // Construir authenticatorSelection: priorizar servidor, permitir override de authenticatorType
    let authenticatorSelection: AuthenticatorSelectionCriteria = {
      userVerification: 'preferred',
    };

    if (serverChallengePayload.authenticatorSelection) {
      // Usar valores del servidor como base
      authenticatorSelection = {
        ...serverChallengePayload.authenticatorSelection,
      };
    }

    // Si el usuario especifica authenticatorType, sobrescribir authenticatorAttachment
    if (authenticatorType) {
      authenticatorSelection = {
        ...authenticatorSelection,
        authenticatorAttachment: authenticatorType,
      };
    }

    const publicKey: PublicKeyCredentialCreationOptions = {
      rp: {
        id: serverChallengePayload.rp.id,
        name: serverChallengePayload.rp.name,
      },
      user: {
        id: userIdBuffer,
        name: serverChallengePayload.user.name,
        displayName: serverChallengePayload.user.displayName,
      },
      challenge: challengeBuffer,
      pubKeyCredParams: serverChallengePayload.pubKeyCredParams,
      ...(serverChallengePayload.timeout !== undefined && {
        timeout: serverChallengePayload.timeout,
      }),
      attestation: 'none',
      authenticatorSelection,
      ...(serverChallengePayload.excludeCredentials && {
        excludeCredentials: serverChallengePayload.excludeCredentials.map((cred) => ({
          id: base64UrlDecodeToArrayBuffer(cred.id),
          type: cred.type,
          ...(cred.transports && {
            transports: cred.transports as AuthenticatorTransport[],
          }),
        })),
      }),
    };

    return ok({ publicKey });
  } catch (e) {
    return err(mapWebAuthnError(e));
  }
}

/**
 * Stateless orchestration: create credential (WebAuthn) → validate structure → serialize for register.
 * Centralizes try/catch and mapWebAuthnError; used by EnrollmentManager and other register flows.
 */
export async function createAndSerializeCredentialForRegister(
  serverChallengePayload: RegisterStartResponse['challenge'],
  signal?: AbortSignal
): Promise<Result<RegisterFinishRequest['credential'], TryMellonError>> {
  const creationOptionsResult = createRegistrationOptions(serverChallengePayload);
  if (!creationOptionsResult.ok) return err(creationOptionsResult.error);

  const creationOptions: CredentialCreationOptions = {
    ...creationOptionsResult.value,
    ...(signal !== undefined && { signal }),
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

  try {
    return ok(serializeCredentialForRegister(credential as PublicKeyCredential));
  } catch (e) {
    return err(mapWebAuthnError(e));
  }
}

/**
 * Creates authentication options for WebAuthn.
 * Converts server response to WebAuthn API format.
 * WebAuthn protocol: challenge and rpId are taken from the server only; do not override.
 */
export function createAuthenticationOptions(
  challenge: AuthStartResponse['challenge'],
  mediation?: AuthenticateOptions['mediation']
): Result<CredentialRequestOptions, TryMellonError> {
  try {
    validateBase64Url(challenge.challenge, 'challenge');
    const challengeBuffer = base64UrlDecodeToArrayBuffer(challenge.challenge);

    return ok({
      publicKey: {
        challenge: challengeBuffer,
        rpId: challenge.rpId,
        ...(challenge.timeout !== undefined && { timeout: challenge.timeout }),
        userVerification: challenge.userVerification ?? 'preferred',
        ...(challenge.allowCredentials && {
          allowCredentials: challenge.allowCredentials.map((cred) => ({
            id: base64UrlDecodeToArrayBuffer(cred.id),
            type: cred.type,
            ...(cred.transports && {
              transports: cred.transports as AuthenticatorTransport[],
            }),
          })),
        }),
      },
      ...(mediation !== undefined && { mediation }),
    });
  } catch (e) {
    return err(mapWebAuthnError(e));
  }
}

/**
 * Registers a new passkey for a user.
 * Handles the full WebAuthn registration flow.
 */
export async function registerPasskey(
  options: RegisterOptions,
  apiClient: ApiClient,
  eventEmitter: EventEmitter
): Promise<Result<RegisterResult, TryMellonError>> {
  const extId = options.externalUserId ?? options.external_user_id;
  if (!extId || typeof extId !== 'string' || extId.trim() === '') {
    const error = createInvalidArgumentError('externalUserId', 'must be a non-empty string');
    eventEmitter.emit('error', { type: 'error', error });
    return err(error);
  }

  const result = await invokeCeremony<
    RegisterStartResponse,
    RegisterResult,
    CredentialCreationOptions
  >({
    operation: 'signUp',
    eventEmitter,
    start: () => apiClient.startRegister({ external_user_id: extId }),
    createOptions: (startResult) =>
      createRegistrationOptions(startResult.challenge, options.authenticatorType),
    invoke: async (ceremonyOptions) => {
      const opts = { ...ceremonyOptions, ...(options.signal && { signal: options.signal }) };
      return navigator.credentials.create(opts);
    },
    finish: async (startResult, credential) => {
      const finishResult = await apiClient.finishRegister({
        session_id: startResult.session_id,
        credential: serializeCredentialForRegister(credential),
        ...(options.successUrl && { success_url: options.successUrl }),
        ...(options.customClaims && { custom_claims: options.customClaims }),
      });

      if (!finishResult.ok) return err(finishResult.error);

      return ok({
        success: true,
        credentialId: finishResult.value.credential_id,
        credential_id: finishResult.value.credential_id,
        status: finishResult.value.status,
        sessionToken: finishResult.value.session_token,
        user: {
          userId: finishResult.value.user.user_id,
          externalUserId: finishResult.value.user.external_user_id,
          email: finishResult.value.user.email,
          metadata: finishResult.value.user.metadata,
        },
        ...(finishResult.value.redirect_url && { redirectUrl: finishResult.value.redirect_url }),
      });
    },
  });

  if (result.ok) {
    eventEmitter.emit('success', {
      type: 'success',
      operation: 'signUp',
      token: result.value.sessionToken,
      user: result.value.user,
    });
  }
  return result;
}

/**
 * Authenticates a user with their passkey.
 * Handles the full WebAuthn authentication flow.
 */
export async function authenticatePasskey(
  options: AuthenticateOptions,
  apiClient: ApiClient,
  eventEmitter: EventEmitter
): Promise<Result<AuthenticateResult, TryMellonError>> {
  const extId = options.externalUserId ?? options.external_user_id;
  const hasUserId = extId !== undefined && typeof extId === 'string' && extId.trim() !== '';

  const result = await invokeCeremony<
    AuthStartResponse,
    AuthenticateResult,
    CredentialRequestOptions
  >({
    operation: 'signIn',
    eventEmitter,
    start: () =>
      apiClient.startAuth(hasUserId ? { external_user_id: (extId as string).trim() } : {}),
    createOptions: (startResult) =>
      createAuthenticationOptions(startResult.challenge, options.mediation),
    invoke: async (ceremonyOptions) => {
      const opts = { ...ceremonyOptions, ...(options.signal && { signal: options.signal }) };
      return navigator.credentials.get(opts);
    },
    finish: async (startResult, credential) => {
      const finishResult = await apiClient.finishAuthentication({
        session_id: startResult.session_id,
        credential: serializeCredentialForAuth(credential),
        ...(options.successUrl && { success_url: options.successUrl }),
        ...(options.customClaims && { custom_claims: options.customClaims }),
      });

      if (!finishResult.ok) return err(finishResult.error);

      return ok({
        authenticated: finishResult.value.authenticated,
        sessionToken: finishResult.value.session_token,
        user: {
          userId: finishResult.value.user.user_id,
          externalUserId: finishResult.value.user.external_user_id,
          email: finishResult.value.user.email,
          metadata: finishResult.value.user.metadata,
        },
        signals: finishResult.value.signals,
        ...(finishResult.value.redirect_url && { redirectUrl: finishResult.value.redirect_url }),
      });
    },
  });

  if (result.ok) {
    eventEmitter.emit('success', {
      type: 'success',
      operation: 'signIn',
      token: result.value.sessionToken,
      user: result.value.user,
    });
  }
  return result;
}
