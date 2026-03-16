import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TryMellonAuthElement } from '../../src/ui/presentation/trymellon-auth.element';
import { TryMellon } from '../../src/core/trymellon';
import {
  eventBridgeAdapter,
  MELLON_FALLBACK,
  MELLON_CANCELLED,
  MELLON_START,
  MELLON_OPEN_REQUEST,
  MELLON_SUCCESS,
} from '../../src/ui/adapters/infra/event-bridge.adapter';
import { MELLON_CONTEXT_READY } from '../../src/ui/presentation/ui-events';
import { MELLON_BTN_SELECTOR } from '../../src/ui/adapters/render/shadow.adapter';
import * as coreFactory from '../../src/ui/adapters/infra/core-factory.adapter';
import { TryMellonAuthModalElement } from '../../src/ui/presentation/trymellon-auth-modal.element';
import type { CoreWithEvents } from '../../src/ui/adapters/infra/event-bridge.adapter';
import type {
  MellonOperationDetail,
  MellonFallbackDetail,
} from '../../src/ui/ports/core-events.port';
import type { EventPayload } from '../../src/types';
import { createError } from '../../src/errors';
import * as support from '../../src/utils/support';
import { ok } from '../../src/utils/result';

if (typeof customElements !== 'undefined' && !customElements.get('trymellon-auth')) {
  customElements.define('trymellon-auth', TryMellonAuthElement);
}
if (typeof customElements !== 'undefined' && !customElements.get('trymellon-auth-modal')) {
  customElements.define('trymellon-auth-modal', TryMellonAuthModalElement);
}

function createValidTryMellonInstance(): TryMellon {
  const result = TryMellon.create({ appId: 'app_test', publishableKey: 'pk_test' });
  if (!result.ok) throw new Error('Test setup: TryMellon.create failed');
  return result.value;
}

describe('TryMellonAuthElement (E.4 shell)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('registers trymellon-auth and instantiates with shadow open', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('reflects attributes in render (mode, theme)', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    el.setAttribute('mode', 'register');
    el.setAttribute('theme', 'dark');
    container.appendChild(el);
    expect(el.getAttribute('theme')).toBe('dark');
    expect(el.shadowRoot?.querySelector('.mellon-root')).not.toBeNull();
  });

  it('shows content according to state (setStateForRender)', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('READY_LOGIN');
    const btn = el.shadowRoot?.querySelector('button.mellon-btn');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toContain('TryMellon');
    el.setStateForRender('SUCCESS');
    const msg = el.shadowRoot?.querySelector('.mellon-message');
    expect(msg?.textContent).toContain('Success');
  });

  it('uses button-label and button-aria-label when provided', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('button-label', 'Sign in');
    el.setAttribute('button-aria-label', 'Sign in with TryMellon');
    container.appendChild(el);
    el.setStateForRender('READY_LOGIN');
    const btn = el.shadowRoot?.querySelector('button.mellon-btn') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toContain('Sign in');
    expect(btn?.getAttribute('aria-label')).toBe('Sign in with TryMellon');
  });

  it('button-variant pill: setAttribute updates render to pill button', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    container.appendChild(el);
    el.setStateForRender('READY_LOGIN');
    expect(el.shadowRoot?.querySelector('button.mellon-btn')).not.toBeNull();
    expect(el.shadowRoot?.querySelector('button.mellon-btn-pill')).toBeNull();

    el.setAttribute('button-variant', 'pill');
    const pillBtn = el.shadowRoot?.querySelector('button.mellon-btn.mellon-btn-pill');
    expect(pillBtn).not.toBeNull();
    expect(pillBtn?.querySelector('.mellon-btn-pill-icon-circle')).not.toBeNull();
  });
});

describe('TryMellonAuthElement attachCore (E.5 P1-C)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('accepts a valid TryMellon instance', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    expect(() => el.attachCore(core)).not.toThrow();
  });

  it('rejects a non-TryMellon object', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    const fakeCore = {
      register: async () => ({ ok: true, value: {} }),
      authenticate: async () => ({ ok: true, value: {} }),
    };
    expect(() => el.attachCore(fakeCore as unknown as TryMellon)).toThrow(
      '[trymellon-auth] attachCore requires a CoreAuthPort-compatible instance.'
    );
  });

  it('allows second attachCore (multi-write with teardown)', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    el.attachCore(core);
    const core2 = createValidTryMellonInstance();
    expect(() => el.attachCore(core2)).not.toThrow();
  });
});

describe('TryMellonAuthElement event bridge (E.6)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('dispatches mellon:start CustomEvent when core emits start', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);

    type Payload = { type: 'start'; operation: 'register' | 'authenticate' };
    const listeners: Array<(p: Payload) => void> = [];
    const mockCore: CoreWithEvents = {
      on(_event, handler) {
        listeners.push(handler as (p: Payload) => void);
        return () => {
          const i = listeners.indexOf(handler as (p: Payload) => void);
          if (i !== -1) listeners.splice(i, 1);
        };
      },
    };
    const emit = (payload: Payload) => listeners.forEach((h) => h(payload));

    eventBridgeAdapter.subscribe(mockCore, el);

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:start', handler);

    emit({ type: 'start', operation: 'register' });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('mellon:start');
    expect(received[0].detail).toEqual({ operation: 'register' });
    expect((received[0] as CustomEvent).bubbles).toBe(true);
    expect((received[0] as CustomEvent).composed).toBe(true);
  });

  it('dispatches mellon:success with bubbles false and composed true and token in detail', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);

    type Payload = {
      type: 'success';
      operation: 'register' | 'authenticate';
      token: string;
      user?: unknown;
    };
    const listeners: Array<(p: Payload) => void> = [];
    const mockCore: CoreWithEvents = {
      on(_event, handler) {
        listeners.push(handler as (p: Payload) => void);
        return () => {
          const i = listeners.indexOf(handler as (p: Payload) => void);
          if (i !== -1) listeners.splice(i, 1);
        };
      },
    };
    const emit = (payload: Payload) => listeners.forEach((h) => h(payload));

    eventBridgeAdapter.subscribe(mockCore, el);

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:success', handler);

    emit({ type: 'success', operation: 'authenticate', token: 'tk-auth' });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('mellon:success');
    expect(received[0].detail).toMatchObject({ token: 'tk-auth', operation: 'login' });
    expect((received[0] as CustomEvent).bubbles).toBe(false);
    expect((received[0] as CustomEvent).composed).toBe(true);
  });

  it('does not dispatch mellon:success when core success payload has no token', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);

    const listeners: Array<(p: EventPayload) => void> = [];
    const mockCore: CoreWithEvents = {
      on(_event, handler) {
        listeners.push(handler);
        return () => {
          const i = listeners.indexOf(handler);
          if (i !== -1) listeners.splice(i, 1);
        };
      },
    };
    const emit = (payload: EventPayload) => listeners.forEach((h) => h(payload));

    eventBridgeAdapter.subscribe(mockCore, el);

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:success', handler);

    emit({ type: 'success', operation: 'authenticate', token: '' });
    expect(received).toHaveLength(0);

    received.length = 0;
    emit({ type: 'success', operation: 'register', token: 'valid-token' });
    expect(received).toHaveLength(1);
    expect(received[0].detail.token).toBe('valid-token');
  });

  it('does not dispatch mellon:error after mellon:success in same ceremony', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);

    const listeners: Record<string, Array<(p: EventPayload) => void>> = {
      start: [],
      success: [],
      error: [],
    };
    const mockCore: CoreWithEvents = {
      on(event, handler) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
        return () => {
          const i = listeners[event].indexOf(handler);
          if (i !== -1) listeners[event].splice(i, 1);
        };
      },
    };
    const emit = (event: string, payload: EventPayload) =>
      (listeners[event] ?? []).forEach((h) => h(payload));

    eventBridgeAdapter.subscribe(mockCore, el);

    const successReceived: CustomEvent[] = [];
    const errorReceived: CustomEvent[] = [];
    const onSuccess = (event: Event): void => {
      successReceived.push(event as CustomEvent);
    };
    const onError = (event: Event): void => {
      errorReceived.push(event as CustomEvent);
    };
    el.addEventListener('mellon:success', onSuccess);
    el.addEventListener('mellon:error', onError);

    emit('start', { type: 'start', operation: 'authenticate' });
    emit('success', { type: 'success', operation: 'authenticate', token: 'tk' });
    emit('error', { type: 'error', error: createError('UNKNOWN_ERROR', 'late') });

    expect(successReceived).toHaveLength(1);
    expect(errorReceived).toHaveLength(0);
  });

  it('unsubscribe removes core listeners (no CustomEvent after unsubscribe)', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);

    type Payload = { type: 'start'; operation: 'register' };
    const listeners: Array<(p: Payload) => void> = [];
    const mockCore: CoreWithEvents = {
      on(_event, handler) {
        listeners.push(handler as (p: Payload) => void);
        return () => {
          const i = listeners.indexOf(handler as (p: Payload) => void);
          if (i !== -1) listeners.splice(i, 1);
        };
      },
    };
    const emit = (payload: Payload) => listeners.forEach((h) => h(payload));

    const unsubscribe = eventBridgeAdapter.subscribe(mockCore, el);

    const received: CustomEvent[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent);
    };
    el.addEventListener('mellon:start', handler);

    emit({ type: 'start', operation: 'register' });
    expect(received).toHaveLength(1);

    unsubscribe();
    received.length = 0;
    emit({ type: 'start', operation: 'register' });
    expect(received).toHaveLength(0);
  });
});

describe('TryMellonAuthElement FSM wiring (E.7)', () => {
  let container: HTMLElement;
  let getClientStatusSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    getClientStatusSpy = vi.spyOn(support, 'getClientStatus').mockResolvedValue({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: true,
      recommendedFlow: 'passkey',
    });
  });

  afterEach(() => {
    getClientStatusSpy?.mockRestore();
    container.remove();
  });

  it('calls getClientStatus and transitions to READY_LOGIN when attachCore and mode=login', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    el.attachCore(core);
    await vi.waitFor(() => {
      expect(el.currentState).toBe('READY_LOGIN');
    });
    expect(getClientStatusSpy).toHaveBeenCalled();
  });

  it('calls getClientStatus and transitions to READY_REGISTER when attachCore and mode=register', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('mode', 'register');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    el.attachCore(core);
    await vi.waitFor(() => {
      expect(el.currentState).toBe('READY_REGISTER');
    });
    expect(getClientStatusSpy).toHaveBeenCalled();
  });

  it('transitions to FALLBACK when getClientStatus returns recommendedFlow fallback', async () => {
    getClientStatusSpy.mockResolvedValue({
      isPasskeySupported: false,
      platformAuthenticatorAvailable: false,
      recommendedFlow: 'fallback',
    });
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    el.attachCore(core);
    await vi.waitFor(() => {
      expect(el.currentState).toBe('FALLBACK');
    });
  });

  it('click on button calls core.authenticate and transitions AUTHENTICATING → SUCCESS on mellon:success', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('action', 'direct-auth');
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    const authenticateSpy = vi.spyOn(core, 'authenticate').mockResolvedValue(
      ok({
        authenticated: true,
        sessionToken: 'tk',
        user: { userId: 'u', externalUserId: 'ext' },
      })
    );
    el.attachCore(core);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_LOGIN'));
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('button.mellon-btn');
    expect(btn).not.toBeNull();
    btn?.click();
    expect(el.currentState).toBe('AUTHENTICATING');
    expect(authenticateSpy).toHaveBeenCalled();
    el.dispatchEvent(
      new CustomEvent('mellon:success', {
        detail: { token: 'tk', operation: 'authenticate' },
        composed: true,
      })
    );
    expect(el.currentState).toBe('SUCCESS');
  });

  it('click on button calls core.register and transitions AUTHENTICATING → ERROR on mellon:error', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('action', 'direct-auth');
    el.setAttribute('mode', 'register');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    const registerSpy = vi.spyOn(core, 'register').mockResolvedValue(
      ok({
        success: true,
        credentialId: 'c',
        status: 'created',
        sessionToken: 'tk',
        user: { userId: 'u', externalUserId: 'ext' },
      })
    );
    el.attachCore(core);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_REGISTER'));
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('button.mellon-btn');
    expect(btn).not.toBeNull();
    btn?.click();
    expect(el.currentState).toBe('AUTHENTICATING');
    expect(registerSpy).toHaveBeenCalled();
    el.dispatchEvent(
      new CustomEvent('mellon:error', {
        detail: { code: 'ERR', message: 'test', operation: 'register' },
        composed: true,
      })
    );
    expect(el.currentState).toBe('ERROR');
  });

  it('Tier 1: auto-creates core from app-id and publishable-key and reaches READY_LOGIN', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('app-id', 'app_t1');
    el.setAttribute('publishable-key', 'pk_t1');
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    await vi.waitFor(() => {
      expect(el.currentState).toBe('READY_LOGIN');
    });
    expect(getClientStatusSpy).toHaveBeenCalled();
  });

  it('action=open-modal: click emits mellon:open-request and opens internal modal', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('action', 'open-modal');
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_LOGIN'));

    const openRequestEvents: Event[] = [];
    el.addEventListener(MELLON_OPEN_REQUEST, (e) => openRequestEvents.push(e));
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('button.mellon-btn');
    expect(btn).not.toBeNull();
    btn?.click();

    expect(openRequestEvents).toHaveLength(1);
    const modal = document.body.querySelector('trymellon-auth-modal') as TryMellonAuthModalElement;
    expect(modal).not.toBeNull();
    expect(modal.open).toBe(true);
  });

  it('trigger-only=true: click emits mellon:open-request and does not mount internal modal', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('action', 'open-modal');
    el.setAttribute('trigger-only', 'true');
    el.setAttribute('app-id', 'app_test');
    el.setAttribute('publishable-key', 'pk_test');
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_LOGIN'));

    const openRequestEvents: Event[] = [];
    el.addEventListener(MELLON_OPEN_REQUEST, (e) => openRequestEvents.push(e));
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('button.mellon-btn');
    expect(btn).not.toBeNull();
    btn?.click();

    expect(openRequestEvents).toHaveLength(1);
    const modal = el.shadowRoot?.querySelector('trymellon-auth-modal');
    expect(modal).toBeNull();
  });
});

describe('TryMellonAuthElement integration (E7 click → modal → events)', () => {
  let container: HTMLElement;
  let getClientStatusSpy: ReturnType<typeof vi.spyOn>;
  let createCoreSpy: ReturnType<typeof vi.spyOn>;

  /** Mock core that emits success when authenticate() is called; no network. Event-bridge receives and fires mellon:success on the host. */
  function createMockCoreEmittingSuccess(): ReturnType<typeof coreFactory.createCoreForUI> {
    const listeners: Record<string, Array<(p: unknown) => void>> = {
      start: [],
      success: [],
      error: [],
      cancelled: [],
    };
    return {
      on(event: string, handler: (p: unknown) => void): () => void {
        if (listeners[event]) listeners[event].push(handler);
        return () => {
          const i = listeners[event]?.indexOf(handler) ?? -1;
          if (i !== -1) listeners[event].splice(i, 1);
        };
      },
      async authenticate(_options?: unknown) {
        listeners.success.forEach((h) =>
          h({ type: 'success', operation: 'authenticate', token: 'tk-e7-integration' })
        );
        return {
          ok: true,
          value: {
            authenticated: true,
            sessionToken: 'tk-e7-integration',
            user: { userId: 'u-e7' },
          },
        };
      },
      async register(_options?: unknown) {
        listeners.success.forEach((h) =>
          h({ type: 'success', operation: 'register', token: 'tk-e7-reg' })
        );
        return {
          ok: true,
          value: {
            success: true,
            credentialId: 'c',
            status: 'created',
            sessionToken: 'tk-e7-reg',
            user: { userId: 'u-e7' },
          },
        };
      },
      async enroll(_options?: unknown) {
        return { ok: true as const, value: undefined };
      },
      getContextHash(): string {
        return '';
      },
    } as ReturnType<typeof coreFactory.createCoreForUI>;
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    getClientStatusSpy = vi.spyOn(support, 'getClientStatus').mockResolvedValue({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: true,
      recommendedFlow: 'passkey',
    });
    // Fresh mock per createCoreForUI call so modal has its own core and event bridge subscription.
    createCoreSpy = vi
      .spyOn(coreFactory, 'createCoreForUI')
      .mockImplementation(() => createMockCoreEmittingSuccess());
  });

  afterEach(() => {
    createCoreSpy?.mockRestore();
    getClientStatusSpy?.mockRestore();
    container.remove();
  });

  it('click → modal visible → click modal CTA → mellon:success en modal con detail.token y detail.operation', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('action', 'open-modal');
    el.setAttribute('app-id', 'app_e7');
    el.setAttribute('publishable-key', 'pk_e7');
    el.setAttribute('mode', 'login');
    container.appendChild(el);

    await vi.waitFor(() => expect(el.currentState).toBe('READY_LOGIN'));

    const triggerBtn = el.shadowRoot?.querySelector<HTMLButtonElement>(
      `button${MELLON_BTN_SELECTOR}`
    );
    expect(triggerBtn).not.toBeNull();
    triggerBtn?.click();

    const modal = document.body.querySelector('trymellon-auth-modal') as TryMellonAuthModalElement;
    expect(modal).not.toBeNull();
    expect(modal.open).toBe(true);

    await vi.waitFor(() => expect(modal.currentState).toBe('READY_LOGIN'));

    const successReceived: CustomEvent<{ token?: string; operation?: string }>[] = [];
    const handler = (event: Event): void => {
      successReceived.push(event as CustomEvent<{ token?: string; operation?: string }>);
    };
    modal.addEventListener(MELLON_SUCCESS, handler);

    // Primary CTA is inside #mellon-root; first .mellon-btn in modal is the QR button (cross-device).
    const modalBtn = modal.shadowRoot?.querySelector<HTMLButtonElement>(
      '#mellon-root button.mellon-btn'
    );
    expect(modalBtn).not.toBeNull();
    modalBtn?.click();

    await vi.waitFor(() => expect(successReceived.length).toBe(1));

    expect(successReceived[0].type).toBe(MELLON_SUCCESS);
    expect(successReceived[0].detail.token).toBe('tk-e7-integration');
    expect(successReceived[0].detail.operation).toBe('login');
  });
});

describe('TryMellonAuthElement reset and tab (02-fsm-estado-modal)', () => {
  let container: HTMLElement;
  let getClientStatusSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    getClientStatusSpy = vi.spyOn(support, 'getClientStatus').mockResolvedValue({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: true,
      recommendedFlow: 'passkey',
    });
  });

  afterEach(() => {
    getClientStatusSpy?.mockRestore();
    container.remove();
  });

  it('reset() transitions any state to IDLE', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('READY_LOGIN');
    el.reset();
    expect(el.currentState).toBe('IDLE');
    el.setStateForRender('SUCCESS');
    el.reset();
    expect(el.currentState).toBe('IDLE');
  });

  it('reset() from AUTHENTICATING emits mellon:cancelled then IDLE', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('action', 'direct-auth');
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    vi.spyOn(core, 'authenticate').mockImplementation(() => new Promise(() => {}));
    el.attachCore(core);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_LOGIN'));
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('button.mellon-btn');
    btn?.click();
    expect(el.currentState).toBe('AUTHENTICATING');
    const received: CustomEvent<MellonOperationDetail>[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent<MellonOperationDetail>);
    };
    el.addEventListener(MELLON_CANCELLED, handler);
    el.reset();
    expect(received).toHaveLength(1);
    expect(received[0].detail.operation).toBe('login');
    expect(el.currentState).toBe('IDLE');
  });

  it('reset() from AUTHENTICATING with _currentNonce set emits mellon:cancelled with nonce in detail', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    el.attachCore(core);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_LOGIN'));

    el.dispatchEvent(
      new CustomEvent<MellonOperationDetail>(MELLON_START, {
        detail: { operation: 'login', nonce: 'n-wc-test' },
        bubbles: true,
        composed: true,
      })
    );
    el.setStateForRender('AUTHENTICATING');

    const received: CustomEvent<MellonOperationDetail>[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent<MellonOperationDetail>);
    };
    el.addEventListener(MELLON_CANCELLED, handler);
    el.reset();

    expect(received).toHaveLength(1);
    expect(received[0].detail.operation).toBe('login');
    expect(received[0].detail.nonce).toBe('n-wc-test');
  });

  it('changing mode (tab) transitions READY_REGISTER ↔ READY_LOGIN', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('mode', 'register');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    el.attachCore(core);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_REGISTER'));
    el.setAttribute('mode', 'login');
    expect(el.currentState).toBe('READY_LOGIN');
    el.setAttribute('mode', 'register');
    expect(el.currentState).toBe('READY_REGISTER');
  });

  it('changing mode from AUTHENTICATING emits mellon:cancelled and transitions to READY_*', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('action', 'direct-auth');
    el.setAttribute('mode', 'login');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    vi.spyOn(core, 'authenticate').mockImplementation(() => new Promise(() => {}));
    el.attachCore(core);
    await vi.waitFor(() => expect(el.currentState).toBe('READY_LOGIN'));
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>('button.mellon-btn');
    btn?.click();
    expect(el.currentState).toBe('AUTHENTICATING');
    const received: CustomEvent<MellonOperationDetail>[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent<MellonOperationDetail>);
    };
    el.addEventListener(MELLON_CANCELLED, handler);
    el.setAttribute('mode', 'register');
    expect(received).toHaveLength(1);
    expect(el.currentState).toBe('READY_REGISTER');
  });
});

describe('TryMellonAuthElement enrollment (ticket-id, context-ready, enroll)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('emits mellon:context-ready with contextHash and composed:true when ticket-id is set and core is attached', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    const contextHash = 'abc64hexcontextHash1234567890123456789012345678901234567890123456';
    vi.spyOn(core, 'getContextHash').mockReturnValue(contextHash);
    el.attachCore(core);
    const received: CustomEvent<{ contextHash?: string }>[] = [];
    el.addEventListener(MELLON_CONTEXT_READY, ((e: CustomEvent<{ contextHash?: string }>) => {
      received.push(e);
    }) as EventListener);
    el.setAttribute('ticket-id', 'ticket-123');
    expect(received).toHaveLength(1);
    expect(received[0].detail.contextHash).toBe(contextHash);
    expect(received[0].composed).toBe(true);
  });

  it('enroll() calls core.enroll with ticketId when ticket-id is set and core attached', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    const enrollSpy = vi.spyOn(core, 'enroll').mockResolvedValue(ok({ sessionToken: 'st-enroll' }));
    el.attachCore(core);
    el.setAttribute('ticket-id', 'ticket-456');
    el.enroll();
    expect(enrollSpy).toHaveBeenCalledTimes(1);
    expect(enrollSpy).toHaveBeenCalledWith({ ticketId: 'ticket-456' });
  });

  it('enroll() is no-op when ticket-id is not set', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    const enrollSpy = vi.spyOn(core, 'enroll');
    el.attachCore(core);
    el.enroll();
    expect(enrollSpy).not.toHaveBeenCalled();
  });

  it('enroll() is no-op when core is not attached', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('ticket-id', 'ticket-789');
    container.appendChild(el);
    const core = createValidTryMellonInstance();
    const enrollSpy = vi.spyOn(core, 'enroll');
    el.enroll();
    expect(enrollSpy).not.toHaveBeenCalled();
  });
});

describe('TryMellonAuthElement fallback UI (E.8)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('shows fallback message and "Continuar con email" in FALLBACK_EMAIL state', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('FALLBACK_EMAIL');
    const msg = el.shadowRoot?.querySelector('.mellon-fallback .mellon-message');
    const btn = el.shadowRoot?.querySelector(
      '.mellon-fallback button[data-mellon-action="fallback-email"]'
    );
    expect(msg?.textContent).toBe('Fallback disponible.');
    expect(btn?.textContent).toBe('Continuar con email');
  });

  it('shows fallback message and "Continuar con QR" in FALLBACK_QR state', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('FALLBACK_QR');
    const btn = el.shadowRoot?.querySelector(
      '.mellon-fallback button[data-mellon-action="fallback-qr"]'
    );
    expect(btn?.textContent).toBe('Continuar con QR');
  });

  it('shows fallback message and generic "Continuar" in FALLBACK state', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('FALLBACK');
    const btn = el.shadowRoot?.querySelector(
      '.mellon-fallback button[data-mellon-action="fallback"]'
    );
    expect(btn?.textContent).toBe('Continuar');
  });

  it('dispatches mellon:fallback with fallbackType email when clicking Continuar con email', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('FALLBACK_EMAIL');
    const received: CustomEvent<MellonFallbackDetail>[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent<MellonFallbackDetail>);
    };
    el.addEventListener(MELLON_FALLBACK, handler);
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>(
      'button[data-mellon-action="fallback-email"]'
    );
    expect(btn).not.toBeNull();
    btn?.click();
    expect(received).toHaveLength(1);
    expect(received[0].detail.fallbackType).toBe('email');
  });

  it('dispatches mellon:fallback with fallbackType qr when clicking Continuar con QR', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('FALLBACK_QR');
    const received: CustomEvent<MellonFallbackDetail>[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent<MellonFallbackDetail>);
    };
    el.addEventListener(MELLON_FALLBACK, handler);
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>(
      'button[data-mellon-action="fallback-qr"]'
    );
    expect(btn).not.toBeNull();
    btn?.click();
    expect(received).toHaveLength(1);
    expect(received[0].detail.fallbackType).toBe('qr');
  });

  it('dispatches mellon:fallback without fallbackType when clicking generic Continuar', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    container.appendChild(el);
    el.setStateForRender('FALLBACK');
    const received: CustomEvent<MellonFallbackDetail>[] = [];
    const handler = (event: Event): void => {
      received.push(event as CustomEvent<MellonFallbackDetail>);
    };
    el.addEventListener(MELLON_FALLBACK, handler);
    const btn = el.shadowRoot?.querySelector<HTMLButtonElement>(
      'button[data-mellon-action="fallback"]'
    );
    expect(btn).not.toBeNull();
    btn?.click();
    expect(received).toHaveLength(1);
    expect(received[0].detail.fallbackType).toBeUndefined();
  });
});
