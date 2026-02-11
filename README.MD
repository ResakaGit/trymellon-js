# @trymellon/js

[![npm version](https://img.shields.io/npm/v/@trymellon/js)](https://www.npmjs.com/package/@trymellon/js)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ResakaGit/trymellon-js/ci.yml)](https://github.com/ResakaGit/trymellon-js/actions)
[![Coverage](https://img.shields.io/codecov/c/github/ResakaGit/trymellon-js)](https://codecov.io/gh/ResakaGit/trymellon-js)

Official **TryMellon** SDK for integrating **passwordless authentication** with **Passkeys / WebAuthn** in web applications.

This SDK fully abstracts WebAuthn and lets you authenticate users without passwords, returning a result your backend can use to create your own session.

---

## What does this SDK do?

* ✅ Handles the full Passkeys flow in the browser
* ✅ Communicates directly with the TryMellon API
* ✅ Returns a `session_token` your backend can verify
* ✅ Handles Base64URL ↔ ArrayBuffer conversion automatically
* ✅ Event system for better UX (spinners, analytics)
* ✅ Email (OTP) fallback when WebAuthn is not available
* ✅ Automatic retries with exponential backoff
* ✅ Thorough validation of inputs and API responses

---

## What does it NOT do?

* ❌ Does not create user sessions (your backend does)
* ❌ Does not replace your auth system
* ❌ Does not store end users
* ❌ Does not expose raw WebAuthn APIs
* ❌ Does not manage cookies or local storage

---

## Installation

```bash
npm install @trymellon/js
```

---

## Requirements

* Browser with WebAuthn support (Chrome, Safari, Firefox, Edge)
* HTTPS (required except on `localhost`)
* A TryMellon Application with the correct origin configured

---

## Quickstart (5 minutes)

```bash
npm install @trymellon/js
```

```typescript
import { TryMellon } from '@trymellon/js'

const client = new TryMellon({
  appId: 'app_live_xxxx',   // From your TryMellon dashboard
  publishableKey: 'key_live_xxxx', // Application API key
})

// Register passkey (camelCase recommended in options)
const registerResult = await client.register({ externalUserId: 'user_123' })
if (registerResult.ok) {
  console.log('Session token:', registerResult.value.session_token)
}

// Authenticate
const authResult = await client.authenticate({ externalUserId: 'user_123' })
if (authResult.ok) {
  console.log('Session token:', authResult.value.session_token)
}
```

---

## Initialization

```typescript
import { TryMellon } from '@trymellon/js'

const client = new TryMellon({
  appId: 'app_live_xxxx',     // Required: application (tenant) identifier
  publishableKey: 'key_live_xxxx',   // Required: API key for authentication
  apiBaseUrl: 'https://api.trymellonauth.com', // optional
  timeoutMs: 30000,          // optional, default: 30000
  maxRetries: 3,             // optional
  retryDelayMs: 1000,        // optional
})
```

**Configuration options:**

- `appId` (required): Your application identifier in TryMellon. Sent in header `X-App-Id`.
- `publishableKey` (required): Public API key for authentication. Sent in header `Authorization: Bearer <publishableKey>`.
- `apiBaseUrl` (optional): API base URL. Default: `'https://api.trymellonauth.com'`
- `timeoutMs` (optional): HTTP request timeout. Range: `1000` - `300000`. Default: `30000`
- `maxRetries` (optional): Retries for network errors. Range: `0` - `10`. Default: `3`
- `retryDelayMs` (optional): Delay between retries. Range: `100` - `10000`. Default: `1000`
- `logger` (optional): `Logger` implementation for request correlation (e.g. `requestId` in logs and `error.details`).

**Register/authenticate options:** Both `externalUserId` (camelCase, recommended) and `external_user_id` (snake_case) are accepted. The SDK normalizes to snake_case for the API.

---

## Basic usage

### Check WebAuthn support

```typescript
if (TryMellon.isSupported()) {
  // WebAuthn available, use passkeys
} else {
  // Use email fallback
}
```

### Passkey registration

```typescript
const result = await client.register({
  externalUserId: 'user_123'  // recommended: camelCase. external_user_id also accepted
})

if (!result.ok) {
  console.error(result.error.code, result.error.message)
  return
}

// Send session_token to your backend
await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: result.value.session_token
  })
})
```

**Registration options:**

- `externalUserId` or `external_user_id` (one required): Unique user ID in your system. camelCase recommended.
- `authenticatorType` (optional): `'platform'` (device) or `'cross-platform'` (USB/NFC)
- `signal` (optional): `AbortSignal` to cancel the operation

**Response:**

```typescript
{
  success: true,
  credential_id: string,
  status: string,
  session_token: string,
  user: {
    user_id: string,
    external_user_id: string,
    email?: string,
    metadata?: Record<string, unknown>
  }
}
```

### Passkey authentication

```typescript
const result = await client.authenticate({
  external_user_id: 'user_123',
  hint: 'user@example.com'  // optional, improves UX
})

// Send to backend
await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: result.session_token
  })
})
```

**Authentication options:**

- `externalUserId` or `external_user_id` (one required): User ID. camelCase recommended.
- `hint` (optional): Hint for the passkey (e.g. email)
- `signal` (optional): AbortSignal to cancel

**Response:**

```typescript
{
  authenticated: boolean,
  session_token: string,
  user: {
    user_id: string,
    external_user_id: string,
    email?: string,
    metadata?: Record<string, unknown>
  },
  signals: {
    userVerification?: boolean,
    backupEligible?: boolean,
    backupStatus?: boolean
  }
}
```

### Validate session

```typescript
const validationResult = await client.validateSession('session_token_123')

if (validationResult.ok && validationResult.value.valid) {
  const v = validationResult.value
  console.log('User:', v.external_user_id, 'Tenant:', v.tenant_id, 'App:', v.app_id)
}
```

**Response:**

```typescript
{
  valid: boolean,
  user_id: string,
  external_user_id: string,
  tenant_id: string,
  app_id: string
}
```

### Get client status

```typescript
const status = await client.getStatus()

if (status.isPasskeySupported) {
  console.log('Passkeys available')
  if (status.platformAuthenticatorAvailable) {
    console.log('Platform authenticator available')
  }
} else {
  console.log('Use fallback')
}
```

**Response:**

```typescript
{
  isPasskeySupported: boolean,
  platformAuthenticatorAvailable: boolean,
  recommendedFlow: 'passkey' | 'fallback'
}
```

---

## Event system

The SDK emits events for better UX and analytics:

```typescript
// Subscribe to events
client.on('start', (payload) => {
  console.log('Operation started:', payload.operation)  // 'register' | 'authenticate'
  showSpinner()
})

client.on('success', (payload) => {
  console.log('Operation succeeded:', payload.operation)
  hideSpinner()
  showSuccessMessage()
})

client.on('error', (payload) => {
  console.error('Error:', payload.error)
  hideSpinner()
  showError(payload.error.message)
})

// Unsubscribe
const unsubscribe = client.on('start', handler)
unsubscribe()
```

**Available events:**

- `'start'`: Operation started (`register` or `authenticate`)
- `'success'`: Operation completed successfully
- `'error'`: Error during the operation
- `'cancelled'`: Operation cancelled (future)

---

## Email fallback (OTP)

When WebAuthn is not available, you can use the email fallback. All methods return `Result<T, TryMellonError>`:

```typescript
// 1. Send OTP code by email
const startResult = await client.fallback.email.start({ userId: 'user_123' })
if (!startResult.ok) { console.error(startResult.error); return }

// 2. Ask user for the code
const code = prompt('Enter the code sent by email:')

// 3. Verify code
const verifyResult = await client.fallback.email.verify({
  userId: 'user_123',
  code: code
})
if (!verifyResult.ok) { console.error(verifyResult.error); return }

// 4. Send sessionToken to backend
await fetch('/api/login', {
  method: 'POST',
  body: JSON.stringify({ sessionToken: verifyResult.value.sessionToken })
})
```

**Full flow with fallback:**

```typescript
async function authenticateUser(userId: string) {
  if (!TryMellon.isSupported()) {
    return await authenticateWithEmail(userId)
  }

  const authResult = await client.authenticate({ externalUserId: userId })
  if (authResult.ok) return authResult
  if (authResult.error.code === 'PASSKEY_NOT_FOUND' || authResult.error.code === 'NOT_SUPPORTED') {
    return await authenticateWithEmail(userId)
  }
  return authResult
}

async function authenticateWithEmail(userId: string) {
  const startRes = await client.fallback.email.start({ userId })
  if (!startRes.ok) return startRes
  const code = prompt('Enter the code sent by email:')
  return await client.fallback.email.verify({ userId, code })
}
```

---

## Result type

The SDK exports the `Result<T, E>` type and the `ok(value)` and `err(error)` helpers for typing and building results (useful in tests or utilities):

```typescript
import { Result, ok, err } from '@trymellon/js'

const result: Result<{ id: string }, Error> = ok({ id: '123' })
if (result.ok) console.log(result.value.id)
```

---

## Error handling

The SDK returns `Result<T, TryMellonError>`: check `result.ok` and on error use `result.error.code`:

```typescript
import { isTryMellonError } from '@trymellon/js'

const result = await client.authenticate({ externalUserId: 'user_123' })

if (!result.ok) {
  const error = result.error
  switch (error.code) {
    case 'USER_CANCELLED':
      console.log('User cancelled the operation')
      break
    case 'NOT_SUPPORTED':
      await client.fallback.email.start({ userId: 'user_123' })
      break
    case 'PASSKEY_NOT_FOUND':
      await client.register({ externalUserId: 'user_123' })
      break
    case 'NETWORK_FAILURE':
      console.error('Network error:', error.details)
      break
    case 'TIMEOUT':
      console.error('Operation timed out')
      break
    default:
      console.error('Error:', error.code, error.message)
  }
  return
}

// result.value contains session_token, user, etc.
```

**Error codes:**

| Code | Description |
|------|-------------|
| `NOT_SUPPORTED` | WebAuthn not available in this environment |
| `USER_CANCELLED` | User cancelled the operation |
| `PASSKEY_NOT_FOUND` | No passkey found for the user |
| `SESSION_EXPIRED` | Session expired |
| `NETWORK_FAILURE` | Network error (with automatic retries) |
| `INVALID_ARGUMENT` | Invalid argument in config or method call |
| `TIMEOUT` | Operation timed out |
| `ABORTED` | Operation aborted via AbortSignal |
| `UNKNOWN_ERROR` | Unknown error |

---

## Cancelling operations

You can cancel operations with `AbortSignal`:

```typescript
const controller = new AbortController()

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10000)

const result = await client.register({
  externalUserId: 'user_123',
  signal: controller.signal
})
if (!result.ok && result.error.code === 'ABORTED') {
  console.log('Operation cancelled')
}
```

---

## Client backend

Your backend must validate the `session_token` with TryMellon and create its own session:

```typescript
// POST /api/login
POST https://api.trymellonauth.com/v1/sessions/validate
Authorization: Bearer {session_token}

// TryMellon response
{
  valid: true,
  user_id: string,
  external_user_id: string,
  tenant_id: string,
  app_id: string
}
```

Then create your own session in your system.

---

## Security

* ✅ Native browser WebAuthn (no client-side cryptography)
* ✅ Short-lived challenges generated by TryMellon
* ✅ Replay attack protection (automatic counters)
* ✅ SDK never handles secrets or private keys
* ✅ Thorough validation of inputs and API responses
* ✅ Robust error handling with typed errors
* ✅ Guaranteed cleanup of resources (timeouts, signals)
* ✅ Automatic origin validation

---

## Compatibility

| Browser | WebAuthn support | Passkeys support |
|---------|-------------------|-------------------|
| Chrome  | ✅                 | ✅                |
| Safari  | ✅                 | ✅                |
| Firefox | ✅                 | ✅                |
| Edge    | ✅                 | ✅                |

**Requirements:**
- HTTPS (required except on `localhost`)
- Modern browser with WebAuthn support

---

## Features

* ✅ **Zero runtime dependencies** – No external runtime dependencies
* ✅ **TypeScript first** – Full types and strict mode
* ✅ **Framework agnostic** – Works with React, Vue, Angular, Vanilla JS, etc.
* ✅ **Automatic retries** – Exponential backoff for transient errors
* ✅ **Thorough validation** – Input and API response validation
* ✅ **Robust error handling** – Typed, descriptive errors
* ✅ **Events for UX** – Event system for spinners and analytics
* ✅ **Email fallback** – OTP by email when WebAuthn is unavailable
* ✅ **Operation cancellation** – AbortSignal support
* ✅ **Automatic detection** – Origin and WebAuthn support detected automatically

---

## Troubleshooting

### WebAuthn not available

If `TryMellon.isSupported()` returns `false`:

- Ensure you are on HTTPS (required except on `localhost`)
- Ensure your browser supports WebAuthn (Chrome, Safari, Firefox, Edge)
- Use the email fallback: `client.fallback.email.start({ userId })`

### User cancelled the operation

If you get `USER_CANCELLED`:

- This is normal when the user dismisses the prompt
- Not a critical error; inform the user and optionally retry

### Passkey not found

If you get `PASSKEY_NOT_FOUND`:

- The user has no registered passkey
- Offer to register: `client.register()`
- Or use email fallback: `client.fallback.email.start()`

### Network errors

If you get `NETWORK_FAILURE`:

- Check your internet connection
- Ensure `apiBaseUrl` is a valid URL
- The SDK retries automatically with exponential backoff for:
  - HTTP 5xx (server errors)
  - HTTP 429 (rate limiting)
  - Transient network errors
- You can configure `maxRetries` and `retryDelayMs` to tune behavior

---

## Security: CSP and SRI

### Content-Security-Policy (CSP)

If you load the SDK via `<script>` or enforce a content security policy, include in your `Content-Security-Policy`:

- **script-src:** The script origin (e.g. `https://cdn.trymellon.com` or `'self'`) and `'unsafe-inline'` only if you use inline scripts; not needed for a bundled SDK.
- **connect-src:** The TryMellon API origin (e.g. `https://api.trymellonauth.com`) so register/authenticate requests are not blocked.

Minimal example (adjust origins to your environment):

```
Content-Security-Policy: script-src 'self'; connect-src 'self' https://api.trymellonauth.com;
```

### SRI (Subresource Integrity)

To load `index.global.js` with integrity, generate the SRI hash after building:

```bash
openssl dgst -sha384 -binary dist/index.global.js | openssl base64 -A
```

Use the value in the `integrity` attribute:

```html
<script
  src="https://cdn.example.com/trymellon/index.global.js"
  integrity="sha384-<generated-hash>"
  crossorigin="anonymous"
></script>
```

Optional: the build can generate `dist/sri.json` with the hash (see `package.json` script: `"sri": "node ..."`).

---

## Telemetry (opt-in)

The SDK can send anonymous telemetry (event + latency, no user identifiers) when `enableTelemetry: true` in config. Used to improve the product. Minimal payload: `{ event: 'register'|'authenticate', latencyMs: number, ok: true }`. You can inject a custom `telemetrySender` to send to your own endpoint or disable with `enableTelemetry: false` (default).

---

## Additional documentation

- [API Reference](./documentation/API.md) – Full API reference
- [Usage examples](./documentation/EXAMPLES.md) – Practical integration examples
- [Contributing](./documentation/CONTRIBUTING.md) – How to contribute (including running tests, coverage, Angular, E2E, audit and workflow lint locally)
- [CI standards (fintech)](./documentation/CI-FINTECH-STANDARDS.md) – Coverage, security, E2E and workflow validation criteria

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the change history.

---

## License

MIT

---

## Philosophy

> Implementing Passkeys should take minutes, not weeks.
> The backend remains yours.
