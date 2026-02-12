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

## Framework support & entry points

The SDK is **framework-agnostic**. Use the main entry for Vanilla JS, Svelte, or any environment; use framework-specific entry points for React, Vue, and Angular to get hooks/services and tree-shaking.

| Entry point | Use case | Exports |
|-------------|----------|---------|
| `@trymellon/js` | Vanilla JS, Svelte, Node, or any bundler | `TryMellon`, `TryMellon.isSupported()`, `Result`, `ok`, `err`, `isTryMellonError`, types |
| `@trymellon/js/react` | React 18+ | `TryMellonProvider`, `useTryMellon`, `useRegister`, `useAuthenticate` |
| `@trymellon/js/vue` | Vue 3 (Composition API) | `provideTryMellon`, `useTryMellon`, `useRegister`, `useAuthenticate`, `TryMellonKey` |
| `@trymellon/js/angular` | Angular (standalone or NgModule) | `TryMellonService`, `provideTryMellonConfig`, `TRYMELLON_CONFIG` |

**Runtime:** ESM and CJS supported. For UMD/script tag use `@trymellon/js/umd` or the built `dist/index.global.js` (exposes `window.TryMellon`).

### React

```bash
npm install @trymellon/js
```

```tsx
import { TryMellon } from '@trymellon/js'
import { TryMellonProvider, useTryMellon, useRegister, useAuthenticate } from '@trymellon/js/react'

const client = new TryMellon({ appId: 'app_live_xxxx', publishableKey: 'key_live_xxxx' })

function App() {
  return (
    <TryMellonProvider client={client}>
      <LoginForm />
    </TryMellonProvider>
  )
}

function LoginForm() {
  const { execute: register, loading } = useRegister()
  const { execute: authenticate } = useAuthenticate()

  const onRegister = () => register({ externalUserId: 'user_123' })
  const onLogin = () => authenticate({ externalUserId: 'user_123' })

  return (
    <>
      <button onClick={onRegister} disabled={loading}>Register passkey</button>
      <button onClick={onLogin} disabled={loading}>Sign in</button>
    </>
  )
}
```

- **Requirements:** React 18+. Create a `TryMellon` instance (e.g. at app root), wrap your app (or auth subtree) with `TryMellonProvider` passing `client={client}`; then use `useTryMellon()`, `useRegister()`, and `useAuthenticate()` in children.

### Vue

```bash
npm install @trymellon/js
```

```vue
<script setup lang="ts">
import { TryMellon } from '@trymellon/js'
import { provideTryMellon, useTryMellon, useRegister, useAuthenticate } from '@trymellon/js/vue'

const client = new TryMellon({ appId: 'app_live_xxxx', publishableKey: 'key_live_xxxx' })
provideTryMellon(client)

const { execute: register, loading } = useRegister()
const { execute: authenticate } = useAuthenticate()

const onRegister = () => register({ externalUserId: 'user_123' })
const onLogin = () => authenticate({ externalUserId: 'user_123' })
</script>

<template>
  <button @click="onRegister" :disabled="loading">Register passkey</button>
  <button @click="onLogin" :disabled="loading">Sign in</button>
</template>
```

- **Requirements:** Vue 3 with Composition API. Create a `TryMellon` instance and call `provideTryMellon(client)` once (e.g. in root or a parent); then use `useTryMellon()`, `useRegister()`, and `useAuthenticate()` in components.

### Angular

```bash
npm install @trymellon/js
```

In your app config (e.g. `app.config.ts` or root module):

```typescript
import { provideTryMellonConfig } from '@trymellon/js/angular'

export const appConfig = {
  providers: [
    provideTryMellonConfig({
      appId: 'app_live_xxxx',
      publishableKey: 'key_live_xxxx',
    }),
  ],
}
```

In a component or service:

```typescript
import { TryMellonService } from '@trymellon/js/angular'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tryMellon = inject(TryMellonService)

  register(userId: string) {
    return this.tryMellon.client.register({ externalUserId: userId })
  }

  authenticate(userId: string) {
    return this.tryMellon.client.authenticate({ externalUserId: userId })
  }
}
```

- **Requirements:** Angular (standalone or NgModule). Add `provideTryMellonConfig(config)` to your app `providers`; inject `TryMellonService` and use `.client` for `register()`, `authenticate()`, and other methods.

### Vanilla JavaScript

Use the main entry and instantiate `TryMellon` directly (see Quickstart below). Works in any ES module or CJS environment. For script-tag usage, use the UMD build: `@trymellon/js/umd` or `dist/index.global.js`; the global is `window.TryMellon`.

### Svelte (and other frameworks)

No dedicated adapter. Use the **main entry** `@trymellon/js`: create one `TryMellon` instance (e.g. in a module or store) and call `register()` / `authenticate()` from your components. Same API as Quickstart; no provider required.

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
  console.log('Session token:', registerResult.value.sessionToken)
}

// Authenticate
const authResult = await client.authenticate({ externalUserId: 'user_123' })
if (authResult.ok) {
  console.log('Session token:', authResult.value.sessionToken)
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
    sessionToken: result.value.sessionToken
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
  credentialId: string,
  status: string,
  sessionToken: string,
  user: {
    userId: string,
    externalUserId: string,
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
    sessionToken: result.value.sessionToken
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
  sessionToken: string,
  user: {
    userId: string,
    externalUserId: string,
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

## Cross-Device Authentication (QR Login)

Enable users to sign in on a desktop device by scanning a QR code with their mobile phone (where their passkey is stored).

### 1. Desktop: Initialize and Show QR

```typescript
// Initialize session
const initResult = await client.auth.crossDevice.init()
if (!initResult.ok) { console.error(initResult.error); return }

const { session_id, qr_url } = initResult.value

// Show QR code with `qr_url`
renderQrCode(qr_url)

// Start polling for approval
// Use AbortController to cancel if user leaves the page
const controller = new AbortController()

const pollResult = await client.auth.crossDevice.waitForSession(
  session_id, 
  controller.signal
)

if (!pollResult.ok) {
  if (pollResult.error.code === 'TIMEOUT') {
    showError('QR code expired')
  }
  return
}

// Success!
console.log('Session token:', pollResult.value.sessionToken)
```

### 2. Mobile: Approve Login

When the user scans the QR code, your mobile web app should handle the URL (containing `session_id`) and call `approve`:

```typescript
// Extract session_id from URL query params
const sessionId = getSessionIdFromUrl()

// Trigger WebAuthn flow on mobile
const approveResult = await client.auth.crossDevice.approve(sessionId)

if (approveResult.ok) {
  showSuccess('Process complete! Check your desktop.')
} else {
  showError('Failed to approve login: ' + approveResult.error.message)
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

* ✅ **Zero runtime dependencies** – No external runtime dependencies in the core bundle
* ✅ **TypeScript first** – Full types and strict mode; all entry points typed
* ✅ **Framework support** – Dedicated entry points: `@trymellon/js` (core), `@trymellon/js/react`, `@trymellon/js/vue`, `@trymellon/js/angular`; Vanilla and Svelte use core
* ✅ **Automatic retries** – Exponential backoff for transient errors
* ✅ **Thorough validation** – Input and API response validation
* ✅ **Robust error handling** – Typed, descriptive errors
* ✅ **Events for UX** – Event system for spinners and analytics
* ✅ **Email fallback** – OTP by email when WebAuthn is unavailable
* ✅ **Operation cancellation** – AbortSignal support
* ✅ **Cross-Device Auth** – QR Login flow support (Desktop to Mobile)
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

## Specification summary (for project ingestion)

Projects integrating this SDK should document in their README:

- **SDK:** `@trymellon/js` (and optionally `/react`, `/vue`, `/angular` if using those entry points)
- **Node:** >= 18 (per `engines`)
- **Browsers:** WebAuthn-capable (Chrome, Safari, Firefox, Edge); HTTPS required except `localhost`
- **Config:** `appId` and `publishableKey` from TryMellon dashboard; optional `apiBaseUrl` for self-hosted API
- **Backend:** Must validate `session_token` via TryMellon API (`GET /v1/sessions/validate`) and create own session

Framework-specific: React uses `TryMellonProvider` + hooks; Vue uses `provideTryMellon` + composables; Angular uses `provideTryMellonConfig` + `TryMellonService`; Vanilla/Svelte use core `TryMellon` only.

---

## Additional documentation

- [API Reference](./documentation/API.md) – Full API reference
- [Usage examples](./documentation/EXAMPLES.md) – Practical integration examples (React, Vue, Vanilla, events, fallback)
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
