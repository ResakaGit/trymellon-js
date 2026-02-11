import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
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
} from './helpers';

export function validateRegisterStartResponse(
  data: unknown
): Result<RegisterStartResponse, TryMellonError> {
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

  const rp = required(challenge, 'rp');
  if (
    !isObject(rp) ||
    !isString((rp as Record<string, unknown>).name) ||
    !isString((rp as Record<string, unknown>).id)
  ) {
    return validationError('Invalid API response: challenge.rp must have name and id strings', {
      originalData: data,
    });
  }

  const user = required(challenge, 'user');
  if (
    !isObject(user) ||
    !isString((user as Record<string, unknown>).id) ||
    !isString((user as Record<string, unknown>).name) ||
    !isString((user as Record<string, unknown>).displayName)
  ) {
    return validationError(
      'Invalid API response: challenge.user must have id, name, displayName strings',
      {
        originalData: data,
      }
    );
  }

  const challengeStr = required(challenge, 'challenge');
  if (!isString(challengeStr)) {
    return validationError('Invalid API response: challenge.challenge must be string', {
      originalData: data,
    });
  }

  const pubKeyCredParams = required(challenge, 'pubKeyCredParams');
  if (!isArray(pubKeyCredParams)) {
    return validationError('Invalid API response: challenge.pubKeyCredParams must be array', {
      originalData: data,
    });
  }
  for (const item of pubKeyCredParams) {
    if (
      !isObject(item) ||
      (item as Record<string, unknown>).type !== 'public-key' ||
      !isNumber((item as Record<string, unknown>).alg)
    ) {
      return validationError(
        'Invalid API response: pubKeyCredParams items must have type and alg',
        {
          originalData: data,
        }
      );
    }
  }

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
          {
            originalData: data,
          }
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
      rp: rp as RegisterStartResponse['challenge']['rp'],
      user: user as RegisterStartResponse['challenge']['user'],
      challenge: challengeStr,
      pubKeyCredParams: pubKeyCredParams as RegisterStartResponse['challenge']['pubKeyCredParams'],
      ...(timeout !== undefined && { timeout }),
      ...(excludeCredentials !== undefined && {
        excludeCredentials:
          excludeCredentials as RegisterStartResponse['challenge']['excludeCredentials'],
      }),
      ...(authenticatorSelection !== undefined && {
        authenticatorSelection:
          authenticatorSelection as RegisterStartResponse['challenge']['authenticatorSelection'],
      }),
    },
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
      {
        originalData: data,
      }
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
    credential_id,
    status,
    session_token,
    user: {
      user_id: userId,
      external_user_id: externalUserId,
      ...(email !== undefined && { email }),
      ...(metadata !== undefined && { metadata: metadata as Record<string, unknown> }),
    },
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
      {
        originalData: data,
      }
    );
  }

  if (signals !== undefined && !isObject(signals)) {
    return validationError('Invalid API response: signals must be object', {
      originalData: data,
    });
  }

  return ok({
    authenticated,
    session_token,
    user: {
      user_id: userId,
      external_user_id: externalUserId,
      ...(user.email !== undefined && { email: user.email as string }),
      ...(user.metadata !== undefined && { metadata: user.metadata as Record<string, unknown> }),
    },
    signals: signals as AuthFinishResponse['signals'],
  });
}
