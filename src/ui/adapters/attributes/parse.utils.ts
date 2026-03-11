/**
 * Pure helpers for DOM attribute parsing (string | null) → type. Shared by inline and modal adapters. No external deps; adapters layer.
 */

export function parseString(value: string | null): string {
  if (value == null || value.trim() === '') return '';
  return value.trim();
}

export function parseOptionalString(value: string | null): string | null {
  const s = parseString(value);
  return s === '' ? null : s;
}

/**
 * Parses boolean attribute (HTML semantics: presence = true). Any present value including "" is true; only null is false.
 */
export function parseBoolean(value: string | null): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === '';
}

export function parseOptionalBoolean(value: string | null): boolean | null {
  if (value == null || value.trim() === '') return null;
  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return null;
}

/**
 * Parses string to one of allowed values; null or empty → fallback. Normalizes trim + lowercase.
 */
export function parseEnum<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  if (value == null || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (allowed.includes(normalized as T)) return normalized as T;
  return fallback;
}

/**
 * Like parseEnum but returns undefined when attribute is missing or invalid. For optional fields without default.
 */
export function parseOptionalEnum<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined {
  if (value == null || value.trim() === '') return undefined;
  const normalized = value.trim().toLowerCase();
  if (allowed.includes(normalized as T)) return normalized as T;
  return undefined;
}
