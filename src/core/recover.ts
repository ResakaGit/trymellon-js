import { isWebAuthnSupported } from '../utils/support';
import { mapWebAuthnError, createNotSupportedError, createInvalidArgumentError } from '../errors';
import { validateCredentialStructure } from '../utils/validation';
import type { ApiClient } from './api';
import type { EventEmitter } from './events';
import type { RecoverAccountOptions, RecoverAccountResult, RegisterStartResponse } from '../types';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import type { TryMellonError } from '../errors';
import { serializeCredentialForRegister } from './webauthn-utils';
import { createRegistrationOptions } from './webauthn';

/**
 * Recovers an account using an email OTP and creates a new passkey credential.
 * Manages the complete orchestrated WebAuthn registration flow for recovery.
 */
export async function recoverAccount(
  options: RecoverAccountOptions,
  apiClient: ApiClient,
  eventEmitter: EventEmitter
): Promise<Result<RecoverAccountResult, TryMellonError>> {
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

    if (!options.otp || typeof options.otp !== 'string' || options.otp.trim().length !== 6) {
      const error = createInvalidArgumentError('otp', 'must be a 6-digit string');
      eventEmitter.emit('error', { type: 'error', error });
      return err(error);
    }

    // 1. Verify OTP and get challenge from server
    const verifyResult = await apiClient.verifyAccountRecoveryOtp(extId, options.otp);

    if (!verifyResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: verifyResult.error });
      return err(verifyResult.error);
    }

    // 2. Create credential creation options for device rotation
    // Note: TypeScript expects a specific structure for challenge but our API returns Record<string, unknown>
    // We cast it to the correct shape expected by createRegistrationOptions
    const creationOptionsResult = createRegistrationOptions(
      verifyResult.value.challenge as RegisterStartResponse['challenge']
    );

    if (!creationOptionsResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: creationOptionsResult.error });
      return err(creationOptionsResult.error);
    }

    const creationOptions = {
      ...creationOptionsResult.value,
    };

    // 3. Request navigator to create the credential
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

    // 4. Complete recovery and save the new credential in the server
    const finishResult = await apiClient.completeAccountRecovery(
      verifyResult.value.recovery_session_id,
      serializeCredentialForRegister(credential)
    );

    if (!finishResult.ok) {
      eventEmitter.emit('error', { type: 'error', error: finishResult.error });
      return err(finishResult.error);
    }

    const result: RecoverAccountResult = {
      success: true,
      credentialId: finishResult.value.credential_id,
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
