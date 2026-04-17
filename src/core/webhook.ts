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
  | 'user.locked'
  | 'identifier.linked'
  | 'identifier.unlinked'
  | 'recovery.enrollment.issued'
  | 'recovery.enrollment.completed';

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

export type IdentifierLinkedPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  identifier_id: string;
  identifier_type: 'email' | 'wallet' | 'custom';
  identifier_value: string;
  linked_at: string;
};

export type IdentifierUnlinkedPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  identifier_id: string;
  identifier_type: 'email' | 'wallet' | 'custom';
  identifier_value: string;
  unlinked_at: string;
};

/**
 * B2B recovery enrollment ticket issued via S2S (ADR-045, F1-R.4).
 * Backend emits this when an integrator calls
 * `POST /v1/users/:external_user_id/recovery/enroll`. The integrator is
 * responsible for delivering the ticket to the user through its own
 * channel — the `enrollment_url` is NOT included in this payload because
 * the ticket is live and the URL would leak into webhook logs.
 */
export type RecoveryEnrollmentIssuedPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  external_user_id: string;
  ticket_id: string;
  context_hash: string;
  expires_at: string;
  issued_at: string;
};

/**
 * B2B recovery enrollment completed successfully (ADR-045, F1-R.4).
 * `reason: 'b2b_enrollment'` distinguishes this from the legacy OTP-based
 * recovery flow — allows consumers to route the two flows differently.
 */
export type RecoveryEnrollmentCompletedPayload = {
  tenant_id: string;
  application_id: string;
  user_id: string;
  ticket_id: string;
  credential_id: string;
  reason: 'b2b_enrollment';
  completed_at: string;
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
  | { event: 'user.locked'; timestamp: string; data: UserLockedPayload }
  | { event: 'identifier.linked'; timestamp: string; data: IdentifierLinkedPayload }
  | { event: 'identifier.unlinked'; timestamp: string; data: IdentifierUnlinkedPayload }
  | {
      event: 'recovery.enrollment.issued';
      timestamp: string;
      data: RecoveryEnrollmentIssuedPayload;
    }
  | {
      event: 'recovery.enrollment.completed';
      timestamp: string;
      data: RecoveryEnrollmentCompletedPayload;
    };

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
