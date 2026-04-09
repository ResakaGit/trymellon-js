import type { TryMellonError } from './errors';
import type { Logger } from './core/ports/logger';
import type { TelemetrySender } from './core/ports/telemetry';

export type { TryMellonError };

// ============================================================================
// Branded Types (Elite Standard)
// ============================================================================

export type Branded<T, B> = T & { __brand: B };

export type AppId = Branded<string, 'AppId'>;
export type ExternalUserId = Branded<string, 'ExternalUserId'>;
export type UserId = Branded<string, 'UserId'>;

/** 64-character hex string (SHA-256). Used to bind enrollment ticket to browser context. */
export type ContextHash = Branded<string, 'ContextHash'>;

// ============================================================================
// Configuration Types
// ============================================================================

export type TryMellonConfig = {
  /** Application identifier (tenant). Required for API requests. */
  appId: string;
  /** API key for authentication. Required for API requests. */
  publishableKey: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  /** Optional logger for request/error correlation (e.g. requestId). */
  logger?: Logger;
  /** If true, send anonymous telemetry (event + latency) after successful register/authenticate. */
  enableTelemetry?: boolean;
  /** Custom telemetry sender; used when enableTelemetry is true. Defaults to TryMellon endpoint. */
  telemetrySender?: TelemetrySender;
  /** Endpoint for default telemetry sender when enableTelemetry is true and telemetrySender not set. */
  telemetryEndpoint?: string;
  /**
   * When true, register() and authenticate() return immediately with a fixed sandbox token (no API or WebAuthn).
   * For local development only. Your backend must NOT accept the sandbox token in production.
   */
  sandbox?: boolean;
  /**
   * Custom token to return in sandbox mode. If not set, SANDBOX_SESSION_TOKEN is used.
   * Only used when sandbox is true.
   */
  sandboxToken?: string;
  /**
   * Origin to send in the Origin header for WebAuthn and cross-device API calls.
   * If not set, the SDK uses window.location.origin in browser environments.
   * Set this in Node or when the document origin is not the correct one (e.g. SSR).
   */
  origin?: string;
  /**
   * Optional storage for context hash (e.g. sessionStorage). If not set, browser sessionStorage or in-memory fallback is used.
   * Injected for testability and SSR; must implement getItem/setItem.
   */
  contextHashStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
};

// ============================================================================
// Public API Types
// ============================================================================

export interface RegisterOptions {
  /**
   * Impacto en Analytics y Dashboard.
   */
  externalUserId?: string | ExternalUserId;
  /**
   * @deprecated Use `externalUserId` instead.
   */
  external_user_id?: string | ExternalUserId;
  authenticatorType?: 'platform' | 'cross-platform';
  /** Optional URL to redirect to after success; validated against application allowlist. API returns it as redirect_url when allowed. */
  successUrl?: string;
  signal?: AbortSignal;
}

export interface AuthenticateOptions {
  /**
   * Impacto en Analytics y Dashboard.
   */
  externalUserId?: string | ExternalUserId;
  /**
   * @deprecated Use `externalUserId` instead.
   */
  external_user_id?: string | ExternalUserId;
  hint?: string;
  /** Optional URL to redirect to after success; validated against application allowlist. API returns it as redirect_url when allowed. */
  successUrl?: string;
  signal?: AbortSignal;
  /** Conditional UI mediation for passkey autofill / conditional UI. */
  mediation?: 'optional' | 'conditional' | 'required';
}

export type ClientStatus = {
  isPasskeySupported: boolean;
  platformAuthenticatorAvailable: boolean;
  recommendedFlow: 'passkey' | 'fallback';
};

export type TryMellonEvent = 'start' | 'success' | 'error' | 'cancelled';

/** User info in success event (aligns with API user payload). */
export type SuccessEventUserInfo = {
  userId: string;
  externalUserId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
};

/** Success payload: token always present (03-eventos-seguridad). Nonce when flow generates it. */
export type SuccessEventPayload = {
  type: 'success';
  operation: 'signUp' | 'signIn' | 'enroll';
  token: string;
  user?: SuccessEventUserInfo;
  nonce?: string;
};

export type EventPayload =
  | { type: 'start'; operation: 'signUp' | 'signIn' | 'enroll'; nonce?: string }
  | SuccessEventPayload
  | {
      type: 'error';
      error: TryMellonError;
      operation?: 'signUp' | 'signIn' | 'enroll';
      nonce?: string;
    }
  | { type: 'cancelled'; operation: 'signUp' | 'signIn'; nonce?: string };

export type EventHandler = (payload: EventPayload) => void;

export type EmailFallbackStartOptions = {
  userId: string;
  email: string;
};

export type EmailFallbackVerifyOptions = {
  userId: string;
  code: string;
  /** Optional URL to redirect to after success; validated against application allowlist. */
  successUrl?: string;
};

export type EmailFallbackVerifyResult = {
  sessionToken: string;
  /** Set when successUrl was passed and allowed by application allowlist */
  redirectUrl?: string;
};

// ============================================================================
// Enrollment Types (KP-SDK-01)
// ============================================================================

export type EnrollOptions = {
  ticketId: string;
  signal?: AbortSignal;
};

/** Result of finish enrollment; aligns with backend envelope (session_token). */
export type EnrollmentResult = {
  sessionToken: string;
  credentialId: string;
  userId: string;
  entityId?: string;
};

/** Backend response for POST /v1/enrollment/register/options. Validators use this shape. */
export type EnrollmentStartResponse = {
  session_id: string;
  challenge: RegisterStartResponse['challenge'];
};

/** Backend response for POST /v1/enrollment/register. Validators use this shape. */
export type EnrollmentFinishResponse = {
  credential_id: string;
  user_id: string;
  session_token: string;
  entity_id?: string;
};

// ============================================================================
// Account Recovery Types
// ============================================================================

export type RecoveryVerifyResponse = {
  challenge: Record<string, unknown>;
  recovery_session_id: string;
};

export type RecoveryCompleteResponse = {
  status: string;
  session_token: string;
  user: {
    user_id: string;
    external_user_id?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  credential_id: string;
  /** Set when successUrl was passed and allowed by application allowlist. */
  redirect_url?: string;
};

export type RecoverAccountOptions = {
  /** The external user ID of the account being recovered. */
  externalUserId: string | ExternalUserId;
  /**
   * @deprecated Use `externalUserId` instead.
   */
  external_user_id?: string | ExternalUserId;
  /** The 6-digit OTP sent via email. */
  otp: string;
};

export interface RecoverAccountResult {
  success: true;
  credentialId: string;
  status: string;
  sessionToken: string;
  user: {
    userId: string;
    externalUserId?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  /** Set when successUrl was passed and allowed by application allowlist. */
  redirectUrl?: string;
}

// ============================================================================
// Onboarding Types
// ============================================================================

export type OnboardingStartOptions = {
  user_role: 'maintainer' | 'app_user';
};

/** @deprecated Use {@link OnboardingStartResponse} */
export type OnboardingStartResult = OnboardingStartResponse;

/** @deprecated Use {@link OnboardingStatusResponse} */
export type OnboardingStatusResult = OnboardingStatusResponse;

/** @deprecated Use {@link OnboardingRegisterResponse} */
export type OnboardingRegisterResult = OnboardingRegisterResponse;

export type OnboardingRegisterPasskeyOptions = {
  session_id: string;
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
    };
    type: 'public-key';
  };
  tenant_id?: string;
  challenge: string;
};

/** @deprecated Use {@link OnboardingRegisterPasskeyResponse} */
export type OnboardingRegisterPasskeyResult = OnboardingRegisterPasskeyResponse;

export type OnboardingCompleteOptions = {
  session_id: string;
  company_name?: string;
};

/** @deprecated Use {@link OnboardingCompleteResponse} */
export type OnboardingCompleteResult = OnboardingCompleteResponse;

// ============================================================================
// Cross-Device Types
// ============================================================================

export type CrossDeviceInitResult = {
  session_id: string;
  qr_url: string;
  expires_at: string;
  /** Opaque token; send in X-Polling-Token header when calling GET status. Not included in qr_url. */
  polling_token: string;
  /** Set when backend returns it (e.g. after anonymous init-registration). */
  external_user_id?: string;
};

export type CrossDeviceStatusResult = {
  status: 'pending' | 'authenticated' | 'completed';
  user_id?: string;
  session_token?: string;
  /** Set when backend allows redirect; returned in GET cross-device/status when status=completed. */
  redirect_url?: string;
};

/** Context for auth: request options (get). */
export type CrossDeviceContextAuth = {
  type: 'auth';
  options: AuthStartResponse['challenge'];
  approval_context?: string;
  application_name?: string;
};

/** Context for registration: creation options (create). */
export type CrossDeviceContextRegistration = {
  type: 'registration';
  options: RegisterStartResponse['challenge'];
  approval_context?: string;
  application_name?: string;
};

/**
 * Contract: response of getCrossDeviceContext.
 * Single source of truth for branching in approve(): use context.type to decide
 * whether to run credentials.get (auth) or credentials.create (registration).
 * Validators must return only CrossDeviceContextAuth | CrossDeviceContextRegistration.
 */
export type CrossDeviceContextResult = CrossDeviceContextAuth | CrossDeviceContextRegistration;

export type CrossDeviceVerifyRequest = {
  session_id: string;
  credential: AuthFinishRequest['credential'];
};

/** Same shape as RegisterFinishRequest; used for POST verify-registration. */
export type CrossDeviceVerifyRegistrationRequest = {
  session_id: string;
  credential: RegisterFinishRequest['credential'];
};

// ============================================================================
// Bridge Types (KP-BRIDGE-04)
// ============================================================================

/** Response from GET context/:sessionId (auth or registration). Aligns with backend unwrapped result. */
export type BridgeContextResponse = {
  type: 'auth' | 'registration';
  options: Record<string, unknown>;
  application_name?: string;
};

/** Response from POST verify/:sessionId (challenge / options for WebAuthn). */
export type BridgeChallengeResponse = {
  session_id: string;
  challenge?: string;
  registration_options?: Record<string, unknown>;
  authentication_options?: Record<string, unknown>;
};

/** Backend result of POST complete (enrollment). Validators use this shape. */
export type BridgeCompleteEnrollmentResult = {
  credential_id: string;
  entity_id: string;
  user_id: string;
  session_token: string;
};

/** Backend result of POST complete (auth). */
export type BridgeCompleteAuthResult = {
  session_token: string;
};

/** Options for bridge flows: PIN callback, optional preset PIN, abort signal. */
export type BridgeOptions = {
  onPinRequired?: () => Promise<string>;
  presencePin?: string;
  signal?: AbortSignal;
};

/** Public result of bridge enrollment: sessionToken and optional credential/user/entity ids. */
export type BridgeEnrollmentResult = {
  kind: 'enrollment';
  sessionToken: string;
  credentialId?: string;
  userId?: string;
  entityId?: string;
};

/** Public result of bridge auth: sessionToken only. */
export type BridgeAuthResult = {
  kind: 'auth';
  sessionToken: string;
};

/** Union: bridge completion returns enrollment or auth result. */
export type BridgeResult = BridgeEnrollmentResult | BridgeAuthResult;

/** Status snapshot from GET .../status/:sessionId (polling or SSE event). Terminal: pin_verified | pin_locked | completed | expired | cancelled. */
export type BridgeStatusSnapshot = {
  status: 'pending' | 'pin_verified' | 'pin_locked' | 'completed' | 'expired' | 'cancelled';
  ts?: string;
};

/** Options for complete(): BridgeOptions plus kind and enrollment-only fields. */
export type BridgeCompleteOptions = BridgeOptions & {
  kind: 'enrollment' | 'auth';
  /** Required when completing enrollment bridge. */
  ticketId?: string;
  /** Required when completing enrollment bridge. */
  entityId?: string;
};

// ============================================================================
// API Request Types
// ============================================================================

export type RegisterStartRequest = {
  external_user_id: string;
};

export type AuthStartRequest = {
  /** Omit for discoverable (resident) passkeys; server returns allowCredentials: [] */
  external_user_id?: string;
};

export type RegisterFinishRequest = {
  session_id: string;
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
    };
    type: 'public-key';
  };
  success_url?: string;
};

export type AuthFinishRequest = {
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
    type: 'public-key';
  };
  success_url?: string;
};

// ============================================================================
// API Response Types
// ============================================================================

export type RegisterStartResponse = {
  challenge: {
    rp: {
      name: string;
      id: string;
    };
    user: {
      id: string;
      name: string;
      displayName: string;
    };
    challenge: string;
    pubKeyCredParams: Array<{
      type: 'public-key';
      alg: number;
    }>;
    timeout?: number;
    excludeCredentials?: Array<{
      id: string;
      type: 'public-key';
      transports?: string[];
    }>;
    authenticatorSelection?: {
      userVerification?: 'required' | 'preferred' | 'discouraged';
      residentKey?: 'required' | 'preferred' | 'discouraged';
      authenticatorAttachment?: 'platform' | 'cross-platform';
    };
  };
  session_id: string;
};

export type AuthStartResponse = {
  challenge: {
    challenge: string;
    rpId: string;
    allowCredentials: Array<{
      id: string;
      type: 'public-key';
      transports?: string[];
    }>;
    timeout?: number;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
  session_id: string;
};

export interface RegisterFinishResponse {
  credential_id: string;
  status: string;
  session_token: string;
  user: {
    user_id: string;
    external_user_id: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  /** Present when success_url was sent and allowed by application allowlist */
  redirect_url?: string;
}

export interface AuthFinishResponse {
  authenticated: boolean;
  user: {
    user_id: string;
    external_user_id: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  signals?: {
    userVerification?: boolean;
    backupEligible?: boolean;
    backupStatus?: boolean;
  };
  session_token: string;
  /** Present when success_url was sent and allowed by application allowlist */
  redirect_url?: string;
}

export interface RegisterResult {
  success: true;
  credentialId: string;
  /**
   * Alias for backward compatibility with snake_case.
   * Prefer `credentialId` in new code.
   */
  credential_id?: string;
  status: string;
  sessionToken: string;
  user: {
    userId: string;
    externalUserId?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  /** Set when successUrl was passed and allowed by application allowlist */
  redirectUrl?: string;
}

export interface AuthenticateResult {
  authenticated: boolean;
  sessionToken: string;
  user: {
    userId: string;
    externalUserId?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  signals?: {
    userVerification?: boolean;
    backupEligible?: boolean;
    backupStatus?: boolean;
  };
  /** Set when successUrl was passed and allowed by application allowlist */
  redirectUrl?: string;
}

export type SessionValidateResponse = {
  valid: boolean;
  userId: string;
  externalUserId: string;
  tenantId: string;
  appId: string;
};

// ============================================================================
// Onboarding API Request Types
// ============================================================================

export type OnboardingStartRequest = {
  user_role: 'maintainer' | 'app_user';
};

// ============================================================================
// Onboarding API Response Types
// ============================================================================

export type OnboardingStartResponse = {
  session_id: string;
  onboarding_url: string;
  expires_in: number;
};

export type OnboardingStatusResponse = {
  status: 'pending_passkey' | 'pending_data' | 'completed';
  onboarding_url: string;
  expires_in: number;
};

export type OnboardingRegisterResponse = {
  session_id: string;
  status: 'pending_passkey';
  onboarding_url: string;
};

export type OnboardingRegisterPasskeyRequest = {
  credential: {
    id: string;
    rawId: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
    };
    type: 'public-key';
  };
  tenant_id?: string;
  challenge: string;
};

export type OnboardingRegisterPasskeyResponse = {
  session_id: string;
  status: 'pending_data' | 'completed';
  user_id: string;
  tenant_id: string;
};

export type OnboardingCompleteRequest = {
  company_name?: string;
};

export type OnboardingCompleteResponse = {
  session_id: string;
  status: 'completed';
  user_id: string;
  tenant_id: string;
  session_token: string;
};
