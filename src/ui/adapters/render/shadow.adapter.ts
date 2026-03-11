/**
 * WC Shadow DOM render. Validates state at boundary (domain validators). No innerHTML/outerHTML; createElement/setAttribute only.
 * Constants: render/constants.ts. Re-exports public constants for consumers (e.g. interactions, presentation).
 */
import type { UIState } from '../../domain';
import type { ButtonVariant } from '../../domain/contracts/types';
import { ensureUIState } from '../../domain/validators';
import type { IRenderSurface, RenderOptions } from '../../ports/render.port';
import {
  MELLON_ROOT_ID,
  MELLON_BTN_SELECTOR,
  MELLON_FALLBACK_BTN_SELECTOR,
  MELLON_ACTION_FALLBACK_EMAIL,
  MELLON_ACTION_FALLBACK_QR,
  PRIMARY_BUTTON_LABEL,
  MODAL_PASSKEY_BUTTON_LABEL,
  TRIGGER_ARIA_LABEL,
  MODAL_PASSKEY_ARIA_LABEL,
  SVG_NS,
} from './constants';

export { MELLON_ROOT_ID, MELLON_BTN_SELECTOR, MELLON_FALLBACK_BTN_SELECTOR };
export { MELLON_ACTION_FALLBACK_EMAIL, MELLON_ACTION_FALLBACK_QR };
export {
  PRIMARY_BUTTON_LABEL,
  MODAL_PASSKEY_BUTTON_LABEL,
  TRIGGER_ARIA_LABEL,
  MODAL_PASSKEY_ARIA_LABEL,
};

/** Fingerprint icon as inline SVG (no external resources). createElementNS only. */
function createFingerprintIconSVG(): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'mellon-btn-icon');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  const path1 = document.createElementNS(SVG_NS, 'path');
  path1.setAttribute('d', 'M12 22a10 10 0 0 0 10-10 10 10 0 0 0-20 0 10 10 0 0 0 10 10Z');
  const path2 = document.createElementNS(SVG_NS, 'path');
  path2.setAttribute('d', 'M12 14a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2Z');
  const path3 = document.createElementNS(SVG_NS, 'path');
  path3.setAttribute('d', 'M5 19.05A9 9 0 0 1 3 12a9 9 0 0 1 2-5.05');

  svg.appendChild(path1);
  svg.appendChild(path2);
  svg.appendChild(path3);
  return svg;
}

/** Primary button default: fingerprint icon + visible label + aria-label. */
function createPrimaryButtonDefault(
  disabled: boolean,
  label: string = PRIMARY_BUTTON_LABEL,
  ariaLabel: string = TRIGGER_ARIA_LABEL
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mellon-btn';
  btn.setAttribute('aria-label', ariaLabel);
  btn.disabled = disabled;
  btn.appendChild(createFingerprintIconSVG());
  btn.appendChild(document.createTextNode(label));
  return btn;
}

/** Primary button pill: landing-style (rounded-full, circle with icon + label), touch target ≥48px. */
function createPrimaryButtonPill(
  disabled: boolean,
  label: string = PRIMARY_BUTTON_LABEL,
  ariaLabel: string = TRIGGER_ARIA_LABEL
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mellon-btn mellon-btn-pill';
  btn.setAttribute('aria-label', ariaLabel);
  btn.disabled = disabled;
  const iconCircle = document.createElement('span');
  iconCircle.className = 'mellon-btn-pill-icon-circle';
  iconCircle.setAttribute('aria-hidden', 'true');
  iconCircle.appendChild(createFingerprintIconSVG());
  btn.appendChild(iconCircle);
  btn.appendChild(document.createTextNode(label));
  return btn;
}

/** HOF: returns the primary button builder for the given variant (stateless). */
function getPrimaryButtonBuilder(
  variant: ButtonVariant,
  label: string = PRIMARY_BUTTON_LABEL,
  ariaLabel: string = TRIGGER_ARIA_LABEL
): (disabled: boolean) => HTMLButtonElement {
  return (disabled: boolean) =>
    variant === 'pill'
      ? createPrimaryButtonPill(disabled, label, ariaLabel)
      : createPrimaryButtonDefault(disabled, label, ariaLabel);
}

/** Resolves primary button options from RenderOptions (single source for defaults). */
function getPrimaryButtonOptions(options: RenderOptions): {
  variant: ButtonVariant;
  label: string;
  ariaLabel: string;
} {
  return {
    variant: options.buttonVariant ?? 'default',
    label: options.primaryButtonLabel ?? PRIMARY_BUTTON_LABEL,
    ariaLabel: options.primaryButtonAriaLabel ?? TRIGGER_ARIA_LABEL,
  };
}

/** Builds the primary passkey button for READY_LOGIN / READY_REGISTER / READY (DRY). */
function buildPrimaryButtonForReadyState(options: RenderOptions): HTMLButtonElement {
  const { variant, label, ariaLabel } = getPrimaryButtonOptions(options);
  return getPrimaryButtonBuilder(variant, label, ariaLabel)(false);
}

function ensureRoot(surface: IRenderSurface): HTMLElement {
  const { shadowRoot } = surface;
  let root = shadowRoot.getElementById(MELLON_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = MELLON_ROOT_ID;
    root.className = 'mellon-root';
    shadowRoot.appendChild(root);
  }
  return root;
}

function createParagraph(className: string, text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  return p;
}

/** Fallback button with data-mellon-action for host click handling. createElement/setAttribute only. */
function createFallbackButton(
  action: 'fallback' | typeof MELLON_ACTION_FALLBACK_EMAIL | typeof MELLON_ACTION_FALLBACK_QR,
  label: string
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mellon-btn mellon-btn-fallback';
  btn.setAttribute('data-mellon-action', action);
  btn.textContent = label;
  return btn;
}

type FallbackState = 'FALLBACK' | 'FALLBACK_EMAIL' | 'FALLBACK_QR';
type FallbackAction =
  | 'fallback'
  | typeof MELLON_ACTION_FALLBACK_EMAIL
  | typeof MELLON_ACTION_FALLBACK_QR;

const FALLBACK_BUTTON_CONFIG: Record<FallbackState, { action: FallbackAction; label: string }> = {
  FALLBACK: { action: 'fallback', label: 'Continuar' },
  FALLBACK_EMAIL: { action: MELLON_ACTION_FALLBACK_EMAIL, label: 'Continuar con email' },
  FALLBACK_QR: { action: MELLON_ACTION_FALLBACK_QR, label: 'Continuar con QR' },
};

function buildFallbackUI(state: FallbackState): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'mellon-fallback';
  const msg = document.createElement('p');
  msg.className = 'mellon-message';
  msg.textContent = 'Fallback disponible.';
  wrap.appendChild(msg);
  const { action, label } = FALLBACK_BUTTON_CONFIG[state];
  wrap.appendChild(createFallbackButton(action, label));
  return wrap;
}

function buildContentForState(state: UIState, options: RenderOptions): DocumentFragment {
  const fragment = document.createDocumentFragment();

  switch (state) {
    case 'IDLE':
    case 'EVALUATING_ENV':
      fragment.appendChild(createParagraph('mellon-loading', 'Loading…'));
      break;

    case 'READY_LOGIN':
      fragment.appendChild(buildPrimaryButtonForReadyState(options));
      break;

    case 'READY_REGISTER':
      if (options.registerSessionReady === false) {
        fragment.appendChild(createParagraph('mellon-loading', 'Preparando registro…'));
      } else {
        fragment.appendChild(buildPrimaryButtonForReadyState(options));
      }
      break;

    case 'READY':
      fragment.appendChild(buildPrimaryButtonForReadyState(options));
      break;

    case 'AUTHENTICATING':
      fragment.appendChild(createParagraph('mellon-loading', 'Authenticating…'));
      break;

    case 'SUCCESS':
      fragment.appendChild(createParagraph('mellon-message', 'Success.'));
      break;

    case 'ERROR':
      fragment.appendChild(createParagraph('mellon-message', 'Something went wrong.'));
      break;

    case 'FALLBACK':
    case 'FALLBACK_EMAIL':
    case 'FALLBACK_QR':
      fragment.appendChild(buildFallbackUI(state));
      break;

    default:
      fragment.appendChild(createParagraph('mellon-loading', 'Loading…'));
  }

  return fragment;
}

/** Updates render surface from FSM state. Validates state at boundary; invalid → IDLE (fail-safe). */
export function render(surface: IRenderSurface, state: unknown, options: RenderOptions = {}): void {
  const safeState = ensureUIState(state);
  const root = ensureRoot(surface);
  const content = buildContentForState(safeState, options);
  root.replaceChildren(...Array.from(content.childNodes));
}
