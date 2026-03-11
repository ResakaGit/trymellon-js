/**
 * DOM interaction delegation in Shadow Root: clicks on primary button, fallback, modal tabs and close controls.
 * Semantic callbacks. Constants: interactions/constants.ts + render/constants.ts.
 */
import {
  MELLON_BTN_SELECTOR,
  MELLON_FALLBACK_BTN_SELECTOR,
  MELLON_ACTION_FALLBACK_EMAIL,
  MELLON_ACTION_FALLBACK_QR,
  OVERLAY_CLASS,
} from '../render/constants';
import type { ModalTabKind } from '../../domain/contracts/types';
import { MELLON_MODAL_TABS_SELECTOR, MELLON_MODAL_CLOSE_SELECTOR, TAB_ATTR } from './constants';

/** Maps data-mellon-action to fallback type. Generic "fallback" → undefined (same callback path). */
function fallbackActionToType(action: string | null): 'email' | 'qr' | undefined {
  if (action === MELLON_ACTION_FALLBACK_EMAIL) return 'email';
  if (action === MELLON_ACTION_FALLBACK_QR) return 'qr';
  return undefined;
}

export type AuthButtonInteractionConfig = {
  onPrimaryClick(): void;
  /** type undefined = generic "Continuar" (data-mellon-action="fallback"). */
  onFallbackClick(type?: 'email' | 'qr'): void;
};

export type AuthModalInteractionConfig = {
  onTabChange(tab: ModalTabKind): void;
  onPrimaryClick(): void;
  /** type undefined = generic fallback. */
  onFallbackClick(type?: 'email' | 'qr'): void;
  /** Called when user clicks the grey backdrop outside the modal panel. */
  onOverlayClick?(): void;
  /** Called when user clicks any control marked with data-mellon-modal-close="true" inside the modal. */
  onCloseClick?(): void;
};

/**
 * Registers click delegation for the auth button: primary vs fallback.
 * Checks fallback first (more specific), then primary.
 * @returns Function to remove listeners (teardown).
 */
export function registerAuthButtonInteractions(
  root: ShadowRoot,
  config: AuthButtonInteractionConfig
): () => void {
  const handler = (e: Event): void => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    const fallbackBtn = target.closest(MELLON_FALLBACK_BTN_SELECTOR);
    if (fallbackBtn instanceof HTMLButtonElement) {
      config.onFallbackClick(fallbackActionToType(fallbackBtn.getAttribute('data-mellon-action')));
      return;
    }

    if (target.closest(MELLON_BTN_SELECTOR)) {
      config.onPrimaryClick();
    }
  };

  root.addEventListener('click', handler);
  return () => root.removeEventListener('click', handler);
}

/**
 * Registers click delegation for the modal: close controls, tabs (register/login), primary button and overlay.
 * Order: explicit close → fallback → tabs → primary → overlay.
 * @returns Function to remove listeners (teardown).
 */
export function registerAuthModalInteractions(
  root: ShadowRoot,
  config: AuthModalInteractionConfig
): () => void {
  const handler = (e: Event): void => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    if (config.onCloseClick) {
      const closeBtn = target.closest(MELLON_MODAL_CLOSE_SELECTOR);
      if (closeBtn instanceof HTMLElement) {
        config.onCloseClick();
        return;
      }
    }

    const fallbackBtn = target.closest(MELLON_FALLBACK_BTN_SELECTOR);
    if (fallbackBtn instanceof HTMLButtonElement) {
      config.onFallbackClick(fallbackActionToType(fallbackBtn.getAttribute('data-mellon-action')));
      return;
    }

    const tabsContainer = root.querySelector(MELLON_MODAL_TABS_SELECTOR);
    if (tabsContainer?.contains(target)) {
      const tabEl = target.closest(`[${TAB_ATTR}]`);
      const tab = tabEl?.getAttribute(TAB_ATTR);
      if (tab === 'register' || tab === 'login') {
        config.onTabChange(tab as ModalTabKind);
        return;
      }
    }

    if (target.closest(MELLON_BTN_SELECTOR)) {
      config.onPrimaryClick();
      return;
    }

    if (config.onOverlayClick) {
      const overlay = root.querySelector<HTMLElement>(`.${OVERLAY_CLASS}`);
      if (overlay && target === overlay) {
        config.onOverlayClick();
      }
    }
  };

  root.addEventListener('click', handler);
  return () => root.removeEventListener('click', handler);
}
