import { describe, it, expect, vi } from 'vitest';
import { AuthController } from '../../../src/ui/presentation/auth-controller';
import type { CoreAuthPort } from '../../../src/ui/ports/core-events.port';
import type { EnvStatusPort } from '../../../src/ui/ports/env-evaluator.port';
import type { UIClientStatus } from '../../../src/ui/domain/types';

describe('ui/presentation/auth-controller', () => {
  it('initial state is IDLE and consumeRenderDecision returns true when dirty', () => {
    const c = new AuthController();
    expect(c.currentState).toBe('IDLE');
    expect(c.consumeRenderDecision()).toBe(true);
    expect(c.consumeRenderDecision()).toBe(false);
  });

  it('setState updates currentState and marks render dirty', () => {
    const c = new AuthController();
    c.setState('READY_LOGIN');
    expect(c.currentState).toBe('READY_LOGIN');
    expect(c.consumeRenderDecision()).toBe(true);
    expect(c.consumeRenderDecision()).toBe(false);
  });

  it('invalidateRender marks dirty without changing state', () => {
    const c = new AuthController();
    c.setState('READY_LOGIN');
    c.consumeRenderDecision();
    c.invalidateRender();
    expect(c.consumeRenderDecision()).toBe(true);
  });

  it('setStateForRender sets state and marks dirty', () => {
    const c = new AuthController();
    c.setStateForRender('SUCCESS');
    expect(c.currentState).toBe('SUCCESS');
    expect(c.consumeRenderDecision()).toBe(true);
  });

  it('setPendingOperationFromTab and pendingOperation', () => {
    const c = new AuthController();
    c.setPendingOperationFromTab('login');
    expect(c.pendingOperation).toBe('authenticate');
    c.setPendingOperationFromTab('register');
    expect(c.pendingOperation).toBe('register');
  });

  it('consumeCancelledDetailIfAuthenticating returns null when not AUTHENTICATING', () => {
    const c = new AuthController();
    expect(c.consumeCancelledDetailIfAuthenticating()).toBeNull();
    c.setState('READY_LOGIN');
    expect(c.consumeCancelledDetailIfAuthenticating()).toBeNull();
  });

  it('consumeCancelledDetailIfAuthenticating returns detail when AUTHENTICATING and clears nonce', () => {
    const c = new AuthController();
    c.setState('AUTHENTICATING');
    c.setNonce('n1');
    const detail = c.consumeCancelledDetailIfAuthenticating();
    expect(detail).toMatchObject({ operation: 'login', nonce: 'n1' });
    // Second call still returns detail (state still AUTHENTICATING) but without nonce
    const second = c.consumeCancelledDetailIfAuthenticating();
    expect(second).toMatchObject({ operation: 'login' });
    expect(second?.nonce).toBeUndefined();
  });

  it('handleAuthSuccess transitions AUTHENTICATING to SUCCESS', () => {
    const c = new AuthController();
    c.setState('AUTHENTICATING');
    c.handleAuthSuccess();
    expect(c.currentState).toBe('SUCCESS');
  });

  it('handleAuthSuccess no-op when not AUTHENTICATING', () => {
    const c = new AuthController();
    c.setState('IDLE');
    c.handleAuthSuccess();
    expect(c.currentState).toBe('IDLE');
  });

  it('handleAuthError transitions AUTHENTICATING to ERROR', () => {
    const c = new AuthController();
    c.setState('AUTHENTICATING');
    c.handleAuthError();
    expect(c.currentState).toBe('ERROR');
  });

  it('handleAuthError no-op when not AUTHENTICATING', () => {
    const c = new AuthController();
    c.setState('READY_LOGIN');
    c.handleAuthError();
    expect(c.currentState).toBe('READY_LOGIN');
  });

  it('onStartEvent sets nonce from detail', () => {
    const c = new AuthController();
    c.setState('AUTHENTICATING');
    c.onStartEvent({ operation: 'login', nonce: 'from-event' });
    const detail = c.consumeCancelledDetailIfAuthenticating();
    expect(detail?.nonce).toBe('from-event');
  });

  it('startAuthFromClick no-op when core is null', () => {
    const c = new AuthController();
    c.setState('READY_LOGIN');
    c.startAuthFromClick(null, 'login');
    expect(c.currentState).toBe('READY_LOGIN');
  });

  it('startAuthFromClick no-op when state not ready for START_AUTH', () => {
    const core: CoreAuthPort = {
      register: vi.fn(),
      authenticate: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
    };
    const c = new AuthController();
    c.setState('IDLE');
    c.startAuthFromClick(core, 'login');
    expect(c.currentState).toBe('IDLE');
    expect(core.authenticate).not.toHaveBeenCalled();
  });

  it('startAuthFromClick delegates to core and transitions when START_AUTH is allowed (READY_LOGIN)', () => {
    const core: CoreAuthPort = {
      register: vi.fn(),
      authenticate: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
    };
    const c = new AuthController();
    c.setState('READY_LOGIN');
    c.startAuthFromClick(core, 'login');
    expect(core.authenticate).toHaveBeenCalled();
    expect(c.currentState).toBe('AUTHENTICATING');
  });

  it('startAuthFromClick delegates register when START_AUTH is allowed (READY_REGISTER)', () => {
    const core: CoreAuthPort = {
      register: vi.fn(),
      authenticate: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
    };
    const c = new AuthController();
    c.setState('READY_REGISTER');
    c.startAuthFromClick(core, 'register');
    expect(core.register).toHaveBeenCalled();
    expect(c.currentState).toBe('AUTHENTICATING');
  });

  it('runEnvEval transitions and returns state from port', async () => {
    const c = new AuthController();
    const port: EnvStatusPort = {
      getClientStatus: vi.fn().mockResolvedValue({
        isPasskeySupported: true,
        platformAuthenticatorAvailable: false,
        recommendedFlow: 'passkey',
      } satisfies UIClientStatus),
    };
    const state = await c.runEnvEval({
      envStatusPort: port,
      mode: 'login',
    });
    expect(state).toBe('READY_LOGIN');
    // Controller leaves state as EVALUATING_ENV; WC is responsible for setState(result)
    expect(c.currentState).toBe('EVALUATING_ENV');
  });

  it('runEnvEval returns null when response is stale (second request wins)', async () => {
    const c = new AuthController();
    let resolveSlow: (v: UIClientStatus) => void = () => {};
    const slowPort: EnvStatusPort = {
      getClientStatus: () =>
        new Promise<UIClientStatus>((r) => {
          resolveSlow = r;
        }),
    };
    const fastPort: EnvStatusPort = {
      getClientStatus: vi.fn().mockResolvedValue({
        isPasskeySupported: true,
        platformAuthenticatorAvailable: false,
        recommendedFlow: 'passkey',
      } satisfies UIClientStatus),
    };
    const p1 = c.runEnvEval({
      envStatusPort: slowPort,
      mode: 'login',
    });
    const p2 = c.runEnvEval({
      envStatusPort: fastPort,
      mode: 'login',
    });
    const fastResult = await p2;
    expect(fastResult).toBe('READY_LOGIN');
    resolveSlow({
      isPasskeySupported: true,
      platformAuthenticatorAvailable: false,
      recommendedFlow: 'passkey',
    });
    const slowResult = await p1;
    expect(slowResult).toBeNull();
  });

  it('reset transitions to IDLE and clears render cache', () => {
    const c = new AuthController();
    c.setState('SUCCESS');
    c.consumeRenderDecision();
    c.reset();
    expect(c.currentState).toBe('IDLE');
    expect(c.consumeRenderDecision()).toBe(true);
  });
});
