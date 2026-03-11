import { describe, it, expect } from 'vitest';
import {
  parseModalAttributesFromElement,
  type ParsedModalAttributes,
} from '../../../src/ui/adapters/attributes/modal.adapter';
import {
  DEFAULT_MODAL_DISPLAY_MODE,
  DEFAULT_TAB,
  DEFAULT_TAB_LABELS,
  DEFAULT_THEME,
} from '../../../src/ui/domain/contracts/constants';

describe('ui/adapters/dom-modal-attributes.adapter', () => {
  it('returns defaults when element has no attributes', () => {
    const el = document.createElement('div');
    const parsed = parseModalAttributesFromElement(el) as ParsedModalAttributes;
    expect(parsed.mode).toBe(DEFAULT_MODAL_DISPLAY_MODE);
    expect(parsed.tab).toBe(DEFAULT_TAB);
    expect(parsed.tabLabels).toEqual(DEFAULT_TAB_LABELS);
    expect(parsed.theme).toBe(DEFAULT_THEME);
    expect(parsed.sessionId).toBeNull();
    expect(parsed.onboardingUrl).toBeNull();
    expect(parsed.isMobileOverride).toBeNull();
    expect(parsed.fallbackType).toBeUndefined();
    expect(parsed.modalVariant).toBe('default');
  });

  it('parses modal attributes including tab-labels, fallback-type and overrides', () => {
    const el = document.createElement('div');
    el.setAttribute('open', '');
    el.setAttribute('mode', 'inline');
    el.setAttribute('tab', 'login');
    el.setAttribute('tab-labels', 'Register here,Login here');
    el.setAttribute('theme', 'dark');
    el.setAttribute('session-id', 'sess_1');
    el.setAttribute('onboarding-url', 'https://example.com/onboarding');
    el.setAttribute('is-mobile-override', 'true');
    el.setAttribute('fallback-type', 'email');
    el.setAttribute('app-id', 'app_x');
    el.setAttribute('publishable-key', 'pk_x');

    const parsed = parseModalAttributesFromElement(el) as ParsedModalAttributes;
    expect(parsed.open).toBe(true);
    expect(parsed.mode).toBe('inline');
    expect(parsed.tab).toBe('login');
    expect(parsed.tabLabels).toEqual({ register: 'Register here', login: 'Login here' });
    expect(parsed.theme).toBe('dark');
    expect(parsed.sessionId).toBe('sess_1');
    expect(parsed.onboardingUrl).toBe('https://example.com/onboarding');
    expect(parsed.isMobileOverride).toBe(true);
    expect(parsed.fallbackType).toBe('email');
    expect(parsed.appId).toBe('app_x');
    expect(parsed.publishableKey).toBe('pk_x');
  });

  it('parses modal-variant minimal and normalizes case', () => {
    const el = document.createElement('div');
    el.setAttribute('modal-variant', 'minimal');
    const parsed = parseModalAttributesFromElement(el) as ParsedModalAttributes;
    expect(parsed.modalVariant).toBe('minimal');
    el.setAttribute('modal-variant', 'MINIMAL');
    expect(parseModalAttributesFromElement(el).modalVariant).toBe('minimal');
  });

  it('returns modalVariant default when attribute missing or invalid', () => {
    const el = document.createElement('div');
    expect(parseModalAttributesFromElement(el).modalVariant).toBe('default');
    el.setAttribute('modal-variant', 'drawer');
    expect(parseModalAttributesFromElement(el).modalVariant).toBe('default');
  });
});
