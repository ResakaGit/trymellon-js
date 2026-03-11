/**
 * FSM state and event validators. Pure type guards and HOFs; no dependencies outside domain.
 */
import type {
  UIState,
  UIMode,
  EnvResolvedPayload,
  TabKind,
  FSMEvent,
  UIClientStatus,
} from '../fsm/types';
import type {
  ThemeKind,
  ModalDisplayMode,
  ButtonAction,
  ButtonVariant,
  ModalVariant,
} from '../contracts/types';
import { INITIAL_UI_STATE } from '../fsm/constants';
import {
  UI_STATES,
  UI_MODES,
  THEME_KINDS,
  TAB_KINDS,
  MODAL_DISPLAY_MODES,
  FALLBACK_TYPES,
  BUTTON_ACTIONS,
  BUTTON_VARIANTS,
  MODAL_VARIANTS,
  RECOMMENDED_FLOWS,
} from './constants';

export {
  UI_STATES,
  UI_MODES,
  THEME_KINDS,
  TAB_KINDS,
  MODAL_DISPLAY_MODES,
  FALLBACK_TYPES,
  BUTTON_ACTIONS,
  BUTTON_VARIANTS,
  MODAL_VARIANTS,
};

/** Type guard: getClientStatus result (port) as UIClientStatus. */
export function isClientStatus(value: unknown): value is UIClientStatus {
  if (value == null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.isPasskeySupported !== 'boolean') return false;
  if (typeof v.platformAuthenticatorAvailable !== 'boolean') return false;
  if (v.recommendedFlow !== 'passkey' && v.recommendedFlow !== 'fallback') return false;
  return true;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

export function isUIState(value: unknown): value is UIState {
  return isOneOf(value, UI_STATES);
}

export function ensureUIState(value: unknown): UIState {
  return isUIState(value) ? value : (INITIAL_UI_STATE as UIState);
}

export function isUIMode(value: unknown): value is UIMode {
  return isOneOf(value, UI_MODES);
}

export function isThemeKind(value: unknown): value is ThemeKind {
  return isOneOf(value, THEME_KINDS);
}

export function isTabKind(value: unknown): value is TabKind {
  return isOneOf(value, TAB_KINDS);
}

export function isModalDisplayMode(value: unknown): value is ModalDisplayMode {
  return isOneOf(value, MODAL_DISPLAY_MODES);
}

export function isButtonAction(value: unknown): value is ButtonAction {
  return isOneOf(value, BUTTON_ACTIONS);
}

export function isButtonVariant(value: unknown): value is ButtonVariant {
  return isOneOf(value, BUTTON_VARIANTS);
}

export function isModalVariant(value: unknown): value is ModalVariant {
  return isOneOf(value, MODAL_VARIANTS);
}

export function isEnvResolvedPayload(value: unknown): value is EnvResolvedPayload {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    isOneOf(o.recommendedFlow, RECOMMENDED_FLOWS) &&
    isUIMode(o.mode) &&
    (o.fallbackType === undefined || isOneOf(o.fallbackType, FALLBACK_TYPES))
  );
}

export function isFSMEvent(value: unknown): value is FSMEvent {
  if (value == null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  const t = o.type;
  if (typeof t !== 'string') return false;
  switch (t) {
    case 'ENV_EVAL_START':
    case 'ENV_DETACH':
    case 'ENV_ERROR':
    case 'RESET':
    case 'START_AUTH':
    case 'AUTH_SUCCESS':
    case 'AUTH_ERROR':
    case 'AUTH_FALLBACK':
    case 'AUTH_FALLBACK_EMAIL':
    case 'AUTH_FALLBACK_QR':
      return true;
    case 'ENV_RESOLVED':
      return isEnvResolvedPayload(o.payload);
    case 'TAB_CHANGE':
      return (
        o.payload != null &&
        typeof o.payload === 'object' &&
        isTabKind((o.payload as Record<string, unknown>).tab)
      );
    default:
      return false;
  }
}
