import { describe, it, expect } from 'vitest';
import { applyTransition } from '../../../src/ui/application';
import type { FSMEvent, UIState } from '../../../src/ui/domain';

describe('application/transition.use-case', () => {
  it('should transition IDLE → EVALUATING_ENV on ENV_EVAL_START', () => {
    const next = applyTransition('IDLE', { type: 'ENV_EVAL_START' });
    expect(next).toBe('EVALUATING_ENV');
  });

  it('should transition EVALUATING_ENV → READY_LOGIN on ENV_RESOLVED (passkey, login)', () => {
    const event: FSMEvent = {
      type: 'ENV_RESOLVED',
      payload: { recommendedFlow: 'passkey', mode: 'login' },
    };
    const next = applyTransition('EVALUATING_ENV', event);
    expect(next).toBe('READY_LOGIN');
  });

  it('should transition EVALUATING_ENV → READY_REGISTER on ENV_RESOLVED (passkey, register)', () => {
    const event: FSMEvent = {
      type: 'ENV_RESOLVED',
      payload: { recommendedFlow: 'passkey', mode: 'register' },
    };
    const next = applyTransition('EVALUATING_ENV', event);
    expect(next).toBe('READY_REGISTER');
  });

  it('should transition EVALUATING_ENV → FALLBACK on ENV_RESOLVED (fallback)', () => {
    const event: FSMEvent = {
      type: 'ENV_RESOLVED',
      payload: { recommendedFlow: 'fallback', mode: 'login' },
    };
    const next = applyTransition('EVALUATING_ENV', event);
    expect(next).toBe('FALLBACK');
  });

  it('should transition EVALUATING_ENV → ERROR on ENV_ERROR', () => {
    const next = applyTransition('EVALUATING_ENV', { type: 'ENV_ERROR' });
    expect(next).toBe('ERROR');
  });

  it('should transition any state → IDLE on RESET', () => {
    const states: UIState[] = ['EVALUATING_ENV', 'READY', 'READY_LOGIN', 'AUTHENTICATING', 'ERROR'];
    for (const s of states) {
      expect(applyTransition(s, { type: 'RESET' })).toBe('IDLE');
    }
  });
});
