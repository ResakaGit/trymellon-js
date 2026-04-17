import { describe, it, expect } from 'vitest';
import {
  isObject,
  isNumber,
  isBoolean,
  isArray,
  validationError,
  required,
  optionalString,
  validateUserEntity,
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

  describe('validateUserEntity — F1 anonymous support (ADR-039)', () => {
    it('Given registered user, when validated, then returns user with external_user_id string and no is_anonymous', () => {
      const result = validateUserEntity(
        {
          user_id: 'usr_1',
          external_user_id: 'ext_1',
          email: 'a@b.com',
        },
        null
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.user_id).toBe('usr_1');
      expect(result.value.external_user_id).toBe('ext_1');
      expect(result.value.email).toBe('a@b.com');
      expect(result.value.is_anonymous).toBeUndefined();
    });

    it('Given anonymous user (null external_user_id), when validated, then returns external_user_id=null', () => {
      const result = validateUserEntity(
        {
          user_id: 'usr_anon',
          external_user_id: null,
          is_anonymous: true,
        },
        null
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.user_id).toBe('usr_anon');
      expect(result.value.external_user_id).toBeNull();
      expect(result.value.is_anonymous).toBe(true);
    });

    it('Given is_anonymous=false explicit, when validated, then field is preserved', () => {
      const result = validateUserEntity(
        { user_id: 'usr_1', external_user_id: 'ext_1', is_anonymous: false },
        null
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.is_anonymous).toBe(false);
    });

    it('Given external_user_id of invalid type (number), when validated, then returns err with field hint', () => {
      const result = validateUserEntity({ user_id: 'usr_1', external_user_id: 42 }, null);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('external_user_id must be string or null');
    });

    it('Given is_anonymous of invalid type (string), when validated, then returns err', () => {
      const result = validateUserEntity(
        { user_id: 'usr_1', external_user_id: 'ext_1', is_anonymous: 'true' },
        null
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toContain('is_anonymous must be boolean');
    });

    it('Given user is not an object, when validated, then returns err with field=user', () => {
      const result = validateUserEntity('not-an-object', null);
      expect(result.ok).toBe(false);
    });
  });
});
