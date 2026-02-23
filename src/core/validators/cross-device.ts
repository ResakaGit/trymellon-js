import { ok } from '../../utils/result';
import type { Result } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import { isObject, isString, validationError } from './helpers';
import type {
  CrossDeviceInitResult,
  CrossDeviceStatusResult,
  CrossDeviceContextResult,
} from '../../types';

function isCreationOptionsShape(opts: unknown): opts is Record<string, unknown> {
  if (!opts || typeof opts !== 'object') return false;
  const o = opts as Record<string, unknown>;
  return (
    typeof o.challenge === 'string' &&
    o.rp != null &&
    typeof o.rp === 'object' &&
    o.user != null &&
    typeof o.user === 'object' &&
    Array.isArray((o as { pubKeyCredParams?: unknown }).pubKeyCredParams)
  );
}

function isRequestOptionsShape(opts: unknown): opts is Record<string, unknown> {
  if (!opts || typeof opts !== 'object') return false;
  const o = opts as Record<string, unknown>;
  return typeof o.challenge === 'string' && typeof o.rpId === 'string';
}

/**
 * Accepts either the unwrapped payload { session_id, qr_url, expires_at } or the fintech
 * envelope { ok: true, resultado: { session_id, qr_url, expires_at } } so the flow works
 * regardless of whether the fetch-client unwraps before calling this validator.
 */
export function validateCrossDeviceInitResponse(
  data: unknown
): Result<CrossDeviceInitResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const payload =
    'resultado' in data && isObject((data as { resultado: unknown }).resultado)
      ? (data as { resultado: Record<string, unknown> }).resultado
      : data;

  const session_id = payload.session_id;
  const qr_url = payload.qr_url;
  const expires_at = payload.expires_at;

  if (!isString(session_id) || !isString(qr_url) || !isString(expires_at)) {
    return validationError('Invalid API response: missing required fields', { originalData: data });
  }

  return ok({
    session_id,
    qr_url,
    expires_at,
  });
}

export function validateCrossDeviceStatusResponse(
  data: unknown
): Result<CrossDeviceStatusResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const status = data.status;
  if (!isString(status) || !['pending', 'authenticated', 'completed'].includes(status)) {
    return validationError('Invalid API response: invalid status', { originalData: data });
  }

  return ok({
    status: status as CrossDeviceStatusResult['status'],
    user_id: data.user_id as string | undefined,
    session_token: data.session_token as string | undefined,
  });
}

export function validateCrossDeviceContextResponse(
  data: unknown
): Result<CrossDeviceContextResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const rawType = data.type;
  const type =
    rawType === 'registration' ? 'registration' : rawType === 'auth' ? 'auth' : ('auth' as const);

  const options = data.options;
  if (!isObject(options)) {
    return validationError('Invalid API response: options are required', { originalData: data });
  }

  if (type === 'registration') {
    if (!isCreationOptionsShape(options)) {
      return validationError(
        'Invalid API response: registration options must have challenge, rp, user, pubKeyCredParams',
        { originalData: data }
      );
    }
    return ok({
      type: 'registration',
      options,
    } as CrossDeviceContextResult);
  }

  if (!isRequestOptionsShape(options)) {
    return validationError('Invalid API response: auth options must have challenge and rpId', {
      originalData: data,
    });
  }
  return ok({ type: 'auth', options } as CrossDeviceContextResult);
}
