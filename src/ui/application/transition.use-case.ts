/**
 * Use case: pure FSM transition. Validates types at boundary; delegates to domain getNextState.
 */
import { getNextState } from '../domain/fsm/fsm';
import type { UIState } from '../domain';
import { ensureUIState, isFSMEvent } from '../domain/validators';

/** Applies event to FSM and returns next state. Invalid input → idempotent safe state. */
export function applyTransition(currentState: unknown, event: unknown): UIState {
  const state = ensureUIState(currentState);
  if (!isFSMEvent(event)) return state;
  return getNextState(state, event);
}
