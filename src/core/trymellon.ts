import { ApiClient } from './api';
import { FetchHttpClient } from './fetch-client';
import { OnboardingManager } from './onboarding-manager';
import { EnrollmentManager } from './enrollment-manager';
import { CrossDeviceManager } from './cross-device-manager';
import { BridgeManager } from './bridge-manager';
import { getOrCreateContextHash } from './context-hash';
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
  SANDBOX_DOCS_URL,
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
  EnrollOptions,
  EnrollmentResult,
  BridgeContextResponse,
  BridgeChallengeResponse,
  BridgeResult,
  BridgeCompleteOptions,
  BridgeStatusSnapshot,
} from '../types';
import { ok, err, type Result } from '../utils/result';
import { type TryMellonError, isTryMellonError } from '../errors';
import { AuthService } from './services/auth-service';
import { RecoveryService } from './services/recovery-service';

declare const __VERSION__: string;

/**
 * Pure helper: true if origin's hostname is localhost or 127.0.0.1.
 * Does not consider [::1] or other formats unless explicitly required.
 */
function isLocalhost(origin: string): boolean {
  if (typeof origin !== 'string' || origin === '') return false;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export class TryMellon {
  private readonly sandbox: boolean;
  private readonly sandboxToken: string;
  private apiClient: ApiClient;
  private eventEmitter: EventEmitter;
  private telemetrySender: TelemetrySender | undefined;
  private crossDeviceManager: CrossDeviceManager;
  private authService: AuthService;
  private recoveryService: RecoveryService;
  private readonly onboardingManager: OnboardingManager;
  private readonly enrollmentManager: EnrollmentManager;
  private readonly bridgeManager: BridgeManager;
  private readonly contextHashStorage: TryMellonConfig['contextHashStorage'];

  private static validateConfig(config: TryMellonConfig): void {
    const { appId, publishableKey } = config;

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
  }

  static create(config: TryMellonConfig): Result<TryMellon, TryMellonError> {
    try {
      TryMellon.validateConfig(config);
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

    TryMellon.validateConfig(config);

    const appId = config.appId as string;
    const publishableKey = config.publishableKey as string;
    const apiBaseUrl = config.apiBaseUrl ?? DEFAULT_API_BASE_URL;
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
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
    this.contextHashStorage = config.contextHashStorage;
    this.onboardingManager = new OnboardingManager(this.apiClient);
    this.enrollmentManager = new EnrollmentManager(this.apiClient, this.contextHashStorage);
    this.crossDeviceManager = new CrossDeviceManager(this.apiClient);
    this.bridgeManager = new BridgeManager(this.apiClient, this.contextHashStorage);
    this.warnIfSandboxOnProd();
  }

  /**
   * DX: warn when sandbox is ON and origin is not localhost/127.0.0.1 (e.g. production).
   * No-op in non-browser (SSR/Node). No exceptions; only console.warn.
   */
  private warnIfSandboxOnProd(): void {
    if (typeof window === 'undefined') return;
    if (!this.sandbox) return;
    const origin = window.location.origin;
    if (isLocalhost(origin)) return;
    console.warn(
      `[TryMellon] Sandbox mode is ON but origin is not localhost (current: ${origin}). Use sandbox: false in production. See: ${SANDBOX_DOCS_URL}`
    );
  }

  /**
   * Bridge (KP-BRIDGE-04): complete enrollment or auth from a second device.
   * Use kind 'enrollment' for enrollment-bridge sessions, 'auth' for auth-bridge sessions.
   */
  get bridge(): {
    getContext(
      sessionId: string,
      kind: 'enrollment' | 'auth'
    ): Promise<import('../utils/result').Result<BridgeContextResponse, TryMellonError>>;
    verifyPresence(
      sessionId: string,
      pin: string,
      kind: 'enrollment' | 'auth'
    ): Promise<import('../utils/result').Result<BridgeChallengeResponse, TryMellonError>>;
    complete(
      sessionId: string,
      options?: BridgeCompleteOptions
    ): Promise<import('../utils/result').Result<BridgeResult, TryMellonError>>;
    waitForResult(
      sessionId: string,
      options?: { useSse?: boolean; kind?: 'enrollment' | 'auth'; timeoutMs?: number }
    ): Promise<import('../utils/result').Result<BridgeStatusSnapshot, TryMellonError>>;
  } {
    return {
      getContext: (sessionId, kind) => this.bridgeManager.getContext(sessionId, kind),
      verifyPresence: (sessionId, pin, kind) => this.bridgeManager.verifyPin(sessionId, pin, kind),
      complete: (sessionId, options) => this.bridgeManager.complete(sessionId, options),
      waitForResult: (sessionId, options) => this.bridgeManager.waitForResult(sessionId, options),
    };
  }

  static isSupported(): boolean {
    return isWebAuthnSupported();
  }

  async signUp(options: RegisterOptions): Promise<Result<RegisterResult, TryMellonError>> {
    return this.authService.register(options);
  }

  async signIn(
    options: AuthenticateOptions
  ): Promise<Result<AuthenticateResult, TryMellonError>> {
    return this.authService.authenticate(options);
  }

  async enroll(options: EnrollOptions): Promise<Result<EnrollmentResult, TryMellonError>> {
    this.eventEmitter.emit('start', { type: 'start', operation: 'enroll' });
    const result = await this.enrollmentManager.enroll(options);
    if (result.ok) {
      this.eventEmitter.emit('success', {
        type: 'success',
        operation: 'enroll',
        token: result.value.sessionToken,
      });
    } else {
      this.eventEmitter.emit('error', {
        type: 'error',
        operation: 'enroll',
        error: result.error,
      });
    }
    return result;
  }

  getContextHash(): string {
    const storage =
      this.contextHashStorage ??
      (typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
    return getOrCreateContextHash(storage);
  }

  session = {
    verify: async (
      sessionToken: string
    ): Promise<Result<SessionValidateResponse, TryMellonError>> => {
      if (this.sandbox && sessionToken === this.sandboxToken) {
        return Promise.resolve(
          ok({
            valid: true,
            userId: 'sandbox-user',
            externalUserId: 'sandbox',
            tenantId: 'sandbox-tenant',
            appId: 'sandbox-app',
          })
        );
      }
      return this.apiClient.validateSession(sessionToken);
    },
  };

  async getCapabilities(): Promise<ClientStatus> {
    return getClientStatus();
  }

  on(event: TryMellonEvent, handler: EventHandler): () => void {
    return this.eventEmitter.on(event, handler);
  }

  version(): string {
    return typeof __VERSION__ !== 'undefined' ? __VERSION__ : '0.0.0';
  }

  otp = {
    send: async (options: EmailFallbackStartOptions): Promise<Result<void, TryMellonError>> => {
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
  };

  crossDevice = {
    start: () => this.crossDeviceManager.init(),
    startRegistration: (options?: { externalUserId?: string }) =>
      this.crossDeviceManager.initRegistration(options ?? {}),
    waitForCompletion: (sessionId: string, signal?: AbortSignal, pollingToken?: string | null) =>
      this.crossDeviceManager.waitForSession(sessionId, signal, pollingToken),
    getContext: (sessionId: string) => this.apiClient.getCrossDeviceContext(sessionId),
    approve: (sessionId: string) => this.crossDeviceManager.approve(sessionId),
  };

  passkey = {
    recover: (options: RecoverAccountOptions) => this.recoveryService.recover(options),
  };

  platform = {
    signUp: (options: import('../types').OnboardingStartOptions & { company_name?: string }, signal?: AbortSignal) =>
      this.onboardingManager.startFlow(options, signal),
  };
}
