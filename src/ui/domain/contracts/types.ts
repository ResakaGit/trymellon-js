/**
 * Type contracts for parsed UI attributes. Types only; no DOM/core. Parsing lives in adapters.
 */
import type { UIMode } from '../fsm/types';

/** Presentation theme (theme attribute). */
export type ThemeKind = 'light' | 'dark';

/** Button action: direct-auth (ceremony only) or open-modal (emit open-request / show modal). */
export type ButtonAction = 'direct-auth' | 'open-modal';

/** Button presentation variant: default (inline icon+text) or pill (landing: circle + label, touch ≥48px). */
export type ButtonVariant = 'default' | 'pill';

/** Modal presentation variant: default (standard panel/tabs) or minimal (landing: rounded-2xl, border-2, light tabs). */
export type ModalVariant = 'default' | 'minimal';

/** Parsed and normalized host attributes (trymellon-auth). */
export type ParsedAttributes = {
  appId: string;
  publishableKey: string;
  mode: UIMode;
  externalUserId: string | null;
  theme: ThemeKind;
  action: ButtonAction;
  triggerOnly: boolean;
  buttonVariant: ButtonVariant;
  /** Optional visible label for the trigger button (default = PRIMARY_BUTTON_LABEL). */
  buttonLabel?: string | null;
  /** Optional aria-label for the trigger button (default = TRIGGER_ARIA_LABEL). */
  buttonAriaLabel?: string | null;
};

/** Modal display mode: overlay vs inline. */
export type ModalDisplayMode = 'modal' | 'inline';

/** Active modal tab: register | login. */
export type ModalTabKind = 'register' | 'login';

/** Tab labels for register/login. */
export type TabLabels = { register: string; login: string };

/** Fallback type when recommendedFlow is fallback (fallback-type attribute). */
export type FallbackTypeKind = 'email' | 'qr';

/** Parsed and normalized modal attributes (trymellon-auth-modal). */
export type ParsedModalAttributes = {
  open: boolean;
  mode: ModalDisplayMode;
  tab: ModalTabKind;
  tabLabels: TabLabels;
  theme: ThemeKind;
  sessionId: string | null;
  onboardingUrl: string | null;
  isMobileOverride: boolean | null;
  fallbackType?: FallbackTypeKind;
  appId: string;
  publishableKey: string;
  /** Optional app name shown in dialog title (e.g. "My App — Sign in or register"). */
  appName: string | null;
  /** Optional full dialog title; overrides default/app-name title when set. */
  dialogTitle: string | null;
  /** Optional dialog description; overrides default copy when set. */
  dialogDescription: string | null;
  /** Optional external user id for register; when missing, SDK uses a generated UUID (no external UI needed). */
  externalUserId: string | null;
  modalVariant: ModalVariant;
};
