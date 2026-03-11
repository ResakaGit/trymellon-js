/** Re-export FSM types and constants for backward compatibility. */
export { INITIAL_UI_STATE, tabToUIMode } from './fsm/types';
export type {
  UIState,
  UIMode,
  UIClientStatus,
  EnvResolvedPayload,
  TabKind,
  FSMEvent,
} from './fsm/types';
