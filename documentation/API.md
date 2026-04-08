# API Reference

Complete reference for the public API of the `@trymellon/js` SDK.

---

## TryMellon Class

Main SDK class for passwordless authentication with Passkeys/WebAuthn.

### Constructor

> **Deprecated.** Use `TryMellon.create()` instead. The constructor throws on invalid config and cannot be used safely in environments where exceptions are undesirable. It is kept for backward compatibility only.

```typescript
/** @deprecated Use TryMellon.create() */
new TryMellon(config: TryMellonConfig)
```

Throws `TryMellonError` with code `'INVALID_ARGUMENT'` if config is invalid.

---

## Static Methods

### `TryMellon.create(config)` ✓ Recommended

Validates the configuration and creates an instance without throwing. Returns `Result<TryMellon, TryMellonError>`.

```typescript
static create(config: TryMellonConfig): Result<TryMellon, TryMellonError>
```

**Parameters:**

- `config.appId` (string, required): Application ID (UUID). Get it from Dashboard → Your app → App ID.
- `config.publishableKey` (string, required): Client ID (value starting with `cli_`). Get it from Dashboard → Your app → Client ID.
- `config.apiBaseUrl` (string, optional): API base URL. Default: `'https://api.trymellonauth.com'`. Must be a valid URL.
- `config.timeoutMs` (number, optional): HTTP request timeout in ms. Default: `30000`. Valid range: `1000`–`300000`.
- `config.maxRetries` (number, optional): Max retries for failed requests. Default: `3`. Valid range: `0`–`10`. Only 5xx and transient errors are retried.
- `config.retryDelayMs` (number, optional): Initial retry delay in ms (exponential backoff). Default: `1000`. Valid range: `100`–`10000`.
- `config.sandbox` (boolean, optional): When `true`, `signUp()` and `signIn()` return a fixed sandbox token immediately — no API or WebAuthn calls. For local development only.
- `config.origin` (string, optional): Explicit origin for API requests. Defaults to `window.location.origin`. Set when running in Node/SSR.
- `config.contextHashStorage` (object, optional): Custom storage for context hash (e.g. `sessionStorage`). Must implement `getItem`/`setItem`.

**Example:**

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({
  appId: 'your-app-id-uuid', // Dashboard → Your app → App ID
  publishableKey: 'cli_xxxx', // Dashboard → Your app → Client ID
});

if (!clientResult.ok) {
  console.error(clientResult.error.code, clientResult.error.message);
  throw clientResult.error;
}

const client = clientResult.value;
```

---

### `TryMellon.isSupported()`

Checks whether the browser supports WebAuthn/Passkeys.

```typescript
static isSupported(): boolean
```

**Returns:**

- `true` if WebAuthn is supported
- `false` if not supported

**Example:**

```typescript
if (!TryMellon.isSupported()) {
  console.log('WebAuthn is not available');
  // Show fallback
}
```

---

## Instance Methods

### `signUp()`

Registers a new passkey for a user.

```typescript
signUp(options: RegisterOptions): Promise<Result<RegisterResult, TryMellonError>>
```

**Parameters:**

- `options.externalUserId` (string, optional): External user ID. Omit for anonymous registration — backend creates a user and returns the id. Also accepts `external_user_id` (deprecated).
- `options.authenticatorType` ('platform' | 'cross-platform', optional): Preferred authenticator type.
- `options.successUrl` (string, optional): Redirect URL after success (must be in allowlist).
- `options.signal` (AbortSignal, optional): Signal to cancel the operation.

**Returns:**

- `Promise<Result<RegisterResult, TryMellonError>>`: `ok: true` with `value` (sessionToken, credentialId, user) or `ok: false` with `error`.

**Example:**

```typescript
const result = await client.signUp({
  externalUserId: 'user_123',
  authenticatorType: 'platform',
});

if (result.ok) {
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  });
} else {
  if (result.error.code === 'USER_CANCELLED') {
    console.log('User cancelled registration');
  }
}
```

**Errors (result.error.code):**

- `NOT_SUPPORTED`: WebAuthn is not available
- `USER_CANCELLED`: User cancelled the operation
- `INVALID_ARGUMENT`: `externalUserId` missing or invalid
- `NETWORK_FAILURE`: Network error
- `TIMEOUT`: Operation expired

---

### `signIn()`

Authenticates a user with their passkey.

```typescript
signIn(options: AuthenticateOptions): Promise<Result<AuthenticateResult, TryMellonError>>
```

**Parameters:**

- `options.externalUserId` (string, optional): External user ID. Omit to trigger discoverable credential flow. Also accepts `external_user_id` (deprecated).
- `options.hint` (string, optional): Hint to help the user select the correct passkey (e.g. email).
- `options.successUrl` (string, optional): Redirect URL after success (must be in allowlist).
- `options.signal` (AbortSignal, optional): Signal to cancel the operation.
- `options.mediation` ('optional' | 'conditional' | 'required', optional): For conditional UI / autofill.

**Returns:**

- `Promise<Result<AuthenticateResult, TryMellonError>>`: `ok: true` with `value` (sessionToken, user) or `ok: false` with `error`.

**Example:**

```typescript
const result = await client.signIn({
  externalUserId: 'user_123',
  hint: 'user@example.com',
});

if (result.ok) {
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  });
} else {
  if (result.error.code === 'PASSKEY_NOT_FOUND') {
    console.log('No passkey found for this user');
  }
}
```

**Errors (result.error.code):**

- `NOT_SUPPORTED`: WebAuthn is not available
- `USER_CANCELLED`: User cancelled the operation
- `PASSKEY_NOT_FOUND`: No passkey found for the user
- `NETWORK_FAILURE`: Network error
- `TIMEOUT`: Operation expired

---

### `session.verify()`

Validates a session token against the API. Client-side only; always validate on the backend for access control.

```typescript
session.verify(sessionToken: string): Promise<Result<SessionValidateResponse, TryMellonError>>
```

**Example:**

```typescript
const result = await client.session.verify(sessionToken);
if (result.ok && result.value.valid) {
  console.log('User:', result.value.externalUserId);
}
```

---

### `capabilities()`

Gets WebAuthn support status on the client device.

```typescript
capabilities(): Promise<ClientStatus>
```

**Returns:**

- `Promise<ClientStatus>`: Object with WebAuthn support information.

**Example:**

```typescript
const status = await client.capabilities();

if (status.isPasskeySupported) {
  console.log('Passkeys available');
  if (status.platformAuthenticatorAvailable) {
    console.log('Platform authenticator available');
  }
} else {
  console.log('Use fallback');
}
```

---

### `on()`

Subscribes a handler to SDK events.

```typescript
on(event: TryMellonEvent, handler: EventHandler): () => void
```

**Parameters:**

- `event`: Event type ('start' | 'success' | 'error' | 'cancelled')
- `handler`: Function to run when the event occurs

**Returns:**

- Function to unsubscribe from the event.

**Example:**

```typescript
const unsubscribe = client.on('start', (payload) => {
  console.log('Operation started:', payload.operation);
});

client.on('success', (payload) => {
  console.log('Operation succeeded:', payload.operation);
});

client.on('error', (payload) => {
  console.error('Error:', payload.error);
});

// Unsubscribe
unsubscribe();
```

---

### `version()`

Returns the SDK version.

```typescript
version(): string
```

**Example:**

```typescript
console.log('SDK version:', client.version());
```

---

## OTP Fallback

Email OTP fallback when WebAuthn is not available.

### `otp.send()`

Sends an OTP code to the user's email.

```typescript
otp.send(options: EmailFallbackStartOptions): Promise<Result<void, TryMellonError>>
```

**Parameters:**

- `options.userId` (string, required): External user identifier.
- `options.email` (string, required): Email address to send the OTP code to.

**Example:**

```typescript
const startResult = await client.otp.send({
  userId: 'user_123',
  email: 'user@example.com',
});

if (!startResult.ok) {
  console.error('Error sending OTP:', startResult.error.message);
  return;
}
console.log('OTP code sent by email');
```

**Errors (result.error.code):**

- `INVALID_ARGUMENT`: Invalid `userId` or `email`
- `NETWORK_FAILURE`: Network error

---

### `otp.verify()`

Verifies the OTP code and returns a sessionToken.

```typescript
otp.verify(options: EmailFallbackVerifyOptions): Promise<Result<EmailFallbackVerifyResult, TryMellonError>>
```

**Parameters:**

- `options.userId` (string, required): User ID.
- `options.code` (string, required): OTP code received by email.
- `options.successUrl` (string, optional): Redirect URL after success (must be in allowlist).

**Returns:**

- `Promise<Result<EmailFallbackVerifyResult, TryMellonError>>`: `ok: true` with `value.sessionToken` on success.

**Example:**

```typescript
const verifyResult = await client.otp.verify({
  userId: 'user_123',
  code: '123456',
});

if (!verifyResult.ok) {
  console.error('Invalid code:', verifyResult.error.message);
  return;
}

await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionToken: verifyResult.value.sessionToken }),
});
```

---

## Cross-Device

QR-based cross-device authentication. Desktop initiates; mobile approves.

### `crossDevice.start()`

Creates a cross-device auth session.

```typescript
crossDevice.start(): Promise<Result<CrossDeviceInitResult, TryMellonError>>
```

Returns `{ session_id, qr_url, expires_at, polling_token }`.

### `crossDevice.startRegistration(options?)`

Creates a cross-device registration session.

```typescript
crossDevice.startRegistration(options?: { externalUserId?: string }): Promise<Result<CrossDeviceInitResult, TryMellonError>>
```

### `crossDevice.waitForCompletion(sessionId, signal?, pollingToken?)`

Polls until the mobile device approves. Returns `{ status, session_token }`.

```typescript
crossDevice.waitForCompletion(
  sessionId: string,
  signal?: AbortSignal,
  pollingToken?: string | null
): Promise<Result<CrossDeviceStatusResult, TryMellonError>>
```

### `crossDevice.context(sessionId)`

Gets session context (used on the mobile side).

```typescript
crossDevice.context(sessionId: string): Promise<Result<CrossDeviceContextResult, TryMellonError>>
```

### `crossDevice.approve(sessionId)`

Approves the cross-device session from the mobile device.

```typescript
crossDevice.approve(sessionId: string): Promise<Result<unknown, TryMellonError>>
```

---

## Bridge

Bridge flows for QR-based enrollment and authentication from a second device.

### `bridge.context(sessionId, kind)`

Gets bridge session context.

```typescript
bridge.context(sessionId: string, kind: 'enrollment' | 'auth'): Promise<Result<BridgeContextResponse, TryMellonError>>
```

### `bridge.verifyPresence(sessionId, pin, kind)`

Verifies presence PIN and returns WebAuthn options.

```typescript
bridge.verifyPresence(sessionId: string, pin: string, kind: 'enrollment' | 'auth'): Promise<Result<BridgeChallengeResponse, TryMellonError>>
```

### `bridge.complete(sessionId, options?)`

Completes the bridge ceremony. `options.kind` is required.

```typescript
bridge.complete(sessionId: string, options?: BridgeCompleteOptions): Promise<Result<BridgeResult, TryMellonError>>
```

### `bridge.subscribe(sessionId, options?)`

Polls or listens via SSE until the bridge session reaches a terminal state.

```typescript
bridge.subscribe(sessionId: string, options?: { useSse?: boolean; kind?: 'enrollment' | 'auth'; timeoutMs?: number }): Promise<Result<BridgeStatusSnapshot, TryMellonError>>
```

---

## Invite / Enrollment

### `invite.accept(options)`

Enrolls a device or entity using a single-use ticket.

```typescript
invite.accept(options: EnrollOptions): Promise<Result<EnrollmentResult, TryMellonError>>
```

**Parameters:**

- `options.ticketId` (string, required): Enrollment ticket ID from `POST /v1/enrollment/tickets`.
- `options.signal` (AbortSignal, optional): Cancel the operation.

---

## Passkey Recovery

### `passkey.recover(options)`

Recovers an account using an email OTP and registers a new passkey.

```typescript
passkey.recover(options: RecoverAccountOptions): Promise<Result<RecoverAccountResult, TryMellonError>>
```

**Parameters:**

- `options.externalUserId` (string, required): The external user ID.
- `options.otp` (string, required): The 6-digit OTP from the recovery email.

---

## getContextHash()

Returns the context hash bound to the current browser session (64-char hex, SHA-256).

```typescript
getContextHash(): string
```

---

## Types

### `TryMellonConfig`

```typescript
type TryMellonConfig = {
  appId: string;
  publishableKey: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  logger?: Logger;
  enableTelemetry?: boolean;
  telemetrySender?: TelemetrySender;
  telemetryEndpoint?: string;
  /** When true, signUp() and signIn() return immediately with a sandbox token (no API/WebAuthn). */
  sandbox?: boolean;
  /** Custom token for sandbox mode. If not set, SANDBOX_SESSION_TOKEN is used. */
  sandboxToken?: string;
  /**
   * Explicit origin for API requests. Defaults to window.location.origin.
   * Set this in Node/SSR or when the document origin is not the correct RP ID origin.
   */
  origin?: string;
  /**
   * Custom storage for context hash (e.g. sessionStorage). Must implement getItem/setItem.
   * Defaults to browser sessionStorage or in-memory fallback.
   */
  contextHashStorage?: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
};
```

**Validation:**

- `appId`: Must be a non-empty string
- `publishableKey`: Must be a non-empty string
- `apiBaseUrl`: Must be a valid URL (validated with `new URL()`)
- `timeoutMs`: Must be a finite number between `1000` and `300000` milliseconds
- `maxRetries`: Must be between `0` and `10`
- `retryDelayMs`: Must be between `100` and `10000` milliseconds

**Behavior with `sandbox === true`:** `signUp()` and `signIn()` do not perform HTTP or WebAuthn calls; they return immediately with a successful `Result` and `sessionToken` equal to `config.sandboxToken` or the `SANDBOX_SESSION_TOKEN` constant. `session.verify(sessionToken)` returns a valid mock when the token matches the sandbox token.

### `SANDBOX_SESSION_TOKEN` (exported constant)

Fixed value of the session token the SDK returns in sandbox mode. The client backend can import it to recognize the token in development and create a session without calling TryMellon. **In production the backend must NOT accept this token.**

```typescript
import { SANDBOX_SESSION_TOKEN } from '@trymellon/js';
// Value: 'trymellon_sandbox_session_token_v1'
```

### `RegisterOptions`

```typescript
type RegisterOptions = {
  externalUserId?: string;
  external_user_id?: string; // deprecated, use externalUserId
  authenticatorType?: 'platform' | 'cross-platform';
  successUrl?: string;
  signal?: AbortSignal;
};
```

### `RegisterResult`

```typescript
interface RegisterResult {
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
```

### `AuthenticateOptions`

```typescript
interface AuthenticateOptions {
  externalUserId?: string;
  /** @deprecated Use externalUserId */
  external_user_id?: string;
  hint?: string;
  successUrl?: string;
  signal?: AbortSignal;
  /** Conditional UI mediation for passkey autofill. */
  mediation?: 'optional' | 'conditional' | 'required';
}
```

### `AuthenticateResult`

```typescript
interface AuthenticateResult {
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
  redirectUrl?: string;
}
```

### `ClientStatus`

```typescript
type ClientStatus = {
  isPasskeySupported: boolean;
  platformAuthenticatorAvailable: boolean;
  recommendedFlow: 'passkey' | 'fallback';
};
```

### `SessionValidateResponse`

```typescript
type SessionValidateResponse = {
  valid: boolean;
  userId: string;
  externalUserId: string;
  tenantId: string;
  appId: string;
};
```

### `TryMellonEvent`

```typescript
type TryMellonEvent = 'start' | 'success' | 'error' | 'cancelled';
```

### `EventPayload`

```typescript
type EventPayload =
  | { type: 'start'; operation: 'register' | 'authenticate' | 'enroll'; nonce?: string }
  | {
      type: 'success';
      operation: 'register' | 'authenticate' | 'enroll';
      token: string;
      user?: SuccessEventUserInfo;
      nonce?: string;
    }
  | {
      type: 'error';
      error: TryMellonError;
      operation?: 'register' | 'authenticate' | 'enroll';
      nonce?: string;
    }
  | { type: 'cancelled'; operation: 'register' | 'authenticate'; nonce?: string };
```

> Note: `operation` values in `EventPayload` are internal runtime strings (`'register'`, `'authenticate'`) — they do not change when the public method is renamed.

### `EmailFallbackStartOptions`

```typescript
type EmailFallbackStartOptions = {
  userId: string;
  email: string;
};
```

### `EmailFallbackVerifyOptions`

```typescript
type EmailFallbackVerifyOptions = {
  userId: string;
  code: string;
  successUrl?: string;
};
```

### `EmailFallbackVerifyResult`

```typescript
type EmailFallbackVerifyResult = {
  sessionToken: string;
  redirectUrl?: string;
};
```

---

## Errors

### `TryMellonError`

Main SDK error class.

```typescript
class TryMellonError extends Error {
  readonly code: TryMellonErrorCode;
  readonly details?: unknown;
  readonly isTryMellonError: true;
}
```

### `TryMellonErrorCode`

Available error codes:

- `'NOT_SUPPORTED'`: WebAuthn is not available
- `'USER_CANCELLED'`: User cancelled the operation
- `'PASSKEY_NOT_FOUND'`: No passkey found
- `'SESSION_EXPIRED'`: Session expired
- `'NETWORK_FAILURE'`: Network error
- `'INVALID_ARGUMENT'`: Invalid argument
- `'TIMEOUT'`: Operation expired
- `'ABORTED'`: Operation aborted
- `'ABORT_ERROR'`: Operation aborted by user or timeout
- `'CHALLENGE_MISMATCH'`: Challenge mismatch — link was already used or expired
- `'TICKET_NOT_FOUND'`: Enrollment ticket not found or invalid
- `'TICKET_EXPIRED'`: Enrollment ticket has expired
- `'TICKET_ALREADY_USED'`: Enrollment ticket was already used
- `'PIN_MISMATCH'`: PIN does not match
- `'PIN_LOCKED'`: PIN locked due to too many failed attempts
- `'BRIDGE_SESSION_EXPIRED'`: Bridge session has expired
- `'UNKNOWN_ERROR'`: Unknown error

**Note on retries:** The SDK retries automatically with exponential backoff for HTTP 5xx, HTTP 429, and transient network errors. Not applied to 4xx (except 429), timeout, or validation errors.

### Error Helper Functions

#### `isTryMellonError(error)`

```typescript
isTryMellonError(error: unknown): error is TryMellonError
```

#### `createError(code, message?, details?)`

```typescript
createError(code: TryMellonErrorCode, message?: string, details?: unknown): TryMellonError
```

#### Other helpers

`createNotSupportedError()`, `createUserCancelledError()`, `createNetworkError(cause?)`, `createTimeoutError()`, `createInvalidArgumentError(field, reason)`, `mapWebAuthnError(error)`.

---

## Usage Examples

See [EXAMPLES.md](./EXAMPLES.md) for full integration examples.
