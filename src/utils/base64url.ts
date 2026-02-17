import { createEncodingError } from '../errors';

/**
 * Converts a standard base64 string to base64url (removes padding, replaces + and /).
 * Idempotent: if the string is already base64url, it is returned unchanged.
 */
export function base64ToBase64Url(base64Str: string): string {
  return base64Str.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }

  let base64 = '';
  if (typeof btoa !== 'undefined') {
    base64 = btoa(binary);
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(binary, 'binary').toString('base64');
  } else {
    throw createEncodingError('encode');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64UrlDecode(s: string): Uint8Array {
  let base64 = s.replace(/-/g, '+').replace(/_/g, '/');

  const padding = base64.length % 4;
  if (padding !== 0) {
    base64 += '='.repeat(4 - padding);
  }

  let binary = '';
  if (typeof atob !== 'undefined') {
    binary = atob(base64);
  } else if (typeof Buffer !== 'undefined') {
    binary = Buffer.from(base64, 'base64').toString('binary');
  } else {
    throw createEncodingError('decode');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export function base64UrlDecodeToArrayBuffer(s: string): ArrayBuffer {
  const bytes = base64UrlDecode(s);
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  view.set(bytes);
  return buffer;
}
