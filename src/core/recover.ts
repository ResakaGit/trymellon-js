import type { ApiClient } from './api';
import type { EventEmitter } from './events';
import type {
  RecoverAccountOptions,
  RecoverAccountResult,
  RecoveryVerifyResponse,
  RegisterStartResponse,
} from '../types';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import type { TryMellonError } from '../errors';
import { createInvalidArgumentError } from '../errors';
import { serializeCredentialForRegister } from './webauthn-utils';
import { createRegistrationOptions } from './webauthn';
import { invokeCeremony } from './ceremony';

/**
 * Recovers an account using an email OTP and creates a new passkey credential.
 * Manages the complete orchestrated WebAuthn registration flow for recovery.
 */
export async function recoverAccount(
  options: RecoverAccountOptions,
  apiClient: ApiClient,
  eventEmitter: EventEmitter
): Promise<Result<RecoverAccountResult, TryMellonError>> {
  const extId = options.externalUserId ?? options.external_user_id;
  if (!extId || typeof extId !== 'string' || extId.trim() === '') {
    const error = createInvalidArgumentError('externalUserId', 'must be a non-empty string');
    eventEmitter.emit('error', { type: 'error', error });
    return err(error);
  }

  if (!options.otp || typeof options.otp !== 'string' || options.otp.trim().length !== 6) {
    const error = createInvalidArgumentError('otp', 'must be a 6-digit string');
    eventEmitter.emit('error', { type: 'error', error });
    return err(error);
  }

  return invokeCeremony<RecoveryVerifyResponse, RecoverAccountResult, CredentialCreationOptions>({
    operation: 'register',
    eventEmitter,
    start: () => apiClient.verifyAccountRecoveryOtp(extId, options.otp),
    createOptions: (startResult) =>
      createRegistrationOptions(startResult.challenge as RegisterStartResponse['challenge']),
    invoke: async (ceremonyOptions) => navigator.credentials.create(ceremonyOptions),
    finish: async (startResult, credential) => {
      const finishResult = await apiClient.completeAccountRecovery(
        startResult.recovery_session_id,
        serializeCredentialForRegister(credential)
      );

      if (!finishResult.ok) return err(finishResult.error);

      const {
        credential_id,
        status,
        session_token,
        user: userPayload,
        redirect_url,
      } = finishResult.value;
      return ok({
        success: true,
        credentialId: credential_id,
        status,
        sessionToken: session_token,
        user: {
          userId: userPayload.user_id,
          externalUserId: userPayload.external_user_id,
          email: userPayload.email,
          metadata: userPayload.metadata,
        },
        ...(redirect_url !== undefined && { redirectUrl: redirect_url }),
      });
    },
  });
}
