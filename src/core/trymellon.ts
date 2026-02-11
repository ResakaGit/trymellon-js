import { ApiClient } from './api';
import { FetchHttpClient } from './fetch-client';
import { OnboardingManager } from './onboarding-manager';
import { EventEmitter } from './events';
import { registerPasskey, authenticatePasskey } from './webauthn';
import { isWebAuthnSupported, getClientStatus } from '../utils/support';
import { validateUrl, validateRange, createInvalidArgumentError } from '../errors';
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TELEMETRY_ENDPOINT,
  MIN_TIMEOUT_MS,
  MAX_TIMEOUT_MS,
  MIN_MAX_RETRIES,
  MAX_MAX_RETRIES,
  MIN_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
} from './constants';
import { createDefaultTelemetrySender } from './adapters/telemetry-sender';
import { buildTelemetryPayload, type TelemetrySender } from './ports/telemetry';
import type {
  TryMellonConfig,
  RegisterOptions,
  RegisterResult,
  AuthenticateOptions,
  AuthenticateResult,
  ClientStatus,
  TryMellonEvent,
  EventHandler,
  EmailFallbackStartOptions,
  EmailFallbackVerifyOptions,
  EmailFallbackVerifyResult,
  SessionValidateResponse,
} from '../types';
import type { Result } from '../utils/result';
import type { TryMellonError } from '../errors';

declare const __VERSION__: string;

export class TryMellon {
  private apiClient: ApiClient;
  private eventEmitter: EventEmitter;
  private telemetrySender: TelemetrySender | undefined;
  public onboarding: OnboardingManager;

  constructor(config: TryMellonConfig) {
    const appId = config.appId;
    const publishableKey = config.publishableKey;
    if (!appId || typeof appId !== 'string' || appId.trim() === '') {
      throw createInvalidArgumentError('appId', 'must be a non-empty string');
    }
    if (!publishableKey || typeof publishableKey !== 'string' || publishableKey.trim() === '') {
      throw createInvalidArgumentError('publishableKey', 'must be a non-empty string');
    }

    const apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    validateUrl(apiBaseUrl, 'apiBaseUrl');

    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    validateRange(timeoutMs, 'timeoutMs', MIN_TIMEOUT_MS, MAX_TIMEOUT_MS);

    if (config.maxRetries !== undefined) {
      validateRange(config.maxRetries, 'maxRetries', MIN_MAX_RETRIES, MAX_MAX_RETRIES);
    }

    if (config.retryDelayMs !== undefined) {
      validateRange(config.retryDelayMs, 'retryDelayMs', MIN_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS);
    }

    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryDelayMs = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    const httpClient = new FetchHttpClient(timeoutMs, maxRetries, retryDelayMs, config.logger);

    const defaultHeaders: Record<string, string> = {
      'X-App-Id': appId.trim(),
      Authorization: `Bearer ${publishableKey.trim()}`,
    };

    this.apiClient = new ApiClient(httpClient, apiBaseUrl, defaultHeaders);
    this.onboarding = new OnboardingManager(this.apiClient);
    this.eventEmitter = new EventEmitter();

    if (config.enableTelemetry) {
      this.telemetrySender =
        config.telemetrySender ??
        createDefaultTelemetrySender(config.telemetryEndpoint ?? DEFAULT_TELEMETRY_ENDPOINT);
    }
  }

  static isSupported(): boolean {
    return isWebAuthnSupported();
  }

  async register(options: RegisterOptions): Promise<Result<RegisterResult, TryMellonError>> {
    const start = Date.now();
    const result = await registerPasskey(options, this.apiClient, this.eventEmitter);
    if (result.ok && this.telemetrySender) {
      this.telemetrySender
        .send(buildTelemetryPayload('register', Date.now() - start))
        .catch(() => {});
    }
    return result;
  }

  async authenticate(
    options: AuthenticateOptions
  ): Promise<Result<AuthenticateResult, TryMellonError>> {
    const start = Date.now();
    const result = await authenticatePasskey(options, this.apiClient, this.eventEmitter);
    if (result.ok && this.telemetrySender) {
      this.telemetrySender
        .send(buildTelemetryPayload('authenticate', Date.now() - start))
        .catch(() => {});
    }
    return result;
  }

  async validateSession(
    sessionToken: string
  ): Promise<Result<SessionValidateResponse, TryMellonError>> {
    return this.apiClient.validateSession(sessionToken);
  }

  async getStatus(): Promise<ClientStatus> {
    return getClientStatus();
  }

  on(event: TryMellonEvent, handler: EventHandler): () => void {
    return this.eventEmitter.on(event, handler);
  }

  version(): string {
    return typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0';
  }

  fallback = {
    email: {
      start: async (options: EmailFallbackStartOptions): Promise<Result<void, TryMellonError>> => {
        return this.apiClient.startEmailFallback(options.userId);
      },
      verify: async (
        options: EmailFallbackVerifyOptions
      ): Promise<Result<EmailFallbackVerifyResult, TryMellonError>> => {
        return this.apiClient.verifyEmailCode(options.userId, options.code);
      },
    },
  };
}
