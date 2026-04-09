import type { HttpClient } from './http-client';
import { BRIDGE_PATH_ENROLLMENT, BRIDGE_PATH_AUTH } from './constants';
import type { Result } from '../utils/result';
import { ok, err } from '../utils/result';
import type { TryMellonError } from '../errors';
import {
  validateRegisterStartResponse,
  validateAuthStartResponse,
  validateRegisterFinishResponse,
  validateAuthFinishResponse,
  validateSessionValidateResponse,
  validateEmailVerifyResponse,
  validateOnboardingStartResponse,
  validateOnboardingStatusResponse,
  validateOnboardingRegisterResponse,
  validateOnboardingRegisterPasskeyResponse,
  validateOnboardingCompleteResponse,
  validateCrossDeviceInitResponse,
  validateCrossDeviceStatusResponse,
  validateCrossDeviceContextResponse,
  validateCrossDeviceVerifyResponse,
  validateRecoveryVerifyResponse,
  validateRecoveryCompleteResponse,
  validateEnrollmentStartResponse,
  validateEnrollmentFinishResponse,
  validateBridgeContextResponse,
  validateBridgeVerifyResponse,
  validateBridgeCompleteEnrollmentResponse,
  validateBridgeCompleteAuthResponse,
  validateBridgeStatusResponse,
} from './validators';
import type {
  RegisterStartRequest,
  RegisterStartResponse,
  AuthStartRequest,
  AuthStartResponse,
  RegisterFinishRequest,
  RegisterFinishResponse,
  AuthFinishRequest,
  AuthFinishResponse,
  SessionValidateResponse,
  OnboardingStartRequest,
  OnboardingStartResponse,
  OnboardingStatusResponse,
  OnboardingRegisterPasskeyRequest,
  OnboardingRegisterPasskeyResponse,
  OnboardingCompleteRequest,
  OnboardingCompleteResponse,
  CrossDeviceInitResult,
  CrossDeviceStatusResult,
  CrossDeviceContextResult,
  CrossDeviceVerifyRequest,
  CrossDeviceVerifyRegistrationRequest,
  RecoveryVerifyResponse,
  RecoveryCompleteResponse,
  EnrollmentStartResponse,
  EnrollmentFinishResponse,
  BridgeContextResponse,
  BridgeChallengeResponse,
  BridgeCompleteEnrollmentResult,
  BridgeCompleteAuthResult,
  BridgeStatusSnapshot,
} from '../types';
import type { OnboardingRegisterResponseWithChallenge } from './validators';

/** Bridge kind: enrollment-bridge (registration flow) or auth-bridge (auth flow). */
export type BridgeKind = 'enrollment' | 'auth';

export class ApiClient {
  private readonly _sessionValidateCache = new Map<
    string,
    { value: SessionValidateResponse; cachedAt: number }
  >();
  private readonly _sessionValidatePending = new Map<
    string,
    Promise<Result<SessionValidateResponse, TryMellonError>>
  >();
  /** TTL for cached session validation results (30 s). Short enough to pick up revocations quickly. */
  private readonly _sessionValidateTtlMs = 30_000;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string,
    private readonly defaultHeaders: Record<string, string> = {}
  ) {}

  private mergeHeaders(extra?: Record<string, string>): Record<string, string> {
    return { ...this.defaultHeaders, ...extra };
  }

  private async post<Req, Res>(
    path: string,
    body: Req,
    validate: (data: unknown) => Result<Res, TryMellonError>,
    extraHeaders?: Record<string, string>
  ): Promise<Result<Res, TryMellonError>> {
    const url = `${this.baseUrl}${path}`;
    const result = await this.httpClient.post<unknown>(url, body, this.mergeHeaders(extraHeaders));

    if (!result.ok) {
      return err(result.error);
    }

    return validate(result.value);
  }

  private async get<Res>(
    path: string,
    validate: (data: unknown) => Result<Res, TryMellonError>,
    headers?: Record<string, string>
  ): Promise<Result<Res, TryMellonError>> {
    const url = `${this.baseUrl}${path}`;
    const result = await this.httpClient.get<unknown>(url, this.mergeHeaders(headers));

    if (!result.ok) {
      return err(result.error);
    }

    return validate(result.value);
  }

  async startRegister(
    request: RegisterStartRequest
  ): Promise<Result<RegisterStartResponse, TryMellonError>> {
    return this.post('/v1/passkeys/register/start', request, validateRegisterStartResponse);
  }

  async startAuth(request: AuthStartRequest): Promise<Result<AuthStartResponse, TryMellonError>> {
    return this.post('/v1/passkeys/auth/start', request, validateAuthStartResponse);
  }

  async finishRegister(
    request: RegisterFinishRequest
  ): Promise<Result<RegisterFinishResponse, TryMellonError>> {
    return this.post('/v1/passkeys/register/finish', request, validateRegisterFinishResponse);
  }

  async finishAuthentication(
    request: AuthFinishRequest
  ): Promise<Result<AuthFinishResponse, TryMellonError>> {
    return this.post('/v1/passkeys/auth/finish', request, validateAuthFinishResponse);
  }

  async validateSession(
    sessionToken: string
  ): Promise<Result<SessionValidateResponse, TryMellonError>> {
    const cached = this._sessionValidateCache.get(sessionToken);
    if (cached && Date.now() - cached.cachedAt < this._sessionValidateTtlMs) {
      return ok(cached.value);
    }
    const pending = this._sessionValidatePending.get(sessionToken);
    if (pending) return pending;

    const inflight = this.get('/v1/sessions/validate', validateSessionValidateResponse, {
      Authorization: `Bearer ${sessionToken}`,
    }).then((result) => {
      this._sessionValidatePending.delete(sessionToken);
      if (result.ok) {
        this._sessionValidateCache.set(sessionToken, { value: result.value, cachedAt: Date.now() });
      }
      return result;
    });

    this._sessionValidatePending.set(sessionToken, inflight);
    return inflight;
  }

  async startEmailFallback(options: {
    userId: string;
    email: string;
  }): Promise<Result<void, TryMellonError>> {
    const url = `${this.baseUrl}/v1/fallback/email/start`;
    const result = await this.httpClient.post<unknown>(
      url,
      { user_id: options.userId, email: options.email },
      this.mergeHeaders()
    );
    if (!result.ok) return err(result.error);
    return ok(undefined);
  }

  async verifyEmailCode(options: {
    userId: string;
    code: string;
    successUrl?: string;
  }): Promise<Result<{ sessionToken: string; redirectUrl?: string }, TryMellonError>> {
    const body: Record<string, unknown> = { user_id: options.userId, code: options.code };
    if (options.successUrl) body.success_url = options.successUrl;
    return this.post('/v1/fallback/email/verify', body, validateEmailVerifyResponse);
  }

  async startOnboarding(
    request: OnboardingStartRequest
  ): Promise<Result<OnboardingStartResponse, TryMellonError>> {
    return this.post('/v1/onboarding/start', request, validateOnboardingStartResponse);
  }

  async getOnboardingStatus(
    sessionId: string
  ): Promise<Result<OnboardingStatusResponse, TryMellonError>> {
    return this.get(`/v1/onboarding/${sessionId}/status`, validateOnboardingStatusResponse);
  }

  async getOnboardingRegister(
    sessionId: string
  ): Promise<Result<OnboardingRegisterResponseWithChallenge, TryMellonError>> {
    return this.get(`/v1/onboarding/${sessionId}/register`, validateOnboardingRegisterResponse);
  }

  async registerOnboardingPasskey(
    sessionId: string,
    request: OnboardingRegisterPasskeyRequest
  ): Promise<Result<OnboardingRegisterPasskeyResponse, TryMellonError>> {
    return this.post(
      `/v1/onboarding/${sessionId}/register-passkey`,
      request,
      validateOnboardingRegisterPasskeyResponse
    );
  }

  async completeOnboarding(
    sessionId: string,
    request: OnboardingCompleteRequest
  ): Promise<Result<OnboardingCompleteResponse, TryMellonError>> {
    return this.post(
      `/v1/onboarding/${sessionId}/complete`,
      request,
      validateOnboardingCompleteResponse
    );
  }

  async initCrossDeviceAuth(): Promise<Result<CrossDeviceInitResult, TryMellonError>> {
    return this.post('/v1/auth/cross-device/init', {}, validateCrossDeviceInitResponse);
  }

  async initCrossDeviceRegistration(options?: {
    externalUserId?: string;
  }): Promise<Result<CrossDeviceInitResult, TryMellonError>> {
    const trimmed =
      typeof options?.externalUserId === 'string' ? options.externalUserId.trim() : '';
    const body = trimmed.length > 0 ? { external_user_id: trimmed } : {};
    return this.post(
      '/v1/auth/cross-device/init-registration',
      body,
      validateCrossDeviceInitResponse
    );
  }

  private crossDeviceStatusPath(sessionId: string): string {
    return `/v1/auth/cross-device/status/${sessionId}`;
  }

  /**
   * Full URL for GET cross-device status (fetch-SSE or polling).
   * The polling token is passed via X-Polling-Token header (not query param) to avoid
   * exposure in server logs and Referer headers.
   */
  getCrossDeviceStatusUrl(sessionId: string): string {
    return `${this.baseUrl}${this.crossDeviceStatusPath(sessionId)}`;
  }

  async getCrossDeviceStatus(
    sessionId: string,
    pollingToken?: string | null
  ): Promise<Result<CrossDeviceStatusResult, TryMellonError>> {
    const hasToken = typeof pollingToken === 'string' && pollingToken.length > 0;
    return this.get(
      this.crossDeviceStatusPath(sessionId),
      validateCrossDeviceStatusResponse,
      hasToken ? { 'X-Polling-Token': pollingToken as string } : undefined
    );
  }

  /**
   * Fetches WebAuthn options for the cross-device session.
   * Contract: response is CrossDeviceContextResult (auth | registration).
   * Use result.value.type to branch: 'auth' → credentials.get + verify;
   * 'registration' → credentials.create + verify-registration.
   */
  async getCrossDeviceContext(
    sessionId: string
  ): Promise<Result<CrossDeviceContextResult, TryMellonError>> {
    return this.get(
      `/v1/auth/cross-device/context/${sessionId}`,
      validateCrossDeviceContextResponse
    );
  }

  async verifyCrossDeviceAuth(
    request: CrossDeviceVerifyRequest
  ): Promise<Result<void, TryMellonError>> {
    return this.post('/v1/auth/cross-device/verify', request, validateCrossDeviceVerifyResponse);
  }

  async verifyCrossDeviceRegistration(
    request: CrossDeviceVerifyRegistrationRequest
  ): Promise<Result<void, TryMellonError>> {
    return this.post(
      '/v1/auth/cross-device/verify-registration',
      request,
      validateCrossDeviceVerifyResponse
    );
  }

  async verifyAccountRecoveryOtp(
    externalUserId: string,
    otp: string
  ): Promise<Result<RecoveryVerifyResponse, TryMellonError>> {
    return this.post(
      '/v1/users/recovery/verify',
      { external_id: externalUserId, otp },
      validateRecoveryVerifyResponse
    );
  }

  async completeAccountRecovery(
    recoverySessionId: string,
    credential: Record<string, unknown>
  ): Promise<Result<RecoveryCompleteResponse, TryMellonError>> {
    return this.post(
      '/v1/users/recovery/complete',
      { recovery_session_id: recoverySessionId, credential },
      validateRecoveryCompleteResponse
    );
  }

  async startEnrollment(
    ticketId: string,
    contextHash: string,
    headers?: Record<string, string>
  ): Promise<Result<EnrollmentStartResponse, TryMellonError>> {
    return this.post(
      '/v1/enrollment/register/options',
      { ticket_id: ticketId, context_hash: contextHash },
      validateEnrollmentStartResponse,
      headers
    );
  }

  async finishEnrollment(
    ticketId: string,
    body: { credential: unknown; context_hash: string },
    headers?: Record<string, string>
  ): Promise<Result<EnrollmentFinishResponse, TryMellonError>> {
    return this.post(
      '/v1/enrollment/register',
      { ...body, ticket_id: ticketId },
      validateEnrollmentFinishResponse,
      headers
    );
  }

  // -------------------------------------------------------------------------
  // Bridge (KP-BRIDGE-04): enrollment-bridge and auth-bridge
  // -------------------------------------------------------------------------

  private bridgePrefix(kind: BridgeKind): string {
    return kind === 'enrollment' ? BRIDGE_PATH_ENROLLMENT : BRIDGE_PATH_AUTH;
  }

  async getBridgeContext(
    sessionId: string,
    kind: BridgeKind,
    headers?: Record<string, string>
  ): Promise<Result<BridgeContextResponse, TryMellonError>> {
    return this.get(
      `${this.bridgePrefix(kind)}/context/${sessionId}`,
      validateBridgeContextResponse,
      headers
    );
  }

  async verifyBridgePin(
    sessionId: string,
    pin: string,
    kind: BridgeKind,
    headers?: Record<string, string>
  ): Promise<Result<BridgeChallengeResponse, TryMellonError>> {
    return this.post(
      `${this.bridgePrefix(kind)}/verify/${sessionId}`,
      { pin },
      validateBridgeVerifyResponse,
      headers
    );
  }

  async completeBridgeEnrollment(
    body: {
      session_id: string;
      ticket_id: string;
      entity_id: string;
      context_hash: string;
      registration_response: {
        id: string;
        rawId: string;
        response: { clientDataJSON: string; attestationObject: string };
        type: string;
      };
    },
    headers?: Record<string, string>
  ): Promise<Result<BridgeCompleteEnrollmentResult, TryMellonError>> {
    return this.post(
      `${this.bridgePrefix('enrollment')}/complete`,
      body,
      validateBridgeCompleteEnrollmentResponse,
      headers
    );
  }

  async completeBridgeAuth(
    body: {
      session_id: string;
      credential: {
        id: string;
        rawId: string;
        response: {
          authenticatorData: string;
          clientDataJSON: string;
          signature: string;
          userHandle?: string;
        };
        type: string;
      };
    },
    headers?: Record<string, string>
  ): Promise<Result<BridgeCompleteAuthResult, TryMellonError>> {
    return this.post(
      `${this.bridgePrefix('auth')}/complete`,
      body,
      validateBridgeCompleteAuthResponse,
      headers
    );
  }

  /**
   * Full URL for GET bridge status (polling or EventSource). Same path as getBridgeStatus.
   * Used by BridgeManager for SSE when EventSource is available (browser only; Node has no EventSource).
   */
  getBridgeStatusUrl(sessionId: string, kind: BridgeKind): string {
    return `${this.baseUrl}${this.bridgePrefix(kind)}/status/${sessionId}`;
  }

  async getBridgeStatus(
    sessionId: string,
    kind: BridgeKind,
    headers?: Record<string, string>
  ): Promise<Result<BridgeStatusSnapshot, TryMellonError>> {
    return this.get(
      `${this.bridgePrefix(kind)}/status/${sessionId}`,
      validateBridgeStatusResponse,
      headers
    );
  }
}
