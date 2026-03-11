/**
 * Use case: evaluate environment (getClientStatus) and return next FSM state. Validates params and port response at boundary; domain + EnvStatusPort only. No DOM.
 */
import type { EnvResolvedPayload, UIState, UIMode, UIClientStatus } from '../domain/types';
import type { EnvStatusPort } from '../ports/env-evaluator.port';
import { ensureUIState, isClientStatus, isUIMode } from '../domain/validators';
import { INITIAL_UI_STATE } from '../domain';
import { applyTransition } from './transition.use-case';

export type RunEnvEvalParams = {
  envStatusPort: EnvStatusPort;
  currentState: UIState;
  mode: UIMode;
  isMobileOverride?: boolean;
  /** When recommendedFlow is fallback, allows fixing FALLBACK_EMAIL vs FALLBACK_QR (e.g. modal). */
  fallbackType?: 'email' | 'qr';
};

/** Type guard: value has getClientStatus (EnvStatusPort). Invalid params/port → IDLE. */
function hasGetClientStatus(x: unknown): x is EnvStatusPort {
  return typeof (x as Record<string, unknown>)?.getClientStatus === 'function';
}

export async function runEnvEval(params: RunEnvEvalParams): Promise<UIState> {
  if (!hasGetClientStatus(params.envStatusPort)) return INITIAL_UI_STATE;

  const envStatusPort = params.envStatusPort;
  const currentState = ensureUIState(params.currentState);
  const mode = isUIMode(params.mode) ? params.mode : 'login';
  const isMobileOverride = params.isMobileOverride === true;
  const fallbackType =
    params.fallbackType === 'email' || params.fallbackType === 'qr'
      ? params.fallbackType
      : undefined;

  const stateEvaluating = applyTransition(currentState, { type: 'ENV_EVAL_START' });

  let status: UIClientStatus;
  try {
    const rawStatus = await envStatusPort.getClientStatus();
    if (!isClientStatus(rawStatus)) {
      return applyTransition(stateEvaluating, { type: 'ENV_ERROR' });
    }
    status = rawStatus;
  } catch {
    return applyTransition(stateEvaluating, { type: 'ENV_ERROR' });
  }

  const effectiveRecommendedFlow =
    isMobileOverride === true ? ('fallback' as const) : status.recommendedFlow;

  const payload: EnvResolvedPayload = {
    recommendedFlow: effectiveRecommendedFlow,
    mode,
    ...(effectiveRecommendedFlow === 'fallback' && fallbackType != null && { fallbackType }),
  };

  return applyTransition(stateEvaluating, { type: 'ENV_RESOLVED', payload });
}
