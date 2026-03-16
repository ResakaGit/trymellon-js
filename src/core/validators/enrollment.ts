import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type { EnrollmentStartResponse, EnrollmentFinishResponse } from '../../types';
import type { TryMellonError } from '../../errors';
import {
  isObject,
  isString,
  required,
  validationError,
  validateRegisterStartShape,
} from './helpers';

export function validateEnrollmentStartResponse(
  data: unknown
): Result<EnrollmentStartResponse, TryMellonError> {
  const shape = validateRegisterStartShape(data);
  if (!shape.ok) return shape;
  return ok({
    session_id: shape.value.session_id,
    challenge: shape.value.challenge as EnrollmentStartResponse['challenge'],
  });
}

function validateEnrollmentUser(
  user: unknown,
  data: unknown
): Result<EnrollmentFinishResponse['user'], TryMellonError> {
  if (!isObject(user)) {
    return validationError('Invalid API response: user must be object', {
      field: 'user',
      originalData: data,
    });
  }
  const user_id = required(user, 'user_id');
  if (!isString(user_id)) {
    return validationError('Invalid API response: user.user_id must be string', {
      originalData: data,
    });
  }
  const external_user_id = user.external_user_id;
  if (external_user_id !== undefined && !isString(external_user_id)) {
    return validationError('Invalid API response: user.external_user_id must be string', {
      originalData: data,
    });
  }
  const email = user.email;
  if (email !== undefined && !isString(email)) {
    return validationError('Invalid API response: user.email must be string', {
      originalData: data,
    });
  }
  const metadata = user.metadata;
  if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null)) {
    return validationError('Invalid API response: user.metadata must be object', {
      originalData: data,
    });
  }
  return ok({
    user_id,
    ...(external_user_id !== undefined && { external_user_id }),
    ...(email !== undefined && { email }),
    ...(metadata !== undefined && { metadata: metadata as Record<string, unknown> }),
  });
}

export function validateEnrollmentFinishResponse(
  data: unknown
): Result<EnrollmentFinishResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const credential_id = required(data, 'credential_id');
  const status = required(data, 'status');
  const session_token = required(data, 'session_token');
  const user = required(data, 'user');

  if (!isString(credential_id)) {
    return validationError('Invalid API response: credential_id must be string', {
      field: 'credential_id',
      originalData: data,
    });
  }
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
  const userResult = validateEnrollmentUser(user, data);
  if (!userResult.ok) return userResult;

  return ok({
    credential_id,
    status,
    session_token,
    user: userResult.value,
  });
}
