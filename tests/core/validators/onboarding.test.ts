import { describe, it, expect } from 'vitest';
import {
  validateOnboardingStartResponse,
  validateOnboardingStatusResponse,
  validateOnboardingRegisterResponse,
  validateOnboardingRegisterPasskeyResponse,
  validateOnboardingCompleteResponse,
} from '../../../src/core/validators/onboarding';

describe('validateOnboardingStartResponse', () => {
  const valid = { session_id: 's1', onboarding_url: 'https://x.com', expires_in: 3600 };

  it('should return ok for valid payload', () => {
    const result = validateOnboardingStartResponse(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_id).toBe('s1');
      expect(result.value.expires_in).toBe(3600);
    }
  });

  it('should return err for null', () => {
    const result = validateOnboardingStartResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err when expires_in is missing', () => {
    const result = validateOnboardingStartResponse({
      session_id: 's1',
      onboarding_url: 'https://x.com',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when session_id is not string', () => {
    const result = validateOnboardingStartResponse({
      session_id: 123,
      onboarding_url: 'https://x.com',
      expires_in: 3600,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when onboarding_url is not string', () => {
    const result = validateOnboardingStartResponse({
      session_id: 's1',
      onboarding_url: 123,
      expires_in: 3600,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when expires_in is not number', () => {
    const result = validateOnboardingStartResponse({
      session_id: 's1',
      onboarding_url: 'https://x.com',
      expires_in: '3600',
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateOnboardingStatusResponse', () => {
  const valid = {
    status: 'pending_passkey' as const,
    onboarding_url: 'https://x.com',
    expires_in: 3600,
  };

  it('should return ok for valid payload', () => {
    const result = validateOnboardingStatusResponse(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('pending_passkey');
  });

  it('should return err for invalid status', () => {
    const result = validateOnboardingStatusResponse({
      ...valid,
      status: 'invalid',
    });
    expect(result.ok).toBe(false);
  });

  it('should return ok for pending_data and completed', () => {
    expect(validateOnboardingStatusResponse({ ...valid, status: 'pending_data' }).ok).toBe(true);
    expect(validateOnboardingStatusResponse({ ...valid, status: 'completed' }).ok).toBe(true);
  });

  it('should return err when onboarding_url is not string', () => {
    const result = validateOnboardingStatusResponse({
      ...valid,
      onboarding_url: 123,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when expires_in is not number', () => {
    const result = validateOnboardingStatusResponse({
      ...valid,
      expires_in: '3600',
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateOnboardingRegisterResponse', () => {
  const valid = {
    session_id: 's1',
    status: 'pending_passkey' as const,
    onboarding_url: 'https://x.com',
  };

  it('should return ok for valid payload', () => {
    const result = validateOnboardingRegisterResponse(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('pending_passkey');
  });

  it('should return ok when challenge is present (for same-device flow)', () => {
    const withChallenge = {
      ...valid,
      challenge: {
        rp: { name: 'R', id: 'r.com' },
        user: { id: 'u', name: 'n', displayName: 'D' },
        challenge: 'c',
        pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
      },
    };
    const result = validateOnboardingRegisterResponse(withChallenge);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.value as { challenge?: unknown }).challenge).toBeDefined();
  });

  it('should return err for null', () => {
    const result = validateOnboardingRegisterResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err when status is not pending_passkey', () => {
    const result = validateOnboardingRegisterResponse({
      ...valid,
      status: 'completed',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when challenge is invalid (missing rp)', () => {
    const result = validateOnboardingRegisterResponse({
      ...valid,
      challenge: {
        user: { id: 'u', name: 'n', displayName: 'D' },
        challenge: 'c',
        pubKeyCredParams: [],
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe('validateOnboardingRegisterPasskeyResponse', () => {
  const valid = {
    session_id: 's1',
    status: 'pending_data' as const,
    user_id: 'u1',
    tenant_id: 't1',
  };

  it('should return ok for valid payload', () => {
    const result = validateOnboardingRegisterPasskeyResponse(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.user_id).toBe('u1');
  });

  it('should return err when user_id is missing', () => {
    const result = validateOnboardingRegisterPasskeyResponse({
      session_id: 's1',
      status: 'completed',
      tenant_id: 't1',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err for invalid status', () => {
    const result = validateOnboardingRegisterPasskeyResponse({
      ...valid,
      status: 'pending_passkey',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when tenant_id is not string', () => {
    const result = validateOnboardingRegisterPasskeyResponse({
      ...valid,
      tenant_id: 123,
    });
    expect(result.ok).toBe(false);
  });

  it('should return ok for status completed', () => {
    const result = validateOnboardingRegisterPasskeyResponse({
      ...valid,
      status: 'completed',
    });
    expect(result.ok).toBe(true);
  });
});

describe('validateOnboardingCompleteResponse', () => {
  const valid = {
    session_id: 's1',
    status: 'completed' as const,
    user_id: 'u1',
    tenant_id: 't1',
    session_token: 'tok1',
  };

  it('should return ok for valid payload', () => {
    const result = validateOnboardingCompleteResponse(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.session_token).toBe('tok1');
  });

  it('should return err for null', () => {
    const result = validateOnboardingCompleteResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err when status is not completed', () => {
    const result = validateOnboardingCompleteResponse({
      ...valid,
      status: 'pending_data',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when session_token is not string', () => {
    const result = validateOnboardingCompleteResponse({
      ...valid,
      session_token: 123,
    });
    expect(result.ok).toBe(false);
  });
});
