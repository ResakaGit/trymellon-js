import { describe, it, expect } from 'vitest';
import {
  isClientStatus,
  isEnvResolvedPayload,
  isFSMEvent,
  isThemeKind,
  isModalDisplayMode,
  isTabKind,
  isUIState,
  ensureUIState,
} from '../../../src/ui/domain/validators-state';
import { INITIAL_UI_STATE } from '../../../src/ui/domain/types';

describe('ui/domain/validators-state', () => {
  it('isClientStatus accepts minimal valid UIClientStatus', () => {
    const ok = {
      isPasskeySupported: true,
      platformAuthenticatorAvailable: false,
      recommendedFlow: 'fallback',
    };
    expect(isClientStatus(ok)).toBe(true);
  });

  it('isClientStatus rejects null or non-object', () => {
    expect(isClientStatus(null)).toBe(false);
    expect(isClientStatus(42)).toBe(false);
  });

  it('isClientStatus rejects when isPasskeySupported is not boolean', () => {
    expect(
      isClientStatus({
        isPasskeySupported: 'yes',
        platformAuthenticatorAvailable: true,
        recommendedFlow: 'passkey',
      })
    ).toBe(false);
  });

  it('isClientStatus rejects when platformAuthenticatorAvailable is not boolean', () => {
    expect(
      isClientStatus({
        isPasskeySupported: true,
        platformAuthenticatorAvailable: null,
        recommendedFlow: 'passkey',
      })
    ).toBe(false);
  });

  it('isClientStatus rejects invalid recommendedFlow', () => {
    const bad = {
      isPasskeySupported: true,
      platformAuthenticatorAvailable: true,
      recommendedFlow: 'invalid',
    } as unknown;
    expect(isClientStatus(bad)).toBe(false);
  });

  it('isEnvResolvedPayload validates recommendedFlow, mode and optional fallbackType', () => {
    const base = { recommendedFlow: 'passkey', mode: 'login' };
    expect(isEnvResolvedPayload(base)).toBe(true);
    expect(isEnvResolvedPayload({ ...base, fallbackType: 'email' })).toBe(true);
    expect(isEnvResolvedPayload({ ...base, fallbackType: 'qr' })).toBe(true);
    expect(isEnvResolvedPayload({ ...base, fallbackType: 'other' })).toBe(false);
  });

  it('isFSMEvent validates simple events and ENV_RESOLVED/TAB_CHANGE payloads', () => {
    expect(isFSMEvent({ type: 'RESET' })).toBe(true);
    expect(
      isFSMEvent({
        type: 'ENV_RESOLVED',
        payload: { recommendedFlow: 'fallback', mode: 'login', fallbackType: 'email' },
      })
    ).toBe(true);
    expect(isFSMEvent({ type: 'TAB_CHANGE', payload: { tab: 'register' } })).toBe(true);
    expect(isFSMEvent({ type: 'TAB_CHANGE', payload: { tab: 'other' } })).toBe(false);
    expect(isFSMEvent({ type: 'UNKNOWN' })).toBe(false);
  });

  it('isFSMEvent rejects ENV_RESOLVED with invalid payload', () => {
    expect(isFSMEvent({ type: 'ENV_RESOLVED', payload: null })).toBe(false);
    expect(isFSMEvent({ type: 'ENV_RESOLVED', payload: {} })).toBe(false);
  });

  it('isFSMEvent rejects TAB_CHANGE without payload or invalid payload', () => {
    expect(isFSMEvent({ type: 'TAB_CHANGE' })).toBe(false);
    expect(isFSMEvent({ type: 'TAB_CHANGE', payload: null })).toBe(false);
    expect(isFSMEvent({ type: 'TAB_CHANGE', payload: { tab: 123 } })).toBe(false);
  });

  it('isFSMEvent rejects non-object or null', () => {
    expect(isFSMEvent(null)).toBe(false);
    expect(isFSMEvent({ type: 42 })).toBe(false);
  });

  it('primitive validators accept only allowed values', () => {
    expect(isThemeKind('light')).toBe(true);
    expect(isThemeKind('dark')).toBe(true);
    expect(isThemeKind('other')).toBe(false);

    expect(isModalDisplayMode('modal')).toBe(true);
    expect(isModalDisplayMode('inline')).toBe(true);
    expect(isModalDisplayMode('dialog')).toBe(false);

    expect(isTabKind('register')).toBe(true);
    expect(isTabKind('login')).toBe(true);
    expect(isTabKind('other')).toBe(false);

    expect(isUIState('IDLE')).toBe(true);
    expect(isUIState('UNKNOWN')).toBe(false);
  });

  it('ensureUIState returns INITIAL_UI_STATE when value is invalid', () => {
    expect(ensureUIState('IDLE')).toBe('IDLE');
    expect(ensureUIState('OTHER')).toBe(INITIAL_UI_STATE);
  });
});
