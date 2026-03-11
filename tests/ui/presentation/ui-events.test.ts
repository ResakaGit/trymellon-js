import { describe, it, expect } from 'vitest';
import {
  createMellonOpenEvent,
  createMellonCloseEvent,
  createMellonCancelledEvent,
  createMellonFallbackEvent,
  createMellonTabChangeEvent,
  createMellonStartEvent,
  createMellonSuccessEvent,
  createMellonErrorEvent,
  MELLON_OPEN,
  MELLON_CLOSE,
  MELLON_CANCELLED,
  MELLON_FALLBACK,
  MELLON_TAB_CHANGE,
  MELLON_START,
  MELLON_SUCCESS,
  MELLON_ERROR,
} from '../../../src/ui/presentation/ui-events';

describe('ui/presentation/ui-events', () => {
  it('createMellonOpenEvent returns CustomEvent with detail, bubbles and composed', () => {
    const detail = { open: true };
    const ev = createMellonOpenEvent(detail);
    expect(ev.type).toBe(MELLON_OPEN);
    expect(ev.detail).toBe(detail);
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it('createMellonCloseEvent returns CustomEvent with detail, bubbles and composed', () => {
    const detail = { reason: 'success', timestamp: 1 };
    const ev = createMellonCloseEvent(detail);
    expect(ev.type).toBe(MELLON_CLOSE);
    expect(ev.detail).toEqual(detail);
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it('createMellonCancelledEvent returns CustomEvent with detail', () => {
    const detail = { nonce: 'n', operation: 'authenticate' as const };
    const ev = createMellonCancelledEvent(detail);
    expect(ev.type).toBe(MELLON_CANCELLED);
    expect(ev.detail).toBe(detail);
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it('createMellonFallbackEvent returns CustomEvent with optional fallbackType', () => {
    const ev = createMellonFallbackEvent({});
    expect(ev.type).toBe(MELLON_FALLBACK);
    expect(ev.detail).toEqual({});
    const ev2 = createMellonFallbackEvent({ fallbackType: 'email' });
    expect(ev2.detail.fallbackType).toBe('email');
  });

  it('createMellonTabChangeEvent returns CustomEvent with tab', () => {
    const ev = createMellonTabChangeEvent({ tab: 'login' });
    expect(ev.type).toBe(MELLON_TAB_CHANGE);
    expect(ev.detail.tab).toBe('login');
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it('createMellonStartEvent returns CustomEvent with operation detail', () => {
    const detail = { nonce: 'n', operation: 'register' as const };
    const ev = createMellonStartEvent(detail);
    expect(ev.type).toBe(MELLON_START);
    expect(ev.detail).toBe(detail);
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it('createMellonSuccessEvent returns CustomEvent with bubbles false', () => {
    const detail = { credentialId: 'c', operation: 'authenticate' as const };
    const ev = createMellonSuccessEvent(detail);
    expect(ev.type).toBe(MELLON_SUCCESS);
    expect(ev.detail).toBe(detail);
    expect(ev.bubbles).toBe(false);
    expect(ev.composed).toBe(true);
  });

  it('createMellonErrorEvent returns CustomEvent with error detail', () => {
    const detail = { code: 'ERR', message: 'fail', operation: 'authenticate' as const };
    const ev = createMellonErrorEvent(detail);
    expect(ev.type).toBe(MELLON_ERROR);
    expect(ev.detail).toBe(detail);
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });
});
