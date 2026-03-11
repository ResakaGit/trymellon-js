import { describe, it, expect } from 'vitest';
import {
  parseString,
  parseOptionalString,
  parseBoolean,
  parseOptionalBoolean,
  parseEnum,
  parseOptionalEnum,
} from '../../../src/ui/adapters/attributes/parse.utils';

describe('ui/adapters/dom-parse.utils', () => {
  describe('parseString', () => {
    it('returns empty string for null or whitespace-only', () => {
      expect(parseString(null)).toBe('');
      expect(parseString('')).toBe('');
      expect(parseString('  ')).toBe('');
    });
    it('returns trimmed value', () => {
      expect(parseString('  foo  ')).toBe('foo');
    });
  });

  describe('parseOptionalString', () => {
    it('returns null for empty after trim', () => {
      expect(parseOptionalString(null)).toBeNull();
      expect(parseOptionalString('')).toBeNull();
      expect(parseOptionalString('  ')).toBeNull();
    });
    it('returns trimmed string when non-empty', () => {
      expect(parseOptionalString('  bar  ')).toBe('bar');
    });
  });

  describe('parseBoolean', () => {
    it('returns false when value is null', () => {
      expect(parseBoolean(null)).toBe(false);
    });
    it('returns true for empty string (HTML presence semantics)', () => {
      expect(parseBoolean('')).toBe(true);
      expect(parseBoolean('  ')).toBe(true);
    });
    it('returns true for "true", "1" (case-insensitive)', () => {
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('1')).toBe(true);
    });
    it('returns false for "false", "0", or other values', () => {
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean('other')).toBe(false);
    });
  });

  describe('parseOptionalBoolean', () => {
    it('returns null when value is null or whitespace-only', () => {
      expect(parseOptionalBoolean(null)).toBeNull();
      expect(parseOptionalBoolean('')).toBeNull();
      expect(parseOptionalBoolean('  ')).toBeNull();
    });
    it('returns true for "true" or "1"', () => {
      expect(parseOptionalBoolean('true')).toBe(true);
      expect(parseOptionalBoolean('1')).toBe(true);
    });
    it('returns false for "false" or "0"', () => {
      expect(parseOptionalBoolean('false')).toBe(false);
      expect(parseOptionalBoolean('0')).toBe(false);
    });
    it('returns null for invalid value', () => {
      expect(parseOptionalBoolean('other')).toBeNull();
    });
  });

  describe('parseEnum', () => {
    const allowed = ['a', 'b'] as const;
    it('returns fallback when null or empty', () => {
      expect(parseEnum(null, allowed, 'a')).toBe('a');
      expect(parseEnum('', allowed, 'a')).toBe('a');
      expect(parseEnum('  ', allowed, 'a')).toBe('a');
    });
    it('returns normalized value when in allowed', () => {
      expect(parseEnum('A', allowed, 'a')).toBe('a');
      expect(parseEnum('b', allowed, 'a')).toBe('b');
    });
    it('returns fallback when value not in allowed', () => {
      expect(parseEnum('c', allowed, 'a')).toBe('a');
    });
  });

  describe('parseOptionalEnum', () => {
    const allowed = ['x', 'y'] as const;
    it('returns undefined when null or empty', () => {
      expect(parseOptionalEnum(null, allowed)).toBeUndefined();
      expect(parseOptionalEnum('', allowed)).toBeUndefined();
      expect(parseOptionalEnum('  ', allowed)).toBeUndefined();
    });
    it('returns normalized value when in allowed', () => {
      expect(parseOptionalEnum('X', allowed)).toBe('x');
      expect(parseOptionalEnum('y', allowed)).toBe('y');
    });
    it('returns undefined when value not in allowed', () => {
      expect(parseOptionalEnum('z', allowed)).toBeUndefined();
    });
  });
});
