/**
 * Centralized constants for the infra layer (event bridge).
 * CustomEvent names for core → host communication.
 */

/** Event name when modal opens (WC lifecycle). */
export const MELLON_OPEN = 'mellon:open';

/** Event name when button/host requests modal open. bubbles: true, composed: true; detail empty or minimal. */
export const MELLON_OPEN_REQUEST = 'mellon:open-request';

/** Event name when modal closes (WC lifecycle). */
export const MELLON_CLOSE = 'mellon:close';

/** Event name when auth completes (core → host). bubbles: false, composed: true; listener on WC element. */
export const MELLON_SUCCESS = 'mellon:success';

/** Event name when auth fails (core → host). bubbles: true, composed: true. */
export const MELLON_ERROR = 'mellon:error';

/** Event name when ceremony starts (core → host). */
export const MELLON_START = 'mellon:start';

/** Event name when ceremony is cancelled (host close or reset from AUTHENTICATING). bubbles: true, composed: true. */
export const MELLON_CANCELLED = 'mellon:cancelled';

/** Fired on fallback UI click inside WC (no external navigation). */
export const MELLON_FALLBACK = 'mellon:fallback';

/** Event name when tab changes (register ↔ login) in the modal. */
export const MELLON_TAB_CHANGE = 'mellon:tab-change';

/** Event name when SDK context is ready (WC lifecycle). bubbles: true, composed: true (crosses shadow DOM). */
export const MELLON_CONTEXT_READY = 'mellon:context-ready';
