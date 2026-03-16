import { ok } from '../../utils/result';
import type { Result } from '../../utils/result';
import type { TryMellonError } from '../../errors';
import type {
  BridgeContextResponse,
  BridgeChallengeResponse,
  BridgeCompleteEnrollmentResult,
  BridgeCompleteAuthResult,
  BridgeStatusSnapshot,
} from '../../types';
import { isObject, isString, required, validationError } from './helpers';

const BRIDGE_STATUS_VALUES = ['pending', 'pin_verified', 'pin_locked', 'completed'] as const;

// ---------------------------------------------------------------------------
// Validators (backend: bridge.schemas.ts)
// ---------------------------------------------------------------------------

export function validateBridgeContextResponse(
  data: unknown
): Result<BridgeContextResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid bridge context response: expected object', {
      originalData: data,
    });
  }

  const typeVal = required(data, 'type');
  if (typeVal !== 'auth' && typeVal !== 'registration') {
    return validationError(
      'Invalid bridge context response: type must be "auth" or "registration"',
      { field: 'type', expected: 'auth | registration', originalData: data }
    );
  }

  const options = required(data, 'options');
  if (!isObject(options)) {
    return validationError('Invalid bridge context response: options must be object', {
      field: 'options',
      originalData: data,
    });
  }

  const application_name = data.application_name;
  if (application_name !== undefined && !isString(application_name)) {
    return validationError('Invalid bridge context response: application_name must be string', {
      field: 'application_name',
      originalData: data,
    });
  }

  return ok({
    type: typeVal,
    options,
    ...(application_name !== undefined && { application_name }),
  });
}

export function validateBridgeVerifyResponse(
  data: unknown
): Result<BridgeChallengeResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid bridge verify response: expected object', {
      originalData: data,
    });
  }

  const session_id = required(data, 'session_id');
  if (!isString(session_id) || session_id.trim() === '') {
    return validationError(
      'Invalid bridge verify response: session_id must be non-empty string (UUID expected)',
      { field: 'session_id', originalData: data }
    );
  }

  const challenge = data.challenge;
  if (challenge !== undefined && !isString(challenge)) {
    return validationError(
      'Invalid bridge verify response: challenge must be string when present',
      {
        field: 'challenge',
        originalData: data,
      }
    );
  }

  const registration_options = data.registration_options;
  if (registration_options !== undefined && !isObject(registration_options)) {
    return validationError(
      'Invalid bridge verify response: registration_options must be object when present',
      { field: 'registration_options', originalData: data }
    );
  }

  const authentication_options = data.authentication_options;
  if (authentication_options !== undefined && !isObject(authentication_options)) {
    return validationError(
      'Invalid bridge verify response: authentication_options must be object when present',
      { field: 'authentication_options', originalData: data }
    );
  }

  return ok({
    session_id,
    ...(challenge !== undefined && { challenge }),
    ...(registration_options !== undefined && { registration_options }),
    ...(authentication_options !== undefined && { authentication_options }),
  });
}

export function validateBridgeCompleteEnrollmentResponse(
  data: unknown
): Result<BridgeCompleteEnrollmentResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid bridge complete enrollment response: expected object', {
      originalData: data,
    });
  }

  const credential_id = required(data, 'credential_id');
  const entity_id = required(data, 'entity_id');
  const user_id = required(data, 'user_id');
  const session_token = required(data, 'session_token');

  if (!isString(credential_id)) {
    return validationError(
      'Invalid bridge complete enrollment response: credential_id must be string',
      { field: 'credential_id', originalData: data }
    );
  }
  if (!isString(entity_id)) {
    return validationError(
      'Invalid bridge complete enrollment response: entity_id must be string',
      { field: 'entity_id', originalData: data }
    );
  }
  if (!isString(user_id)) {
    return validationError('Invalid bridge complete enrollment response: user_id must be string', {
      field: 'user_id',
      originalData: data,
    });
  }
  if (!isString(session_token)) {
    return validationError(
      'Invalid bridge complete enrollment response: session_token must be string',
      { field: 'session_token', originalData: data }
    );
  }

  return ok({ credential_id, entity_id, user_id, session_token });
}

export function validateBridgeCompleteAuthResponse(
  data: unknown
): Result<BridgeCompleteAuthResult, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid bridge complete auth response: expected object', {
      originalData: data,
    });
  }

  const session_token = required(data, 'session_token');
  if (!isString(session_token)) {
    return validationError('Invalid bridge complete auth response: session_token must be string', {
      field: 'session_token',
      originalData: data,
    });
  }

  return ok({ session_token });
}

export function validateBridgeStatusResponse(
  data: unknown
): Result<BridgeStatusSnapshot, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid bridge status response: expected object', {
      originalData: data,
    });
  }

  const status = required(data, 'status');
  if (
    typeof status !== 'string' ||
    !BRIDGE_STATUS_VALUES.includes(status as BridgeStatusSnapshot['status'])
  ) {
    return validationError(
      'Invalid bridge status response: status must be one of pending, pin_verified, pin_locked, completed',
      { field: 'status', originalData: data }
    );
  }

  const ts = data.ts;
  if (ts !== undefined && !isString(ts)) {
    return validationError('Invalid bridge status response: ts must be string when present', {
      field: 'ts',
      originalData: data,
    });
  }

  return ok({
    status: status as BridgeStatusSnapshot['status'],
    ...(ts !== undefined && { ts }),
  });
}
