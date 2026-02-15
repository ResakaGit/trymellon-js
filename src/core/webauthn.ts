import { isWebAuthnSupported } from '../utils/support';
import {
  mapWebAuthnError,
  createNotSupportedError,
  createInvalidArgumentError,
  validateBase64Url,
} from '../errors';
import { base64UrlDecodeToArrayBuffer } from '../utils/base64url';
import { validateCredentialStructure } from '../utils/validation';
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
  try {
    eventEmitter.emit('start', { type: 'start', operation: 'register' });

    if (!isWebAuthnSupported()) {
      const error = createNotSupportedError();
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    const extId = options.externalUserId ?? options.external_user_id;

    if (!extId || typeof extId !== 'string' || extId.trim() === '') {
      const error = createInvalidArgumentError('externalUserId', 'must be a non-empty string');
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 1. Obtener challenge del servidor
    const startResult = await apiClient.startRegister({
      external_user_id: extId,
    });

    if (!startResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: startResult.error });
      return err(startResult.error);
    }

    // 2. Crear opciones de creación de credencial
    const creationOptionsResult = createRegistrationOptions(
      startResult.value.challenge,
      options.authenticatorType
    );

    if (!creationOptionsResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: creationOptionsResult.error });
      return err(creationOptionsResult.error);
    }

    const creationOptions = {
      ...creationOptionsResult.value,
      ...(options.signal && { signal: options.signal }),
    };

    // 3. Solicitar al navegador la creación de la credencial
    const credential = (await navigator.credentials.create(creationOptions)) as PublicKeyCredential;

    if (!credential) {
      const error = createInvalidArgumentError('credential', 'creation failed');
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    try {
      validateCredentialStructure(credential);
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 4. Completar registro en el servidor
    const finishResult = await apiClient.finishRegister({
      session_id: startResult.value.session_id,
      credential: serializeCredentialForRegister(credential),
    });

    if (!finishResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: finishResult.error });
      return err(finishResult.error);
    }

    const result: RegisterResult = {
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
    };

    eventEmitter.emit('success', { type: 'success', operation: 'register' });
    return ok(result);
  } catch (error) {
    const tryMellonError = mapWebAuthnError(error);
    eventEmitter.emit('error', { type: 'error', error: tryMellonError });
    return err(tryMellonError);
  }
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
  try {
    eventEmitter.emit('start', { type: 'start', operation: 'authenticate' });

    if (!isWebAuthnSupported()) {
      const error = createNotSupportedError();
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    const extId = options.externalUserId ?? options.external_user_id;

    if (!extId || typeof extId !== 'string' || extId.trim() === '') {
      const error = createInvalidArgumentError('externalUserId', 'must be a non-empty string');
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 1. Obtener challenge del servidor
    const startResult = await apiClient.startAuth({
      external_user_id: extId,
    });

    if (!startResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: startResult.error });
      return err(startResult.error);
    }

    // 2. Crear opciones de autenticación
    const requestOptionsResult = createAuthenticationOptions(
      startResult.value.challenge,
      options.mediation
    );

    if (!requestOptionsResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: requestOptionsResult.error });
      return err(requestOptionsResult.error);
    }

    const requestOptions = {
      ...requestOptionsResult.value,
      ...(options.signal && { signal: options.signal }),
    };

    // 3. Solicitar al navegador la autenticación
    const credential = (await navigator.credentials.get(requestOptions)) as PublicKeyCredential;

    if (!credential) {
      const error = createInvalidArgumentError('credential', 'retrieval failed');
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    try {
      validateCredentialStructure(credential);
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 4. Completar autenticación en el servidor
    const finishResult = await apiClient.finishAuthentication({
      session_id: startResult.value.session_id,
      credential: serializeCredentialForAuth(credential),
    });

    if (!finishResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: finishResult.error });
      return err(finishResult.error);
    }

    const result: AuthenticateResult = {
      authenticated: finishResult.value.authenticated,
      sessionToken: finishResult.value.session_token,
      user: {
        userId: finishResult.value.user.user_id,
        externalUserId: finishResult.value.user.external_user_id,
        email: finishResult.value.user.email,
        metadata: finishResult.value.user.metadata,
      },
      signals: finishResult.value.signals,
    };

    eventEmitter.emit('success', { type: 'success', operation: 'authenticate' });
    return ok(result);
  } catch (error) {
    const tryMellonError = mapWebAuthnError(error);
    eventEmitter.emit('error', { type: 'error', error: tryMellonError });
    return err(tryMellonError);
  }
}
