import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import { isObject, isString, required, validationError } from './helpers';

export function validateEmailVerifyResponse(
  data: unknown
): Result<{ sessionToken: string }, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const sessionToken = required(data, 'sessionToken');
  if (!isString(sessionToken)) {
    return validationError('Invalid API response: sessionToken must be string', {
      field: 'sessionToken',
      originalData: data,
    });
  }

  return ok({ sessionToken });
}
