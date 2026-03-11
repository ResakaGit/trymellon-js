/**
 * Centralized constants for the interactions layer (click delegation, focus trap).
 * Selectors and attribute names used by dom.adapter and focus-trap.adapter.
 */

/** Modal tabs container selector (register/login tab buttons). */
export const MELLON_MODAL_TABS_SELECTOR = '.mellon-modal-tabs';

/** Attribute name for tab value on buttons (register | login). */
export const TAB_ATTR = 'data-tab';

/** Focusable elements for focus trap (a11y). Excludes disabled and [tabindex="-1"]. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Selector for any explicit \"close modal\" control inside the modal content. */
export const MELLON_MODAL_CLOSE_SELECTOR = '[data-mellon-modal-close="true"]';
