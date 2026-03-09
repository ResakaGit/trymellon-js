import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type { RecoveryVerifyResponse, RecoveryCompleteResponse } from '../../types';
import type { TryMellonError } from '../../errors';
import { isObject, isString, required, validationError } from './helpers';

export function validateRecoveryVerifyResponse(
  data: unknown
): Result<RecoveryVerifyResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const challenge = required(data, 'challenge');
  const recovery_session_id = required(data, 'recovery_session_id');

  if (!isObject(challenge)) {
    return validationError('Invalid API response: challenge must be object', {
      field: 'challenge',
      originalData: data,
    });
  }

  if (!isString(recovery_session_id)) {
    return validationError('Invalid API response: recovery_session_id must be string', {
      field: 'recovery_session_id',
      originalData: data,
    });
  }

  return ok({
    challenge: challenge as Record<string, unknown>,
    recovery_session_id,
  });
}

export function validateRecoveryCompleteResponse(
  data: unknown
): Result<RecoveryCompleteResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const status = required(data, 'status');
  const session_token = required(data, 'session_token');
  const user = required(data, 'user');
  const credential_id = required(data, 'credential_id');

  if (!isString(status)) {
    return validationError('Invalid API response: status must be string', {
      field: 'status',
      originalData: data,
    });
  }

  if (!isString(session_token)) {
    return validationError('Invalid API response: session_token must be string', {
      field: 'session_token',
      originalData: data,
    });
  }

  if (!isString(credential_id)) {
    return validationError('Invalid API response: credential_id must be string', {
      field: 'credential_id',
      originalData: data,
    });
  }

  if (!isObject(user)) {
    return validationError('Invalid API response: user must be object', {
      field: 'user',
      originalData: data,
    });
  }

  const user_id = required(user, 'user_id');
  if (!isString(user_id)) {
    return validationError('Invalid API response: user.user_id must be string', {
      field: 'user.user_id',
      originalData: data,
    });
  }

  const dataObj = data as Record<string, unknown>;
  const redirect_url = dataObj.redirect_url;
  if (redirect_url !== undefined && !isString(redirect_url)) {
    return validationError('Invalid API response: redirect_url must be string', {
      field: 'redirect_url',
      originalData: data,
    });
  }

  const userObj = user as Record<string, unknown>;
  return ok({
    status,
    session_token,
    credential_id,
    user: {
      user_id,
      external_user_id: isString(userObj.external_user_id) ? userObj.external_user_id : undefined,
      email: isString(userObj.email) ? userObj.email : undefined,
      metadata: isObject(userObj.metadata)
        ? (userObj.metadata as Record<string, unknown>)
        : undefined,
    },
    ...(redirect_url !== undefined && { redirect_url }),
  });
}
