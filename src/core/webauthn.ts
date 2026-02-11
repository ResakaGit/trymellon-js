import { isWebAuthnSupported } from '../utils/support';
import {
  mapWebAuthnError,
  createNotSupportedError,
  createInvalidArgumentError,
  validateBase64Url,
} from '../errors';
import { base64UrlDecodeToArrayBuffer } from '../utils/base64url';
import { validateCredentialStructure } from '../utils/validation';
import { serializeCredentialForRegister, serializeCredentialForAuth } from './webauthn-utils';
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

/**
 * Crea las opciones de creación de credencial para WebAuthn.
 * Convierte la respuesta del servidor en formato WebAuthn API.
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
 */
function createAuthenticationOptions(
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
  eventEmitter.emit('start', { type: 'start', operation: 'register' });

  try {
    const external_user_id = options.externalUserId ?? options.external_user_id;
    if (
      !external_user_id ||
      typeof external_user_id !== 'string' ||
      external_user_id.trim() === ''
    ) {
      return err(
        createInvalidArgumentError(
          'external_user_id',
          'must be provided (use externalUserId or external_user_id)'
        )
      );
    }

    if (!isWebAuthnSupported()) {
      return err(createNotSupportedError());
    }

    // 1. Iniciar registro en el servidor
    const startResponseResult = await apiClient.startRegister({
      external_user_id: external_user_id.trim(),
    });

    if (!startResponseResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: startResponseResult.error });
      return err(startResponseResult.error);
    }

    const startResponse = startResponseResult.value;
    const session_id = startResponse.session_id;

    // 2. Crear opciones de registro para WebAuthn API
    const creationOptionsResult = createRegistrationOptions(
      startResponse.challenge,
      options.authenticatorType
    );

    if (!creationOptionsResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: creationOptionsResult.error });
      return err(creationOptionsResult.error);
    }

    const creationOptions = creationOptionsResult.value;

    if (options.signal) {
      creationOptions.signal = options.signal;
    }

    // 3. Crear credencial usando WebAuthn API del navegador
    let credential: Credential | null;
    try {
      credential = await navigator.credentials.create(creationOptions);
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // We can't trust validateCredentialStructure to bail out with TryMellon error gracefully if it throws generic error.
    // It throws errors. We should wrap.
    try {
      validateCredentialStructure(credential, 'create');
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 4. Serializar credencial para registro
    let serializedCredential;
    try {
      serializedCredential = serializeCredentialForRegister(credential as PublicKeyCredential);
    } catch (e) {
      // serializeCredentialForRegister throws TryMellonError (via createError)
      // or unknown.
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 5. Completar registro en el servidor
    const finishResult = await apiClient.finishRegister({
      session_id,
      credential: serializedCredential,
    });

    if (!finishResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: finishResult.error });
      return err(finishResult.error);
    }

    const result = finishResult.value;

    eventEmitter.emit('success', { type: 'success', operation: 'register' });

    return ok({
      success: true,
      credential_id: result.credential_id,
      status: result.status,
      session_token: result.session_token,
      user: result.user,
    });
  } catch (error) {
    // Catch-all for unexpected synchronous errors
    const mappedError = mapWebAuthnError(error);
    eventEmitter.emit('error', { type: 'error', error: mappedError });
    return err(mappedError);
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
  eventEmitter.emit('start', { type: 'start', operation: 'authenticate' });

  try {
    const external_user_id = options.externalUserId ?? options.external_user_id;
    if (
      !external_user_id ||
      typeof external_user_id !== 'string' ||
      external_user_id.trim() === ''
    ) {
      return err(
        createInvalidArgumentError(
          'external_user_id',
          'must be provided (use externalUserId or external_user_id)'
        )
      );
    }

    if (!isWebAuthnSupported()) {
      return err(createNotSupportedError());
    }

    // 1. Iniciar autenticación en el servidor
    const startResponseResult = await apiClient.startAuth({
      external_user_id: external_user_id.trim(),
    });

    if (!startResponseResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: startResponseResult.error });
      return err(startResponseResult.error);
    }

    const startResponse = startResponseResult.value;
    const session_id = startResponse.session_id;

    // 2. Crear opciones de autenticación para WebAuthn API
    const requestOptionsResult = createAuthenticationOptions(
      startResponse.challenge,
      options.mediation
    );
    if (!requestOptionsResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: requestOptionsResult.error });
      return err(requestOptionsResult.error);
    }

    const requestOptions = requestOptionsResult.value;

    if (options.signal) {
      requestOptions.signal = options.signal;
    }

    // 3. Obtener credencial usando WebAuthn API del navegador
    let credential: Credential | null;
    try {
      credential = await navigator.credentials.get(requestOptions);
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    try {
      validateCredentialStructure(credential, 'get');
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 4. Serializar credencial para autenticación
    let serializedCredential;
    try {
      serializedCredential = serializeCredentialForAuth(credential as PublicKeyCredential);
    } catch (e) {
      const error = mapWebAuthnError(e);
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 5. Completar autenticación en el servidor
    const finishResult = await apiClient.finishAuth({
      session_id,
      credential: serializedCredential,
    });

    if (!finishResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: finishResult.error });
      return err(finishResult.error);
    }

    const result = finishResult.value;

    eventEmitter.emit('success', {
      type: 'success',
      operation: 'authenticate',
    });

    return ok({
      authenticated: result.authenticated,
      session_token: result.session_token,
      user: result.user,
      signals: result.signals,
    });
  } catch (error) {
    const mappedError = mapWebAuthnError(error);
    eventEmitter.emit('error', { type: 'error', error: mappedError });
    return err(mappedError);
  }
}
