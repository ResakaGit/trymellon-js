/**
 * Webhook event types + signature verification helper for integrators
 * consuming tryMellon webhooks. Discriminated union lets the caller narrow
 * the payload type by the `event` field.
 *
 * Zero runtime deps: HMAC verification uses WebCrypto (Node 19+ and all
 * modern browsers expose `globalThis.crypto.subtle`).
 */

/**
 * Canonical event names emitted by the backend. Keep in sync with
 * `-trymellon-webauthn-saas/src/shared/constants/webhook-events.constants.ts`.
 */
export type WebhookEventType =
  | 'auth.success'
  | 'credential.revoked'
  | 'application.secret_rotated'
  | 'session.revoked'
  | 'session.logout'
  | 'user.locked';

export type AuthSuccessPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  external_user_id?: string;
  credential_id: string;
  timestamp: string;
};

export type CredentialRevokedPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  credential_id: string;
  revoked_at: string;
  reason?: string;
};

export type ApplicationSecretRotatedPayload = {
  tenant_id: string;
  application_id: string;
  client_id: string;
  rotated_at: string;
  previous_secret_expires_at: string | null;
  actor_user_id?: string;
};

export type SessionRevokedPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  session_id: string;
  revoked_at: string;
  reason?: string;
};

export type SessionLogoutPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  session_id: string;
  logged_out_at: string;
};

export type UserLockedPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  external_user_id?: string;
  locked_at: string;
  lockout_level: 'soft' | 'hard';
  reason?: string;
};

/**
 * Discriminated union: switch on `event` to narrow the `data` shape.
 */
export type WebhookEvent =
  | { event: 'auth.success'; timestamp: string; data: AuthSuccessPayload }
  | { event: 'credential.revoked'; timestamp: string; data: CredentialRevokedPayload }
  | {
      event: 'application.secret_rotated';
      timestamp: string;
      data: ApplicationSecretRotatedPayload;
    }
  | { event: 'session.revoked'; timestamp: string; data: SessionRevokedPayload }
  | { event: 'session.logout'; timestamp: string; data: SessionLogoutPayload }
  | { event: 'user.locked'; timestamp: string; data: UserLockedPayload };

export type WebhookPayload<E extends WebhookEventType = WebhookEventType> = Extract<
  WebhookEvent,
  { event: E }
>;

/**
 * Verifies the HMAC-SHA256 signature of a webhook delivery.
 *
 * @param rawBody The raw HTTP request body (string — do NOT parse before verifying).
 * @param signatureHeader Value of the `X-TryMellon-Signature` header (hex-encoded).
 * @param secret The application's webhook secret (shared with tryMellon).
 * @returns `true` when the signature matches; `false` otherwise (including on any error).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  if (!rawBody || !signatureHeader || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const computed = toHex(new Uint8Array(signature));
    return timingSafeEqualHex(computed, signatureHeader.trim().toLowerCase());
  } catch {
    return false;
  }
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

/** Constant-time comparison of two lowercase hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
