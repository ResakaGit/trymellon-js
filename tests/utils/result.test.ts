import { describe, it, expect } from 'vitest';
import { ok, err, map, mapErr, unwrap } from '../../src/utils/result';

describe('result', () => {
  describe('ok / err', () => {
    it('ok returns object with ok: true and value', () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(42);
    });

    it('err returns object with ok: false and error', () => {
      const e = new Error('fail');
      const r = err(e);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe(e);
    });
  });

  describe('map', () => {
    it('maps value when ok', () => {
      const r = map(ok(10), (n) => n * 2);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(20);
    });

    it('returns same result when err', () => {
      const original = err('error');
      const r = map(original, (n: number) => n * 2);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('error');
    });
  });

  describe('mapErr', () => {
    it('maps error when err', () => {
      const r = mapErr(err(100), (n) => String(n));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe('100');
    });

    it('returns same result when ok', () => {
      const original = ok(42);
      const r = mapErr(original, (e: string) => e.toUpperCase());
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(42);
    });
  });

  describe('unwrap', () => {
    it('returns value when ok', () => {
      expect(unwrap(ok('x'))).toBe('x');
    });

    it('throws error when err', () => {
      const error = new Error('unwrap err');
      expect(() => unwrap(err(error))).toThrow(error);
    });
  });
});
