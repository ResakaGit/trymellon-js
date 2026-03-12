import { describe, it, expect } from 'vitest';
import { parseAttributesFromElement } from '../../src/ui/adapters/attributes/inline.adapter';
import { parseEnum } from '../../src/ui/adapters/attributes/parse.utils';
import { UI_MODES, THEME_KINDS } from '../../src/ui/domain/validators/validators-state';
import { DEFAULT_UI_MODE, DEFAULT_THEME } from '../../src/ui/domain/contracts/constants';

describe('attributes (E.4)', () => {
  describe('parseEnum (mode)', () => {
    it('returns login when null or empty', () => {
      expect(parseEnum(null, UI_MODES, DEFAULT_UI_MODE)).toBe('login');
      expect(parseEnum('', UI_MODES, DEFAULT_UI_MODE)).toBe('login');
      expect(parseEnum('  ', UI_MODES, DEFAULT_UI_MODE)).toBe('login');
    });
    it('returns valid mode and normalizes case', () => {
      expect(parseEnum('login', UI_MODES, DEFAULT_UI_MODE)).toBe('login');
      expect(parseEnum('REGISTER', UI_MODES, DEFAULT_UI_MODE)).toBe('register');
      expect(parseEnum('auto', UI_MODES, DEFAULT_UI_MODE)).toBe('auto');
    });
    it('returns login for invalid value', () => {
      expect(parseEnum('invalid', UI_MODES, DEFAULT_UI_MODE)).toBe('login');
    });
  });

  describe('parseEnum (theme)', () => {
    it('returns fallback when null or empty', () => {
      expect(parseEnum(null, THEME_KINDS, DEFAULT_THEME)).toBe('light');
      expect(parseEnum('', THEME_KINDS, DEFAULT_THEME)).toBe('light');
    });
    it('returns valid theme and normalizes case', () => {
      expect(parseEnum('light', THEME_KINDS, DEFAULT_THEME)).toBe('light');
      expect(parseEnum('DARK', THEME_KINDS, DEFAULT_THEME)).toBe('dark');
    });
    it('returns fallback for invalid value', () => {
      expect(parseEnum('invalid', THEME_KINDS, DEFAULT_THEME)).toBe('light');
    });
  });

  describe('parseAttributesFromElement', () => {
    it('returns defaults when element has no attributes', () => {
      const el = document.createElement('div');
      const parsed = parseAttributesFromElement(el);
      expect(parsed.mode).toBe('login');
      expect(parsed.theme).toBe('light');
      expect(parsed.appId).toBe('');
      expect(parsed.publishableKey).toBe('');
      expect(parsed.externalUserId).toBeNull();
      expect(parsed.buttonVariant).toBe('default');
    });
    it('reads app-id, publishable-key, mode, theme, external-user-id', () => {
      const el = document.createElement('div');
      el.setAttribute('app-id', 'app_xxx');
      el.setAttribute('publishable-key', 'pk_yyy');
      el.setAttribute('mode', 'register');
      el.setAttribute('theme', 'dark');
      el.setAttribute('external-user-id', 'user_123');
      const parsed = parseAttributesFromElement(el);
      expect(parsed.appId).toBe('app_xxx');
      expect(parsed.publishableKey).toBe('pk_yyy');
      expect(parsed.mode).toBe('register');
      expect(parsed.theme).toBe('dark');
      expect(parsed.externalUserId).toBe('user_123');
    });
    it('returns buttonVariant default when attribute missing or invalid', () => {
      const el = document.createElement('div');
      expect(parseAttributesFromElement(el).buttonVariant).toBe('default');
      el.setAttribute('button-variant', 'invalid');
      expect(parseAttributesFromElement(el).buttonVariant).toBe('default');
    });
    it('parses button-variant pill and normalizes case', () => {
      const el = document.createElement('div');
      el.setAttribute('button-variant', 'pill');
      expect(parseAttributesFromElement(el).buttonVariant).toBe('pill');
      el.setAttribute('button-variant', 'PILL');
      expect(parseAttributesFromElement(el).buttonVariant).toBe('pill');
    });
    it('parses button-variant default', () => {
      const el = document.createElement('div');
      el.setAttribute('button-variant', 'default');
      expect(parseAttributesFromElement(el).buttonVariant).toBe('default');
    });

    it('parses button-label into parsed buttonLabel', () => {
      const el = document.createElement('div');
      el.setAttribute('button-label', 'Sign in');
      const parsed = parseAttributesFromElement(el);
      expect(parsed.buttonLabel).toBe('Sign in');
    });

    it('parses button-aria-label into parsed buttonAriaLabel', () => {
      const el = document.createElement('div');
      el.setAttribute('button-aria-label', 'Sign in with TryMellon');
      const parsed = parseAttributesFromElement(el);
      expect(parsed.buttonAriaLabel).toBe('Sign in with TryMellon');
    });
  });
});
