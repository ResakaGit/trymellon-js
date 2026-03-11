/**
 * Centralized constants for the render layer (Shadow DOM, modal structure, selectors, labels).
 * Single source for IDs, class names, selectors, and copy used by shadow.adapter and modal-structure.adapter.
 */

/** Main container ID in Shadow DOM; shared by inline and modal. */
export const MELLON_ROOT_ID = 'mellon-root';

/** Primary auth (passkey) button selector. */
export const MELLON_BTN_SELECTOR = '.mellon-btn';

/** Fallback button selector (data-mellon-action^="fallback"). */
export const MELLON_FALLBACK_BTN_SELECTOR = '[data-mellon-action^="fallback"]';

/** data-mellon-action value for email fallback. */
export const MELLON_ACTION_FALLBACK_EMAIL = 'fallback-email';

/** data-mellon-action value for QR fallback. */
export const MELLON_ACTION_FALLBACK_QR = 'fallback-qr';

/** Primary button label when used as trigger (opens modal). */
export const PRIMARY_BUTTON_LABEL = 'TryMellon';

/** Primary button label when inside modal (passkey on this device). Same structure as landing. */
export const MODAL_PASSKEY_BUTTON_LABEL = 'Try Passkey';

/** aria-label for trigger/CTA (context without visual; not icon-only). */
export const TRIGGER_ARIA_LABEL = 'TryMellon, open authentication';

/** aria-label for passkey button inside modal. */
export const MODAL_PASSKEY_ARIA_LABEL = 'Try Passkey, use this device';

/** Internal: SVG namespace for fingerprint icon. */
export const SVG_NS = 'http://www.w3.org/2000/svg';

// --- Modal structure (modal-structure.adapter) ---

export const WRAPPER_CLASS = 'mellon-modal-wrapper';
export const OVERLAY_CLASS = 'mellon-modal-overlay';
export const PANEL_CLASS = 'mellon-modal-panel';
export const TABS_CLASS = 'mellon-modal-tabs';
export const CONTENT_WRAPPER_CLASS = 'mellon-modal-content';

/** Slot name for host-injected QR / cross-device UI. Use <trymellon-auth-modal><div slot="cross-device">...</div></trymellon-auth-modal>. */
export const SLOT_CROSS_DEVICE = 'cross-device';

export const SLOT_FALLBACK_CTA = 'fallback-cta';

/** IDs for dialog aria-labelledby / aria-describedby. */
export const MELLON_DIALOG_TITLE_ID = 'mellon-dialog-title';
export const MELLON_DIALOG_DESC_ID = 'mellon-dialog-desc';

export const DIALOG_TITLE_TEXT = 'TryMellon — Sign in or register';
/** Title when app name is set: "{appName} — Sign in or register". */
export const DIALOG_TITLE_WITH_APP = (appName: string): string =>
  `${appName} — Sign in or register`;
export const DIALOG_DESC_TEXT = 'Pick Register or Sign in to continue.';
/** Separator between QR/cross-device and Try Passkey (with lines: —— or ——). */
export const MODAL_SEPARATOR_TEXT = 'Or sign in with';
export const CROSS_DEVICE_WRAP_CLASS = 'mellon-cross-device-wrap';
export const MODAL_SEPARATOR_CLASS = 'mellon-modal-separator';

/** Modal close button (top-right, inside panel). */
export const MODAL_CLOSE_BUTTON_CLASS = 'mellon-modal-close-btn';
export const MODAL_CLOSE_BUTTON_ARIA_LABEL = 'Close dialog';

/** Cross-device CTA (default slot content when host does not inject QR). Always visible above "or" and Try Passkey. */
export const CROSS_DEVICE_CTA_TEXT = 'Try from another device';
export const CROSS_DEVICE_CTA_CLASS = 'mellon-cross-device-cta';
/** Aria-label for QR button (icon-only, no visible text). */
export const CROSS_DEVICE_QR_BUTTON_ARIA_LABEL = 'Try with QR';

/** QR area: skeleton and timeout (owned by modal). */
export const MELLON_QR_SKELETON_CLASS = 'mellon-cross-device-skeleton';
export const MELLON_QR_ERROR_CLASS = 'mellon-cross-device-error';
export const MELLON_QR_SLOT_WRAP_CLASS = 'mellon-cross-device-slot-wrap';
export const QR_SKELETON_TEXT = 'Loading QRs';
export const QR_TIMEOUT_ERROR_TEXT = 'QR could not be loaded. Try again.';
/** Default timeout (ms) when modal expects injected QR; host can override via qr-load-timeout-ms. */
export const QR_LOAD_TIMEOUT_MS_DEFAULT = 12_000;
