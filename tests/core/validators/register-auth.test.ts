import { describe, it, expect } from 'vitest';
import {
  validateRegisterStartResponse,
  validateAuthStartResponse,
  validateRegisterFinishResponse,
  validateAuthFinishResponse,
} from '../../../src/core/validators/register-auth';

describe('validateRegisterStartResponse', () => {
  const validPayload = {
    challenge: {
      rp: { name: 'Example', id: 'example.com' },
      user: { id: 'dXNlcl8x', name: 'user_1', displayName: 'User 1' },
      challenge: 'Y2hhbGxlbmdl',
      pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
    },
    session_id: 'sess_123',
  };

  it('should return ok for valid payload', () => {
    const result = validateRegisterStartResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_id).toBe('sess_123');
      expect(result.value.challenge.rp.name).toBe('Example');
      expect(result.value.challenge.pubKeyCredParams).toHaveLength(1);
    }
  });

  it('should return err for null', () => {
    const result = validateRegisterStartResponse(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
  });

  it('should return err for undefined', () => {
    const result = validateRegisterStartResponse(undefined);
    expect(result.ok).toBe(false);
  });

  it('should return err for non-object', () => {
    const result = validateRegisterStartResponse('string');
    expect(result.ok).toBe(false);
  });

  it('should return err when challenge is missing', () => {
    const result = validateRegisterStartResponse({ session_id: 'sess_123' });
    expect(result.ok).toBe(false);
  });

  it('should return err when session_id is missing', () => {
    const result = validateRegisterStartResponse({ challenge: validPayload.challenge });
    expect(result.ok).toBe(false);
  });

  it('should return err when challenge.user.id is not string', () => {
    const bad = {
      ...validPayload,
      challenge: { ...validPayload.challenge, user: { ...validPayload.challenge.user, id: 123 } },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when session_id is not string', () => {
    const result = validateRegisterStartResponse({ ...validPayload, session_id: 123 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('session_id');
  });

  it('should return err when challenge is not object', () => {
    const result = validateRegisterStartResponse({ session_id: 's', challenge: 'x' });
    expect(result.ok).toBe(false);
  });

  it('should return err when challenge.rp lacks name or id', () => {
    const bad = {
      ...validPayload,
      challenge: { ...validPayload.challenge, rp: { name: 'X' } },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when challenge.challenge is not string', () => {
    const bad = {
      ...validPayload,
      challenge: { ...validPayload.challenge, challenge: 123 },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when pubKeyCredParams is not array', () => {
    const bad = {
      ...validPayload,
      challenge: { ...validPayload.challenge, pubKeyCredParams: {} },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when pubKeyCredParams item has wrong type or alg', () => {
    const bad = {
      ...validPayload,
      challenge: {
        ...validPayload.challenge,
        pubKeyCredParams: [{ type: 'wrong', alg: -7 }],
      },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when timeout is not number', () => {
    const bad = {
      ...validPayload,
      challenge: { ...validPayload.challenge, timeout: '30' },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when excludeCredentials is not array', () => {
    const bad = {
      ...validPayload,
      challenge: { ...validPayload.challenge, excludeCredentials: {} },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when excludeCredentials item lacks id or type', () => {
    const bad = {
      ...validPayload,
      challenge: {
        ...validPayload.challenge,
        excludeCredentials: [{ type: 'public-key' }],
      },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return err when authenticatorSelection is not object', () => {
    const bad = {
      ...validPayload,
      challenge: { ...validPayload.challenge, authenticatorSelection: 'x' },
    };
    const result = validateRegisterStartResponse(bad);
    expect(result.ok).toBe(false);
  });

  it('should return ok with optional timeout and excludeCredentials', () => {
    const withOpt = {
      ...validPayload,
      challenge: {
        ...validPayload.challenge,
        timeout: 60000,
        excludeCredentials: [{ type: 'public-key' as const, id: 'cred_1' }],
      },
    };
    const result = validateRegisterStartResponse(withOpt);
    expect(result.ok).toBe(true);
  });
});

describe('validateAuthStartResponse', () => {
  const validPayload = {
    challenge: {
      challenge: 'Y2hhbGxlbmdl',
      rpId: 'example.com',
      allowCredentials: [],
      timeout: 30000,
      userVerification: 'preferred' as const,
    },
    session_id: 'sess_456',
  };

  it('should return ok for valid payload', () => {
    const result = validateAuthStartResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_id).toBe('sess_456');
      expect(result.value.challenge.rpId).toBe('example.com');
    }
  });

  it('should return err for null', () => {
    const result = validateAuthStartResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err when session_id is missing', () => {
    const result = validateAuthStartResponse({ challenge: validPayload.challenge });
    expect(result.ok).toBe(false);
  });

  it('should return err when session_id is not string', () => {
    const result = validateAuthStartResponse({ ...validPayload, session_id: 123 });
    expect(result.ok).toBe(false);
  });

  it('should return err when challenge is not object', () => {
    const result = validateAuthStartResponse({ session_id: 's', challenge: null });
    expect(result.ok).toBe(false);
  });

  it('should return err when challenge.challenge is not string', () => {
    const result = validateAuthStartResponse({
      session_id: 's',
      challenge: { ...validPayload.challenge, challenge: 123 },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when rpId is not string', () => {
    const result = validateAuthStartResponse({
      session_id: 's',
      challenge: { ...validPayload.challenge, rpId: 123 },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when allowCredentials is not array', () => {
    const result = validateAuthStartResponse({
      session_id: 's',
      challenge: { ...validPayload.challenge, allowCredentials: {} },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when allowCredentials item lacks id or type', () => {
    const result = validateAuthStartResponse({
      session_id: 's',
      challenge: {
        ...validPayload.challenge,
        allowCredentials: [{ type: 'public-key' }],
      },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when timeout is not number', () => {
    const result = validateAuthStartResponse({
      session_id: 's',
      challenge: { ...validPayload.challenge, timeout: '30' },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when userVerification is invalid', () => {
    const result = validateAuthStartResponse({
      session_id: 's',
      challenge: { ...validPayload.challenge, userVerification: 'invalid' },
    });
    expect(result.ok).toBe(false);
  });

  it('should return ok with userVerification required', () => {
    const result = validateAuthStartResponse({
      session_id: 's',
      challenge: { ...validPayload.challenge, userVerification: 'required' },
    });
    expect(result.ok).toBe(true);
  });
});

describe('validateRegisterFinishResponse', () => {
  const validPayload = {
    credential_id: 'cred_1',
    status: 'verified',
    session_token: 'token_1',
    user: { user_id: 'u1', external_user_id: 'ext1', email: 'a@b.com', metadata: {} },
  };

  it('should return ok for valid payload', () => {
    const result = validateRegisterFinishResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.credential_id).toBe('cred_1');
      expect(result.value.user.external_user_id).toBe('ext1');
    }
  });

  it('should return err for null', () => {
    const result = validateRegisterFinishResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err when user is missing', () => {
    const result = validateRegisterFinishResponse({
      credential_id: 'c',
      status: 's',
      session_token: 't',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when credential_id is not string', () => {
    const result = validateRegisterFinishResponse({
      ...validPayload,
      credential_id: 123,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when session_token is not string', () => {
    const result = validateRegisterFinishResponse({
      ...validPayload,
      session_token: null,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when user is not object', () => {
    const result = validateRegisterFinishResponse({
      ...validPayload,
      user: 'x',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when user lacks user_id or external_user_id', () => {
    const result = validateRegisterFinishResponse({
      ...validPayload,
      user: { user_id: 'u1' },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when user.email is not string', () => {
    const result = validateRegisterFinishResponse({
      ...validPayload,
      user: { ...validPayload.user, email: 123 },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when user.metadata is not object', () => {
    const result = validateRegisterFinishResponse({
      ...validPayload,
      user: { ...validPayload.user, metadata: 'x' },
    });
    expect(result.ok).toBe(false);
  });

  it('should return ok without optional email and metadata', () => {
    const minimal = {
      credential_id: 'c',
      status: 's',
      session_token: 't',
      user: { user_id: 'u1', external_user_id: 'ext1' },
    };
    const result = validateRegisterFinishResponse(minimal);
    expect(result.ok).toBe(true);
  });
});

describe('validateAuthFinishResponse', () => {
  const validPayload = {
    authenticated: true,
    session_token: 'token_2',
    user: { user_id: 'u2', external_user_id: 'ext2' },
    signals: { userVerification: true },
  };

  it('should return ok for valid payload', () => {
    const result = validateAuthFinishResponse(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.authenticated).toBe(true);
      expect(result.value.session_token).toBe('token_2');
    }
  });

  it('should return err for null', () => {
    const result = validateAuthFinishResponse(null);
    expect(result.ok).toBe(false);
  });

  it('should return err when authenticated is not boolean', () => {
    const result = validateAuthFinishResponse({
      ...validPayload,
      authenticated: 'yes',
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when session_token is not string', () => {
    const result = validateAuthFinishResponse({
      ...validPayload,
      session_token: 123,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when user is not object', () => {
    const result = validateAuthFinishResponse({
      ...validPayload,
      user: null,
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when user lacks user_id or external_user_id', () => {
    const result = validateAuthFinishResponse({
      ...validPayload,
      user: { user_id: 'u1' },
    });
    expect(result.ok).toBe(false);
  });

  it('should return err when signals is not object', () => {
    const result = validateAuthFinishResponse({
      ...validPayload,
      signals: 'x',
    });
    expect(result.ok).toBe(false);
  });

  it('should return ok with optional email and metadata on user', () => {
    const withUser = {
      ...validPayload,
      user: { user_id: 'u2', external_user_id: 'ext2', email: 'a@b.com', metadata: {} },
    };
    const result = validateAuthFinishResponse(withUser);
    expect(result.ok).toBe(true);
  });
});
