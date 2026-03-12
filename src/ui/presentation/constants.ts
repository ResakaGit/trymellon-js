/**
 * Centralized constants for the presentation layer (WC elements).
 * Attribute names, modal DOM selectors, close reasons. Single source — no magic strings.
 * Selector class names must match render layer (styles.adapter, modal-structure.adapter).
 */

// --- Modal DOM selectors (class names aligned with render/constants WRAPPER_CLASS, etc.) ---
const MODAL_WRAPPER_CLASS = 'mellon-modal-wrapper';
const MODAL_OVERLAY_CLASS = 'mellon-modal-overlay';
const MODAL_PANEL_CLASS = 'mellon-modal-panel';

// --- Observed attribute names (public API) ---

export const OBSERVED_ATTRIBUTES_AUTH = [
  'app-id',
  'publishable-key',
  'mode',
  'external-user-id',
  'theme',
  'action',
  'trigger-only',
  'button-variant',
  'button-label',
  'button-aria-label',
] as const;

export const OBSERVED_ATTRIBUTES_MODAL = [
  'open',
  'mode',
  'tab',
  'tab-labels',
  'theme',
  'session-id',
  'onboarding-url',
  'is-mobile-override',
  'fallback-type',
  'app-id',
  'publishable-key',
  'app-name',
  'dialog-title',
  'dialog-description',
  'external-user-id',
  'modal-variant',
  'qr-load-timeout-ms',
] as const;

// --- Modal DOM selectors ---

export const MODAL_SELECTORS = {
  wrapper: `.${MODAL_WRAPPER_CLASS}`,
  overlay: `.${MODAL_OVERLAY_CLASS}`,
  panel: `.${MODAL_PANEL_CLASS}`,
} as const;

// --- Close / event reasons ---

export const MELLON_CLOSE_REASON_DEFAULT = 'user' as const;
