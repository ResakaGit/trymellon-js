import { ok, type Result } from '../../utils/result';
import { type TryMellonError } from '../../errors';
import { isObject, isString, isArray, isNumber, validationError } from './helpers';
import type { IssueActionChallengeResponse, VerifyActionSignatureResponse } from '../../types';

const VALID_USER_VERIFICATION = ['required', 'preferred', 'discouraged'] as const;

/**
 * Validates the response from POST /v1/actions/challenges.
 * Pure — no I/O. Returns Result; never throws.
 */
export function validateIssueActionChallengeResponse(
  raw: unknown
): Result<IssueActionChallengeResponse, TryMellonError> {
  if (!isObject(raw)) {
    return validationError('Invalid API response: expected object', { originalData: raw });
  }

  const challenge_id = raw.challenge_id;
  if (!isString(challenge_id) || challenge_id.trim() === '') {
    return validationError('Invalid API response: challenge_id must be a non-empty string', {
      field: 'challenge_id',
      originalData: raw,
    });
  }

  const expires_at = raw.expires_at;
  if (!isString(expires_at) || expires_at.trim() === '') {
    return validationError('Invalid API response: expires_at must be a non-empty string', {
      field: 'expires_at',
      originalData: raw,
    });
  }

  const opts = raw.webauthn_options;
  if (!isObject(opts)) {
    return validationError('Invalid API response: webauthn_options must be an object', {
      field: 'webauthn_options',
      originalData: raw,
    });
  }

  const challenge = opts.challenge;
  if (!isString(challenge) || challenge.trim() === '') {
    return validationError(
      'Invalid API response: webauthn_options.challenge must be a non-empty string',
      { field: 'webauthn_options.challenge', originalData: raw }
    );
  }

  const rpId = opts.rpId;
  if (!isString(rpId) || rpId.trim() === '') {
    return validationError(
      'Invalid API response: webauthn_options.rpId must be a non-empty string',
      { field: 'webauthn_options.rpId', originalData: raw }
    );
  }

  const allowCredentials = opts.allowCredentials;
  if (allowCredentials !== undefined) {
    if (!isArray(allowCredentials)) {
      return validationError(
        'Invalid API response: webauthn_options.allowCredentials must be an array',
        { originalData: raw }
      );
    }
    for (const c of allowCredentials) {
      if (
        !isObject(c) ||
        !isString((c as Record<string, unknown>).id) ||
        (c as Record<string, unknown>).type !== 'public-key'
      ) {
        return validationError(
          'Invalid API response: allowCredentials items must have id (string) and type (public-key)',
          { originalData: raw }
        );
      }
    }
  }

  const timeout = opts.timeout;
  if (timeout !== undefined && !isNumber(timeout)) {
    return validationError('Invalid API response: webauthn_options.timeout must be a number', {
      originalData: raw,
    });
  }

  const userVerification = opts.userVerification;
  if (
    userVerification !== undefined &&
    (!isString(userVerification) ||
      !VALID_USER_VERIFICATION.includes(
        userVerification as (typeof VALID_USER_VERIFICATION)[number]
      ))
  ) {
    return validationError(
      'Invalid API response: webauthn_options.userVerification must be required | preferred | discouraged',
      { originalData: raw }
    );
  }

  return ok({
    challenge_id,
    expires_at,
    webauthn_options: {
      challenge,
      rpId,
      ...(allowCredentials !== undefined && {
        allowCredentials:
          allowCredentials as IssueActionChallengeResponse['webauthn_options']['allowCredentials'],
      }),
      ...(timeout !== undefined && { timeout }),
      ...(userVerification !== undefined && {
        userVerification: userVerification as 'required' | 'preferred' | 'discouraged',
      }),
    },
  });
}

/**
 * Validates the response from POST /v1/actions/:challengeId/verify.
 * Pure — no I/O. Returns Result; never throws.
 */
export function validateVerifyActionSignatureResponse(
  raw: unknown
): Result<VerifyActionSignatureResponse, TryMellonError> {
  if (!isObject(raw)) {
    return validationError('Invalid API response: expected object', { originalData: raw });
  }

  const token = raw.token;
  if (!isString(token) || token.trim() === '') {
    return validationError('Invalid API response: token must be a non-empty string', {
      field: 'token',
      originalData: raw,
    });
  }

  const verified_at = raw.verified_at;
  if (!isString(verified_at) || verified_at.trim() === '') {
    return validationError('Invalid API response: verified_at must be a non-empty string', {
      field: 'verified_at',
      originalData: raw,
    });
  }

  const action_type = raw.action_type;
  if (!isString(action_type) || action_type.trim() === '') {
    return validationError('Invalid API response: action_type must be a non-empty string', {
      field: 'action_type',
      originalData: raw,
    });
  }

  const credential_id = raw.credential_id;
  if (!isString(credential_id) || credential_id.trim() === '') {
    return validationError('Invalid API response: credential_id must be a non-empty string', {
      field: 'credential_id',
      originalData: raw,
    });
  }

  return ok({ token, verified_at, action_type, credential_id });
}
