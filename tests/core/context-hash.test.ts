import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateContextHash,
  getOrCreateContextHash,
  type StorageLike,
} from '../../src/core/context-hash';

const HEX_REGEX = /^[0-9a-f]{64}$/;

describe('generateContextHash', () => {
  it('returns string length 64 with only hex chars', () => {
    const hash = generateContextHash();
    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(HEX_REGEX);
  });

  it('returns different values on multiple calls (CSPRNG)', () => {
    const a = generateContextHash();
    const b = generateContextHash();
    expect(a).toMatch(HEX_REGEX);
    expect(b).toMatch(HEX_REGEX);
    expect(a).not.toBe(b);
  });
});

describe('getOrCreateContextHash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with mock storage', () => {
    it('first call stores and returns hash, second call returns same (reuse)', () => {
      let stored: string | null = null;
      const storage: StorageLike = {
        getItem: vi.fn(() => stored),
        setItem: vi.fn((_k: string, v: string) => {
          stored = v;
        }),
      };
      const first = getOrCreateContextHash(storage);
      const second = getOrCreateContextHash(storage);

      expect(first).toMatch(HEX_REGEX);
      expect(first).toHaveLength(64);
      expect(second).toBe(first);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(storage.setItem).toHaveBeenCalledWith('trymellon_context_hash', first);
      expect(storage.getItem).toHaveBeenCalledWith('trymellon_context_hash');
    });

    it('when storage already has valid hash, returns it without calling setItem', () => {
      const existingHash = 'a'.repeat(64);
      const storage: StorageLike = {
        getItem: vi.fn().mockReturnValue(existingHash),
        setItem: vi.fn(),
      };
      const result = getOrCreateContextHash(storage);
      expect(result).toBe(existingHash);
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('two different storage instances yield different hashes', () => {
      const storage1: StorageLike = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      };
      const storage2: StorageLike = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      };
      const hash1 = getOrCreateContextHash(storage1);
      const hash2 = getOrCreateContextHash(storage2);
      expect(hash1).toMatch(HEX_REGEX);
      expect(hash2).toMatch(HEX_REGEX);
      expect(hash1).not.toBe(hash2);
    });

    it('clear storage between calls → next call returns new hash', () => {
      let stored: string | null = null;
      const storage: StorageLike = {
        getItem: vi.fn(() => stored),
        setItem: vi.fn((_k, v) => {
          stored = v;
        }),
      };
      const first = getOrCreateContextHash(storage);
      const second = getOrCreateContextHash(storage);
      expect(second).toBe(first);
      stored = null;
      const afterClear = getOrCreateContextHash(storage);
      expect(afterClear).toMatch(HEX_REGEX);
      expect(afterClear).not.toBe(first);
    });
  });

  describe('when storage unavailable (undefined or getItem/setItem throw)', () => {
    it('uses in-memory fallback; two calls in same session return same hash', () => {
      const storageUnavailable: StorageLike = {
        getItem: vi.fn(() => {
          throw new Error('QuotaExceeded');
        }),
        setItem: vi.fn(() => {
          throw new Error('QuotaExceeded');
        }),
      };
      const first = getOrCreateContextHash(storageUnavailable);
      const second = getOrCreateContextHash(storageUnavailable);
      expect(first).toMatch(HEX_REGEX);
      expect(first).toHaveLength(64);
      expect(second).toBe(first);
    });

    it('when storage is undefined, uses in-memory fallback and same hash on second call', () => {
      const first = getOrCreateContextHash(undefined);
      const second = getOrCreateContextHash(undefined);
      expect(first).toMatch(HEX_REGEX);
      expect(second).toBe(first);
    });
  });
});
