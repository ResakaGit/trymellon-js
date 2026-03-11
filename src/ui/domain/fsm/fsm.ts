/**
 * Pure UI FSM — no DOM, no I/O. (currentState, event) → nextState.
 * Transitions per 02-fsm-estado-modal.
 */
import type { UIState, FSMEvent, EnvResolvedPayload } from './types';

function resolveEnvState(payload: EnvResolvedPayload): UIState {
  if (payload.recommendedFlow === 'fallback') {
    if (payload.fallbackType === 'email') return 'FALLBACK_EMAIL';
    if (payload.fallbackType === 'qr') return 'FALLBACK_QR';
    return 'FALLBACK';
  }
  switch (payload.mode) {
    case 'login':
      return 'READY_LOGIN';
    case 'register':
      return 'READY_REGISTER';
    case 'auto':
    default:
      return 'READY';
  }
}

function tabToReadyState(tab: 'register' | 'login'): UIState {
  return tab === 'register' ? 'READY_REGISTER' : 'READY_LOGIN';
}

/**
 * Next FSM state from current state and event. RESET from any state → IDLE.
 * Undefined transitions leave state unchanged (idempotent).
 */
export function getNextState(currentState: UIState, event: FSMEvent): UIState {
  if (currentState == null || event == null) return 'IDLE';
  if (event.type === 'RESET') return 'IDLE';

  if (event.type === 'TAB_CHANGE') {
    const tab = event.payload?.tab;
    if (tab !== 'register' && tab !== 'login') return currentState;
    const nextReady = tabToReadyState(tab);
    switch (currentState) {
      case 'READY':
      case 'READY_REGISTER':
      case 'READY_LOGIN':
      case 'FALLBACK':
      case 'FALLBACK_EMAIL':
      case 'FALLBACK_QR':
      case 'AUTHENTICATING':
      case 'ERROR':
        return nextReady;
      default:
        return currentState;
    }
  }

  switch (currentState) {
    case 'IDLE':
      if (event.type === 'ENV_EVAL_START') return 'EVALUATING_ENV';
      break;

    case 'EVALUATING_ENV':
      if (event.type === 'ENV_RESOLVED') return resolveEnvState(event.payload);
      if (event.type === 'ENV_DETACH') return 'IDLE';
      if (event.type === 'ENV_ERROR') return 'ERROR';
      break;

    case 'READY':
    case 'READY_REGISTER':
    case 'READY_LOGIN':
      if (event.type === 'START_AUTH') return 'AUTHENTICATING';
      break;

    case 'AUTHENTICATING':
      if (event.type === 'AUTH_SUCCESS') return 'SUCCESS';
      if (event.type === 'AUTH_ERROR') return 'ERROR';
      if (event.type === 'AUTH_FALLBACK') return 'FALLBACK';
      if (event.type === 'AUTH_FALLBACK_EMAIL') return 'FALLBACK_EMAIL';
      if (event.type === 'AUTH_FALLBACK_QR') return 'FALLBACK_QR';
      break;

    default:
      break;
  }

  return currentState;
}
