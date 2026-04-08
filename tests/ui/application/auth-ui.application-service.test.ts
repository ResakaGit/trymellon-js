import { describe, it, expect, vi } from 'vitest';
import {
  authUiApplicationService,
  canStartAuth,
} from '../../../src/ui/application/auth-ui.application-service';
import type { CoreAuthPort } from '../../../src/ui/ports/core-events.port';

describe('ui/application/auth-ui.application-service', () => {
  it('envEvalStart transitions to EVALUATING_ENV', () => {
    const next = authUiApplicationService.envEvalStart('IDLE');
    expect(next).toBe('EVALUATING_ENV');
  });

  it('startAuth calls signUp for mode=register and signIn otherwise', () => {
    const core: CoreAuthPort = {
      signUp: vi.fn(),
      signIn: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
      enroll: vi.fn(),
      getContextHash: vi.fn().mockReturnValue(''),
    };

    const stateAfterRegister = authUiApplicationService.startAuth(
      'READY_REGISTER',
      'register',
      core,
      { externalUserId: 'user_1' }
    );
    expect(core.signUp).toHaveBeenCalledWith({ externalUserId: 'user_1' });
    expect(core.signIn).not.toHaveBeenCalled();
    expect(stateAfterRegister).not.toBe('READY_REGISTER');

    (core.signUp as vi.Mock).mockClear();
    (core.signIn as vi.Mock).mockClear();

    const stateAfterLogin = authUiApplicationService.startAuth('READY_LOGIN', 'login', core, {
      externalUserId: 'user_2',
    });
    expect(core.signIn).toHaveBeenCalledWith({ externalUserId: 'user_2' });
    expect(core.signUp).not.toHaveBeenCalled();
    expect(stateAfterLogin).not.toBe('READY_LOGIN');
  });

  it('handleAuthOutcome returns null when not AUTHENTICATING', () => {
    expect(authUiApplicationService.handleAuthOutcome('READY', 'success')).toBeNull();
    expect(authUiApplicationService.handleAuthOutcome('READY', 'error')).toBeNull();
  });

  it('handleAuthOutcome transitions when AUTHENTICATING', () => {
    const successState = authUiApplicationService.handleAuthOutcome('AUTHENTICATING', 'success');
    expect(successState).toBe('SUCCESS');

    const errorState = authUiApplicationService.handleAuthOutcome('AUTHENTICATING', 'error');
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

  it('canStartAuth returns true only when FSM allows START_AUTH', () => {
    expect(canStartAuth('READY_LOGIN')).toBe(true);
    expect(canStartAuth('READY_REGISTER')).toBe(true);
    expect(canStartAuth('READY')).toBe(true);
    expect(canStartAuth('IDLE')).toBe(false);
    expect(canStartAuth('AUTHENTICATING')).toBe(false);
    expect(canStartAuth('SUCCESS')).toBe(false);
  });

  it('startEnrollment transitions to ENROLLING and calls core.enroll', () => {
    const core: CoreAuthPort = {
      signUp: vi.fn(),
      signIn: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
      enroll: vi.fn(),
      getContextHash: vi.fn().mockReturnValue(''),
    };
    const next = authUiApplicationService.startEnrollment('ENROLLMENT_READY', core, {
      ticketId: 'ticket_xyz',
    });
    expect(next).toBe('ENROLLING');
    expect(core.enroll).toHaveBeenCalledWith({ ticketId: 'ticket_xyz' });
    (core.enroll as ReturnType<typeof vi.fn>).mockClear();
    const fromIdle = authUiApplicationService.startEnrollment('IDLE', core, {
      ticketId: 'ticket_xyz',
    });
    expect(core.enroll).toHaveBeenCalledWith({ ticketId: 'ticket_xyz' });
    expect(fromIdle).toBe('ENROLLING');
  });

  it('enrollRetry transitions ENROLLMENT_ERROR to ENROLLMENT_READY', () => {
    const next = authUiApplicationService.enrollRetry('ENROLLMENT_ERROR');
    expect(next).toBe('ENROLLMENT_READY');
  });

  it('handleEnrollOutcome returns null when not ENROLLING', () => {
    expect(authUiApplicationService.handleEnrollOutcome('ENROLLMENT_READY', 'success')).toBeNull();
    expect(authUiApplicationService.handleEnrollOutcome('IDLE', 'error')).toBeNull();
  });

  it('handleEnrollOutcome transitions when ENROLLING', () => {
    expect(authUiApplicationService.handleEnrollOutcome('ENROLLING', 'success')).toBe(
      'ENROLLMENT_SUCCESS'
    );
    expect(authUiApplicationService.handleEnrollOutcome('ENROLLING', 'error')).toBe(
      'ENROLLMENT_ERROR'
    );
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
