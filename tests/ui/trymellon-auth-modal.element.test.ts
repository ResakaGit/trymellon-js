import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TryMellonAuthModalElement } from '../../src/ui/presentation/trymellon-auth-modal.element';
import type { ParsedModalAttributes } from '../../src/ui/adapters/attributes/modal.adapter';
import type { CoreConfig } from '../../src/ui/adapters/infra/core-factory.adapter';

/** Test-only surface for protected/private modal API. */
interface ModalTestAccess {
  _parsed: ParsedModalAttributes;
  canStartAuth(): boolean;
  getCoreConfig(): CoreConfig | null;
}

if (typeof customElements !== 'undefined' && !customElements.get('trymellon-auth-modal')) {
  customElements.define('trymellon-auth-modal', TryMellonAuthModalElement);
}

describe('TryMellonAuthModalElement shell and interactions', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('initializes shadow DOM and modal structure on connect', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);

    const shadow = el.shadowRoot;
    expect(shadow).not.toBeNull();
    expect(shadow?.mode).toBe('open');

    const wrapper = shadow?.querySelector('.mellon-modal-wrapper');
    const panel = shadow?.querySelector('.mellon-modal-panel');
    const tabs = shadow?.querySelector('.mellon-modal-tabs');
    expect(wrapper).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(tabs).not.toBeNull();
  });

  it('modal-variant minimal: setAttribute sets data-mellon-modal-variant on wrapper', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    el.setAttribute('modal-variant', 'minimal');
    container.appendChild(el);

    const wrapper = el.shadowRoot?.querySelector('.mellon-modal-wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-mellon-modal-variant')).toBe('minimal');
  });

  it('emits mellon:open when open attribute toggles from false to true', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);

    const received: CustomEvent[] = [];
    el.addEventListener('mellon:open', ((e: CustomEvent) => {
      received.push(e);
    }) as unknown as EventListener);

    el.setAttribute('open', 'true');

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('mellon:open');
  });

  it('updates tab attribute and emits mellon:tab-change when clicking tab buttons', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);

    const shadow = el.shadowRoot;
    expect(shadow).not.toBeNull();
    if (!shadow) return;
    const tabs = shadow.querySelector('.mellon-modal-tabs');
    expect(tabs).not.toBeNull();
    if (!tabs) return;
    const loginButton = tabs.querySelector<HTMLButtonElement>('[data-tab="login"]');
    const registerButton = tabs.querySelector<HTMLButtonElement>('[data-tab="register"]');
    expect(loginButton).not.toBeNull();
    expect(registerButton).not.toBeNull();
    if (!loginButton || !registerButton) return;

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:tab-change', handler);

    loginButton.click();
    expect(received.length).toBe(1);
    expect(received[0].detail).toEqual({ tab: 'login' });
    expect(el.getAttribute('tab')).toBe('login');

    registerButton.click();
    expect(received.length).toBe(2);
    expect(received[1].detail).toEqual({ tab: 'register' });
    expect(el.getAttribute('tab')).toBe('register');
  });

  it('dispatches mellon:close with reason=user when reset is called while open', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);

    el.open = true;

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:close', handler);

    el.reset();

    expect(received.length).toBe(1);
    expect(received[0].detail).toMatchObject({ reason: 'user' });
  });

  it('sets and reads convenience properties (theme, sessionId, onboardingUrl, isMobileOverride, fallbackType, appId, publishableKey)', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    container.appendChild(el);

    el.theme = 'dark';
    el.sessionId = 'sess_1';
    el.onboardingUrl = 'https://example.com/onboarding';
    el.isMobileOverride = true;
    el.fallbackType = 'email';
    el.appId = 'app_x';
    el.publishableKey = 'pk_x';

    expect(el.getAttribute('theme')).toBe('dark');
    expect(el.getAttribute('session-id')).toBe('sess_1');
    expect(el.getAttribute('onboarding-url')).toBe('https://example.com/onboarding');
    expect(el.getAttribute('is-mobile-override')).toBe('true');
    expect(el.getAttribute('fallback-type')).toBe('email');
    expect(el.getAttribute('app-id')).toBe('app_x');
    expect(el.getAttribute('publishable-key')).toBe('pk_x');
  });

  it('canStartAuth requires non-empty sessionId when tab is register', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    container.appendChild(el);

    const access = el as unknown as ModalTestAccess;
    const baseParsed = access._parsed as ParsedModalAttributes & {
      tab: string;
      sessionId: string | null;
    };
    // Passkey register is always allowed; external user id is optional (SDK uses UUID when not set).
    access._parsed = { ...baseParsed, tab: 'register', sessionId: null };
    expect(access.canStartAuth()).toBe(true);

    access._parsed = { ...baseParsed, tab: 'register', sessionId: 'sess_1' };
    expect(access.canStartAuth()).toBe(true);
  });

  it('mellon:close has reason success when state is SUCCESS and reset() is called', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);
    el.open = true;
    el.setStateForRender('SUCCESS');

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:close', handler);
    el.reset();

    expect(received).toHaveLength(1);
    expect(received[0].detail).toMatchObject({ reason: 'success' });
    expect(typeof (received[0].detail as { timestamp?: number }).timestamp).toBe('number');
  });

  it('mellon:close has reason cancel when state is AUTHENTICATING and open is set to false', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);
    el.setAttribute('open', 'true');
    el.setStateForRender('AUTHENTICATING');

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:close', handler);
    el.setAttribute('open', 'false');

    expect(received).toHaveLength(1);
    expect(received[0].detail).toMatchObject({ reason: 'cancel' });
    expect(typeof (received[0].detail as { timestamp?: number }).timestamp).toBe('number');
  });

  it('mellon:close has reason error when state is ERROR and reset() is called', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);
    el.open = true;
    el.setStateForRender('ERROR');

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:close', handler);
    el.reset();

    expect(received).toHaveLength(1);
    expect(received[0].detail).toMatchObject({ reason: 'error' });
    expect(typeof (received[0].detail as { timestamp?: number }).timestamp).toBe('number');
  });

  it('changing app-id triggers teardown and re-eval (attributeChangedCallback branch)', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_1');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);

    el.setAttribute('app-id', 'app_2');
    expect(el.getAttribute('app-id')).toBe('app_2');
  });

  it('changing publishable-key triggers teardown and re-eval (attributeChangedCallback branch)', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_1');
    container.appendChild(el);

    el.setAttribute('publishable-key', 'pk_2');
    expect(el.getAttribute('publishable-key')).toBe('pk_2');
  });

  it('tab attribute change triggers tabChange and re-render', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);

    el.setAttribute('tab', 'register');
    expect(el.getAttribute('tab')).toBe('register');
    el.setAttribute('tab', 'login');
    expect(el.getAttribute('tab')).toBe('login');
  });

  it('tabLabels getter returns comma-separated string; setter with empty removes attribute', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('tab-labels', 'Reg,Log');
    container.appendChild(el);
    expect(el.tabLabels).toBe('Reg,Log');
    el.tabLabels = '';
    expect(el.getAttribute('tab-labels')).toBeNull();
    el.tabLabels = 'A,B';
    expect(el.getAttribute('tab-labels')).toBe('A,B');
  });

  it('sessionId and onboardingUrl setters remove attribute when null', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    container.appendChild(el);
    el.sessionId = 's1';
    expect(el.getAttribute('session-id')).toBe('s1');
    el.sessionId = null;
    expect(el.getAttribute('session-id')).toBeNull();
    el.onboardingUrl = 'https://x.com';
    expect(el.getAttribute('onboarding-url')).toBe('https://x.com');
    el.onboardingUrl = null;
    expect(el.getAttribute('onboarding-url')).toBeNull();
  });

  describe('QR area states', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets data-qr-area-state="waiting" when opened without injected QR', () => {
      const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
      el.setAttribute('app-id', 'app_test');
      el.setAttribute('publishable-key', 'pk_test');
      container.appendChild(el);

      el.setAttribute('open', 'true');

      const wrap = el.shadowRoot?.querySelector<HTMLElement>('.mellon-cross-device-wrap');
      expect(wrap).not.toBeNull();
      expect(wrap?.getAttribute('data-qr-area-state')).toBe('waiting');
    });

    it('moves to loaded when a node is injected into the cross-device slot', async () => {
      const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
      el.setAttribute('app-id', 'app_test');
      el.setAttribute('publishable-key', 'pk_test');
      container.appendChild(el);

      el.setAttribute('open', 'true');

      const qrNode = document.createElement('div');
      qrNode.slot = 'cross-device';
      el.appendChild(qrNode);

      await Promise.resolve();

      const wrap = el.shadowRoot?.querySelector<HTMLElement>('.mellon-cross-device-wrap');
      expect(wrap).not.toBeNull();
      expect(wrap?.getAttribute('data-qr-area-state')).toBe('loaded');

      vi.advanceTimersByTime(20_000);
      expect(wrap?.getAttribute('data-qr-area-state')).toBe('loaded');
    });

    it('moves to timeout when no QR is injected before qr-load-timeout-ms', () => {
      const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
      el.setAttribute('app-id', 'app_test');
      el.setAttribute('publishable-key', 'pk_test');
      el.setAttribute('qr-load-timeout-ms', '5000');
      container.appendChild(el);

      el.setAttribute('open', 'true');

      const wrap = el.shadowRoot?.querySelector<HTMLElement>('.mellon-cross-device-wrap');
      expect(wrap).not.toBeNull();
      expect(wrap?.getAttribute('data-qr-area-state')).toBe('waiting');

      vi.advanceTimersByTime(6000);

      expect(wrap?.getAttribute('data-qr-area-state')).toBe('timeout');
    });

    it('uses a single square wrapper where skeleton is replaced by QR content on load', async () => {
      const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
      el.setAttribute('app-id', 'app_test');
      el.setAttribute('publishable-key', 'pk_test');
      container.appendChild(el);

      el.setAttribute('open', 'true');

      const root = el.shadowRoot;
      expect(root).not.toBeNull();
      if (!root) return;

      const wrap = root.querySelector<HTMLElement>('.mellon-cross-device-wrap');
      const skeleton = root.querySelector<HTMLElement>('.mellon-cross-device-skeleton');
      const slotWrap = root.querySelector<HTMLElement>('.mellon-cross-device-slot-wrap');

      expect(wrap).not.toBeNull();
      expect(skeleton).not.toBeNull();
      expect(slotWrap).not.toBeNull();
      expect(wrap?.getAttribute('data-qr-area-state')).toBe('waiting');

      const slot = root.querySelector<HTMLSlotElement>('slot[name="cross-device"]');
      expect(slot).not.toBeNull();
      expect(slot?.assignedNodes().length).toBe(0);

      const qrContainer = document.createElement('div');
      qrContainer.slot = 'cross-device';
      const qrImg = document.createElement('img');
      qrImg.src = 'data:image/png;base64,xyz';
      qrContainer.appendChild(qrImg);
      el.appendChild(qrContainer);

      await Promise.resolve();

      const wrapAfter = root.querySelector<HTMLElement>('.mellon-cross-device-wrap');
      const skeletonAfter = root.querySelector<HTMLElement>('.mellon-cross-device-skeleton');
      const slotAfter = root.querySelector<HTMLSlotElement>('slot[name="cross-device"]');

      expect(wrapAfter).toBe(wrap);
      expect(skeletonAfter).not.toBeNull();
      expect(wrapAfter?.getAttribute('data-qr-area-state')).toBe('loaded');
      expect(slotAfter?.assignedNodes().length).toBeGreaterThan(0);
    });
  });

  it('isMobileOverride and fallbackType setters remove attribute when null/undefined', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    container.appendChild(el);
    el.isMobileOverride = true;
    expect(el.getAttribute('is-mobile-override')).toBe('true');
    el.isMobileOverride = null;
    expect(el.getAttribute('is-mobile-override')).toBeNull();
    el.fallbackType = 'email';
    expect(el.getAttribute('fallback-type')).toBe('email');
    el.fallbackType = undefined;
    expect(el.getAttribute('fallback-type')).toBeNull();
  });

  it('getCoreConfig returns null when appId or publishableKey empty', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    container.appendChild(el);
    const access = el as unknown as ModalTestAccess;
    expect(access.getCoreConfig()).toBeNull();
    el.setAttribute('app-id', 'app_x');
    expect(access.getCoreConfig()).toBeNull();
    el.setAttribute('publishable-key', 'pk_x');
    expect(access.getCoreConfig()).toEqual({ appId: 'app_x', publishableKey: 'pk_x' });
  });

  it('click outside tab buttons delegates to base (_handleShadowClick)', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);
    const root = el.shadowRoot;
    expect(root).not.toBeNull();
    if (!root) return;
    const panel = root.querySelector('.mellon-modal-panel');
    expect(panel).not.toBeNull();
    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:tab-change', handler);
    (panel as HTMLElement).click();
    expect(received).toHaveLength(0);
  });

  it('mode and theme getters reflect parsed attributes', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('mode', 'inline');
    el.setAttribute('theme', 'dark');
    container.appendChild(el);
    expect(el.mode).toBe('inline');
    expect(el.theme).toBe('dark');
    el.mode = 'modal';
    el.theme = 'light';
    expect(el.getAttribute('mode')).toBe('modal');
    expect(el.getAttribute('theme')).toBe('light');
  });

  it('appId and publishableKey getters reflect parsed attributes', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'my_app');
    el.setAttribute('publishable-key', 'pk_live');
    container.appendChild(el);
    expect(el.appId).toBe('my_app');
    expect(el.publishableKey).toBe('pk_live');
  });

  it('re-connected element with existing shadowRoot re-attaches bridge and runs env eval', () => {
    const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);
    const shadow = el.shadowRoot;
    expect(shadow).not.toBeNull();
    container.removeChild(el);
    container.appendChild(el);
    expect(el.shadowRoot).toBe(shadow);
  });

  describe('focus trap (E1)', () => {
    /** In jsdom focus may be reported on the shadow host; in browser on the inner node. */
    function isFocusWithinModal(modalEl: TryMellonAuthModalElement): boolean {
      const active = document.activeElement;
      if (!active) return false;
      return active === modalEl || (modalEl.shadowRoot?.contains(active) ?? false);
    }

    it('when modal is open, focus remains inside the modal', () => {
      const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
      el.setAttribute('app-id', 'app_test');
      el.setAttribute('publishable-key', 'pk_test');
      container.appendChild(el);

      el.setAttribute('open', 'true');

      expect(document.activeElement).not.toBeNull();
      expect(isFocusWithinModal(el)).toBe(true);
    });

    it('Tab cycles focus within the modal (Tab / Shift+Tab do not escape)', () => {
      const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
      el.setAttribute('app-id', 'app_test');
      el.setAttribute('publishable-key', 'pk_test');
      container.appendChild(el);
      el.setAttribute('open', 'true');

      const root = el.shadowRoot;
      expect(root).not.toBeNull();
      if (!root) return;
      const wrapper = root.querySelector<HTMLElement>('.mellon-modal-wrapper');
      expect(wrapper).not.toBeNull();
      if (!wrapper) return;
      const wrapperEl = wrapper;
      const focusables = wrapperEl.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      expect(focusables.length).toBeGreaterThanOrEqual(2);
      expect(isFocusWithinModal(el)).toBe(true);

      wrapperEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true })
      );
      expect(isFocusWithinModal(el)).toBe(true);

      wrapperEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
      );
      expect(isFocusWithinModal(el)).toBe(true);
    });

    it('on close, focus is restored and not left inside the hidden modal', () => {
      const buttonOutside = document.createElement('button');
      buttonOutside.textContent = 'Outside';
      container.appendChild(buttonOutside);
      buttonOutside.focus();
      expect(document.activeElement).toBe(buttonOutside);

      const el = document.createElement('trymellon-auth-modal') as TryMellonAuthModalElement;
      el.setAttribute('app-id', 'app_test');
      el.setAttribute('publishable-key', 'pk_test');
      container.appendChild(el);
      el.setAttribute('open', 'true');

      expect(isFocusWithinModal(el)).toBe(true);

      el.setAttribute('open', 'false');

      expect(isFocusWithinModal(el)).toBe(false);
      expect(document.activeElement).toBe(buttonOutside);
    });
  });
});
