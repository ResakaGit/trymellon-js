import {
  MELLON_OPEN,
  MELLON_OPEN_REQUEST,
  MELLON_CLOSE,
  MELLON_SUCCESS,
  MELLON_ERROR,
  MELLON_START,
  MELLON_CANCELLED,
  MELLON_FALLBACK,
  MELLON_TAB_CHANGE,
  MELLON_CONTEXT_READY,
} from '../adapters/infra/event-bridge.adapter';
import type {
  MellonErrorDetail,
  MellonFallbackDetail,
  MellonOperationDetail,
  MellonSuccessDetail,
  MellonContextReadyDetail,
} from '../ports/core-events.port';
import type { MellonCloseDetail, MellonOpenDetail } from '../ports';

export {
  MELLON_OPEN,
  MELLON_OPEN_REQUEST,
  MELLON_CLOSE,
  MELLON_SUCCESS,
  MELLON_ERROR,
  MELLON_START,
  MELLON_CANCELLED,
  MELLON_FALLBACK,
  MELLON_TAB_CHANGE,
  MELLON_CONTEXT_READY,
};

export function createMellonOpenEvent(detail: MellonOpenDetail): CustomEvent<MellonOpenDetail> {
  return new CustomEvent<MellonOpenDetail>(MELLON_OPEN, {
    detail,
    bubbles: true,
    composed: true,
  });
}

export function createMellonCloseEvent(detail: MellonCloseDetail): CustomEvent<MellonCloseDetail> {
  return new CustomEvent<MellonCloseDetail>(MELLON_CLOSE, {
    detail,
    bubbles: true,
    composed: true,
  });
}

export function createMellonCancelledEvent(
  detail: MellonOperationDetail
): CustomEvent<MellonOperationDetail> {
  return new CustomEvent<MellonOperationDetail>(MELLON_CANCELLED, {
    detail,
    bubbles: true,
    composed: true,
  });
}

export function createMellonFallbackEvent(
  detail: MellonFallbackDetail
): CustomEvent<MellonFallbackDetail> {
  return new CustomEvent<MellonFallbackDetail>(MELLON_FALLBACK, {
    detail,
    bubbles: true,
    composed: true,
  });
}

export function createMellonTabChangeEvent(detail: { tab: string }): CustomEvent<{ tab: string }> {
  return new CustomEvent<{ tab: string }>(MELLON_TAB_CHANGE, {
    detail,
    bubbles: true,
    composed: true,
  });
}

export function createMellonStartEvent(
  detail: MellonOperationDetail
): CustomEvent<MellonOperationDetail> {
  return new CustomEvent<MellonOperationDetail>(MELLON_START, {
    detail,
    bubbles: true,
    composed: true,
  });
}

export function createMellonSuccessEvent(
  detail: MellonSuccessDetail
): CustomEvent<MellonSuccessDetail> {
  return new CustomEvent<MellonSuccessDetail>(MELLON_SUCCESS, {
    detail,
    bubbles: false,
    composed: true,
  });
}

export function createMellonErrorEvent(detail: MellonErrorDetail): CustomEvent<MellonErrorDetail> {
  return new CustomEvent<MellonErrorDetail>(MELLON_ERROR, {
    detail,
    bubbles: true,
    composed: true,
  });
}

/** Context-ready event: crosses shadow DOM (composed: true). Emit when SDK context is ready. */
export function createContextReadyEvent(
  detail: MellonContextReadyDetail
): CustomEvent<MellonContextReadyDetail> {
  return new CustomEvent<MellonContextReadyDetail>(MELLON_CONTEXT_READY, {
    detail,
    bubbles: false,
    composed: true,
  });
}
