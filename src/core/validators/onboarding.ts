import type { Result } from '../../utils/result';
import { ok } from '../../utils/result';
import type {
  OnboardingStartResponse,
  OnboardingStatusResponse,
  OnboardingRegisterResponse,
  OnboardingRegisterPasskeyResponse,
  OnboardingCompleteResponse,
  RegisterStartResponse,
} from '../../types';
import type { TryMellonError } from '../../errors';
import { isObject, isString, isNumber, isArray, required, validationError } from './helpers';

const ONBOARDING_STATUSES = ['pending_passkey', 'pending_data', 'completed'] as const;
const REGISTER_PASSKEY_STATUSES = ['pending_data', 'completed'] as const;

export function validateOnboardingStartResponse(
  data: unknown
): Result<OnboardingStartResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const session_id = required(data, 'session_id');
  const onboarding_url = required(data, 'onboarding_url');
  const expires_in = required(data, 'expires_in');

  if (!isString(session_id)) {
    return validationError('Invalid API response: session_id must be string', {
      field: 'session_id',
      originalData: data,
    });
  }
  if (!isString(onboarding_url)) {
    return validationError('Invalid API response: onboarding_url must be string', {
      field: 'onboarding_url',
      originalData: data,
    });
  }
  if (!isNumber(expires_in)) {
    return validationError('Invalid API response: expires_in must be number', {
      field: 'expires_in',
      originalData: data,
    });
  }

  return ok({ session_id, onboarding_url, expires_in });
}

export function validateOnboardingStatusResponse(
  data: unknown
): Result<OnboardingStatusResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const status = required(data, 'status');
  const onboarding_url = required(data, 'onboarding_url');
  const expires_in = required(data, 'expires_in');

  if (
    !isString(status) ||
    !ONBOARDING_STATUSES.includes(status as (typeof ONBOARDING_STATUSES)[number])
  ) {
    return validationError(
      'Invalid API response: status must be pending_passkey|pending_data|completed',
      {
        field: 'status',
        originalData: data,
      }
    );
  }
  if (!isString(onboarding_url)) {
    return validationError('Invalid API response: onboarding_url must be string', {
      originalData: data,
    });
  }
  if (!isNumber(expires_in)) {
    return validationError('Invalid API response: expires_in must be number', {
      originalData: data,
    });
  }

  return ok({
    status: status as OnboardingStatusResponse['status'],
    onboarding_url,
    expires_in,
  });
}

/** Response may include optional challenge for same-device passkey registration */
export type OnboardingRegisterResponseWithChallenge = OnboardingRegisterResponse & {
  challenge?: RegisterStartResponse['challenge'];
};

export function validateOnboardingRegisterResponse(
  data: unknown
): Result<OnboardingRegisterResponseWithChallenge, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const session_id = required(data, 'session_id');
  const status = required(data, 'status');
  const onboarding_url = required(data, 'onboarding_url');

  if (!isString(session_id)) {
    return validationError('Invalid API response: session_id must be string', {
      field: 'session_id',
      originalData: data,
    });
  }
  if (status !== 'pending_passkey') {
    return validationError('Invalid API response: status must be pending_passkey', {
      field: 'status',
      originalData: data,
    });
  }
  if (!isString(onboarding_url)) {
    return validationError('Invalid API response: onboarding_url must be string', {
      originalData: data,
    });
  }

  const challenge = data.challenge;
  let parsedChallenge: RegisterStartResponse['challenge'] | undefined;
  if (challenge !== undefined) {
    const chResult = validateOnboardingChallenge(challenge);
    if (!chResult.ok) return chResult;
    parsedChallenge = chResult.value;
  }

  return ok({
    session_id,
    status: 'pending_passkey',
    onboarding_url,
    ...(parsedChallenge !== undefined && { challenge: parsedChallenge }),
  });
}

function validateOnboardingChallenge(
  data: unknown
): Result<RegisterStartResponse['challenge'], TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: challenge must be object', {
      originalData: data,
    });
  }

  const rp = required(data, 'rp');
  const user = required(data, 'user');
  const challengeStr = required(data, 'challenge');
  const pubKeyCredParams = required(data, 'pubKeyCredParams');

  if (
    !isObject(rp) ||
    !isString((rp as Record<string, unknown>).name) ||
    !isString((rp as Record<string, unknown>).id)
  ) {
    return validationError('Invalid API response: challenge.rp must have name and id', {
      originalData: data,
    });
  }
  if (
    !isObject(user) ||
    !isString((user as Record<string, unknown>).id) ||
    !isString((user as Record<string, unknown>).name) ||
    !isString((user as Record<string, unknown>).displayName)
  ) {
    return validationError('Invalid API response: challenge.user must have id, name, displayName', {
      originalData: data,
    });
  }
  if (!isString(challengeStr)) {
    return validationError('Invalid API response: challenge.challenge must be string', {
      originalData: data,
    });
  }
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

  return ok({
    rp: rp as RegisterStartResponse['challenge']['rp'],
    user: user as RegisterStartResponse['challenge']['user'],
    challenge: challengeStr,
    pubKeyCredParams: pubKeyCredParams as RegisterStartResponse['challenge']['pubKeyCredParams'],
  });
}

export function validateOnboardingRegisterPasskeyResponse(
  data: unknown
): Result<OnboardingRegisterPasskeyResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const session_id = required(data, 'session_id');
  const status = required(data, 'status');
  const user_id = required(data, 'user_id');
  const tenant_id = required(data, 'tenant_id');

  if (!isString(session_id)) {
    return validationError('Invalid API response: session_id must be string', {
      originalData: data,
    });
  }
  if (
    !isString(status) ||
    !REGISTER_PASSKEY_STATUSES.includes(status as (typeof REGISTER_PASSKEY_STATUSES)[number])
  ) {
    return validationError('Invalid API response: status must be pending_data|completed', {
      originalData: data,
    });
  }
  if (!isString(user_id)) {
    return validationError('Invalid API response: user_id must be string', {
      originalData: data,
    });
  }
  if (!isString(tenant_id)) {
    return validationError('Invalid API response: tenant_id must be string', {
      originalData: data,
    });
  }

  return ok({
    session_id,
    status: status as OnboardingRegisterPasskeyResponse['status'],
    user_id,
    tenant_id,
  });
}

export function validateOnboardingCompleteResponse(
  data: unknown
): Result<OnboardingCompleteResponse, TryMellonError> {
  if (!isObject(data)) {
    return validationError('Invalid API response: expected object', { originalData: data });
  }

  const session_id = required(data, 'session_id');
  const status = required(data, 'status');
  const user_id = required(data, 'user_id');
  const tenant_id = required(data, 'tenant_id');
  const session_token = required(data, 'session_token');

  if (!isString(session_id)) {
    return validationError('Invalid API response: session_id must be string', {
      originalData: data,
    });
  }
  if (status !== 'completed') {
    return validationError('Invalid API response: status must be completed', {
      originalData: data,
    });
  }
  if (!isString(user_id) || !isString(tenant_id) || !isString(session_token)) {
    return validationError(
      'Invalid API response: user_id, tenant_id, session_token must be strings',
      { originalData: data }
    );
  }

  return ok({
    session_id,
    status: 'completed',
    user_id,
    tenant_id,
    session_token,
  });
}
