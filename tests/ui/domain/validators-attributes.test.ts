import { describe, it, expect } from 'vitest';
import {
  isParsedAttributes,
  isTabLabels,
  isParsedModalAttributes,
  defaultParsedAttributes,
  defaultParsedModalAttributes,
  ensureParsedAttributes,
  ensureParsedModalAttributes,
} from '../../../src/ui/domain/validators/validators-attributes';
import {
  DEFAULT_PARSED_ATTRIBUTES,
  DEFAULT_PARSED_MODAL_ATTRIBUTES,
} from '../../../src/ui/domain/contracts/constants';

describe('ui/domain/validators-attributes', () => {
  describe('isParsedAttributes', () => {
    it('returns true for valid ParsedAttributes', () => {
      const valid = {
        appId: 'app',
        publishableKey: 'pk',
        mode: 'login',
        theme: 'light',
        externalUserId: null,
        action: 'open-modal',
        triggerOnly: false,
        buttonVariant: 'default',
      };
      expect(isParsedAttributes(valid)).toBe(true);
    });
    it('returns true for ParsedAttributes with buttonVariant pill', () => {
      const valid = {
        appId: 'app',
        publishableKey: 'pk',
        mode: 'login',
        theme: 'light',
        externalUserId: null,
        action: 'open-modal',
        triggerOnly: false,
        buttonVariant: 'pill',
      };
      expect(isParsedAttributes(valid)).toBe(true);
    });
    it('returns false when buttonVariant is invalid', () => {
      expect(isParsedAttributes({ ...DEFAULT_PARSED_ATTRIBUTES, buttonVariant: 'compact' })).toBe(
        false
      );
    });
    it('returns false for null or non-object', () => {
      expect(isParsedAttributes(null)).toBe(false);
      expect(isParsedAttributes(42)).toBe(false);
    });
    it('returns false when appId or publishableKey is not string', () => {
      expect(isParsedAttributes({ ...DEFAULT_PARSED_ATTRIBUTES, appId: 1 })).toBe(false);
    });
    it('returns false when mode or theme is invalid', () => {
      expect(isParsedAttributes({ ...DEFAULT_PARSED_ATTRIBUTES, mode: 'invalid' })).toBe(false);
    });
  });

  describe('isTabLabels', () => {
    it('returns true for object with register and login strings', () => {
      expect(isTabLabels({ register: 'Reg', login: 'Log' })).toBe(true);
    });
    it('returns false for null or non-object', () => {
      expect(isTabLabels(null)).toBe(false);
      expect(isTabLabels('x')).toBe(false);
    });
    it('returns false when register or login is not string', () => {
      expect(isTabLabels({ register: 1, login: 'Log' })).toBe(false);
    });
  });

  describe('isParsedModalAttributes', () => {
    it('returns true for valid ParsedModalAttributes', () => {
      const valid = {
        ...DEFAULT_PARSED_MODAL_ATTRIBUTES,
        open: false,
        tab: 'login',
        tabLabels: { register: 'Reg', login: 'Log' },
        modalVariant: 'default',
      };
      expect(isParsedModalAttributes(valid)).toBe(true);
    });
    it('returns true for ParsedModalAttributes with modalVariant minimal', () => {
      const valid = {
        ...DEFAULT_PARSED_MODAL_ATTRIBUTES,
        open: true,
        tab: 'register',
        tabLabels: { register: 'R', login: 'L' },
        modalVariant: 'minimal',
      };
      expect(isParsedModalAttributes(valid)).toBe(true);
    });
    it('returns false when modalVariant is invalid', () => {
      const bad = { ...DEFAULT_PARSED_MODAL_ATTRIBUTES, modalVariant: 'drawer' };
      expect(isParsedModalAttributes(bad)).toBe(false);
    });
    it('returns false for null or non-object', () => {
      expect(isParsedModalAttributes(null)).toBe(false);
    });
    it('returns false when fallbackType is invalid', () => {
      const bad = { ...DEFAULT_PARSED_MODAL_ATTRIBUTES, fallbackType: 'sms' };
      expect(isParsedModalAttributes(bad)).toBe(false);
    });
  });

  describe('defaultParsedAttributes / defaultParsedModalAttributes', () => {
    it('defaultParsedAttributes returns default object', () => {
      const d = defaultParsedAttributes();
      expect(d.mode).toBe('login');
      expect(d.theme).toBe('light');
      expect(d.appId).toBe('');
      expect(d.publishableKey).toBe('');
    });
    it('defaultParsedModalAttributes returns default object', () => {
      const d = defaultParsedModalAttributes();
      expect(d.open).toBe(false);
      expect(d.tab).toBe('register');
      expect(d.mode).toBe('modal');
    });
  });

  describe('ensureParsedAttributes / ensureParsedModalAttributes', () => {
    it('ensureParsedAttributes returns value when valid', () => {
      const valid = {
        appId: 'a',
        publishableKey: 'p',
        mode: 'login',
        theme: 'light',
        externalUserId: null,
        action: 'open-modal',
        triggerOnly: false,
        buttonVariant: 'default',
      };
      expect(ensureParsedAttributes(valid)).toBe(valid);
    });
    it('ensureParsedAttributes returns default with buttonVariant default when input missing buttonVariant', () => {
      const withoutVariant = {
        appId: 'a',
        publishableKey: 'p',
        mode: 'login',
        theme: 'light',
        externalUserId: null,
        action: 'open-modal',
        triggerOnly: false,
      };
      const result = ensureParsedAttributes(withoutVariant);
      expect(result.buttonVariant).toBe('default');
    });
    it('ensureParsedModalAttributes returns default with modalVariant default when input missing modalVariant', () => {
      const withoutVariant = { ...DEFAULT_PARSED_MODAL_ATTRIBUTES, open: true };
      const result = ensureParsedModalAttributes(withoutVariant);
      expect(result.modalVariant).toBe('default');
    });
    it('ensureParsedAttributes returns default when invalid', () => {
      expect(ensureParsedAttributes(null)).toEqual(DEFAULT_PARSED_ATTRIBUTES);
    });
    it('ensureParsedModalAttributes returns value when valid', () => {
      const valid = {
        ...DEFAULT_PARSED_MODAL_ATTRIBUTES,
        open: true,
        tab: 'register',
        tabLabels: { register: 'R', login: 'L' },
      };
      expect(ensureParsedModalAttributes(valid)).toBe(valid);
    });
    it('ensureParsedModalAttributes returns default when invalid', () => {
      expect(ensureParsedModalAttributes(null)).toEqual(DEFAULT_PARSED_MODAL_ATTRIBUTES);
    });
  });
});
