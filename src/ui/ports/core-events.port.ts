/**
 * Port: core event subscription and re-emission on host. Source of truth for modal WC event contract (names, detail types).
 * Contract only; implementation in adapters. No import from ../core.
 */
import type { TabKind } from '../domain/types';
import type { EnrollOptions } from '../../types';

/** Public auth operation for host (login | register | enroll). */
export type AuthOperation = TabKind | 'enroll';

/** Optional user info in mellon:success; minimal shape for host without coupling to core. */
export type MellonSuccessUserInfo = {
  userId: string;
  externalUserId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
};

/** mellon:success detail. Token required; token only in this event. Sensitive: backend only, validate server-side. */
export type MellonSuccessDetail = {
  operation: AuthOperation;
  token: string;
  nonce?: string;
  user?: MellonSuccessUserInfo;
  /** Redirect URL after login when core provides it. */
  redirectUrl?: string;
};

/** mellon:error detail (code, message, operation, optional nonce). bubbles: true, composed: true. */
export type MellonErrorDetail = {
  operation: AuthOperation;
  code: string;
  message: string;
  nonce?: string;
};

/** mellon:start and mellon:cancelled detail (operation, optional nonce for ceremony correlation). */
export type MellonOperationDetail = {
  operation: AuthOperation;
  nonce?: string;
};

/** mellon:open detail (optional source, timestamp for observability). */
export type MellonOpenDetail =
  | Record<string, never>
  | { source?: 'user' | 'api'; timestamp?: number };

/** mellon:close detail (optional reason, timestamp for observability). */
export type MellonCloseDetail =
  | Record<string, never>
  | { reason: 'user' | 'success' | 'error' | 'cancel'; timestamp?: number };

/** mellon:fallback detail (channel chosen in UI). */
export type MellonFallbackDetail = {
  operation?: AuthOperation;
  fallbackType?: 'email' | 'qr';
};

/** mellon:context-ready detail (context hash when SDK is ready). composed: true for shadow DOM. */
export type MellonContextReadyDetail = {
  contextHash: string;
};

/** Minimal payload types the event-bridge expects from core (adapter narrows unknown with type guards). */

export type CoreStartPayload = {
  type: 'start';
  operation: 'register' | 'authenticate' | 'enroll';
  nonce?: string;
};

/** Minimal success payload from core. */
export type CoreSuccessPayload = {
  type: 'success';
  operation: 'register' | 'authenticate' | 'enroll';
  token: string;
  user?: unknown;
  nonce?: string;
  redirectUrl?: string;
};

/** Minimal error shape used by bridge (code, message). */
export type CoreErrorPayload = {
  type: 'error';
  operation?: 'register' | 'authenticate' | 'enroll';
  error?: { code?: string; message?: string };
  nonce?: string;
};

export type CoreCancelledPayload = {
  type: 'cancelled';
  operation: 'register' | 'authenticate' | 'enroll';
  nonce?: string;
};

/** Minimal core contract for event subscription (on → unsubscribe). */
export interface CoreWithEvents {
  on(event: string, handler: (...args: unknown[]) => void): () => void;
}

/** Contract to subscribe core to host and re-emit as CustomEvents. Returns unsubscribe. */
export interface CoreEventsPort {
  subscribe(core: CoreWithEvents, host: HTMLElement): () => void;
}

/** Minimal core surface for UI: start auth, enrollment, context hash, and subscribe to events. */
export interface CoreAuthPort extends CoreWithEvents {
  authenticate(options?: CoreAuthOptions): void;
  register(options?: CoreAuthOptions): void;
  enroll(options?: EnrollOptions): void;
  getContextHash(): string;
}

/** Options when starting auth from UI. */
export interface CoreAuthOptions {
  externalUserId?: string | null;
}
