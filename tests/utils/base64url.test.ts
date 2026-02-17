import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  base64UrlEncode,
  base64UrlDecode,
  base64UrlDecodeToArrayBuffer,
} from '../../src/utils/base64url';
import { TryMellonError } from '../../src/errors';

describe('base64UrlEncode', () => {
  it('should encode empty ArrayBuffer', () => {
    const buffer = new ArrayBuffer(0);
    const result = base64UrlEncode(buffer);
    expect(result).toBe('');
  });

  it('should encode simple string to base64url', () => {
    const text = 'Hello World';
    const buffer = new TextEncoder().encode(text).buffer;
    const result = base64UrlEncode(buffer);
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });

  it('should encode binary data correctly', () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 253]);
    const result = base64UrlEncode(bytes.buffer);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should produce URL-safe output (no + or /)', () => {
    const bytes = new Uint8Array([251, 239, 191]);
    const result = base64UrlEncode(bytes.buffer);
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
  });

  it('should remove padding', () => {
    const bytes = new Uint8Array([1, 2]);
    const result = base64UrlEncode(bytes.buffer);
    expect(result).not.toContain('=');
  });

  it('should handle large buffers', () => {
    const size = 1000;
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = i % 256;
    }
    const result = base64UrlEncode(bytes.buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('+');
    expect(result).not.toContain('/');
    expect(result).not.toContain('=');
  });
});

describe('base64UrlDecode', () => {
  it('should decode empty string', () => {
    const result = base64UrlDecode('');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBe(0);
  });

  it('should decode base64url string to Uint8Array', () => {
    const text = 'Hello World';
    const encoded = base64UrlEncode(new TextEncoder().encode(text).buffer);
    const decoded = base64UrlDecode(encoded);
    const decodedText = new TextDecoder().decode(decoded);
    expect(decodedText).toBe(text);
  });

  it('should handle URL-safe characters', () => {
    const bytes = new Uint8Array([251, 239, 191]);
    const encoded = base64UrlEncode(bytes.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(bytes);
  });

  it('should decode without padding', () => {
    const bytes = new Uint8Array([1, 2]);
    const encoded = base64UrlEncode(bytes.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(bytes);
  });

  it('should round-trip correctly', () => {
    const original = new Uint8Array([0, 1, 2, 3, 255, 254, 253, 252]);
    const encoded = base64UrlEncode(original.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it('should handle various byte values', () => {
    const testCases = [
      new Uint8Array([0]),
      new Uint8Array([255]),
      new Uint8Array([128]),
      new Uint8Array([64]),
      new Uint8Array([1, 2, 3, 4, 5]),
    ];

    for (const bytes of testCases) {
      const encoded = base64UrlEncode(bytes.buffer);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toEqual(bytes);
    }
  });
});

describe('base64UrlDecodeToArrayBuffer', () => {
  it('should decode to ArrayBuffer', () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const encoded = base64UrlEncode(bytes.buffer);
    const decoded = base64UrlDecodeToArrayBuffer(encoded);
    expect(decoded).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(decoded)).toEqual(bytes);
  });

  it('should produce same result as base64UrlDecode', () => {
    const text = 'Test String';
    const encoded = base64UrlEncode(new TextEncoder().encode(text).buffer);
    const decoded1 = base64UrlDecode(encoded);
    const decoded2 = new Uint8Array(base64UrlDecodeToArrayBuffer(encoded));
    expect(decoded2).toEqual(decoded1);
  });

  it('should handle empty string', () => {
    const result = base64UrlDecodeToArrayBuffer('');
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBe(0);
  });

  it('should round-trip with base64UrlEncode', () => {
    const original = new Uint8Array([10, 20, 30, 40, 50]);
    const encoded = base64UrlEncode(original.buffer);
    const decoded = base64UrlDecodeToArrayBuffer(encoded);
    expect(new Uint8Array(decoded)).toEqual(original);
  });
});

describe('base64url edge cases', () => {
  it('should handle single byte', () => {
    const bytes = new Uint8Array([42]);
    const encoded = base64UrlEncode(bytes.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(bytes);
  });

  it('should handle two bytes', () => {
    const bytes = new Uint8Array([42, 84]);
    const encoded = base64UrlEncode(bytes.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(bytes);
  });

  it('should handle three bytes', () => {
    const bytes = new Uint8Array([42, 84, 126]);
    const encoded = base64UrlEncode(bytes.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(bytes);
  });

  it('should handle random data', () => {
    const bytes = new Uint8Array(100);
    crypto.getRandomValues(bytes);
    const encoded = base64UrlEncode(bytes.buffer);
    const decoded = base64UrlDecode(encoded);
    expect(decoded).toEqual(bytes);
  });
});

describe('base64url when btoa/atob and Buffer unavailable', () => {
  const originalBtoa = globalThis.btoa;
  const originalAtob = globalThis.atob;
  const originalBuffer = globalThis.Buffer;

  afterEach(() => {
    vi.stubGlobal('btoa', originalBtoa);
    vi.stubGlobal('atob', originalAtob);
    vi.stubGlobal('Buffer', originalBuffer);
  });

  it('base64UrlEncode throws createEncodingError when no btoa nor Buffer', () => {
    vi.stubGlobal('btoa', undefined);
    vi.stubGlobal('Buffer', undefined);
    expect(() => base64UrlEncode(new ArrayBuffer(1))).toThrow(TryMellonError);
  });

  it('base64UrlDecode throws createEncodingError when no atob nor Buffer', () => {
    vi.stubGlobal('atob', undefined);
    vi.stubGlobal('Buffer', undefined);
    expect(() => base64UrlDecode('YQ')).toThrow(TryMellonError);
  });
});
