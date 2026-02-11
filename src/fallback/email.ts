import type { ApiClient } from '../core/api';
import type { Result } from '../utils/result';
import { err } from '../utils/result';
import { validateNonEmptyString, createInvalidArgumentError, isTryMellonError } from '../errors';
import type { TryMellonError } from '../errors';

export async function startEmailFallback(
  userId: string,
  apiClient: ApiClient
): Promise<Result<void, TryMellonError>> {
  try {
    validateNonEmptyString(userId, 'userId');
  } catch (e) {
    return err(
      isTryMellonError(e) ? e : createInvalidArgumentError('userId', 'must be a non-empty string')
    );
  }
  return apiClient.startEmailFallback(userId);
}

export async function verifyEmailCode(
  userId: string,
  code: string,
  apiClient: ApiClient
): Promise<Result<{ sessionToken: string }, TryMellonError>> {
  try {
    validateNonEmptyString(userId, 'userId');
  } catch (e) {
    return err(
      isTryMellonError(e) ? e : createInvalidArgumentError('userId', 'must be a non-empty string')
    );
  }
  try {
    validateNonEmptyString(code, 'code');
  } catch (e) {
    return err(
      isTryMellonError(e) ? e : createInvalidArgumentError('code', 'must be a non-empty string')
    );
  }
  return apiClient.verifyEmailCode(userId, code);
}
