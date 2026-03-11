/**
 * Application facade: orchestrates use cases (applyTransition, runEnvEval) and core delegation. One method per UC; domain + ports only. Stale-response token: caller (WC) responsibility; stateless.
 */
import type { UIState, UIMode, TabKind } from '../domain/types';
import type { FSMEvent } from '../domain/types';
import type { CoreAuthPort, CoreAuthOptions } from '../ports/core-events.port';
import { applyTransition } from './transition.use-case';
import { runEnvEval, type RunEnvEvalParams } from './evaluate-env.use-case';

/** Application facade contract: high-level methods per use case. */
export interface AuthUiApplicationService {
  /** Transition ENV_EVAL_START → EVALUATING_ENV (so WC shows evaluating state before await). */
  envEvalStart(currentState: UIState): UIState;

  /**
   * EvaluateEnvironment: evaluates env via port and returns final FSM state.
   * Always resolves with UIState. Caller (WC) must discard stale responses by comparing
   * a per-instance requestId after await (last-wins per component).
   */
  evaluateEnv(params: RunEnvEvalParams): Promise<UIState>;

  /** START_AUTH transition and core delegation (authenticate/register). */
  startAuth(
    currentState: UIState,
    mode: UIMode,
    coreAuthPort: CoreAuthPort,
    options?: CoreAuthOptions
  ): UIState;

  /** AUTH_SUCCESS transition. */
  handleAuthSuccess(currentState: UIState): UIState;

  /** AUTH_ERROR transition. */
  handleAuthError(currentState: UIState): UIState;

  /** Applies AUTH_SUCCESS only if state is AUTHENTICATING. Returns new state or null (avoids duplicating guard in WCs). */
  tryHandleAuthSuccess(currentState: UIState): UIState | null;

  /** Applies AUTH_ERROR only if state is AUTHENTICATING. Returns new state or null (avoids duplicating guard in WCs). */
  tryHandleAuthError(currentState: UIState): UIState | null;

  /** AUTH_FALLBACK[_EMAIL|_QR] transition by channel. */
  handleFallback(currentState: UIState, fallbackKind?: 'email' | 'qr'): UIState;

  /** TAB_CHANGE transition. */
  tabChange(currentState: UIState, tab: TabKind): UIState;

  /** RESET → IDLE transition. */
  reset(currentState: UIState): UIState;
}

/**
 * Pure helper: returns whether the FSM allows starting AUTH from the given state.
 * Uses applyTransition as single source of truth: if START_AUTH does not change state, it is not allowed.
 */
export function canStartAuth(currentState: UIState): boolean {
  const nextState = applyTransition(currentState, { type: 'START_AUTH' });
  return nextState !== currentState;
}

function applyStartAuthAndInvokeCore(
  currentState: UIState,
  mode: UIMode,
  coreAuthPort: CoreAuthPort,
  options?: CoreAuthOptions
): UIState {
  const nextState = applyTransition(currentState, { type: 'START_AUTH' });
  if (mode === 'register') {
    coreAuthPort.register(options);
  } else {
    coreAuthPort.authenticate(options);
  }
  return nextState;
}

/** Fallback kind → FSM event. One lookup; generic is the default key. */
const FALLBACK_EVENT: Record<'email' | 'qr' | 'generic', FSMEvent> = {
  email: { type: 'AUTH_FALLBACK_EMAIL' },
  qr: { type: 'AUTH_FALLBACK_QR' },
  generic: { type: 'AUTH_FALLBACK' },
};

function applyFallbackTransition(currentState: UIState, fallbackKind?: 'email' | 'qr'): UIState {
  const key: 'email' | 'qr' | 'generic' =
    fallbackKind === 'email' ? 'email' : fallbackKind === 'qr' ? 'qr' : 'generic';
  return applyTransition(currentState, FALLBACK_EVENT[key]);
}

/** Stateless facade implementation; orchestrates use cases and ports. */
export const authUiApplicationService: AuthUiApplicationService = {
  envEvalStart(currentState) {
    return applyTransition(currentState, { type: 'ENV_EVAL_START' });
  },

  evaluateEnv(params) {
    return runEnvEval(params);
  },

  startAuth(currentState, mode, coreAuthPort, options) {
    return applyStartAuthAndInvokeCore(currentState, mode, coreAuthPort, options);
  },

  handleAuthSuccess(currentState) {
    return applyTransition(currentState, { type: 'AUTH_SUCCESS' });
  },

  handleAuthError(currentState) {
    return applyTransition(currentState, { type: 'AUTH_ERROR' });
  },

  tryHandleAuthSuccess(currentState) {
    if (currentState !== 'AUTHENTICATING') return null;
    return applyTransition(currentState, { type: 'AUTH_SUCCESS' });
  },

  tryHandleAuthError(currentState) {
    if (currentState !== 'AUTHENTICATING') return null;
    return applyTransition(currentState, { type: 'AUTH_ERROR' });
  },

  handleFallback(currentState, fallbackKind) {
    return applyFallbackTransition(currentState, fallbackKind);
  },

  tabChange(currentState, tab) {
    return applyTransition(currentState, { type: 'TAB_CHANGE', payload: { tab } });
  },

  reset(currentState) {
    return applyTransition(currentState, { type: 'RESET' });
  },
};
