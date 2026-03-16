/**
 * Event bridge: Core EventEmitter → DOM CustomEvents on the WC host element.
 * Token only in mellon:success; bubbles:false, composed:true. At most once success per ceremony; no error after success.
 * Payload as unknown; narrow with type guards to port types. P1-B: nonce in detail when present; no public API to dispatch success with arbitrary detail.
 * Constants: infra/constants.ts.
 */
import type {
  AuthOperation,
  CoreCancelledPayload,
  CoreErrorPayload,
  CoreEventsPort,
  CoreStartPayload,
  CoreSuccessPayload,
  CoreWithEvents,
  MellonErrorDetail,
  MellonOperationDetail,
  MellonSuccessDetail,
  MellonSuccessUserInfo,
} from '../../ports/core-events.port';
import { mapBackendErrorCodeToTryMellon } from '../../../errors';
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
} from './constants';

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

export type {
  AuthOperation,
  CoreWithEvents,
  MellonErrorDetail,
  MellonOperationDetail,
  MellonSuccessDetail,
} from '../../ports/core-events.port';

function dispatchCustomEvent<T>(
  host: HTMLElement,
  name: string,
  detail: T,
  options: { bubbles: boolean; composed: boolean }
): void {
  host.dispatchEvent(
    new CustomEvent(name, {
      detail,
      bubbles: options.bubbles,
      composed: options.composed,
    })
  );
}

/** Map core operation to public contract ('login' | 'register' | 'enroll'). */
function toPublicOperation(op: 'register' | 'authenticate' | 'enroll'): AuthOperation {
  if (op === 'authenticate') return 'login';
  if (op === 'enroll') return 'enroll';
  return 'register';
}

/**
 * Maps raw core success payload user to MellonSuccessUserInfo. Returns undefined if payload
 * does not expose user or does not have at least a non-empty userId (no inventar forma).
 */
function mapSuccessUser(raw: unknown): MellonSuccessUserInfo | undefined {
  if (raw == null || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const userId = o.userId;
  if (typeof userId !== 'string' || userId.length === 0) return undefined;
  const result: MellonSuccessUserInfo = { userId };
  if (typeof o.externalUserId === 'string') result.externalUserId = o.externalUserId;
  if (typeof o.email === 'string') result.email = o.email;
  if (o.metadata != null && typeof o.metadata === 'object' && !Array.isArray(o.metadata)) {
    result.metadata = o.metadata as Record<string, unknown>;
  }
  return result;
}

function isCoreStartPayload(raw: unknown): raw is CoreStartPayload {
  return (
    raw != null &&
    typeof raw === 'object' &&
    (raw as CoreStartPayload).type === 'start' &&
    ((raw as CoreStartPayload).operation === 'register' ||
      (raw as CoreStartPayload).operation === 'authenticate' ||
      (raw as CoreStartPayload).operation === 'enroll')
  );
}

function isCoreSuccessPayload(raw: unknown): raw is CoreSuccessPayload {
  const o = raw as Record<string, unknown>;
  return (
    raw != null &&
    typeof raw === 'object' &&
    o.type === 'success' &&
    typeof o.token === 'string' &&
    (o.operation === 'register' || o.operation === 'authenticate' || o.operation === 'enroll')
  );
}

function isCoreErrorPayload(raw: unknown): raw is CoreErrorPayload {
  return raw != null && typeof raw === 'object' && (raw as CoreErrorPayload).type === 'error';
}

function isCoreCancelledPayload(raw: unknown): raw is CoreCancelledPayload {
  return (
    raw != null &&
    typeof raw === 'object' &&
    (raw as CoreCancelledPayload).type === 'cancelled' &&
    ((raw as CoreCancelledPayload).operation === 'register' ||
      (raw as CoreCancelledPayload).operation === 'authenticate' ||
      (raw as CoreCancelledPayload).operation === 'enroll')
  );
}

/** Event-bridge adapter: CoreEventsPort (core → CustomEvents on host). */
const eventBridgeAdapter: CoreEventsPort = {
  subscribe(core: CoreWithEvents, host: HTMLElement): () => void {
    if (core == null || host == null) {
      throw new TypeError('eventBridgeAdapter.subscribe: core and host are required');
    }
    const unsubscribes: Array<() => void> = [];
    let lastOperation: 'register' | 'authenticate' | 'enroll' = 'authenticate';
    let successEmittedThisCeremony = false;

    const offStart = core.on('start', (payload: unknown) => {
      if (!isCoreStartPayload(payload)) return;
      lastOperation = payload.operation;
      successEmittedThisCeremony = false;
      const detail: MellonOperationDetail = {
        operation: toPublicOperation(payload.operation),
        ...(typeof payload.nonce === 'string' && { nonce: payload.nonce }),
      };
      dispatchCustomEvent<MellonOperationDetail>(host, MELLON_START, detail, {
        bubbles: true,
        composed: true,
      });
    });
    unsubscribes.push(offStart);

    const offSuccess = core.on('success', (payload: unknown) => {
      if (!isCoreSuccessPayload(payload)) return;
      if (successEmittedThisCeremony) return;
      if (payload.token.length === 0) return;
      successEmittedThisCeremony = true;
      const mappedUser = mapSuccessUser(payload.user);
      const detail: MellonSuccessDetail = {
        operation: toPublicOperation(payload.operation),
        token: payload.token,
        ...(typeof payload.nonce === 'string' && { nonce: payload.nonce }),
        ...(mappedUser !== undefined && { user: mappedUser }),
        ...(typeof payload.redirectUrl === 'string' && { redirectUrl: payload.redirectUrl }),
      };
      // Token not exposed to document/window (bubbles: false).
      dispatchCustomEvent<MellonSuccessDetail>(host, MELLON_SUCCESS, detail, {
        bubbles: false,
        composed: true,
      });
    });
    unsubscribes.push(offSuccess);

    const offError = core.on('error', (payload: unknown) => {
      if (!isCoreErrorPayload(payload)) return;
      if (successEmittedThisCeremony) return;
      const rawCode = payload.error?.code ?? 'UNKNOWN_ERROR';
      const code = mapBackendErrorCodeToTryMellon(
        typeof rawCode === 'string' ? rawCode : String(rawCode)
      );
      const detail: MellonErrorDetail = {
        operation: toPublicOperation(payload.operation ?? lastOperation),
        code,
        message:
          typeof payload.error?.message === 'string' ? payload.error.message : 'Unknown error',
        ...(typeof payload.nonce === 'string' && { nonce: payload.nonce }),
      };
      dispatchCustomEvent<MellonErrorDetail>(host, MELLON_ERROR, detail, {
        bubbles: true,
        composed: true,
      });
    });
    unsubscribes.push(offError);

    const offCancelled = core.on('cancelled', (payload: unknown) => {
      if (!isCoreCancelledPayload(payload)) return;
      const detail: MellonOperationDetail = {
        operation: toPublicOperation(payload.operation),
        ...(typeof payload.nonce === 'string' && { nonce: payload.nonce }),
      };
      dispatchCustomEvent<MellonOperationDetail>(host, MELLON_CANCELLED, detail, {
        bubbles: true,
        composed: true,
      });
    });
    unsubscribes.push(offCancelled);

    return function unsubscribe(): void {
      for (const off of unsubscribes) {
        off();
      }
    };
  },
};

export { eventBridgeAdapter };
