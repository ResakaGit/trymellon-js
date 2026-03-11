/** @trymellon/js/ui — Web Component entry. */
import { TryMellonAuthElement } from './presentation/trymellon-auth.element';
import { TryMellonAuthModalElement } from './presentation/trymellon-auth-modal.element';

export const UI_VERSION = '0.1.0';
/** Canonical tag: button + internal modal (Option A) or trigger only (Option B with trigger-only). */
export const TRYMELLON_AUTH_TAG = 'trymellon-auth';
/** Modal tag; used internally by <trymellon-auth> (Option A) or by host (Option B). */
export const TRYMELLON_AUTH_MODAL_TAG = 'trymellon-auth-modal';

if (typeof customElements !== 'undefined' && !customElements.get(TRYMELLON_AUTH_TAG)) {
  customElements.define(TRYMELLON_AUTH_TAG, TryMellonAuthElement);
}
if (typeof customElements !== 'undefined' && !customElements.get(TRYMELLON_AUTH_MODAL_TAG)) {
  customElements.define(TRYMELLON_AUTH_MODAL_TAG, TryMellonAuthModalElement);
}

export { TryMellonAuthElement, TryMellonAuthModalElement };
export { getNextState, INITIAL_UI_STATE } from './domain';
export {
  BASE_STYLES,
  createConstructableStylesheet,
  getStylesFallback,
} from './adapters/render/styles.adapter';
export type { UIState, FSMEvent, EnvResolvedPayload, UIMode, TabKind } from './domain';
export type { ParsedAttributes, ThemeKind } from './adapters/attributes/inline.adapter';
export type { RenderOptions } from './ports';
export {
  eventBridgeAdapter,
  MELLON_START,
  MELLON_CANCELLED,
  MELLON_FALLBACK,
  MELLON_TAB_CHANGE,
  MELLON_OPEN,
  MELLON_OPEN_REQUEST,
  MELLON_CLOSE,
  MELLON_SUCCESS,
  MELLON_ERROR,
} from './adapters/infra/event-bridge.adapter';
export type {
  CoreWithEvents,
  CoreEventsPort,
  MellonSuccessDetail,
  MellonErrorDetail,
  MellonOperationDetail,
  MellonFallbackDetail,
  MellonOpenDetail,
  MellonCloseDetail,
} from './ports';
