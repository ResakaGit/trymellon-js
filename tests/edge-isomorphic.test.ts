import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Edge / isomorphic verification (ELITE-SDK-REFACTOR-GUIDE Step 4).
 * SDK must run in environments without Node Buffer (Cloudflare Workers, Vercel Edge).
 * Do NOT static-import SDK or base64url so that dynamic import runs in the simulated environment.
 */

type GlobalWithBuffer = typeof globalThis & { Buffer?: unknown };

const savedBuffer: unknown =
  typeof globalThis !== 'undefined' ? (globalThis as GlobalWithBuffer).Buffer : undefined;

function removeBuffer(): void {
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as GlobalWithBuffer).Buffer;
  }
}

function restoreBuffer(): void {
  if (typeof globalThis !== 'undefined' && savedBuffer !== undefined) {
    (globalThis as GlobalWithBuffer).Buffer = savedBuffer;
  }
}

function isBufferUndefined(): boolean {
  return typeof (globalThis as GlobalWithBuffer).Buffer === 'undefined';
}

describe('Edge environment (no Buffer)', () => {
  afterEach(() => {
    restoreBuffer();
  });

  it('should have Buffer undefined after removal', () => {
    removeBuffer();
    expect(isBufferUndefined()).toBe(true);
  });

  it('should assert typeof Buffer === "undefined" inside execution context (guide Step 4)', () => {
    removeBuffer();
    expect(typeof (globalThis as GlobalWithBuffer).Buffer).toBe('undefined');
  });

  it('should load base64url utils and run without Buffer', async () => {
    removeBuffer();
    expect(isBufferUndefined()).toBe(true);

    const { base64UrlEncode, base64UrlDecode, base64UrlDecodeToArrayBuffer } =
      await import('../src/utils/base64url');

    const empty = new ArrayBuffer(0);
    expect(base64UrlEncode(empty)).toBe('');

    const decoded = base64UrlDecode('');
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect(decoded.length).toBe(0);

    const decodedAb = base64UrlDecodeToArrayBuffer('');
    expect(decodedAb).toBeInstanceOf(ArrayBuffer);
    expect(decodedAb.byteLength).toBe(0);
  });

  it('should load fetch-client helpers without Buffer', async () => {
    removeBuffer();

    const { getRetryDelayMs } = await import('../src/core/fetch-client');

    expect(getRetryDelayMs(0, 1000)).toBe(1000);
    expect(getRetryDelayMs(1, 1000)).toBe(2000);
  });

  it('should load TryMellon.create without Buffer', async () => {
    removeBuffer();

    const { TryMellon } = await import('../src/index');

    const result = TryMellon.create({
      appId: 'app_test',
      publishableKey: 'key_test',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeDefined();
    }
  });
});

describe('dist bundle (no Buffer)', () => {
  const distPath = join(__dirname, '../dist/index.js');

  afterEach(() => {
    restoreBuffer();
  });

  it('should load built dist/index.js without Buffer when dist exists', async () => {
    if (!existsSync(distPath)) {
      return;
    }

    removeBuffer();

    const mod = await import(pathToFileURL(distPath).href);
    expect(mod.TryMellon).toBeDefined();

    const result = mod.TryMellon.create({
      appId: 'app_test',
      publishableKey: 'key_test',
    });

    expect(result.ok).toBe(true);
  });
});
