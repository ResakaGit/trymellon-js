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

export function validateEnrollmentFinishResponse(
  data: unknown
): Result<EnrollmentFinishResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const credential_id = required(data, 'credential_id');
  const user_id = required(data, 'user_id');
  const session_token = required(data, 'session_token');

  if (!isString(credential_id)) {
    return validationError('Invalid API response: credential_id must be string', {
      field: 'credential_id',
      originalData: data,
    });
  }
  if (!isString(user_id)) {
    return validationError('Invalid API response: user_id must be string', {
      field: 'user_id',
      originalData: data,
    });
  }
  if (!isString(session_token)) {
    return validationError('Invalid API response: session_token must be string', {
      field: 'session_token',
      originalData: data,
    });
  }

  const entity_id = data.entity_id;
  if (entity_id !== undefined && !isString(entity_id)) {
    return validationError('Invalid API response: entity_id must be string when present', {
      field: 'entity_id',
      originalData: data,
    });
  }

  return ok({
    credential_id,
    user_id,
    session_token,
    ...(isString(entity_id) && { entity_id }),
  });
}
