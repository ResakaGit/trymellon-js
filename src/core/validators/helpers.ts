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

/**
 * Parsed shape of a "register start" challenge (shared by register and enrollment validators).
 * Single source of truth for the validation sequence; avoids duplicating challenge validation.
 */
export interface ParsedRegisterChallengeShape {
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  timeout?: number;
  excludeCredentials?: Array<{ type: string; id: string }>;
  authenticatorSelection?: Record<string, unknown>;
}

/**
 * Pure, stateless validation of "start response with register challenge".
 * Used by validateRegisterStartResponse and validateEnrollmentStartResponse (DRY).
 */
export function validateRegisterStartShape(
  data: unknown
): Result<{ session_id: string; challenge: ParsedRegisterChallengeShape }, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const session_id = required(data, 'session_id');
  if (!isString(session_id)) {
    return validationError('Invalid API response: session_id must be string', {
      field: 'session_id',
      originalData: data,
    });
  }

  const challenge = required(data, 'challenge');
  if (!isObject(challenge)) {
    return validationError('Invalid API response: challenge must be object', {
      field: 'challenge',
      originalData: data,
    });
  }

  const rpResult = validateChallengeRP(required(challenge, 'rp'), data);
  if (!rpResult.ok) return rpResult;

  const userResult = validateChallengeUser(required(challenge, 'user'), data);
  if (!userResult.ok) return userResult;

  const challengeStr = required(challenge, 'challenge');
  if (!isString(challengeStr)) {
    return validationError('Invalid API response: challenge.challenge must be string', {
      originalData: data,
    });
  }

  const pubKeyCredParamsResult = validatePubKeyCredParams(
    required(challenge, 'pubKeyCredParams'),
    data
  );
  if (!pubKeyCredParamsResult.ok) return pubKeyCredParamsResult;

  const timeout = challenge.timeout;
  if (timeout !== undefined && !isNumber(timeout)) {
    return validationError('Invalid API response: challenge.timeout must be number', {
      originalData: data,
    });
  }

  const excludeCredentials = challenge.excludeCredentials;
  if (excludeCredentials !== undefined) {
    if (!isArray(excludeCredentials)) {
      return validationError('Invalid API response: excludeCredentials must be array', {
        originalData: data,
      });
    }
    for (const c of excludeCredentials) {
      if (
        !isObject(c) ||
        (c as Record<string, unknown>).type !== 'public-key' ||
        !isString((c as Record<string, unknown>).id)
      ) {
        return validationError(
          'Invalid API response: excludeCredentials items must have id and type',
          { originalData: data }
        );
      }
    }
  }

  const authenticatorSelection = challenge.authenticatorSelection;
  if (authenticatorSelection !== undefined && !isObject(authenticatorSelection)) {
    return validationError('Invalid API response: authenticatorSelection must be object', {
      originalData: data,
    });
  }

  return ok({
    session_id,
    challenge: {
      rp: challenge.rp as ParsedRegisterChallengeShape['rp'],
      user: challenge.user as ParsedRegisterChallengeShape['user'],
      challenge: challengeStr,
      pubKeyCredParams:
        challenge.pubKeyCredParams as ParsedRegisterChallengeShape['pubKeyCredParams'],
      ...(timeout !== undefined && { timeout }),
      ...(excludeCredentials !== undefined && {
        excludeCredentials:
          excludeCredentials as ParsedRegisterChallengeShape['excludeCredentials'],
      }),
      ...(authenticatorSelection !== undefined && {
        authenticatorSelection,
      }),
    },
  });
}

export function validateUserEntity(
  user: unknown,
  data: unknown
): Result<
  {
    user_id: string;
    external_user_id: string | null;
    email?: string;
    metadata?: Record<string, unknown>;
    is_anonymous?: boolean;
  },
  TryMellonError
> {
  if (!isObject(user)) {
    return validationError('Invalid API response: user must be object', {
      field: 'user',
      originalData: data,
    });
  }

  const userId = required(user, 'user_id');
  if (!isString(userId)) {
    return validationError('Invalid API response: user.user_id must be string', {
      originalData: data,
    });
  }

  const externalUserIdRaw = user.external_user_id;
  if (externalUserIdRaw !== null && !isString(externalUserIdRaw)) {
    return validationError('Invalid API response: user.external_user_id must be string or null', {
      originalData: data,
    });
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

  const isAnonymous = user.is_anonymous;
  if (isAnonymous !== undefined && !isBoolean(isAnonymous)) {
    return validationError('Invalid API response: user.is_anonymous must be boolean', {
      originalData: data,
    });
  }

  return ok({
    user_id: userId,
    external_user_id: externalUserIdRaw as string | null,
    ...(email !== undefined && { email }),
    ...(metadata !== undefined && { metadata: metadata as Record<string, unknown> }),
    ...(isAnonymous !== undefined && { is_anonymous: isAnonymous }),
  });
}
