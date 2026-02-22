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
} from '../types';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import type { TryMellonError } from '../errors';
import { serializeCredentialForAuth, serializeCredentialForRegister } from './webauthn-utils';
import { invokeCeremony } from './ceremony';

/**
 * Crea las opciones de creación de credencial para WebAuthn.
 * Convierte la respuesta del servidor en formato WebAuthn API.
 * WebAuthn protocol: challenge and rp.id are taken from the server only; do not override.
 * Exported for use by OnboardingManager (same-device passkey registration).
 */
export function createRegistrationOptions(
  challenge: RegisterStartResponse['challenge'],
  authenticatorType?: 'platform' | 'cross-platform'
): Result<CredentialCreationOptions, TryMellonError> {
  try {
    validateBase64Url(challenge.challenge, 'challenge');
    validateBase64Url(challenge.user.id, 'user.id');

    const challengeBuffer = base64UrlDecodeToArrayBuffer(challenge.challenge);
    const userIdBuffer = base64UrlDecodeToArrayBuffer(challenge.user.id);

    // Construir authenticatorSelection: priorizar servidor, permitir override de authenticatorType
    let authenticatorSelection: AuthenticatorSelectionCriteria = {
      userVerification: 'preferred',
    };

    if (challenge.authenticatorSelection) {
      // Usar valores del servidor como base
      authenticatorSelection = {
        ...challenge.authenticatorSelection,
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
        id: challenge.rp.id,
        name: challenge.rp.name,
      },
      user: {
        id: userIdBuffer,
        name: challenge.user.name,
        displayName: challenge.user.displayName,
      },
      challenge: challengeBuffer,
      pubKeyCredParams: challenge.pubKeyCredParams,
      ...(challenge.timeout !== undefined && { timeout: challenge.timeout }),
      attestation: 'none',
      authenticatorSelection,
      ...(challenge.excludeCredentials && {
        excludeCredentials: challenge.excludeCredentials.map((cred) => ({
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
 * Crea las opciones de autenticación para WebAuthn.
 * Convierte la respuesta del servidor en formato WebAuthn API.
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
 * Registra una nueva passkey para un usuario.
 * Maneja el flujo completo de registro WebAuthn.
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

  return invokeCeremony<RegisterStartResponse, RegisterResult, CredentialCreationOptions>({
    operation: 'register',
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
      });
    },
  });
}

/**
 * Autentica un usuario usando su passkey.
 * Maneja el flujo completo de autenticación WebAuthn.
 */
export async function authenticatePasskey(
  options: AuthenticateOptions,
  apiClient: ApiClient,
  eventEmitter: EventEmitter
): Promise<Result<AuthenticateResult, TryMellonError>> {
  const extId = options.externalUserId ?? options.external_user_id;
  const hasUserId = extId !== undefined && typeof extId === 'string' && extId.trim() !== '';

  return invokeCeremony<AuthStartResponse, AuthenticateResult, CredentialRequestOptions>({
    operation: 'authenticate',
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
      });
    },
  });
}
