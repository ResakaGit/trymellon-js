import { describe, it, expect } from 'vitest';
import { getNextState, INITIAL_UI_STATE } from '../../src/ui/domain';
import type { FSMEvent, UIState } from '../../src/ui/domain';

describe('UI FSM', () => {
  describe('initial state', () => {
    it('should expose INITIAL_UI_STATE as IDLE', () => {
      expect(INITIAL_UI_STATE).toBe('IDLE');
    });
  });

  describe('IDLE → EVALUATING_ENV', () => {
    it('should transition to EVALUATING_ENV on ENV_EVAL_START', () => {
      const next = getNextState('IDLE', { type: 'ENV_EVAL_START' });
      expect(next).toBe('EVALUATING_ENV');
    });
  });

  describe('EVALUATING_ENV → READY_*', () => {
    it('should transition to READY_LOGIN when mode=login and env OK', () => {
      const event: FSMEvent = {
        type: 'ENV_RESOLVED',
        payload: { recommendedFlow: 'passkey', mode: 'login' },
      };
      const next = getNextState('EVALUATING_ENV', event);
      expect(next).toBe('READY_LOGIN');
    });

    it('should transition to READY_REGISTER when mode=register and env OK', () => {
      const event: FSMEvent = {
        type: 'ENV_RESOLVED',
        payload: { recommendedFlow: 'passkey', mode: 'register' },
      };
      const next = getNextState('EVALUATING_ENV', event);
      expect(next).toBe('READY_REGISTER');
    });

    it('should transition to READY when mode=auto and env OK', () => {
      const event: FSMEvent = {
        type: 'ENV_RESOLVED',
        payload: { recommendedFlow: 'passkey', mode: 'auto' },
      };
      const next = getNextState('EVALUATING_ENV', event);
      expect(next).toBe('READY');
    });
  });

  describe('EVALUATING_ENV → FALLBACK', () => {
    it('should transition to FALLBACK when recommendedFlow is fallback', () => {
      const event: FSMEvent = {
        type: 'ENV_RESOLVED',
        payload: { recommendedFlow: 'fallback', mode: 'login' },
      };
      const next = getNextState('EVALUATING_ENV', event);
      expect(next).toBe('FALLBACK');
    });

    it('should transition to FALLBACK_EMAIL when fallbackType is email', () => {
      const event: FSMEvent = {
        type: 'ENV_RESOLVED',
        payload: {
          recommendedFlow: 'fallback',
          mode: 'login',
          fallbackType: 'email',
        },
      };
      const next = getNextState('EVALUATING_ENV', event);
      expect(next).toBe('FALLBACK_EMAIL');
    });

    it('should transition to FALLBACK_QR when fallbackType is qr', () => {
      const event: FSMEvent = {
        type: 'ENV_RESOLVED',
        payload: {
          recommendedFlow: 'fallback',
          mode: 'login',
          fallbackType: 'qr',
        },
      };
      const next = getNextState('EVALUATING_ENV', event);
      expect(next).toBe('FALLBACK_QR');
    });
  });

  describe('READY_* → AUTHENTICATING', () => {
    it('should transition from READY to AUTHENTICATING on START_AUTH', () => {
      const next = getNextState('READY', { type: 'START_AUTH' });
      expect(next).toBe('AUTHENTICATING');
    });

    it('should transition from READY_LOGIN to AUTHENTICATING on START_AUTH', () => {
      const next = getNextState('READY_LOGIN', { type: 'START_AUTH' });
      expect(next).toBe('AUTHENTICATING');
    });

    it('should transition from READY_REGISTER to AUTHENTICATING on START_AUTH', () => {
      const next = getNextState('READY_REGISTER', { type: 'START_AUTH' });
      expect(next).toBe('AUTHENTICATING');
    });
  });

  describe('AUTHENTICATING → terminal', () => {
    it('should transition to ERROR on AUTH_ERROR', () => {
      const next = getNextState('AUTHENTICATING', { type: 'AUTH_ERROR' });
      expect(next).toBe('ERROR');
    });

    it('should transition to SUCCESS on AUTH_SUCCESS', () => {
      const next = getNextState('AUTHENTICATING', { type: 'AUTH_SUCCESS' });
      expect(next).toBe('SUCCESS');
    });

    it('should transition to FALLBACK_EMAIL on AUTH_FALLBACK_EMAIL', () => {
      const next = getNextState('AUTHENTICATING', {
        type: 'AUTH_FALLBACK_EMAIL',
      });
      expect(next).toBe('FALLBACK_EMAIL');
    });

    it('should transition to FALLBACK_QR on AUTH_FALLBACK_QR', () => {
      const next = getNextState('AUTHENTICATING', { type: 'AUTH_FALLBACK_QR' });
      expect(next).toBe('FALLBACK_QR');
    });
  });

  describe('RESET → IDLE (02-fsm-estado-modal)', () => {
    it('should transition to IDLE from any state on RESET', () => {
      const states: UIState[] = [
        'IDLE',
        'EVALUATING_ENV',
        'READY',
        'READY_REGISTER',
        'READY_LOGIN',
        'AUTHENTICATING',
        'SUCCESS',
        'ERROR',
        'FALLBACK',
        'FALLBACK_EMAIL',
        'FALLBACK_QR',
        'ENROLLMENT_READY',
        'ENROLLING',
        'ENROLLMENT_SUCCESS',
        'ENROLLMENT_ERROR',
      ];
      for (const s of states) {
        expect(getNextState(s, { type: 'RESET' })).toBe('IDLE');
      }
    });
  });

  describe('EVALUATING_ENV → IDLE / ERROR', () => {
    it('should transition to IDLE on ENV_DETACH', () => {
      const next = getNextState('EVALUATING_ENV', { type: 'ENV_DETACH' });
      expect(next).toBe('IDLE');
    });

    it('should transition to ERROR on ENV_ERROR', () => {
      const next = getNextState('EVALUATING_ENV', { type: 'ENV_ERROR' });
      expect(next).toBe('ERROR');
    });
  });

  describe('TAB_CHANGE → READY_REGISTER | READY_LOGIN', () => {
    it('should transition to READY_LOGIN on TAB_CHANGE(tab=login) from READY_REGISTER', () => {
      const next = getNextState('READY_REGISTER', {
        type: 'TAB_CHANGE',
        payload: { tab: 'login' },
      });
      expect(next).toBe('READY_LOGIN');
    });

    it('should transition to READY_REGISTER on TAB_CHANGE(tab=register) from READY_LOGIN', () => {
      const next = getNextState('READY_LOGIN', {
        type: 'TAB_CHANGE',
        payload: { tab: 'register' },
      });
      expect(next).toBe('READY_REGISTER');
    });

    it('should transition from FALLBACK to READY_LOGIN on TAB_CHANGE(tab=login)', () => {
      const next = getNextState('FALLBACK', { type: 'TAB_CHANGE', payload: { tab: 'login' } });
      expect(next).toBe('READY_LOGIN');
    });

    it('should transition from AUTHENTICATING to READY_REGISTER on TAB_CHANGE(tab=register)', () => {
      const next = getNextState('AUTHENTICATING', {
        type: 'TAB_CHANGE',
        payload: { tab: 'register' },
      });
      expect(next).toBe('READY_REGISTER');
    });

    it('should transition from ERROR to READY_LOGIN on TAB_CHANGE(tab=login) (retry)', () => {
      const next = getNextState('ERROR', { type: 'TAB_CHANGE', payload: { tab: 'login' } });
      expect(next).toBe('READY_LOGIN');
    });

    it('should ignore TAB_CHANGE when in IDLE', () => {
      const next = getNextState('IDLE', { type: 'TAB_CHANGE', payload: { tab: 'login' } });
      expect(next).toBe('IDLE');
    });

    it('should transition from READY to READY_LOGIN on TAB_CHANGE(tab=login)', () => {
      const next = getNextState('READY', { type: 'TAB_CHANGE', payload: { tab: 'login' } });
      expect(next).toBe('READY_LOGIN');
    });

    it('should transition from READY to READY_REGISTER on TAB_CHANGE(tab=register)', () => {
      const next = getNextState('READY', { type: 'TAB_CHANGE', payload: { tab: 'register' } });
      expect(next).toBe('READY_REGISTER');
    });

    it('should transition from FALLBACK_EMAIL to READY_LOGIN on TAB_CHANGE(tab=login)', () => {
      const next = getNextState('FALLBACK_EMAIL', {
        type: 'TAB_CHANGE',
        payload: { tab: 'login' },
      });
      expect(next).toBe('READY_LOGIN');
    });

    it('should transition from FALLBACK_EMAIL to READY_REGISTER on TAB_CHANGE(tab=register)', () => {
      const next = getNextState('FALLBACK_EMAIL', {
        type: 'TAB_CHANGE',
        payload: { tab: 'register' },
      });
      expect(next).toBe('READY_REGISTER');
    });

    it('should transition from FALLBACK_QR to READY_LOGIN on TAB_CHANGE(tab=login)', () => {
      const next = getNextState('FALLBACK_QR', {
        type: 'TAB_CHANGE',
        payload: { tab: 'login' },
      });
      expect(next).toBe('READY_LOGIN');
    });

    it('should transition from FALLBACK_QR to READY_REGISTER on TAB_CHANGE(tab=register)', () => {
      const next = getNextState('FALLBACK_QR', {
        type: 'TAB_CHANGE',
        payload: { tab: 'register' },
      });
      expect(next).toBe('READY_REGISTER');
    });

    it('should keep state on TAB_CHANGE when tab is not register or login', () => {
      const next = getNextState('READY_LOGIN', {
        type: 'TAB_CHANGE',
        payload: { tab: 'other' as 'login' },
      });
      expect(next).toBe('READY_LOGIN');
    });

    it('should keep state on TAB_CHANGE when payload has no valid tab', () => {
      const event = { type: 'TAB_CHANGE' as const, payload: {} } as FSMEvent;
      const next = getNextState('READY_LOGIN', event);
      expect(next).toBe('READY_LOGIN');
    });
  });

  describe('AUTHENTICATING → FALLBACK (generic)', () => {
    it('should transition to FALLBACK on AUTH_FALLBACK', () => {
      const next = getNextState('AUTHENTICATING', { type: 'AUTH_FALLBACK' });
      expect(next).toBe('FALLBACK');
    });
  });

  describe('fail-safe (null/undefined)', () => {
    it('should return IDLE when currentState is null', () => {
      const next = getNextState(null as unknown as UIState, { type: 'ENV_EVAL_START' });
      expect(next).toBe('IDLE');
    });

    it('should return IDLE when currentState is undefined', () => {
      const next = getNextState(undefined as unknown as UIState, { type: 'RESET' });
      expect(next).toBe('IDLE');
    });

    it('should return IDLE when event is null', () => {
      const next = getNextState('READY_LOGIN', null as unknown as FSMEvent);
      expect(next).toBe('IDLE');
    });

    it('should return IDLE when event is undefined', () => {
      const next = getNextState('AUTHENTICATING', undefined as unknown as FSMEvent);
      expect(next).toBe('IDLE');
    });
  });

  describe('enrollment flow (KP-SDK-02)', () => {
    it('should transition IDLE → ENROLLMENT_READY on ENROLLMENT_READY_SET', () => {
      const next = getNextState('IDLE', { type: 'ENROLLMENT_READY_SET' });
      expect(next).toBe('ENROLLMENT_READY');
    });

    it('should transition ENROLLMENT_READY → ENROLLING on START_ENROLL', () => {
      const next = getNextState('ENROLLMENT_READY', { type: 'START_ENROLL' });
      expect(next).toBe('ENROLLING');
    });

    it('should transition ENROLLING → ENROLLMENT_SUCCESS on ENROLL_SUCCESS', () => {
      const next = getNextState('ENROLLING', { type: 'ENROLL_SUCCESS' });
      expect(next).toBe('ENROLLMENT_SUCCESS');
    });

    it('should transition ENROLLING → ENROLLMENT_ERROR on ENROLL_ERROR', () => {
      const next = getNextState('ENROLLING', { type: 'ENROLL_ERROR' });
      expect(next).toBe('ENROLLMENT_ERROR');
    });

    it('should transition ENROLLMENT_ERROR → ENROLLMENT_READY on ENROLL_RETRY', () => {
      const next = getNextState('ENROLLMENT_ERROR', { type: 'ENROLL_RETRY' });
      expect(next).toBe('ENROLLMENT_READY');
    });

    it('should not transition READY to enrollment on START_AUTH (register/login unchanged)', () => {
      const next = getNextState('READY', { type: 'START_AUTH' });
      expect(next).toBe('AUTHENTICATING');
    });
  });

  describe('invalid or ignored transitions', () => {
    it('should remain IDLE on START_AUTH (no-op)', () => {
      const next = getNextState('IDLE', { type: 'START_AUTH' });
      expect(next).toBe('IDLE');
    });

    it('should remain EVALUATING_ENV on ENV_EVAL_START (no-op)', () => {
      const next = getNextState('EVALUATING_ENV', { type: 'ENV_EVAL_START' });
      expect(next).toBe('EVALUATING_ENV');
    });

    it('should remain AUTHENTICATING on ENV_RESOLVED (no-op)', () => {
      const event: FSMEvent = {
        type: 'ENV_RESOLVED',
        payload: { recommendedFlow: 'passkey', mode: 'login' },
      };
      const next = getNextState('AUTHENTICATING', event);
      expect(next).toBe('AUTHENTICATING');
    });
  });
});
