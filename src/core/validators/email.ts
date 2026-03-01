import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import { isObject, isString, validationError } from './helpers';

export function validateEmailVerifyResponse(
  data: unknown
): Result<{ sessionToken: string; redirectUrl?: string }, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const raw =
    (data as Record<string, unknown>).session_token ??
    (data as Record<string, unknown>).sessionToken;
  if (!isString(raw)) {
    return validationError('Invalid API response: session_token/sessionToken must be string', {
      field: 'session_token',
      originalData: data,
    });
  }

  const redirect_url = (data as Record<string, unknown>).redirect_url;
  if (redirect_url !== undefined && !isString(redirect_url)) {
    return validationError('Invalid API response: redirect_url must be string', {
      originalData: data,
    });
  }

  return ok({
    sessionToken: raw,
    ...(redirect_url !== undefined && { redirectUrl: redirect_url }),
  });
}
