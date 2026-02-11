import type { HttpClient } from './http-client';
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
} from '../types';
import type { OnboardingRegisterResponseWithChallenge } from './validators';

export class ApiClient {
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
    validate: (data: unknown) => Result<Res, TryMellonError>
  ): Promise<Result<Res, TryMellonError>> {
    const url = `${this.baseUrl}${path}`;
    const result = await this.httpClient.post<unknown>(url, body, this.mergeHeaders());

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

  async finishAuth(
    request: AuthFinishRequest
  ): Promise<Result<AuthFinishResponse, TryMellonError>> {
    return this.post('/v1/passkeys/auth/finish', request, validateAuthFinishResponse);
  }

  async validateSession(
    sessionToken: string
  ): Promise<Result<SessionValidateResponse, TryMellonError>> {
    return this.get('/v1/sessions/validate', validateSessionValidateResponse, {
      Authorization: `Bearer ${sessionToken}`,
    });
  }

  async startEmailFallback(userId: string): Promise<Result<void, TryMellonError>> {
    const url = `${this.baseUrl}/v1/fallback/email/start`;
    const result = await this.httpClient.post<unknown>(url, { userId }, this.mergeHeaders());
    if (!result.ok) return err(result.error);
    return ok(undefined);
  }

  async verifyEmailCode(
    userId: string,
    code: string
  ): Promise<Result<{ sessionToken: string }, TryMellonError>> {
    return this.post('/v1/fallback/email/verify', { userId, code }, validateEmailVerifyResponse);
  }

  async startOnboarding(
    request: OnboardingStartRequest
  ): Promise<Result<OnboardingStartResponse, TryMellonError>> {
    return this.post('/onboarding/start', request, validateOnboardingStartResponse);
  }

  async getOnboardingStatus(
    sessionId: string
  ): Promise<Result<OnboardingStatusResponse, TryMellonError>> {
    return this.get(`/onboarding/${sessionId}/status`, validateOnboardingStatusResponse);
  }

  async getOnboardingRegister(
    sessionId: string
  ): Promise<Result<OnboardingRegisterResponseWithChallenge, TryMellonError>> {
    return this.get(`/onboarding/${sessionId}/register`, validateOnboardingRegisterResponse);
  }

  async registerOnboardingPasskey(
    sessionId: string,
    request: OnboardingRegisterPasskeyRequest
  ): Promise<Result<OnboardingRegisterPasskeyResponse, TryMellonError>> {
    return this.post(
      `/onboarding/${sessionId}/register-passkey`,
      request,
      validateOnboardingRegisterPasskeyResponse
    );
  }

  async completeOnboarding(
    sessionId: string,
    request: OnboardingCompleteRequest
  ): Promise<Result<OnboardingCompleteResponse, TryMellonError>> {
    return this.post(
      `/onboarding/${sessionId}/complete`,
      request,
      validateOnboardingCompleteResponse
    );
  }
}
