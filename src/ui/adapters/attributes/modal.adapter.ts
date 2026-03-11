/**
 * Parses trymellon-auth-modal WC attributes.
 * Uses parseEnum + enum arrays and domain-centralized defaults.
 */
import type { ParsedModalAttributes, TabLabels } from '../../domain/contracts/types';
import {
  DEFAULT_MODAL_DISPLAY_MODE,
  DEFAULT_MODAL_VARIANT,
  DEFAULT_TAB,
  DEFAULT_TAB_LABELS,
  DEFAULT_THEME,
} from '../../domain/contracts/constants';
import {
  MODAL_DISPLAY_MODES,
  MODAL_VARIANTS,
  TAB_KINDS,
  THEME_KINDS,
  FALLBACK_TYPES,
} from '../../domain/validators/validators-state';
import { ensureParsedModalAttributes } from '../../domain/validators';
import {
  parseString,
  parseOptionalString,
  parseBoolean,
  parseOptionalBoolean,
  parseEnum,
  parseOptionalEnum,
} from './parse.utils';

export type {
  FallbackTypeKind,
  ModalDisplayMode,
  ModalTabKind,
  ParsedModalAttributes,
  ThemeKind,
} from '../../domain/contracts/types';

/**
 * Parses tab-labels. Format: "registerLabel,loginLabel" (CSV). Missing or empty → domain defaults.
 */
function parseTabLabels(value: string | null): TabLabels {
  if (value == null || value.trim() === '') return DEFAULT_TAB_LABELS;
  const parts = value.split(',').map((p) => p.trim());
  const register = parts[0] ?? DEFAULT_TAB_LABELS.register;
  const login = parts[1] ?? DEFAULT_TAB_LABELS.login;
  return { register, login };
}

/**
 * Parses all modal attributes from element. Validates at boundary before return (adapter validates domain type).
 */
export function parseModalAttributesFromElement(element: HTMLElement): ParsedModalAttributes {
  const raw = {
    open: parseBoolean(element.getAttribute('open')),
    mode: parseEnum(element.getAttribute('mode'), MODAL_DISPLAY_MODES, DEFAULT_MODAL_DISPLAY_MODE),
    tab: parseEnum(element.getAttribute('tab'), TAB_KINDS, DEFAULT_TAB),
    tabLabels: parseTabLabels(element.getAttribute('tab-labels')),
    theme: parseEnum(element.getAttribute('theme'), THEME_KINDS, DEFAULT_THEME),
    sessionId: parseOptionalString(element.getAttribute('session-id')),
    onboardingUrl: parseOptionalString(element.getAttribute('onboarding-url')),
    isMobileOverride: parseOptionalBoolean(element.getAttribute('is-mobile-override')),
    fallbackType: parseOptionalEnum(element.getAttribute('fallback-type'), FALLBACK_TYPES),
    appId: parseString(element.getAttribute('app-id')),
    publishableKey: parseString(element.getAttribute('publishable-key')),
    appName: parseOptionalString(element.getAttribute('app-name')),
    dialogTitle: parseOptionalString(element.getAttribute('dialog-title')),
    dialogDescription: parseOptionalString(element.getAttribute('dialog-description')),
    externalUserId: parseOptionalString(element.getAttribute('external-user-id')),
    modalVariant: parseEnum(
      element.getAttribute('modal-variant'),
      MODAL_VARIANTS,
      DEFAULT_MODAL_VARIANT
    ),
  };
  return ensureParsedModalAttributes(raw);
}
