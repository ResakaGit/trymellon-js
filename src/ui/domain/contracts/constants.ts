/**
 * Contract constants: default values for parsed attributes. Single source of truth.
 */
import type { UIMode } from '../fsm/types';
import type {
  ThemeKind,
  ModalDisplayMode,
  ModalTabKind,
  TabLabels,
  ButtonAction,
  ButtonVariant,
  ModalVariant,
  ParsedAttributes,
  ParsedModalAttributes,
} from './types';

export const DEFAULT_UI_MODE: UIMode = 'login';
export const DEFAULT_THEME: ThemeKind = 'light';
export const DEFAULT_MODAL_DISPLAY_MODE: ModalDisplayMode = 'modal';
export const DEFAULT_TAB: ModalTabKind = 'register';
/** Register tab = "Register" to avoid duplicating "Create account" with slot content (e.g. label above QR). */
export const DEFAULT_TAB_LABELS: TabLabels = { register: 'Register', login: 'Sign in' };

export const DEFAULT_BUTTON_ACTION: ButtonAction = 'open-modal';
export const DEFAULT_BUTTON_VARIANT: ButtonVariant = 'default';
export const DEFAULT_MODAL_VARIANT: ModalVariant = 'default';

/** Safe default for ParsedAttributes. */
export const DEFAULT_PARSED_ATTRIBUTES: ParsedAttributes = {
  appId: '',
  publishableKey: '',
  mode: DEFAULT_UI_MODE,
  externalUserId: null,
  theme: DEFAULT_THEME,
  action: DEFAULT_BUTTON_ACTION,
  triggerOnly: false,
  buttonVariant: DEFAULT_BUTTON_VARIANT,
  buttonLabel: null,
  buttonAriaLabel: null,
};

/** Safe default for ParsedModalAttributes. */
export const DEFAULT_PARSED_MODAL_ATTRIBUTES: ParsedModalAttributes = {
  open: false,
  mode: DEFAULT_MODAL_DISPLAY_MODE,
  tab: DEFAULT_TAB,
  tabLabels: DEFAULT_TAB_LABELS,
  theme: DEFAULT_THEME,
  sessionId: null,
  onboardingUrl: null,
  isMobileOverride: null,
  appId: '',
  publishableKey: '',
  appName: null,
  dialogTitle: null,
  dialogDescription: null,
  externalUserId: null,
  modalVariant: DEFAULT_MODAL_VARIANT,
};
