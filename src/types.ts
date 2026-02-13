import type { TryMellonError } from './errors';
import type { Logger } from './core/ports/logger';
import type { TelemetrySender } from './core/ports/telemetry';

export type { TryMellonError };

// ============================================================================
// Branded Types (Elite Standard)
// ============================================================================

export type Branded<T, B> = T & { __brand: B };

export type AppId = Branded<string, 'AppId'>;
export type TenantId = Branded<string, 'TenantId'>;
export type ExternalUserId = Branded<string, 'ExternalUserId'>;
export type UserId = Branded<string, 'UserId'>;
export type SessionId = Branded<string, 'SessionId'>;
export type SessionToken = Branded<string, 'SessionToken'>;

export function asAppId(value: string): AppId {
  return value as AppId;
}

export function asExternalUserId(value: string): ExternalUserId {
  return value as ExternalUserId;
}

// ============================================================================
// Configuration Types
// ============================================================================

export type TryMellonConfig = {
  /** Application identifier (tenant). Required for API requests. */
  appId: string | AppId;
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

export type EventPayload =
  | { type: 'start'; operation: 'register' | 'authenticate' }
  | { type: 'success'; operation: 'register' | 'authenticate' }
  | { type: 'error'; error: TryMellonError }
  | { type: 'cancelled'; operation: 'register' | 'authenticate' };

export type EventHandler = (payload: EventPayload) => void;

export type EmailFallbackStartOptions = {
  userId: string;
};

export type EmailFallbackVerifyOptions = {
  userId: string;
  code: string;
};

export type EmailFallbackVerifyResult = {
  sessionToken: string;
};

// ============================================================================
// Onboarding Types
// ============================================================================

export type OnboardingStartOptions = {
  user_role: 'maintainer' | 'app_user';
};

export type OnboardingStartResult = {
  session_id: string;
  onboarding_url: string;
  expires_in: number;
};

export type OnboardingStatusResult = {
  status: 'pending_passkey' | 'pending_data' | 'completed';
  onboarding_url: string;
  expires_in: number;
};

export type OnboardingRegisterResult = {
  session_id: string;
  status: 'pending_passkey';
  onboarding_url: string;
};

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

export type OnboardingRegisterPasskeyResult = {
  session_id: string;
  status: 'pending_data' | 'completed';
  user_id: string;
  tenant_id: string;
};

export type OnboardingCompleteOptions = {
  session_id: string;
  company_name?: string;
};

export type OnboardingCompleteResult = {
  session_id: string;
  status: 'completed';
  user_id: string;
  tenant_id: string;
  session_token: string;
};

// ============================================================================
// Cross-Device Types
// ============================================================================

export type CrossDeviceInitResult = {
  session_id: string;
  qr_url: string;
  expires_at: string;
};

export type CrossDeviceStatusResult = {
  status: 'pending' | 'authenticated' | 'completed';
  user_id?: string;
  session_token?: string;
};

export type CrossDeviceContextResult = {
  options: AuthStartResponse['challenge'];
};

export type CrossDeviceVerifyRequest = {
  session_id: string;
  credential: AuthFinishRequest['credential'];
};

// ============================================================================
// API Request Types
// ============================================================================

export type RegisterStartRequest = {
  external_user_id: string;
};

export type AuthStartRequest = {
  external_user_id: string;
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
}

export interface AuthFinishResponse {
  authenticated: boolean;
  user: {
    user_id: string;
    external_user_id: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  signals: {
    userVerification?: boolean;
    backupEligible?: boolean;
    backupStatus?: boolean;
  };
  session_token: string;
}

export interface RegisterResult {
  success: true;
  credentialId: string;
  /**
   * Alias para compatibilidad con versiones anteriores que usaban snake_case.
   * Preferir `credentialId` en código nuevo.
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
}

export type SessionValidateResponse = {
  valid: boolean;
  user_id: string;
  external_user_id: string;
  tenant_id: string;
  app_id: string;
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
