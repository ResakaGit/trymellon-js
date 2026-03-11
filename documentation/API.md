# API Reference

Complete reference for the public API of the `@trymellon/js` SDK.

---

## TryMellon Class

Main SDK class for passwordless authentication with Passkeys/WebAuthn.

### Constructor

```typescript
new TryMellon(config: TryMellonConfig)
```

**Parameters:**

- `config.appId` (string, required): Application ID (UUID) for your app. Sent in the `X-App-Id` header. Get it from Dashboard → Your app → App ID. The API identifies your app by `publishableKey` and Origin.
- `config.publishableKey` (string, required): Client ID (value starting with `cli_`). Sent in `Authorization: Bearer <publishableKey>`. Get it from Dashboard → Your app → Client ID.
- `config.apiBaseUrl` (string, optional): API base URL. Default: `'https://api.trymellonauth.com'`
  - Must be a valid URL
- `config.timeoutMs` (number, optional): Timeout in milliseconds for HTTP requests. Default: `30000`
  - Valid range: `1000` - `300000` (1 second - 5 minutes)
- `config.maxRetries` (number, optional): Maximum number of retries for failed HTTP requests. Default: `3`
  - Valid range: `0` - `10`
  - Only 5xx and transient network errors are retried
- `config.retryDelayMs` (number, optional): Initial delay in milliseconds between retries. Default: `1000`
  - Valid range: `100` - `10000` (100ms - 10 seconds)
  - Delay increases exponentially on each retry

**Example:**

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({
  appId: 'your-app-id-uuid', // Dashboard → Your app → App ID
  publishableKey: 'cli_xxxx', // Dashboard → Your app → Client ID
  apiBaseUrl: 'https://api.trymellonauth.com',
  timeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
});
```

**Errors:**

- Throws `TryMellonError` with code `'INVALID_ARGUMENT'` if:
  - `appId` is empty or not a string
  - `publishableKey` is empty or not a string
  - `apiBaseUrl` is not a valid URL
  - `timeoutMs` is out of valid range (or not finite)
  - `maxRetries` is out of valid range
  - `retryDelayMs` is out of valid range

---

## Static Methods

### `TryMellon.create(config)`

Validates the configuration and creates an instance without throwing. Returns `Result<TryMellon, TryMellonError>`.

```typescript
static create(config: TryMellonConfig): Result<TryMellon, TryMellonError>
```

**Example:**

```typescript
const result = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (result.ok) {
  const client = result.value;
  // use client
} else {
  console.error(result.error.code, result.error.message);
}
```

**Recommended** for handling configuration errors without try/catch. The constructor is still available but throws if config is invalid.

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

### `register()`

Registers a new passkey for a user.

```typescript
register(options: RegisterOptions): Promise<Result<RegisterResult, TryMellonError>>
```

**Parameters:**

- `options.externalUserId` (string, optional): External user ID. Usually required for same-device `register()`; optional for `auth.crossDevice.initRegistration()` (omit for anonymous registration; backend generates an id). Also accepts `external_user_id` (deprecated)
- `options.authenticatorType` ('platform' | 'cross-platform', optional): Preferred authenticator type
- `options.signal` (AbortSignal, optional): Signal to cancel the operation

**Returns:**

- `Promise<Result<RegisterResult, TryMellonError>>`: `ok: true` with `value` (success, sessionToken, user, etc.) or `ok: false` with `error` (TryMellonError)

**Example:**

```typescript
const result = await client.register({
  externalUserId: 'user_123',
  authenticatorType: 'platform',
});

if (result.ok) {
  if (result.value.sessionToken) {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.value.sessionToken }),
    });
  }
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

### `authenticate()`

Authenticates a user with their passkey.

```typescript
authenticate(options: AuthenticateOptions): Promise<Result<AuthenticateResult, TryMellonError>>
```

**Parameters:**

- `options.externalUserId` (string, optional): External user ID. Also accepts `external_user_id` (deprecated)
- `options.hint` (string, optional): Hint to help the user select the correct passkey (e.g. email)
- `options.signal` (AbortSignal, optional): Signal to cancel the operation
- `options.mediation` ('optional' | 'conditional' | 'required', optional): For conditional UI / autofill

**Returns:**

- `Promise<Result<AuthenticateResult, TryMellonError>>`: `ok: true` with `value` (sessionToken, user, etc.) or `ok: false` with `error`

**Example:**

```typescript
const result = await client.authenticate({
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

### `getStatus()`

Gets WebAuthn support status on the client.

```typescript
getStatus(): Promise<ClientStatus>
```

**Returns:**

- `Promise<ClientStatus>`: Object with WebAuthn support information

**Example:**

```typescript
const status = await client.getStatus();

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

- Function to unsubscribe from the event

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

**Returns:**

- SDK version as string

**Example:**

```typescript
console.log('SDK version:', client.version());
```

---

## Email Fallback

### `fallback.email.start()`

Starts the email fallback flow by sending an OTP code.

```typescript
fallback.email.start(options: EmailFallbackStartOptions): Promise<void>
```

**Parameters:**

- `options.userId` (string, required): External user identifier
- `options.email` (string, required): Email address to send the OTP code to

**Example:**

```typescript
try {
  await client.fallback.email.start({
    userId: 'user_123',
    email: 'user@example.com',
  });
  console.log('OTP code sent by email');
} catch (error) {
  console.error('Error sending OTP:', error);
}
```

**Errors:**

- `INVALID_ARGUMENT`: Invalid `userId` or `email`
- `NETWORK_FAILURE`: Network error

---

### `fallback.email.verify()`

Verifies the OTP code and returns a sessionToken.

```typescript
fallback.email.verify(options: EmailFallbackVerifyOptions): Promise<EmailFallbackVerifyResult>
```

**Parameters:**

- `options.userId` (string, required): User ID
- `options.code` (string, required): OTP code received by email

**Returns:**

- `Promise<EmailFallbackVerifyResult>`: Object with `sessionToken`

**Example:**

```typescript
try {
  const result = await client.fallback.email.verify({
    userId: 'user_123',
    code: '123456',
  });

  // Send sessionToken to backend
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.sessionToken }),
  });
} catch (error) {
  console.error('Invalid code:', error);
}
```

**Errors:**

- `INVALID_ARGUMENT`: Invalid `userId` or `code`
- `NETWORK_FAILURE`: Network error

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
  /** When true, register() and authenticate() return immediately with a sandbox token (no API/WebAuthn). */
  sandbox?: boolean;
  /** Custom token for sandbox mode. If not set, SANDBOX_SESSION_TOKEN is used. */
  sandboxToken?: string;
};
```

**Validation:**

- `appId`: Must be a non-empty string
- `publishableKey`: Must be a non-empty string
- `apiBaseUrl`: Must be a valid URL (validated with `new URL()`)
- `timeoutMs`: Must be a finite number between `1000` and `300000` milliseconds
- `maxRetries`: Must be between `0` and `10`
- `retryDelayMs`: Must be between `100` and `10000` milliseconds

**Behavior with `sandbox === true`:** `register()` and `authenticate()` do not perform HTTP or WebAuthn calls; they return immediately with a successful `Result` and `sessionToken` equal to `config.sandboxToken` or the `SANDBOX_SESSION_TOKEN` constant. `validateSession(sessionToken)` returns a valid mock when the token is the sandbox token.

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
  signal?: AbortSignal;
};
```

### `RegisterResult`

```typescript
type RegisterResult = {
  success: true;
  sessionToken?: string;
};
```

**Note:** `sessionToken` is optional and is only present when TryMellon Backend provides it during registration. If present, you can use it immediately to authenticate the user without calling `authenticate()`.

### `AuthenticateOptions`

```typescript
type AuthenticateOptions = {
  userId?: string;
  hint?: string;
  signal?: AbortSignal;
};
```

### `AuthenticateResult`

```typescript
type AuthenticateResult = {
  sessionToken: string;
  user?: {
    userId: string;
    externalUserId: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
};
```

### `ClientStatus`

```typescript
type ClientStatus = {
  isPasskeySupported: boolean;
  platformAuthenticatorAvailable: boolean;
  recommendedFlow: 'passkey' | 'fallback';
};
```

### `TryMellonEvent`

```typescript
type TryMellonEvent = 'start' | 'success' | 'error' | 'cancelled';
```

### `EventPayload`

```typescript
type EventPayload =
  | { type: 'start'; operation: 'register' | 'authenticate' }
  | { type: 'success'; operation: 'register' | 'authenticate' }
  | { type: 'error'; error: TryMellonError }
  | { type: 'cancelled'; operation: 'register' | 'authenticate' };
```

### `EventHandler`

```typescript
type EventHandler = (payload: EventPayload) => void;
```

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
};
```

### `EmailFallbackVerifyResult`

```typescript
type EmailFallbackVerifyResult = {
  sessionToken: string;
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

**Properties:**

- `code`: Error code
- `details`: Additional error details (optional)
- `isTryMellonError`: Always `true` for type identification

**Example:**

```typescript
try {
  await client.authenticate({ userId: 'user_123' });
} catch (error) {
  if (error instanceof TryMellonError) {
    console.error('Error code:', error.code);
    console.error('Details:', error.details);
  }
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
- `'UNKNOWN_ERROR'`: Unknown error

**Note on retries:**

The SDK implements automatic retries with exponential backoff for:

- HTTP 5xx errors (server errors)
- HTTP 429 (rate limiting)
- Transient network errors (TypeError, connection errors)

Retries are NOT applied to:

- HTTP 4xx errors (client errors, except 429)
- Timeout errors (thrown immediately)
- Validation errors

### Error Helper Functions

#### `isTryMellonError()`

Type guard to check if an error is `TryMellonError`.

```typescript
isTryMellonError(error: unknown): error is TryMellonError
```

**Example:**

```typescript
try {
  await client.authenticate({ userId: 'user_123' });
} catch (error) {
  if (isTryMellonError(error)) {
    console.error('TryMellon error:', error.code);
  } else {
    console.error('Unknown error:', error);
  }
}
```

#### `createError()`

Creates a `TryMellonError` with a specific code.

```typescript
createError(code: TryMellonErrorCode, message?: string, details?: unknown): TryMellonError
```

#### `createNotSupportedError()`

Creates a `NOT_SUPPORTED` error.

```typescript
createNotSupportedError(): TryMellonError
```

#### `createUserCancelledError()`

Creates a `USER_CANCELLED` error.

```typescript
createUserCancelledError(): TryMellonError
```

#### `createNetworkError()`

Creates a `NETWORK_FAILURE` error.

```typescript
createNetworkError(cause?: Error): TryMellonError
```

#### `createTimeoutError()`

Creates a `TIMEOUT` error.

```typescript
createTimeoutError(): TryMellonError
```

#### `createInvalidArgumentError()`

Creates an `INVALID_ARGUMENT` error.

```typescript
createInvalidArgumentError(field: string, reason: string): TryMellonError
```

#### `mapWebAuthnError()`

Maps native WebAuthn errors to `TryMellonError`.

```typescript
mapWebAuthnError(error: unknown): TryMellonError
```

---

## Usage Examples

See [EXAMPLES.md](./EXAMPLES.md) for full integration examples.
