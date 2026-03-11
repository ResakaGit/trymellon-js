/**
 * ViewModels for auth presentation. Group UIState + props needed for render.
 * No DOM dependencies; built from parsed attributes.
 */
import type { UIState, UIMode } from '../fsm/types';
import type {
  ThemeKind,
  ButtonVariant,
  ParsedAttributes,
  ParsedModalAttributes,
  TabLabels,
  ModalTabKind,
} from '../contracts/types';

/** ViewModel for the auth button/trigger content (trymellon-auth). */
export type AuthButtonViewModel = {
  state: UIState;
  theme: ThemeKind;
  mode: UIMode;
  buttonVariant: ButtonVariant;
  registerSessionReady?: boolean;
  primaryButtonLabel?: string;
  primaryButtonAriaLabel?: string;
};

/** ViewModel for the modal FSM content (trymellon-auth-modal). */
export type AuthModalViewModel = {
  state: UIState;
  theme: ThemeKind;
  tab: ModalTabKind;
  tabLabels: TabLabels;
  registerSessionReady?: boolean;
  primaryButtonLabel: string;
  primaryButtonAriaLabel: string;
};

export function buildAuthButtonViewModel(
  state: UIState,
  parsed: ParsedAttributes,
  options?: {
    registerSessionReady?: boolean;
    primaryButtonLabel?: string;
    primaryButtonAriaLabel?: string;
  }
): AuthButtonViewModel {
  return {
    state,
    theme: parsed.theme,
    mode: parsed.mode,
    buttonVariant: parsed.buttonVariant,
    ...(parsed.mode === 'register' &&
      options?.registerSessionReady !== undefined && {
        registerSessionReady: options.registerSessionReady,
      }),
    ...(options?.primaryButtonLabel !== undefined && {
      primaryButtonLabel: options.primaryButtonLabel,
    }),
    ...(options?.primaryButtonAriaLabel !== undefined && {
      primaryButtonAriaLabel: options.primaryButtonAriaLabel,
    }),
  };
}

export function buildAuthModalViewModel(
  state: UIState,
  parsed: ParsedModalAttributes,
  options?: {
    registerSessionReady?: boolean;
    primaryButtonLabel?: string;
    primaryButtonAriaLabel?: string;
  }
): AuthModalViewModel {
  return {
    state,
    theme: parsed.theme,
    tab: parsed.tab,
    tabLabels: parsed.tabLabels,
    ...(parsed.tab === 'register' &&
      options?.registerSessionReady !== undefined && {
        registerSessionReady: options.registerSessionReady,
      }),
    primaryButtonLabel: options?.primaryButtonLabel ?? 'Try Passkey',
    primaryButtonAriaLabel: options?.primaryButtonAriaLabel ?? 'Try Passkey, use this device',
  };
}
