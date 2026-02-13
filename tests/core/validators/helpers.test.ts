import { describe, it, expect } from 'vitest';
import {
  isObject,
  isNumber,
  isBoolean,
  isArray,
  validationError,
  required,
  optionalString,
} from '../../../src/core/validators/helpers';

describe('validators/helpers', () => {
  describe('optionalString', () => {
    it('should return undefined when key is missing', () => {
      expect(optionalString({}, 'foo')).toBeUndefined();
    });

    it('should return undefined when value is not a string', () => {
      expect(optionalString({ foo: 123 }, 'foo')).toBeUndefined();
      expect(optionalString({ foo: null }, 'foo')).toBeUndefined();
      expect(optionalString({ foo: {} }, 'foo')).toBeUndefined();
    });

    it('should return the string when value is string', () => {
      expect(optionalString({ foo: 'bar' }, 'foo')).toBe('bar');
    });
  });

  describe('required', () => {
    it('should return value for existing key', () => {
      expect(required({ a: 1 }, 'a')).toBe(1);
      expect(required({ x: 'y' }, 'x')).toBe('y');
    });
  });

  describe('validationError', () => {
    it('should return err with UNKNOWN_ERROR code', () => {
      const result = validationError('Invalid');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
        expect(result.error.message).toBe('Invalid');
      }
    });
  });

  describe('type guards', () => {
    it('isObject', () => {
      expect(isObject({})).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
    });
    it('isNumber', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
    });
    it('isBoolean', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(1)).toBe(false);
    });
    it('isArray', () => {
      expect(isArray([])).toBe(true);
      expect(isArray({})).toBe(false);
    });
  });
});
