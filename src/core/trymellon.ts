import { ApiClient } from './api';
import { FetchHttpClient } from './fetch-client';
import { OnboardingManager } from './onboarding-manager';
import { CrossDeviceManager } from './cross-device-manager';
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
  SANDBOX_SESSION_TOKEN,
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
import { ok, err, type Result } from '../utils/result';
import { type TryMellonError, isTryMellonError } from '../errors';

declare const __VERSION__: string;

export class TryMellon {
  private readonly sandbox: boolean;
  private readonly sandboxToken: string;
  private apiClient: ApiClient;
  private eventEmitter: EventEmitter;
  private telemetrySender: TelemetrySender | undefined;
  private crossDeviceManager: CrossDeviceManager;
  public onboarding: OnboardingManager;

  /**
   * Configura una nueva instancia de TryMellon.
   * Valida la configuración y retorna un Result.
   * @param config Configuración del SDK
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

    const defaultHeaders: Record<string, string> = {
      'X-App-Id': appId.trim(),
      Authorization: `Bearer ${publishableKey.trim()}`,
    };

    this.apiClient = new ApiClient(httpClient, apiBaseUrl, defaultHeaders);
    this.onboarding = new OnboardingManager(this.apiClient);
    this.crossDeviceManager = new CrossDeviceManager(this.apiClient);
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
    if (this.sandbox) {
      const externalUserId =
        options.externalUserId ??
        (options as { external_user_id?: string }).external_user_id ??
        'sandbox';
      return Promise.resolve(
        ok({
          success: true,
          credentialId: '',
          status: 'sandbox',
          sessionToken: this.sandboxToken,
          user: {
            userId: 'sandbox-user',
            externalUserId: typeof externalUserId === 'string' ? externalUserId : 'sandbox',
          },
        })
      );
    }
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
    if (this.sandbox) {
      const externalUserId =
        options.externalUserId ??
        (options as { external_user_id?: string }).external_user_id ??
        'sandbox';
      return Promise.resolve(
        ok({
          authenticated: true,
          sessionToken: this.sandboxToken,
          user: {
            userId: 'sandbox-user',
            externalUserId: typeof externalUserId === 'string' ? externalUserId : 'sandbox',
          },
        })
      );
    }
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
        return this.apiClient.verifyEmailCode(options.userId, options.code);
      },
    },
  };

  auth = {
    crossDevice: {
      init: () => this.crossDeviceManager.init(),
      waitForSession: (sessionId: string, signal?: AbortSignal) =>
        this.crossDeviceManager.waitForSession(sessionId, signal),
      approve: (sessionId: string) => this.crossDeviceManager.approve(sessionId),
    },
  };
}
