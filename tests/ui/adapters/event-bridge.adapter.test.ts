/**
 * Event-bridge adapter: ensures core → host emits CustomEvents mellon:start and mellon:cancelled
 * with typed detail (MellonOperationDetail). mellon:fallback is emitted by the WC on click, not the core;
 * event contract (name + detail) is verified via dispatch/listener.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  eventBridgeAdapter,
  MELLON_FALLBACK,
  MELLON_START,
  MELLON_CANCELLED,
  MELLON_SUCCESS,
  MELLON_ERROR,
} from '../../../src/ui/adapters/infra/event-bridge.adapter';
import type { CoreWithEvents } from '../../../src/ui/ports/core-events.port';
import type {
  MellonOperationDetail,
  MellonFallbackDetail,
  MellonSuccessDetail,
  MellonErrorDetail,
} from '../../../src/ui/ports/core-events.port';
import { EventEmitter } from '../../../src/core/events';
import type { EventPayload } from '../../../src/types';

/** Core real (EventEmitter) cumpliendo CoreWithEvents para no depender de mock. */
function createCore(): EventEmitter & CoreWithEvents {
  return new EventEmitter() as EventEmitter & CoreWithEvents;
}

describe('event-bridge adapter', () => {
  it('bridge dispatches mellon:start on host when core emits start', () => {
    const core = createCore();
    const host = document.createElement('div');
    const dispatchSpy = vi.spyOn(host, 'dispatchEvent');
    eventBridgeAdapter.subscribe(core, host);
    core.emit('start', { type: 'start', operation: 'register', nonce: 'n1' });
    expect(dispatchSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    const evt = dispatchSpy.mock.calls[0][0] as CustomEvent<MellonOperationDetail>;
    expect(evt.type).toBe(MELLON_START);
    expect(evt.detail).toEqual({
      operation: 'register',
      nonce: 'n1',
    });
  });

  describe('mellon:start', () => {
    it('emits mellon:start with MellonOperationDetail when core emits start (register)', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonOperationDetail>[] = [];
      host.addEventListener(MELLON_START, ((e: CustomEvent<MellonOperationDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      const payload: EventPayload = { type: 'start', operation: 'register', nonce: 'n1' };
      core.emit('start', payload);

      expect(received).toHaveLength(1);
      expect(received[0].detail).toEqual({
        operation: 'register',
        nonce: 'n1',
      });
      expect(received[0].bubbles).toBe(true);
      expect(received[0].composed).toBe(true);
    });

    it('emits mellon:start with operation login when core emits start (authenticate)', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonOperationDetail>[] = [];
      host.addEventListener(MELLON_START, ((e: CustomEvent<MellonOperationDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('start', { type: 'start', operation: 'authenticate' });

      expect(received).toHaveLength(1);
      expect(received[0].detail.operation).toBe('login');
      expect(received[0].detail.nonce).toBeUndefined();
    });
  });

  describe('mellon:success', () => {
    it('emits mellon:success with redirectUrl in detail when core sends redirectUrl', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonSuccessDetail>[] = [];
      host.addEventListener(MELLON_SUCCESS, ((e: CustomEvent<MellonSuccessDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('success', {
        type: 'success',
        operation: 'authenticate',
        token: 'jwt-ok',
        nonce: 'n1',
        redirectUrl: 'https://app.example/dashboard',
      });

      expect(received).toHaveLength(1);
      expect(received[0].detail.token).toBe('jwt-ok');
      expect(received[0].detail.operation).toBe('login');
      expect(received[0].detail.nonce).toBe('n1');
      expect(received[0].detail.redirectUrl).toBe('https://app.example/dashboard');
      expect(received[0].bubbles).toBe(false);
      expect(received[0].composed).toBe(true);
    });

    it('emits mellon:success without redirectUrl when core does not send it', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonSuccessDetail>[] = [];
      host.addEventListener(MELLON_SUCCESS, ((e: CustomEvent<MellonSuccessDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('success', {
        type: 'success',
        operation: 'register',
        token: 'jwt-ok',
      });

      expect(received).toHaveLength(1);
      expect(received[0].detail.token).toBe('jwt-ok');
      expect(received[0].detail.redirectUrl).toBeUndefined();
    });

    it('at-most-once per ceremony: second success in same ceremony is ignored', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonSuccessDetail>[] = [];
      host.addEventListener(MELLON_SUCCESS, ((e: CustomEvent<MellonSuccessDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('start', { type: 'start', operation: 'authenticate', nonce: 'n1' });
      core.emit('success', {
        type: 'success',
        operation: 'authenticate',
        token: 'jwt-first',
        nonce: 'n1',
      });
      core.emit('success', {
        type: 'success',
        operation: 'authenticate',
        token: 'jwt-second',
        nonce: 'n1',
      });

      expect(received).toHaveLength(1);
      expect(received[0].detail.token).toBe('jwt-first');
    });

    it('omits redirectUrl from detail when core sends non-string (e.g. number)', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonSuccessDetail>[] = [];
      host.addEventListener(MELLON_SUCCESS, ((e: CustomEvent<MellonSuccessDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('success', {
        type: 'success',
        operation: 'authenticate',
        token: 'jwt-ok',
        redirectUrl: 123 as unknown as string,
      });

      expect(received).toHaveLength(1);
      expect(received[0].detail.token).toBe('jwt-ok');
      expect(received[0].detail.redirectUrl).toBeUndefined();
    });

    it('includes nonce in detail when core success payload has nonce string', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonSuccessDetail>[] = [];
      host.addEventListener(MELLON_SUCCESS, ((e: CustomEvent<MellonSuccessDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('success', {
        type: 'success',
        operation: 'authenticate',
        token: 'jwt-ok',
        nonce: 'ceremony-nonce-123',
      });

      expect(received).toHaveLength(1);
      expect(received[0].detail.nonce).toBe('ceremony-nonce-123');
    });

    it('omits nonce from detail when core success payload has no nonce', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonSuccessDetail>[] = [];
      host.addEventListener(MELLON_SUCCESS, ((e: CustomEvent<MellonSuccessDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('success', {
        type: 'success',
        operation: 'register',
        token: 'jwt-ok',
      });

      expect(received).toHaveLength(1);
      expect(received[0].detail.nonce).toBeUndefined();
    });
  });

  describe('no error after success (defensa en profundidad)', () => {
    it('after mellon:success, core error does not dispatch mellon:error', () => {
      const core = createCore();
      const host = document.createElement('div');
      const receivedError: CustomEvent<MellonErrorDetail>[] = [];
      host.addEventListener(MELLON_ERROR, ((e: CustomEvent<MellonErrorDetail>) => {
        receivedError.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('start', { type: 'start', operation: 'authenticate', nonce: 'n1' });
      core.emit('success', {
        type: 'success',
        operation: 'authenticate',
        token: 'jwt-ok',
        nonce: 'n1',
      });
      core.emit('error', {
        type: 'error',
        operation: 'authenticate',
        nonce: 'n1',
        error: { code: 'LATE_ERROR', message: 'Should not reach host' },
      });

      expect(receivedError).toHaveLength(0);
    });
  });

  describe('mellon:cancelled', () => {
    it('emits mellon:cancelled with MellonOperationDetail when core emits cancelled', () => {
      const core = createCore();
      const host = document.createElement('div');
      const received: CustomEvent<MellonOperationDetail>[] = [];
      host.addEventListener(MELLON_CANCELLED, ((e: CustomEvent<MellonOperationDetail>) => {
        received.push(e);
      }) as EventListener);

      eventBridgeAdapter.subscribe(core, host);
      core.emit('cancelled', { type: 'cancelled', operation: 'register', nonce: 'n2' });

      expect(received).toHaveLength(1);
      expect(received[0].detail).toEqual({
        operation: 'register',
        nonce: 'n2',
      });
    });
  });

  describe('unsubscribe', () => {
    it('stops emitting after unsubscribe', () => {
      const core = createCore();
      const host = document.createElement('div');
      const listener = vi.fn();
      host.addEventListener(MELLON_START, listener);

      const unsubscribe = eventBridgeAdapter.subscribe(core, host);
      core.emit('start', { type: 'start', operation: 'register' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      core.emit('start', { type: 'start', operation: 'register' });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

describe('mellon:fallback contract', () => {
  /**
   * mellon:fallback is emitted by the WC on fallback button click, not by the core.
   * This test verifies that a CustomEvent with MELLON_FALLBACK and MellonFallbackDetail
   * can be dispatched and received with the correct detail shape.
   */
  it('mellon:fallback CustomEvent with MellonFallbackDetail is received with correct detail', () => {
    const host = document.createElement('div');
    const received: CustomEvent<MellonFallbackDetail>[] = [];
    host.addEventListener(MELLON_FALLBACK, ((e: CustomEvent<MellonFallbackDetail>) => {
      received.push(e);
    }) as EventListener);

    const detail: MellonFallbackDetail = { operation: 'login', fallbackType: 'email' };
    host.dispatchEvent(
      new CustomEvent(MELLON_FALLBACK, {
        detail,
        bubbles: true,
        composed: true,
      })
    );

    expect(received).toHaveLength(1);
    expect(received[0].detail).toEqual({ operation: 'login', fallbackType: 'email' });
  });

  it('MELLON_FALLBACK constant is mellon:fallback', () => {
    expect(MELLON_FALLBACK).toBe('mellon:fallback');
  });
});
