import { describe, it, expect, vi } from 'vitest';
import { authUiApplicationService } from '../../../src/ui/application/auth-ui.application-service';
import type { CoreAuthPort } from '../../../src/ui/ports/core-events.port';

describe('ui/application/auth-ui.application-service', () => {
  it('envEvalStart transitions to EVALUATING_ENV', () => {
    const next = authUiApplicationService.envEvalStart('IDLE');
    expect(next).toBe('EVALUATING_ENV');
  });

  it('startAuth calls register for mode=register and authenticate otherwise', () => {
    const core: CoreAuthPort = {
      register: vi.fn(),
      authenticate: vi.fn(),
    };

    const stateAfterRegister = authUiApplicationService.startAuth(
      'READY_REGISTER',
      'register',
      core,
      { externalUserId: 'user_1' }
    );
    expect(core.register).toHaveBeenCalledWith({ externalUserId: 'user_1' });
    expect(core.authenticate).not.toHaveBeenCalled();
    expect(stateAfterRegister).not.toBe('READY_REGISTER');

    (core.register as vi.Mock).mockClear();
    (core.authenticate as vi.Mock).mockClear();

    const stateAfterLogin = authUiApplicationService.startAuth('READY_LOGIN', 'login', core, {
      externalUserId: 'user_2',
    });
    expect(core.authenticate).toHaveBeenCalledWith({ externalUserId: 'user_2' });
    expect(core.register).not.toHaveBeenCalled();
    expect(stateAfterLogin).not.toBe('READY_LOGIN');
  });

  it('tryHandleAuthSuccess and tryHandleAuthError return null when not AUTHENTICATING', () => {
    expect(authUiApplicationService.tryHandleAuthSuccess('READY')).toBeNull();
    expect(authUiApplicationService.tryHandleAuthError('READY')).toBeNull();
  });

  it('tryHandleAuthSuccess and tryHandleAuthError transition when AUTHENTICATING', () => {
    const successState = authUiApplicationService.tryHandleAuthSuccess('AUTHENTICATING');
    expect(successState).toBe('SUCCESS');

    const errorState = authUiApplicationService.tryHandleAuthError('AUTHENTICATING');
    expect(errorState).toBe('ERROR');
  });

  it('handleFallback delegates to transition (email / qr / default) from AUTHENTICATING', () => {
    expect(authUiApplicationService.handleFallback('AUTHENTICATING', 'email')).toBe(
      'FALLBACK_EMAIL'
    );
    expect(authUiApplicationService.handleFallback('AUTHENTICATING', 'qr')).toBe('FALLBACK_QR');
    expect(authUiApplicationService.handleFallback('AUTHENTICATING')).toBe('FALLBACK');
  });

  it('tabChange wraps TAB_CHANGE event with payload', () => {
    const next = authUiApplicationService.tabChange('READY_LOGIN', 'register');
    expect(next).toBe('READY_REGISTER');
  });

  it('reset sends RESET event and returns IDLE', () => {
    const next = authUiApplicationService.reset('SUCCESS');
    expect(next).toBe('IDLE');
  });

  it('handleAuthSuccess and handleAuthError apply AUTH_SUCCESS / AUTH_ERROR', () => {
    expect(authUiApplicationService.handleAuthSuccess('AUTHENTICATING')).toBe('SUCCESS');
    expect(authUiApplicationService.handleAuthError('AUTHENTICATING')).toBe('ERROR');
  });

  it('evaluateEnv delegates to runEnvEval and returns UIState', async () => {
    const port = {
      getClientStatus: vi.fn().mockResolvedValue({
        isPasskeySupported: true,
        platformAuthenticatorAvailable: false,
        recommendedFlow: 'passkey',
      }),
    };
    const state = await authUiApplicationService.evaluateEnv({
      envStatusPort: port,
      currentState: 'IDLE',
      mode: 'login',
    });
    expect(state).toBe('READY_LOGIN');
  });
});
