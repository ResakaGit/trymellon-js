import { createError } from '../errors';
import { base64UrlEncode } from '../utils/base64url';
import type { RegisterFinishRequest, AuthFinishRequest } from '../types';

type SerializedCredentialForRegister = RegisterFinishRequest['credential'];
type SerializedCredentialForAuth = AuthFinishRequest['credential'];

/**
 * Type guard to verify whether a credential response is valid.
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
 * Serializes a credential for registration (finish).
 * Includes attestationObject required for registration verification.
 *
 * @param credential - WebAuthn credential from navigator.credentials.create()
 * @returns Serialized credential in Base64URL format
 * @throws {TryMellonError} If the credential does not have the expected structure for registration
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
 * Serializes a credential for authentication (finish).
 * Includes authenticatorData, signature, and optionally userHandle.
 *
 * @param credential - WebAuthn credential from navigator.credentials.get()
 * @returns Serialized credential in Base64URL format
 * @throws {TryMellonError} If the credential does not have the expected structure for authentication
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
