/**
 * E.10 E2E fixture: integrador monta <trymellon-auth> con atributos; Vitest + happy-dom.
 * Verifica: shadowRoot, render del WC, flujo getClientStatus → READY_LOGIN y evento mellon:start.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TryMellonAuthElement } from '../../src/ui/presentation/trymellon-auth.element';
import * as support from '../../src/utils/support';

if (typeof customElements !== 'undefined' && !customElements.get('trymellon-auth')) {
  customElements.define('trymellon-auth', TryMellonAuthElement);
}

describe('E2E fixture: WC como integrador (E.10)', () => {
  let container: HTMLElement;
  let getClientStatusSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    getClientStatusSpy = vi.spyOn(support, 'getClientStatus').mockResolvedValue({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: true,
      recommendedFlow: 'passkey',
    }) as ReturnType<typeof vi.spyOn>;
  });

  afterEach(() => {
    getClientStatusSpy?.mockRestore();
    container.remove();
  });

  it('monta <trymellon-auth> con app-id, publishable-key, mode y tiene shadowRoot abierto', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('app-id', 'app_e2e');
    el.setAttribute('publishable-key', 'pk_e2e');
    el.setAttribute('mode', 'login');
    container.appendChild(el);

    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot?.mode).toBe('open');
  });

  it('renderiza el WC (mellon-root presente en shadow)', () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('app-id', 'app_e2e');
    el.setAttribute('publishable-key', 'pk_e2e');
    el.setAttribute('mode', 'login');
    container.appendChild(el);

    const root =
      el.shadowRoot?.getElementById('mellon-root') ?? el.shadowRoot?.querySelector('.mellon-root');
    expect(root).toBeTruthy();
  });

  it('Tier 1: getClientStatus mock → transición a READY_LOGIN', async () => {
    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('app-id', 'app_e2e');
    el.setAttribute('publishable-key', 'pk_e2e');
    el.setAttribute('mode', 'login');
    container.appendChild(el);

    await vi.waitFor(() => {
      expect(el.currentState).toBe('READY_LOGIN');
    });
    expect(getClientStatusSpy).toHaveBeenCalled();
  });

  it('dispara mellon:start cuando el core emite start (flujo integrador)', async () => {
    const { eventBridgeAdapter } = await import('../../src/ui/adapters/infra/event-bridge.adapter');
    type CoreWithEvents = import('../../src/ui/adapters/infra/event-bridge.adapter').CoreWithEvents;

    const el = document.createElement('trymellon-auth') as TryMellonAuthElement;
    el.setAttribute('mode', 'login');
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
    el.addEventListener('mellon:start', ((e: Event) =>
      received.push(e as CustomEvent)) as EventListener);

    emit({ type: 'start', operation: 'authenticate' });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('mellon:start');
    expect(received[0].detail).toEqual({ operation: 'login' });
  });
});
