import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type { SessionValidateResponse } from '../../types';
import type { TryMellonError } from '../../errors';
import { isObject, isString, isBoolean, required, validationError } from './helpers';

export function validateSessionValidateResponse(
  data: unknown
): Result<SessionValidateResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const valid = required(data, 'valid');
  const user_id = required(data, 'user_id');
  const external_user_id = required(data, 'external_user_id');
  const tenant_id = required(data, 'tenant_id');
  const app_id = required(data, 'app_id');

  if (!isBoolean(valid)) {
    return validationError('Invalid API response: valid must be boolean', {
      field: 'valid',
      originalData: data,
    });
  }
  if (!isString(user_id)) {
    return validationError('Invalid API response: user_id must be string', {
      field: 'user_id',
      originalData: data,
    });
  }
  if (!isString(external_user_id)) {
    return validationError('Invalid API response: external_user_id must be string', {
      field: 'external_user_id',
      originalData: data,
    });
  }
  if (!isString(tenant_id)) {
    return validationError('Invalid API response: tenant_id must be string', {
      field: 'tenant_id',
      originalData: data,
    });
  }
  if (!isString(app_id)) {
    return validationError('Invalid API response: app_id must be string', {
      field: 'app_id',
      originalData: data,
    });
  }

  return ok({
    valid,
    userId: user_id,
    externalUserId: external_user_id,
    tenantId: tenant_id,
    appId: app_id,
  });
}
