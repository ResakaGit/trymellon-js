import { createError } from '../errors';
import { base64UrlEncode } from '../utils/base64url';
import type { RegisterFinishRequest, AuthFinishRequest } from '../types';

type SerializedCredentialForRegister = RegisterFinishRequest['credential'];
type SerializedCredentialForAuth = AuthFinishRequest['credential'];

/**
 * Type guard para verificar si una respuesta de credencial es válida.
 */
function isValidCredentialResponse(
  response: unknown
): response is AuthenticatorAssertionResponse | AuthenticatorAttestationResponse {
  return (
    response !== null &&
    typeof response === 'object' &&
    'clientDataJSON' in response &&
    response.clientDataJSON instanceof ArrayBuffer
  );
}

/**
 * Serializa una credencial para registro (finish).
 * Incluye attestationObject requerido para la verificación de registro.
 *
 * @param credential - Credencial WebAuthn obtenida de navigator.credentials.create()
 * @returns Credencial serializada con formato Base64URL
 * @throws {TryMellonError} Si la credencial no tiene la estructura esperada para registro
 */
export function serializeCredentialForRegister(
  credential: PublicKeyCredential
): SerializedCredentialForRegister {
  if (!credential.response) {
    throw createError('UNKNOWN_ERROR', 'Credential response is missing', { credential });
  }

  const response = credential.response;

  if (!isValidCredentialResponse(response)) {
    throw createError('UNKNOWN_ERROR', 'Invalid credential response structure', { response });
  }

  if (!('attestationObject' in response)) {
    throw createError(
      'UNKNOWN_ERROR',
      'Invalid credential response structure for register: attestationObject is missing',
      { response }
    );
  }

  const clientDataJSON = response.clientDataJSON;
  const attestationObject = (response as AuthenticatorAttestationResponse).attestationObject;

  return {
    id: credential.id,
    rawId: base64UrlEncode(credential.rawId),
    response: {
      clientDataJSON: base64UrlEncode(clientDataJSON),
      attestationObject: base64UrlEncode(attestationObject),
    },
    type: 'public-key',
  };
}

/**
 * Serializa una credencial para autenticación (finish).
 * Incluye authenticatorData, signature, y opcionalmente userHandle.
 *
 * @param credential - Credencial WebAuthn obtenida de navigator.credentials.get()
 * @returns Credencial serializada con formato Base64URL
 * @throws {TryMellonError} Si la credencial no tiene la estructura esperada para autenticación
 */
export function serializeCredentialForAuth(
  credential: PublicKeyCredential
): SerializedCredentialForAuth {
  if (!credential.response) {
    throw createError('UNKNOWN_ERROR', 'Credential response is missing', { credential });
  }

  const response = credential.response;

  if (!isValidCredentialResponse(response)) {
    throw createError('UNKNOWN_ERROR', 'Invalid credential response structure', { response });
  }

  if (!('authenticatorData' in response) || !('signature' in response)) {
    throw createError(
      'UNKNOWN_ERROR',
      'Invalid credential response structure for auth: authenticatorData or signature is missing',
      { response }
    );
  }

  const clientDataJSON = response.clientDataJSON;
  const authenticatorData = (response as AuthenticatorAssertionResponse).authenticatorData;
  const signature = (response as AuthenticatorAssertionResponse).signature;
  const userHandle = (response as AuthenticatorAssertionResponse).userHandle;

  return {
    id: credential.id,
    rawId: base64UrlEncode(credential.rawId),
    response: {
      authenticatorData: base64UrlEncode(authenticatorData),
      clientDataJSON: base64UrlEncode(clientDataJSON),
      signature: base64UrlEncode(signature),
      ...(userHandle && { userHandle: base64UrlEncode(userHandle) }),
    },
    type: 'public-key',
  };
}
