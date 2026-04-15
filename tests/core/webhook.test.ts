import { describe, it, expect } from 'vitest';
import {
  verifyWebhookSignature,
  type WebhookEvent,
  type WebhookPayload,
} from '../../src/core/webhook';

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test_1234567890';
  const body = JSON.stringify({ event: 'auth.success', timestamp: '2026-04-15T12:00:00.000Z' });

  it('Given a valid HMAC-SHA256 signature, when verified, then returns true', async () => {
    const sig = await hmacSha256Hex(body, secret);
    await expect(verifyWebhookSignature(body, sig, secret)).resolves.toBe(true);
  });

  it('Given a tampered body, when verified, then returns false', async () => {
    const sig = await hmacSha256Hex(body, secret);
    const tamperedBody = body.replace('auth.success', 'session.revoked');
    await expect(verifyWebhookSignature(tamperedBody, sig, secret)).resolves.toBe(false);
  });

  it('Given a wrong secret, when verified, then returns false', async () => {
    const sig = await hmacSha256Hex(body, secret);
    await expect(verifyWebhookSignature(body, sig, 'wrong_secret')).resolves.toBe(false);
  });

  it('Given a signature with different length, when verified, then returns false', async () => {
    await expect(verifyWebhookSignature(body, 'abc', secret)).resolves.toBe(false);
  });

  it('Given empty body or signature or secret, when verified, then returns false', async () => {
    await expect(verifyWebhookSignature('', 'sig', secret)).resolves.toBe(false);
    await expect(verifyWebhookSignature(body, '', secret)).resolves.toBe(false);
    await expect(verifyWebhookSignature(body, 'sig', '')).resolves.toBe(false);
  });

  it('Given uppercase signature hex, when verified, then normalizes and returns true', async () => {
    const sig = await hmacSha256Hex(body, secret);
    await expect(verifyWebhookSignature(body, sig.toUpperCase(), secret)).resolves.toBe(true);
  });
});

describe('WebhookEvent discriminated union type narrowing', () => {
  it('narrows payload by event field at compile time', () => {
    const handle = (e: WebhookEvent): string => {
      switch (e.event) {
        case 'auth.success':
          return e.data.credential_id;
        case 'credential.revoked':
          return e.data.revoked_at;
        case 'application.secret_rotated':
          return e.data.rotated_at;
        case 'session.revoked':
          return e.data.session_id;
        case 'session.logout':
          return e.data.logged_out_at;
        case 'user.locked':
          return e.data.lockout_level;
      }
    };
    const sample: WebhookPayload<'user.locked'> = {
      event: 'user.locked',
      timestamp: '2026-04-15T12:00:00.000Z',
      data: {
        tenant_id: 't_1',
        application_id: 'a_1',
        user_id: 'u_1',
        locked_at: '2026-04-15T12:00:00.000Z',
        lockout_level: 'hard',
      },
    };
    expect(handle(sample)).toBe('hard');
  });
});
