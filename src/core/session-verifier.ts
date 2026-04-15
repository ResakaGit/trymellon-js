import { base64UrlDecode } from '../utils/base64url';
import { createError, type TryMellonError } from '../errors';
import { ok, err, type Result } from '../utils/result';
import type { SessionClaims, Jwk, JwtHeader, JwtPayloadRaw } from '../types';

const JWKS_CACHE_TTL_MS = 3_600_000;
const CLOCK_SKEW_SEC = 30;
const CUSTOM_CLAIMS_NAMESPACE = 'https://trymellon.dev/claims';

type CacheEntry = { keys: Jwk[]; fetchedAt: number };

const jwksCache = new Map<string, CacheEntry>();

/** Test-only. Not exported from src/index.ts. */
export function __resetJwksCacheForTests(): void {
  jwksCache.clear();
}

type DecodedJwt = {
  header: JwtHeader;
  payload: JwtPayloadRaw;
  signingInput: string;
  signature: Uint8Array;
};

export function decodeJwtUnsafe(token: string): DecodedJwt | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;
  try {
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const header = JSON.parse(headerJson) as JwtHeader;
    const payload = JSON.parse(payloadJson) as JwtPayloadRaw;
    const signature = base64UrlDecode(signatureB64);
    const signingInput = `${headerB64}.${payloadB64}`;
    return { header, payload, signingInput, signature };
  } catch {
    return null;
  }
}

export async function fetchJwks(
  jwksUrl: string,
  now: number = Date.now()
): Promise<Result<Jwk[], TryMellonError>> {
  const cached = jwksCache.get(jwksUrl);
  if (cached && now - cached.fetchedAt < JWKS_CACHE_TTL_MS) {
    return ok(cached.keys);
  }
  try {
    const response = await fetch(jwksUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return err(createError('NETWORK_FAILURE', `JWKS fetch returned ${response.status}`));
    }
    const body = (await response.json()) as { keys?: unknown };
    if (!body || !Array.isArray(body.keys)) {
      return err(createError('NETWORK_FAILURE', 'JWKS response missing keys array'));
    }
    const keys = body.keys as Jwk[];
    jwksCache.set(jwksUrl, { keys, fetchedAt: now });
    return ok(keys);
  } catch (e) {
    return err(createError('NETWORK_FAILURE', (e as Error).message));
  }
}

async function importJwkRs256(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

function flattenCustomClaims(
  raw: JwtPayloadRaw
): Record<string, string | number | boolean> | undefined {
  const bag = raw[CUSTOM_CLAIMS_NAMESPACE];
  if (!bag || typeof bag !== 'object') return undefined;
  const entries = Object.entries(bag).filter(
    ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
  ) as Array<[string, string | number | boolean]>;
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

type ValidatedPayload = {
  sub: string;
  tenant_id: string;
  app_id: string;
  iat: number;
  exp: number;
  user_id?: string;
  external_user_id?: string;
};

function shapeClaims(
  payload: ValidatedPayload,
  raw: JwtPayloadRaw,
  kid: string | undefined
): SessionClaims {
  const customClaims = flattenCustomClaims(raw);
  const base: SessionClaims = {
    userId: payload.user_id ?? payload.sub,
    tenantId: payload.tenant_id,
    appId: payload.app_id,
    iat: payload.iat,
    exp: payload.exp,
  };
  if (payload.external_user_id !== undefined) base.externalUserId = payload.external_user_id;
  if (customClaims) base.customClaims = customClaims;
  if (kid !== undefined) base.kid = kid;
  return base;
}

function validatePayload(raw: JwtPayloadRaw): Result<ValidatedPayload, TryMellonError> {
  if (typeof raw.exp !== 'number' || typeof raw.iat !== 'number') {
    return err(createError('INVALID_ARGUMENT', 'Token missing iat/exp'));
  }
  if (typeof raw.sub !== 'string' || raw.sub === '') {
    return err(createError('INVALID_ARGUMENT', 'Token missing sub'));
  }
  if (typeof raw.tenant_id !== 'string' || typeof raw.app_id !== 'string') {
    return err(createError('INVALID_ARGUMENT', 'Token missing tenant_id/app_id'));
  }
  const validated: ValidatedPayload = {
    sub: raw.sub,
    tenant_id: raw.tenant_id,
    app_id: raw.app_id,
    iat: raw.iat,
    exp: raw.exp,
  };
  if (typeof raw.user_id === 'string') validated.user_id = raw.user_id;
  if (typeof raw.external_user_id === 'string') validated.external_user_id = raw.external_user_id;
  return ok(validated);
}

export type VerifyOfflineInput = {
  token: string;
  jwksUrl: string;
  /** Override for tests. Defaults to Date.now(). */
  now?: number;
};

export async function verifyJwtOffline(
  input: VerifyOfflineInput
): Promise<Result<SessionClaims, TryMellonError>> {
  const decoded = decodeJwtUnsafe(input.token);
  if (!decoded) {
    return err(createError('INVALID_ARGUMENT', 'Token is malformed'));
  }

  if (decoded.header.alg !== 'RS256') {
    return err(createError('JWT_KID_MISMATCH', 'Unsupported JWT algorithm; expected RS256'));
  }

  const jwksResult = await fetchJwks(input.jwksUrl, input.now);
  if (!jwksResult.ok) return jwksResult;

  const jwk = jwksResult.value.find((k) => k.kid === decoded.header.kid);
  if (!jwk) {
    return err(createError('JWT_KID_MISMATCH'));
  }
  if (jwk.kty !== 'RSA' || (jwk.alg !== undefined && jwk.alg !== 'RS256')) {
    return err(createError('JWT_KID_MISMATCH', 'JWK algorithm mismatch'));
  }

  let key: CryptoKey;
  try {
    key = await importJwkRs256(jwk);
  } catch {
    return err(createError('JWT_KID_MISMATCH', 'JWK import failed'));
  }

  const signingData = new TextEncoder().encode(decoded.signingInput);
  // BufferSource cast: TS ArrayBufferLike vs ArrayBuffer generic friction on Uint8Array.
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decoded.signature as BufferSource,
    signingData as BufferSource
  );
  if (!verified) {
    return err(createError('JWT_KID_MISMATCH', 'Signature verification failed'));
  }

  const validated = validatePayload(decoded.payload);
  if (!validated.ok) return validated;

  const nowSec = Math.floor((input.now ?? Date.now()) / 1000);
  if (validated.value.exp + CLOCK_SKEW_SEC < nowSec) {
    return err(createError('SESSION_EXPIRED'));
  }
  if (validated.value.iat > nowSec) {
    return err(createError('INVALID_ARGUMENT', 'Token iat is in the future'));
  }

  return ok(shapeClaims(validated.value, decoded.payload, decoded.header.kid));
}
