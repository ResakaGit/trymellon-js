import { ApiClient } from './api';
import { FetchHttpClient } from './fetch-client';
import { OnboardingManager } from './onboarding-manager';
import { CrossDeviceManager } from './cross-device-manager';
import { EventEmitter } from './events';
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
  SANDBOX_SESSION_TOKEN,
} from './constants';
import { createDefaultTelemetrySender } from './adapters/telemetry-sender';
import type { TelemetrySender } from './ports/telemetry';
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
  RecoverAccountOptions,
} from '../types';
import { ok, err, type Result } from '../utils/result';
import { type TryMellonError, isTryMellonError } from '../errors';
import { AuthService } from './services/auth-service';
import { RecoveryService } from './services/recovery-service';

declare const __VERSION__: string;

export class TryMellon {
  private readonly sandbox: boolean;
  private readonly sandboxToken: string;
  private apiClient: ApiClient;
  private eventEmitter: EventEmitter;
  private telemetrySender: TelemetrySender | undefined;
  private crossDeviceManager: CrossDeviceManager;
  private authService: AuthService;
  private recoveryService: RecoveryService;
  public onboarding: OnboardingManager;

  /**
   * Creates a new TryMellon instance.
   * Validates config and returns a Result.
   * @param config SDK configuration
   */
  static create(config: TryMellonConfig): Result<TryMellon, TryMellonError> {
    try {
      const appId = config.appId;
      const publishableKey = config.publishableKey;

      if (!appId || typeof appId !== 'string' || appId.trim() === '') {
        return err(createInvalidArgumentError('appId', 'must be a non-empty string'));
      }
      if (!publishableKey || typeof publishableKey !== 'string' || publishableKey.trim() === '') {
        return err(createInvalidArgumentError('publishableKey', 'must be a non-empty string'));
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

      // Safe to instantiate now
      return ok(new TryMellon(config));
    } catch (e) {
      if (isTryMellonError(e)) {
        return err(e);
      }
      return err(createInvalidArgumentError('config', (e as Error).message));
    }
  }

  /**
   * @deprecated Use `TryMellon.create(config)` instead to handle validation errors safely.
   * This constructor will throw errors if configuration is invalid.
   */
  constructor(config: TryMellonConfig) {
    this.sandbox = config.sandbox === true;
    this.sandboxToken =
      this.sandbox && config.sandboxToken != null && config.sandboxToken !== ''
        ? config.sandboxToken
        : SANDBOX_SESSION_TOKEN;

    const appId = config.appId;
    const publishableKey = config.publishableKey;

    // Legacy validation for direct constructor usage (still throws to maintain behavior for legacy code,
    // but create() handles this safely before calling constructor)
    if (!appId || typeof appId !== 'string' || appId.trim() === '') {
      throw createInvalidArgumentError('appId', 'must be a non-empty string');
    }
    if (!publishableKey || typeof publishableKey !== 'string' || publishableKey.trim() === '') {
      throw createInvalidArgumentError('publishableKey', 'must be a non-empty string');
    }

    const apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    // validateUrl throws, which is expected for the constructor. create() catches it.
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

    const originHeader =
      config.origin ??
      (typeof window !== 'undefined' && window?.location?.origin
        ? window.location.origin
        : undefined);

    const defaultHeaders: Record<string, string> = {
      'X-App-Id': appId.trim(),
      Authorization: `Bearer ${publishableKey.trim()}`,
      ...(originHeader && { Origin: originHeader }),
    };

    this.apiClient = new ApiClient(httpClient, apiBaseUrl, defaultHeaders);
    this.eventEmitter = new EventEmitter();

    if (config.enableTelemetry) {
      this.telemetrySender =
        config.telemetrySender ??
        createDefaultTelemetrySender(config.telemetryEndpoint ?? DEFAULT_TELEMETRY_ENDPOINT);
    }

    this.authService = new AuthService(
      this.apiClient,
      this.eventEmitter,
      this.sandbox,
      this.sandboxToken,
      this.telemetrySender
    );
    this.recoveryService = new RecoveryService(this.apiClient, this.eventEmitter);
    this.onboarding = new OnboardingManager(this.apiClient);
    this.crossDeviceManager = new CrossDeviceManager(this.apiClient);
  }

  static isSupported(): boolean {
    return isWebAuthnSupported();
  }

  async register(options: RegisterOptions): Promise<Result<RegisterResult, TryMellonError>> {
    return this.authService.register(options);
  }

  async authenticate(
    options: AuthenticateOptions
  ): Promise<Result<AuthenticateResult, TryMellonError>> {
    return this.authService.authenticate(options);
  }

  async validateSession(
    sessionToken: string
  ): Promise<Result<SessionValidateResponse, TryMellonError>> {
    if (this.sandbox && sessionToken === this.sandboxToken) {
      return Promise.resolve(
        ok({
          valid: true,
          user_id: 'sandbox-user',
          external_user_id: 'sandbox',
          tenant_id: 'sandbox-tenant',
          app_id: 'sandbox-app',
        })
      );
    }
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
        return this.apiClient.startEmailFallback(options);
      },
      verify: async (
        options: EmailFallbackVerifyOptions
      ): Promise<Result<EmailFallbackVerifyResult, TryMellonError>> => {
        const result = await this.apiClient.verifyEmailCode({
          userId: options.userId,
          code: options.code,
          ...(options.successUrl && { successUrl: options.successUrl }),
        });
        if (!result.ok) return result;
        return ok({
          sessionToken: result.value.sessionToken,
          ...(result.value.redirectUrl && { redirectUrl: result.value.redirectUrl }),
        });
      },
    },
  };

  auth = {
    crossDevice: {
      init: () => this.crossDeviceManager.init(),
      initRegistration: (options?: { externalUserId?: string }) =>
        this.crossDeviceManager.initRegistration(options ?? {}),
      waitForSession: (sessionId: string, signal?: AbortSignal, pollingToken?: string | null) =>
        this.crossDeviceManager.waitForSession(sessionId, signal, pollingToken),
      getContext: (sessionId: string) => this.apiClient.getCrossDeviceContext(sessionId),
      approve: (sessionId: string) => this.crossDeviceManager.approve(sessionId),
    },
    recoverAccount: (options: RecoverAccountOptions) => this.recoveryService.recover(options),
  };
}
