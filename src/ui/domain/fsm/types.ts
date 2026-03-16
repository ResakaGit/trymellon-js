/** UI FSM types — presentation layer. No DOM/core deps (types only). Aligned to 01-arquitectura §4. */
export { INITIAL_UI_STATE } from './constants';

/** UI state machine states. */
export type UIState =
  | 'IDLE'
  | 'EVALUATING_ENV'
  | 'READY'
  | 'READY_REGISTER'
  | 'READY_LOGIN'
  | 'AUTHENTICATING'
  | 'SUCCESS'
  | 'ERROR'
  | 'FALLBACK'
  | 'FALLBACK_EMAIL'
  | 'FALLBACK_QR'
  | 'ENROLLMENT_READY'
  | 'ENROLLING'
  | 'ENROLLMENT_SUCCESS'
  | 'ENROLLMENT_ERROR';

/** Component mode (mode attribute). */
export type UIMode = 'login' | 'register' | 'auto';

/** Client status in UI layer (port/adapter map from core). */
export type UIClientStatus = {
  isPasskeySupported: boolean;
  platformAuthenticatorAvailable: boolean;
  recommendedFlow: 'passkey' | 'fallback';
};

/** getClientStatus result for EVALUATING_ENV → READY* transition. */
export type EnvResolvedPayload = {
  recommendedFlow: 'passkey' | 'fallback';
  mode: UIMode;
  /** When recommendedFlow === 'fallback', available fallback channel. */
  fallbackType?: 'email' | 'qr';
};

/** Modal tab (register | login). */
export type TabKind = 'register' | 'login';

/** Maps modal tab to UIMode for startAuth. Identity for register|login. */
export function tabToUIMode(tab: TabKind): UIMode {
  return tab;
}

/** Events that trigger FSM transitions. */
export type FSMEvent =
  | { type: 'ENV_EVAL_START' }
  | { type: 'ENV_RESOLVED'; payload: EnvResolvedPayload }
  | { type: 'ENV_DETACH' }
  | { type: 'ENV_ERROR' }
  | { type: 'RESET' }
  | { type: 'TAB_CHANGE'; payload: { tab: TabKind } }
  | { type: 'START_AUTH' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_ERROR' }
  | { type: 'AUTH_FALLBACK' }
  | { type: 'AUTH_FALLBACK_EMAIL' }
  | { type: 'AUTH_FALLBACK_QR' }
  | { type: 'ENROLLMENT_READY_SET'; payload?: { ticketId?: string } }
  | { type: 'START_ENROLL' }
  | { type: 'ENROLL_SUCCESS' }
  | { type: 'ENROLL_ERROR' }
  | { type: 'ENROLL_RETRY' };
