import type { Result } from '../utils/result';
import type { TryMellonError } from '../errors';

export interface TryMellonPlatformConfig {
  /** @default https://api.trymellon.com */
  apiBaseUrl?: string;
}

export interface CreateSignupLinkOptions {
  /**
   * https URL donde la hosted page redirige al completar.
   *
   * **Opcional** (B1 2026-04-23). Flow típico para integradores externos: omitir
   * `returnUrl` y usar `awaitSignupCompletion(sessionId)` para saber cuándo
   * terminó — la hosted page redirige al dashboard del landing por default y el
   * integrator se coordina via polling.
   *
   * Si se provee, debe matchear allowlist server-side (400 `invalid_return_url`
   * de lo contrario). Solo válido si el account ya tiene `return_url` registrado
   * O para first-signup sólo paths del enum hardcoded del landing (ADR-076 §2.2).
   */
  returnUrl?: string;
  /** https URL fallback cuando el hosted sessionId expira. Mismas reglas que `returnUrl`. */
  refreshUrl?: string;
  /** UX prefill only — never treated as trust input. */
  prefill?: {
    companyName?: string;
    email?: string;
  };
  userRole?: 'maintainer' | 'app_user';
}

export interface CreateSignupLinkResult {
  sessionId: string;
  hostedUrl: string;
  /** Seconds until the hosted sessionId expires. */
  expiresInSeconds: number;
}

export type SignupStatus = 'pending_data' | 'pending_passkey' | 'completed' | 'expired' | 'failed';

export interface SignupStatusResult {
  status: SignupStatus;
  hostedUrl?: string;
  expiresInSeconds?: number;
}

export interface AwaitSignupCompletionOptions {
  signal?: AbortSignal;
  /** @default 2000ms */
  intervalMs?: number;
  /** @default 60 — ~2 min with the default intervalMs. */
  maxAttempts?: number;
}

export interface AwaitSignupCompletionResult {
  status: 'completed';
  /** Always present once terminal-completed. */
  hostedUrl: string;
}

export interface TryMellonPlatform {
  createSignupLink(
    opts: CreateSignupLinkOptions
  ): Promise<Result<CreateSignupLinkResult, TryMellonError>>;

  getSignupStatus(sessionId: string): Promise<Result<SignupStatusResult, TryMellonError>>;

  awaitSignupCompletion(
    sessionId: string,
    opts?: AwaitSignupCompletionOptions
  ): Promise<Result<AwaitSignupCompletionResult, TryMellonError>>;
}
