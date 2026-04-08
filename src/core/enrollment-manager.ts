import type { ApiClient } from './api';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import { createError } from '../errors';
import type { TryMellonError } from '../errors';
import type { EnrollOptions, EnrollmentResult } from '../types';
import type { StorageLike } from './context-hash';
import { getOrCreateContextHash } from './context-hash';
import { createAndSerializeCredentialForRegister } from './webauthn';

export class EnrollmentManager {
  constructor(
    private readonly apiClient: ApiClient,
    private readonly storage?: StorageLike
  ) {}

  async enroll(options: EnrollOptions): Promise<Result<EnrollmentResult, TryMellonError>> {
    if (options.signal?.aborted) {
      return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
    }

    const effectiveStorage =
      this.storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
    const contextHash = getOrCreateContextHash(effectiveStorage);

    const startResult = await this.apiClient.startEnrollment(options.ticketId, contextHash);
    if (!startResult.ok) return err(startResult.error);

    const credentialResult = await createAndSerializeCredentialForRegister(
      startResult.value.challenge,
      options.signal
    );
    if (!credentialResult.ok) return err(credentialResult.error);

    const finishResult = await this.apiClient.finishEnrollment(options.ticketId, {
      credential: credentialResult.value,
      context_hash: contextHash,
    });
    if (!finishResult.ok) return err(finishResult.error);

    return ok({
      sessionToken: finishResult.value.session_token,
      credentialId: finishResult.value.credential_id,
      userId: finishResult.value.user_id,
      ...(finishResult.value.entity_id !== undefined && { entityId: finishResult.value.entity_id }),
    });
  }
}
