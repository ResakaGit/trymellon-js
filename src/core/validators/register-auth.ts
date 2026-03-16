import type { Result } from '../../utils/result';
import { ok, err } from '../../utils/result';
import type {
  RegisterStartResponse,
  AuthStartResponse,
  RegisterFinishResponse,
  AuthFinishResponse,
} from '../../types';
import type { TryMellonError } from '../../errors';
import {
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  validationError,
  required,
  validateRegisterStartShape,
  validateUserEntity,
} from './helpers';

export function validateRegisterStartResponse(
  data: unknown
): Result<RegisterStartResponse, TryMellonError> {
  const shape = validateRegisterStartShape(data);
  if (!shape.ok) return shape;
  return ok({
    session_id: shape.value.session_id,
    challenge: shape.value.challenge as RegisterStartResponse['challenge'],
  });
}

export function validateAuthStartResponse(
  data: unknown
): Result<AuthStartResponse, TryMellonError> {
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

  const ch = required(challenge, 'challenge');
  const rpId = required(challenge, 'rpId');
  const allowCredentials = challenge.allowCredentials;
  if (!isString(ch)) {
    return validationError('Invalid API response: challenge.challenge must be string', {
      originalData: data,
    });
  }
  if (!isString(rpId)) {
    return validationError('Invalid API response: challenge.rpId must be string', {
      originalData: data,
    });
  }
  if (allowCredentials !== undefined && !isArray(allowCredentials)) {
    return validationError('Invalid API response: allowCredentials must be array', {
      originalData: data,
    });
  }
  if (allowCredentials) {
    for (const c of allowCredentials) {
      if (
        !isObject(c) ||
        (c as Record<string, unknown>).type !== 'public-key' ||
        !isString((c as Record<string, unknown>).id)
      ) {
        return validationError(
          'Invalid API response: allowCredentials items must have id and type',
          {
            originalData: data,
          }
        );
      }
    }
  }

  const timeout = challenge.timeout;
  if (timeout !== undefined && !isNumber(timeout)) {
    return validationError('Invalid API response: challenge.timeout must be number', {
      originalData: data,
    });
  }

  const userVerification = challenge.userVerification;
  if (
    userVerification !== undefined &&
    !['required', 'preferred', 'discouraged'].includes(String(userVerification))
  ) {
    return validationError(
      'Invalid API response: userVerification must be required|preferred|discouraged',
      {
        originalData: data,
      }
    );
  }

  return ok({
    session_id,
    challenge: {
      challenge: ch,
      rpId,
      allowCredentials:
        (allowCredentials as AuthStartResponse['challenge']['allowCredentials']) ?? [],
      ...(timeout !== undefined && { timeout }),
      ...(userVerification !== undefined && {
        userVerification: userVerification as AuthStartResponse['challenge']['userVerification'],
      }),
    },
  });
}

export function validateRegisterFinishResponse(
  data: unknown
): Result<RegisterFinishResponse, TryMellonError> {
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
  const userResult = validateUserEntity(user, data);
  if (!userResult.ok) return err(userResult.error);

  const redirect_url = data.redirect_url;
  if (redirect_url !== undefined && !isString(redirect_url)) {
    return validationError('Invalid API response: redirect_url must be string', {
      originalData: data,
    });
  }

  return ok({
    credential_id,
    status,
    session_token,
    user: userResult.value,
    ...(redirect_url !== undefined && { redirect_url }),
  });
}

export function validateAuthFinishResponse(
  data: unknown
): Result<AuthFinishResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const authenticated = required(data, 'authenticated');
  const session_token = required(data, 'session_token');
  const user = required(data, 'user');
  const signals = required(data, 'signals');

  if (!isBoolean(authenticated)) {
    return validationError('Invalid API response: authenticated must be boolean', {
      field: 'authenticated',
      originalData: data,
    });
  }
  if (!isString(session_token)) {
    return validationError('Invalid API response: session_token must be string', {
      field: 'session_token',
      originalData: data,
    });
  }
  const userResult = validateUserEntity(user, data);
  if (!userResult.ok) return err(userResult.error);

  if (signals !== undefined && !isObject(signals)) {
    return validationError('Invalid API response: signals must be object', {
      originalData: data,
    });
  }

  const redirect_url = data.redirect_url;
  if (redirect_url !== undefined && !isString(redirect_url)) {
    return validationError('Invalid API response: redirect_url must be string', {
      originalData: data,
    });
  }

  return ok({
    authenticated,
    session_token,
    user: userResult.value,
    signals: signals as AuthFinishResponse['signals'],
    ...(redirect_url !== undefined && { redirect_url }),
  });
}
