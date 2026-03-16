import type { ContextHash } from '../types';

const CONTEXT_HASH_KEY = 'trymellon_context_hash';
const HEX_BYTES = 32;
const CONTEXT_HASH_HEX_REGEX = /^[a-f0-9]{64}$/;

/**
 * Single source of truth for "valid 64-char hex context hash".
 * Used when reading from storage and when generating.
 */
export function isValidContextHash(value: unknown): value is ContextHash {
  return typeof value === 'string' && CONTEXT_HASH_HEX_REGEX.test(value);
}

/**
 * Generates a 64-character hex string (32 bytes CSPRNG). No I/O.
 */
export function generateContextHash(): string {
  const bytes = new Uint8Array(HEX_BYTES);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    throw new Error('crypto.getRandomValues is not available');
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex as ContextHash;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * In-memory StorageLike for fallback when sessionStorage is unavailable (e.g. private browsing).
 * State is encapsulated in the returned object; no module-level mutable variable.
 */
export function createInMemoryStorage(): StorageLike {
  let value: string | null = null;
  return {
    getItem() {
      return value;
    },
    setItem(_, v: string) {
      value = v;
    },
  };
}

const inMemoryStorageFallback = createInMemoryStorage();

/**
 * Pure: get existing valid hash from storage or create, persist, and return. Single place for the logic.
 */
function getOrCreateInStorage(storage: StorageLike): string {
  const existing = storage.getItem(CONTEXT_HASH_KEY);
  if (existing && isValidContextHash(existing)) return existing;
  const hash = generateContextHash();
  storage.setItem(CONTEXT_HASH_KEY, hash);
  return hash;
}

/**
 * Returns existing context hash from storage or creates one, persists it, and returns it.
 * If storage is omitted or throws (e.g. private browsing), uses in-memory fallback (Strategy).
 */
export function getOrCreateContextHash(storage?: StorageLike): string {
  const effectiveStorage = storage ?? inMemoryStorageFallback;
  try {
    return getOrCreateInStorage(effectiveStorage);
  } catch {
    return getOrCreateInStorage(inMemoryStorageFallback);
  }
}
