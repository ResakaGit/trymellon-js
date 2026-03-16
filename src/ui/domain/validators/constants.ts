/**
 * Validator constants: enum arrays for type guards and parseEnum. Single source of truth.
 */
import type { UIState } from '../fsm/types';
import type {
  ThemeKind,
  ModalDisplayMode,
  ButtonAction,
  ButtonVariant,
  ModalVariant,
} from '../contracts/types';

export const UI_STATES: readonly UIState[] = [
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

export const UI_MODES = ['login', 'register', 'auto'] as const;
export const THEME_KINDS: readonly ThemeKind[] = ['light', 'dark'];
export const TAB_KINDS = ['register', 'login'] as const;
export const MODAL_DISPLAY_MODES: readonly ModalDisplayMode[] = ['modal', 'inline'];
export const FALLBACK_TYPES = ['email', 'qr'] as const;
export const BUTTON_ACTIONS: readonly ButtonAction[] = ['direct-auth', 'open-modal'];
export const BUTTON_VARIANTS: readonly ButtonVariant[] = ['default', 'pill'];
export const MODAL_VARIANTS: readonly ModalVariant[] = ['default', 'minimal'];

export const RECOMMENDED_FLOWS = ['passkey', 'fallback'] as const;
