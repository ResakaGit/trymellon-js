import { createEncodingError } from '../errors';

/**
 * Encodes an ArrayBuffer to base64url using globalThis.btoa (Edge/browser-safe; no Node Buffer).
 * @throws TryMellonError when btoa is unavailable
 */
export function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');

  if (typeof globalThis.btoa === 'undefined') {
    throw createEncodingError('encode');
  }
  const base64 = globalThis.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Decodes a base64url string to Uint8Array using globalThis.atob (Edge/browser-safe; no Node Buffer).
 * @throws TryMellonError when atob is unavailable
 */
export function base64UrlDecode(s: string): Uint8Array {
  if (typeof globalThis.atob === 'undefined') {
    throw createEncodingError('decode');
  }

  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  const padded = padding === 0 ? base64 : base64 + '='.repeat(4 - padding);
  const binary = globalThis.atob(padded);

  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Decodes base64url to ArrayBuffer (delegates to base64UrlDecode). */
export function base64UrlDecodeToArrayBuffer(s: string): ArrayBuffer {
  const bytes = base64UrlDecode(s);
  return bytes.buffer as ArrayBuffer;
}
