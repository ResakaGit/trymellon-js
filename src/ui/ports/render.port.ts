/**
 * Port: UI rendering onto a surface. Contract only; implementation in adapters. Imports from ../domain only.
 */
import type { UIState, UIMode } from '../domain/types';
import type { ThemeKind, ButtonVariant } from '../domain/contracts/types';

/** Render surface: encapsulates WC ShadowRoot access. */
export interface IRenderSurface {
  readonly shadowRoot: ShadowRoot;
}

/** Render options (theme, mode, pre-ceremony signal for register, button variant, labels). */
export type RenderOptions = {
  theme?: ThemeKind;
  mode?: UIMode;
  /** When false and state is READY_REGISTER, show "Preparing…" instead of button (session-id missing or empty). */
  registerSessionReady?: boolean;
  /** Button presentation variant. Default: default. */
  buttonVariant?: ButtonVariant;
  /** Primary button label (e.g. trigger "TryMellon", inside modal "Try Passkey"). Omit = "TryMellon". */
  primaryButtonLabel?: string;
  /** Primary button aria-label. Omit = derived from primaryButtonLabel or default. */
  primaryButtonAriaLabel?: string;
};

/** Contract to render FSM state onto a surface. */
export interface RenderPort {
  render(surface: IRenderSurface, state: UIState, options?: RenderOptions): void;
}
