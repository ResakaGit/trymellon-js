import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  verifyJwtOffline,
  decodeJwtUnsafe,
  __resetJwksCacheForTests,
} from '../../src/core/session-verifier';
import { base64UrlEncode } from '../../src/utils/base64url';

const JWKS_URL = 'https://api.example.test/.well-known/jwks.json';
const NAMESPACE = 'https://trymellon.dev/claims';

type Keypair = {
  privateKey: CryptoKey;
  publicJwk: JsonWebKey & { kid: string; alg: string; kty: 'RSA'; use: 'sig' };
};

async function generateRs256Keypair(kid: string): Promise<Keypair> {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
  const pub = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey;
  return {
    privateKey: pair.privateKey,
    publicJwk: { ...pub, kid, alg: 'RS256', kty: 'RSA', use: 'sig' },
  };
}

function encodeSegment(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  return base64UrlEncode(bytes.buffer as ArrayBuffer);
}

async function signJwt(
  privateKey: CryptoKey,
  header: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<string> {
  const headerB64 = encodeSegment(header);
  const payloadB64 = encodeSegment(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

function mockFetchJwks(keys: unknown[], status: number = 200): ReturnType<typeof vi.fn> {
  const spy = vi.fn(
    async () =>
      new Response(JSON.stringify({ keys }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function basePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = nowSec();
  return {
    sub: 'user_123',
    tenant_id: 'tenant_abc',
    app_id: 'app_xyz',
    user_id: 'user_123',
    external_user_id: 'ext_456',
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

describe('session-verifier', () => {
  let kp: Keypair;

  beforeEach(async () => {
    __resetJwksCacheForTests();
    kp = await generateRs256Keypair('kid-primary');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('decodeJwtUnsafe', () => {
    it('Given malformed token, when decoded, then returns null', () => {
      expect(decodeJwtUnsafe('not-a-jwt')).toBeNull();
      expect(decodeJwtUnsafe('only.two')).toBeNull();
      expect(decodeJwtUnsafe('')).toBeNull();
      expect(decodeJwtUnsafe(null as unknown as string)).toBeNull();
    });

    it('Given non-base64url segments, when decoded, then returns null', () => {
      expect(decodeJwtUnsafe('@@@.###.$$$')).toBeNull();
    });

    it('Given valid 3-part token, when decoded, then returns parts', async () => {
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );
      const decoded = decodeJwtUnsafe(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.header.alg).toBe('RS256');
      expect(decoded?.header.kid).toBe('kid-primary');
    });
  });

  describe('verifyJwtOffline — happy path', () => {
    it('Given valid token + matching JWKS, when verified, then returns claims', async () => {
      mockFetchJwks([kp.publicJwk]);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload({ [NAMESPACE]: { plan: 'pro', seats: 5 } })
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toMatchObject({
        userId: 'user_123',
        tenantId: 'tenant_abc',
        appId: 'app_xyz',
        externalUserId: 'ext_456',
        kid: 'kid-primary',
      });
      expect(result.value.customClaims).toEqual({ plan: 'pro', seats: 5 });
    });

    it('Given token with user_id absent, when verified, then falls back to sub', async () => {
      mockFetchJwks([kp.publicJwk]);
      const payload = basePayload();
      delete (payload as Record<string, unknown>).user_id;
      const token = await signJwt(kp.privateKey, { alg: 'RS256', kid: 'kid-primary' }, payload);

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.userId).toBe('user_123');
    });
  });

  describe('verifyJwtOffline — sad paths', () => {
    it('Given tampered signature, when verified, then JWT_KID_MISMATCH', async () => {
      mockFetchJwks([kp.publicJwk]);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );
      const tampered = token.slice(0, -4) + 'AAAA';

      const result = await verifyJwtOffline({ token: tampered, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('JWT_KID_MISMATCH');
    });

    it('Given expired token beyond skew, when verified, then SESSION_EXPIRED', async () => {
      mockFetchJwks([kp.publicJwk]);
      const now = nowSec();
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload({ iat: now - 7200, exp: now - 3600 })
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SESSION_EXPIRED');
    });

    it('Given token expired 15s ago, when verified, then OK (within ±30s skew)', async () => {
      mockFetchJwks([kp.publicJwk]);
      const now = nowSec();
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload({ iat: now - 60, exp: now - 15 })
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(true);
    });

    it('Given token iat in future, when verified, then INVALID_ARGUMENT', async () => {
      mockFetchJwks([kp.publicJwk]);
      const now = nowSec();
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload({ iat: now + 3600, exp: now + 7200 })
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });

    it('Given malformed token, when verified, then INVALID_ARGUMENT', async () => {
      mockFetchJwks([kp.publicJwk]);
      const result = await verifyJwtOffline({ token: 'not.a.jwt.too.many', jwksUrl: JWKS_URL });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });

    it('Given kid not in JWKS, when verified, then JWT_KID_MISMATCH', async () => {
      const otherKp = await generateRs256Keypair('kid-other');
      mockFetchJwks([otherKp.publicJwk]);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('JWT_KID_MISMATCH');
    });

    it('Given alg!=RS256 header, when verified, then JWT_KID_MISMATCH', async () => {
      mockFetchJwks([kp.publicJwk]);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'HS256', kid: 'kid-primary' },
        basePayload()
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('JWT_KID_MISMATCH');
    });

    it('Given JWK with non-RSA kty, when verified, then JWT_KID_MISMATCH', async () => {
      const badJwk = { ...kp.publicJwk, kty: 'EC' };
      mockFetchJwks([badJwk]);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('JWT_KID_MISMATCH');
    });

    it('Given JWKS fetch returns 500, when verified, then NETWORK_FAILURE', async () => {
      mockFetchJwks([], 500);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
    });

    it('Given fetch rejects, when verified, then NETWORK_FAILURE', async () => {
      globalThis.fetch = vi.fn(async () => {
        throw new Error('offline');
      }) as unknown as typeof fetch;
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
    });

    it('Given JWKS response missing keys array, when verified, then NETWORK_FAILURE', async () => {
      globalThis.fetch = vi.fn(
        async () => new Response(JSON.stringify({}), { status: 200 })
      ) as unknown as typeof fetch;
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
    });

    it('Given token missing tenant_id, when verified, then INVALID_ARGUMENT', async () => {
      mockFetchJwks([kp.publicJwk]);
      const payload = basePayload();
      delete (payload as Record<string, unknown>).tenant_id;
      const token = await signJwt(kp.privateKey, { alg: 'RS256', kid: 'kid-primary' }, payload);

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
    });
  });

  describe('verifyJwtOffline — cache behavior', () => {
    it('Given two calls within TTL, when verified, then JWKS fetched once', async () => {
      const spy = mockFetchJwks([kp.publicJwk]);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      await verifyJwtOffline({ token, jwksUrl: JWKS_URL });
      await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('Given cache expired (>1h), when verified, then JWKS refetched', async () => {
      const spy = mockFetchJwks([kp.publicJwk]);
      const token = await signJwt(
        kp.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      const t0 = Date.now();
      await verifyJwtOffline({ token, jwksUrl: JWKS_URL, now: t0 });
      await verifyJwtOffline({ token, jwksUrl: JWKS_URL, now: t0 + 3_600_001 });

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyJwtOffline — key rotation', () => {
    it('Given token signed with previous key present in JWKS, when verified, then OK', async () => {
      const primary = await generateRs256Keypair('kid-primary-new');
      const previous = kp;
      mockFetchJwks([primary.publicJwk, previous.publicJwk]);
      const token = await signJwt(
        previous.privateKey,
        { alg: 'RS256', kid: 'kid-primary' },
        basePayload()
      );

      const result = await verifyJwtOffline({ token, jwksUrl: JWKS_URL });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.kid).toBe('kid-primary');
    });
  });
});
