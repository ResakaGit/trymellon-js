import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import type {
  LinkChallengeResult,
  LinkedIdentifier,
  SiweNonceResult,
  SiweVerifyResult,
} from '../../types';
import { isObject, isString, isBoolean, isArray, required, validationError } from './helpers';

export function validateLinkChallengeResult(
  data: unknown
): Result<LinkChallengeResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const identifierId = required(data, 'identifier_id');
  const expiresAt = required(data, 'expires_at');

  if (!isString(identifierId)) {
    return validationError('Invalid API response: identifier_id must be string', {
      field: 'identifier_id',
      originalData: data,
    });
  }
  if (!isString(expiresAt)) {
    return validationError('Invalid API response: expires_at must be string', {
      field: 'expires_at',
      originalData: data,
    });
  }

  return ok({
    identifierId,
    expiresAt,
  });
}

function validateLinkedIdentifierObject(
  item: unknown,
  data: unknown
): Result<LinkedIdentifier, TryMellonError> {
  if (!isObject(item)) {
    return validationError('Invalid API response: identifier must be object', {
      originalData: data,
    });
  }

  const id = required(item, 'id');
  const type = required(item, 'type');
  const value = required(item, 'value');
  const verified = required(item, 'verified');
  const linkedAt = required(item, 'linked_at');

  if (!isString(id)) {
    return validationError('Invalid API response: id must be string', {
      field: 'id',
      originalData: data,
    });
  }
  if (!isString(type) || (type !== 'email' && type !== 'wallet' && type !== 'custom')) {
    return validationError('Invalid API response: type must be email, wallet, or custom', {
      field: 'type',
      originalData: data,
    });
  }
  if (!isString(value)) {
    return validationError('Invalid API response: value must be string', {
      field: 'value',
      originalData: data,
    });
  }
  if (!isBoolean(verified)) {
    return validationError('Invalid API response: verified must be boolean', {
      field: 'verified',
      originalData: data,
    });
  }
  if (!isString(linkedAt)) {
    return validationError('Invalid API response: linked_at must be string', {
      field: 'linked_at',
      originalData: data,
    });
  }

  return ok({
    id,
    type,
    value,
    verified,
    linkedAt,
  });
}

export function validateLinkedIdentifierResponse(
  data: unknown
): Result<LinkedIdentifier, TryMellonError> {
  return validateLinkedIdentifierObject(data, data);
}

export function validateLinkedIdentifierListResponse(
  data: unknown
): Result<LinkedIdentifier[], TryMellonError> {
  if (!isArray(data)) {
    return validationError('Invalid API response: expected array', { originalData: data });
  }

  const results: LinkedIdentifier[] = [];
  for (const item of data) {
    const result = validateLinkedIdentifierObject(item, data);
    if (!result.ok) return result as Result<never, TryMellonError>;
    results.push(result.value);
  }

  return ok(results);
}

export function validateVoidResponse(_data: unknown): Result<void, TryMellonError> {
  return ok(undefined);
}

export function validateSiweNonceResult(data: unknown): Result<SiweNonceResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const nonce = required(data, 'nonce');
  const expiresAt = required(data, 'expires_at');

  if (!isString(nonce)) {
    return validationError('Invalid API response: nonce must be string', {
      field: 'nonce',
      originalData: data,
    });
  }
  if (!isString(expiresAt)) {
    return validationError('Invalid API response: expires_at must be string', {
      field: 'expires_at',
      originalData: data,
    });
  }

  return ok({
    nonce,
    expiresAt,
  });
}

export function validateSiweVerifyResult(data: unknown): Result<SiweVerifyResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const sessionToken = required(data, 'session_token');
  const userId = required(data, 'user_id');
  const walletAddress = required(data, 'wallet_address');

  if (!isString(sessionToken)) {
    return validationError('Invalid API response: session_token must be string', {
      field: 'session_token',
      originalData: data,
    });
  }
  if (!isString(userId)) {
    return validationError('Invalid API response: user_id must be string', {
      field: 'user_id',
      originalData: data,
    });
  }
  if (!isString(walletAddress)) {
    return validationError('Invalid API response: wallet_address must be string', {
      field: 'wallet_address',
      originalData: data,
    });
  }

  return ok({
    sessionToken,
    userId,
    walletAddress,
  });
}
