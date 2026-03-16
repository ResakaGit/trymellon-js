/**
 * Centralized constants for the presentation layer (WC elements).
 * Attribute names, modal DOM selectors, close reasons. Single source — no magic strings.
 * Modal class names: single source of truth in render/constants; re-exported here for selectors.
 */
import {
  WRAPPER_CLASS as MODAL_WRAPPER_CLASS,
  OVERLAY_CLASS as MODAL_OVERLAY_CLASS,
  PANEL_CLASS as MODAL_PANEL_CLASS,
} from '../adapters/render/constants.js';

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
  'ticket-id',
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
