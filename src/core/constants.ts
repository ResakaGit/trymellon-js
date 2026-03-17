export const COSE_ALGORITHM_ES256 = -7;
export const COSE_ALGORITHM_RS256 = -257;

export const DEFAULT_API_BASE_URL = 'https://api.trymellonauth.com';
export const DEFAULT_TELEMETRY_ENDPOINT = 'https://api.trymellonauth.com/v1/telemetry';
export const DEFAULT_TIMEOUT_MS = 30000;
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 1000;

export const MIN_TIMEOUT_MS = 1000;
export const MAX_TIMEOUT_MS = 300000;
export const MIN_MAX_RETRIES = 0;
export const MAX_MAX_RETRIES = 10;
export const MIN_RETRY_DELAY_MS = 100;
export const MAX_RETRY_DELAY_MS = 10000;

/** Cap for exponential backoff delay (single request retry loop). */
export const RETRY_DELAY_CAP_MS = 30_000;

/**
 * Fixed session token returned by register() and authenticate() when sandbox mode is enabled.
 * Backends MUST NOT accept this token in production; only in development for testing the integration flow.
 */
export const SANDBOX_SESSION_TOKEN = 'trymellon_sandbox_session_token_v1';

/** Docs URL for sandbox mode (DX: warn when sandbox ON in non-localhost). Single source of truth. */
export const SANDBOX_DOCS_URL = 'https://trymellon.com/docs/getting-started#sandbox';

/** API path prefix for enrollment-bridge (KP-BRIDGE-04). Single source of truth. */
export const BRIDGE_PATH_ENROLLMENT = '/v1/enrollment-bridge';

/** API path prefix for auth-bridge (KP-BRIDGE-04). Single source of truth. */
export const BRIDGE_PATH_AUTH = '/v1/auth-bridge';
