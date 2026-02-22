import { err, ok, type Result } from '../../utils/result';
import { createError, type TryMellonError } from '../../errors';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function validationError(
  message: string,
  details?: { field?: string; expected?: string; originalData?: unknown }
): Result<never, TryMellonError> {
  return err(
    createError('UNKNOWN_ERROR', message, {
      ...details,
      originalData: details?.originalData,
    })
  );
}

export function required(obj: Record<string, unknown>, key: string): unknown {
  return obj[key];
}

export function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return v === undefined ? undefined : typeof v === 'string' ? v : undefined;
}

// DRY Helpers for common TryMellon objects

export function validateChallengeRP(rp: unknown, data: unknown): Result<true, TryMellonError> {
  if (!isObject(rp) || !isString(rp.name) || !isString(rp.id)) {
    return validationError('Invalid API response: challenge.rp must have name and id strings', {
      originalData: data,
    });
  }
  return ok(true);
}

export function validateChallengeUser(user: unknown, data: unknown): Result<true, TryMellonError> {
  if (
    !isObject(user) ||
    !isString(user.id) ||
    !isString(user.name) ||
    !isString(user.displayName)
  ) {
    return validationError(
      'Invalid API response: challenge.user must have id, name, displayName strings',
      { originalData: data }
    );
  }
  return ok(true);
}

export function validatePubKeyCredParams(
  params: unknown,
  data: unknown
): Result<true, TryMellonError> {
  if (!isArray(params)) {
    return validationError('Invalid API response: challenge.pubKeyCredParams must be array', {
      originalData: data,
    });
  }
  for (const item of params) {
    if (!isObject(item) || item.type !== 'public-key' || !isNumber(item.alg)) {
      return validationError(
        'Invalid API response: pubKeyCredParams items must have type and alg',
        { originalData: data }
      );
    }
  }
  return ok(true);
}

export function validateUserEntity(
  user: unknown,
  data: unknown
): Result<
  { user_id: string; external_user_id: string; email?: string; metadata?: Record<string, unknown> },
  TryMellonError
> {
  if (!isObject(user)) {
    return validationError('Invalid API response: user must be object', {
      field: 'user',
      originalData: data,
    });
  }

  const userId = required(user, 'user_id');
  const externalUserId = required(user, 'external_user_id');
  if (!isString(userId) || !isString(externalUserId)) {
    return validationError(
      'Invalid API response: user must have user_id and external_user_id strings',
      { originalData: data }
    );
  }

  const email = user.email;
  const metadata = user.metadata;
  if (email !== undefined && !isString(email)) {
    return validationError('Invalid API response: user.email must be string', {
      originalData: data,
    });
  }
  if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null)) {
    return validationError('Invalid API response: user.metadata must be object', {
      originalData: data,
    });
  }

  return ok({
    user_id: userId,
    external_user_id: externalUserId,
    ...(email !== undefined && { email }),
    ...(metadata !== undefined && { metadata: metadata as Record<string, unknown> }),
  });
}
