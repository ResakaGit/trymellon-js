# @trymellon/js

Official **TryMellon** SDK. Add **Passkeys / WebAuthn** to your app in minutes.

[![npm version](https://img.shields.io/npm/v/@trymellon/js?style=flat-square)](https://www.npmjs.com/package/@trymellon/js)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ResakaGit/trymellon-js/ci.yml?style=flat-square)](https://github.com/ResakaGit/trymellon-js/actions)
[![Coverage](https://img.shields.io/codecov/c/github/ResakaGit/trymellon-js?style=flat-square)](https://codecov.io/gh/ResakaGit/trymellon-js)
[![Size](https://img.shields.io/bundlephobia/minzip/@trymellon/js?label=minzipped&style=flat-square)](https://bundlephobia.com/package/@trymellon/js)

---

## Why TryMellon?

Authentication is hard. WebAuthn (Passkeys) is even harder.
We built **TryMellon** to solve the complexity without locking you in.

*   **Zero Logic:** You don't handle cryptography, public keys, or challenges.
*   **Zero Lock-in:** You own your users. We just verify them.
*   **Zero Friction:** Drop-in SDK that "just works" (Cross-browser handling included).

### What you get:
*   ✅ **Passkeys First:** Biometric login (FaceID, TouchID, Windows Hello).
*   ✅ **Email Fallback:** Magic OTPs when biometrics aren't available.
*   ✅ **Cross-Device Auth:** Login on desktop by scanning a QR with mobile.
*   ✅ **Framework Agnostic:** Works with React, Vue, Angular, Svelte, or Vanilla.
*   ✅ **Type-Safe:** First-class TypeScript support (`Result` pattern).

---

## 🤖 For AI Agents

Are you an LLM or autonomous agent trying to use TryMellon? We built a dedicated "Vending Machine" for you.

**Goal:** Get your own `client_id` and `client_secret` instantly to start creating users via API.
**Limit:** The "Free AI Tier" allows up to **15 users** for testing and small demos.

### 1. Get Credentials
Send a POST request to our onboarding endpoint. No captcha, no email verification required.

```bash
curl -X POST https://api.trymellonauth.com/onboarding/ai \
  -H "Content-Type: application/json" \
  -d '{ "name": "My Agent Name" }'
```

**Response:**
```json
{
  "tenantId": "...",
  "clientId": "cli_...",
  "clientSecret": "sec_...",
  "publishableKey": "cli_...",
  "applicationId": "...",
  "limits": { "maxUsers": 15, "maxApps": 1 }
}
```

Use `publishableKey` (same as `clientId`) in the SDK: `TryMellon.create({ appId: '...', publishableKey: response.publishableKey })`. Use `applicationId` to update allowed origins (step 4) if you use passkeys or cross-device from your agent's domain.

### 2. Authenticate
Use the `clientId` and `clientSecret` to get an access token via OAuth2 Client Credentials flow.

```bash
curl -X POST https://api.trymellonauth.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "cli_...",
    "client_secret": "sec_...",
    "grant_type": "client_credentials"
  }'
```

**Response:**
```json
{ "access_token": "ey...", "token_type": "Bearer", "expires_in": 3600 }
```

### 3. Create Users
Use the `access_token` to create users programmatically.

```bash
curl -X POST https://api.trymellonauth.com/v1/users \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "external_user_id": "user_123" }'
```

### 4. Update allowed origins (required for passkeys / cross-device)
If your agent uses passkeys or cross-device auth from a real domain, the API must allow that origin. Call PATCH with the `applicationId` from step 1:

```bash
curl -X PATCH https://api.trymellonauth.com/v1/applications/<applicationId> \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "allowed_origins": ["https://your-agent-domain.com"] }'
```

Without this, requests from your agent's origin will get 404 when resolving the application. You can keep `https://agent.local` in the list for local testing.

---

## Installation

```bash
npm install @trymellon/js
```

That's it. No peer dependencies. No bloat.

---

## Requirements

* Node 18+, browsers, and Edge runtimes (Cloudflare Workers, Vercel Edge); no Node-specific APIs (Buffer/crypto module).
* Browser with WebAuthn support (Chrome, Safari, Firefox, Edge)
* HTTPS (required except on `localhost`)
* A TryMellon Application with the correct origin configured

---

## Where to get credentials

You need two values to initialize the SDK. Get both from the [TryMellon dashboard](https://trymellon-landing.pages.dev/dashboard) after creating an application and adding your app's origin.

| SDK parameter    | What it is              | Where to find it                          |
|------------------|-------------------------|-------------------------------------------|
| `appId`          | **Application ID** (UUID) | Dashboard → Your app → **App ID**        |
| `publishableKey` | **Client ID** (starts with `cli_`) | Dashboard → Your app → **Client ID** (same value is your publishable key) |

The API identifies your app by `publishableKey` (sent as `Authorization: Bearer <publishableKey>`) and the request **Origin**. Ensure your app's origin is allowed in the dashboard for that application.

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

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' }) // Get these from Dashboard → Your app → App ID and Client ID
if (!clientResult.ok) throw clientResult.error
const client = clientResult.value

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

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' }) // Get these from Dashboard → Your app → App ID and Client ID
if (!clientResult.ok) throw clientResult.error
const client = clientResult.value
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
      appId: 'your-app-id-uuid',
      publishableKey: 'cli_xxxx',
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

// 1. Initialize safely (Factory Pattern)
const clientResult = TryMellon.create({
  appId: 'your-app-id-uuid',   // App ID (UUID) from Dashboard → Your app
  publishableKey: 'cli_xxxx',  // Client ID from Dashboard → Your app
})

if (!clientResult.ok) {
  console.error('Invalid config:', clientResult.error.message);
  throw clientResult.error;
}

const client = clientResult.value;

// 2. Register passkey (camelCase recommended in options)
const registerResult = await client.register({ externalUserId: 'user_123' })
if (registerResult.ok) {
  console.log('Session token:', registerResult.value.sessionToken)
}

// 3. Authenticate
const authResult = await client.authenticate({ externalUserId: 'user_123' })
if (authResult.ok) {
  console.log('Session token:', authResult.value.sessionToken)
}
```

---

## Initialization

Prefer **TryMellon.create()** so invalid config returns a Result instead of throwing:

```typescript
import { TryMellon } from '@trymellon/js'

const clientResult = TryMellon.create({
  appId: 'your-app-id-uuid',
  publishableKey: 'cli_xxxx',
  apiBaseUrl: 'https://api.trymellonauth.com', // optional
  timeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
})

if (!clientResult.ok) {
  console.error('Invalid config:', clientResult.error.message)
  throw clientResult.error
}
const client = clientResult.value
```

> [!TIP]
> For static, validated config you can use `new TryMellon(config)`; it throws on invalid config. Prefer `TryMellon.create()` for user- or env-driven config so you can handle errors without try/catch.

**Configuration options:**

- `appId` (required): Your Application ID (UUID). Get it from Dashboard → Your app → App ID. Sent in header `X-App-Id`. The API identifies your app by `publishableKey` and Origin; `appId` is sent for consistency and future use.
- `publishableKey` (required): Your Client ID (value starting with `cli_`). Get it from Dashboard → Your app → Client ID. Sent in header `Authorization: Bearer <publishableKey>`. The API uses this plus the request Origin to resolve your application.
- `apiBaseUrl` (optional): API base URL. Default: `'https://api.trymellonauth.com'`
- `timeoutMs` (optional): HTTP request timeout. Range: `1000` - `300000`. Default: `30000`
- `maxRetries` (optional): Retries for network errors. Range: `0` - `10`. Default: `3`
- `retryDelayMs` (optional): Delay between retries. Range: `100` - `10000`. Default: `1000`
- `logger` (optional): `Logger` implementation for request correlation (e.g. `requestId` in logs and `error.details`).

**Register/authenticate options:** Both `externalUserId` (camelCase, recommended) and `external_user_id` (snake_case) are accepted. The SDK normalizes to snake_case for the API.

---

## Sandbox / development mode

For local development or testing the integration flow without a real backend or WebAuthn (e.g. no passkey hardware), enable **sandbox mode**. With `sandbox: true`, `register()` and `authenticate()` return immediately with a fixed session token and a demo user—no API or WebAuthn calls.

**Configuration:**

- `sandbox` (optional): Set to `true` to enable sandbox mode.
- `sandboxToken` (optional): Custom token to return. If not set, the exported constant `SANDBOX_SESSION_TOKEN` is used.

**Exported constant:** Import `SANDBOX_SESSION_TOKEN` from `@trymellon/js` so your backend can recognize the sandbox token in development. **Your backend MUST NOT accept this token in production**—only in development. See [Backend validation](https://trymellon.com/docs/backend-validation) for the hook contract.

**Example:**

```typescript
import { TryMellon, SANDBOX_SESSION_TOKEN } from '@trymellon/js'

const clientResult = TryMellon.create({
  sandbox: true,
  appId: 'sandbox',
  publishableKey: 'sandbox',
})
if (!clientResult.ok) throw clientResult.error
const client = clientResult.value

const result = await client.authenticate({ externalUserId: 'dev_user_1' })
if (result.ok) {
  // result.value.sessionToken === SANDBOX_SESSION_TOKEN
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  })
}
```

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
const startResult = await client.fallback.email.start({
  userId: 'user_123',
  email: 'user@example.com'
})
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
    return await authenticateWithEmail(userId, userId)
  }

  const authResult = await client.authenticate({ externalUserId: userId })
  if (authResult.ok) return authResult
  if (authResult.error.code === 'PASSKEY_NOT_FOUND' || authResult.error.code === 'NOT_SUPPORTED') {
    return await authenticateWithEmail(userId, userId)
  }
  return authResult
}

async function authenticateWithEmail(userId: string, email: string) {
  const startRes = await client.fallback.email.start({ userId, email })
  if (!startRes.ok) return startRes
  const code = prompt('Enter the code sent by email:')
  return await client.fallback.email.verify({ userId, code })
}
```

---

## Cross-Device Authentication (QR Login)

Enable users to sign in on a desktop device by scanning a QR code with their mobile phone (where their passkey is stored).

**About `qr_url` and the mobile app:** The API returns `qr_url` in the form `{baseUrl}/mobile-auth?session_id={session_id}` (where `session_id` is a UUID). Your **mobile web app** must be deployed and its URL/origin **allowed in the TryMellon dashboard** for that application. The user scans the QR, opens that URL (which includes the `session_id`), and your mobile app must call `approve(session_id)` to complete the flow. If the mobile app’s origin is not allowed, the API will reject the request.

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
      await client.fallback.email.start({
        userId: 'user_123',
        email: 'user@example.com'
      })
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
| `CHALLENGE_MISMATCH` | Cross-device: link already used or expired; ask user to scan QR again from computer |
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
- Use the email fallback: `client.fallback.email.start({ userId, email })`

### User cancelled the operation

If you get `USER_CANCELLED`:

- This is normal when the user dismisses the prompt
- Not a critical error; inform the user and optionally retry

### Passkey not found

If you get `PASSKEY_NOT_FOUND`:

- The user has no registered passkey
- Offer to register: `client.register()`
- Or use email fallback: `client.fallback.email.start({ userId, email })`

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

## Contact & landing

- **Landing:** [https://trymellon-landing.pages.dev/](https://trymellon-landing.pages.dev/)
- **Contact:** [siliangrove@gmail.com](mailto:siliangrove@gmail.com) — Sales inquiries by email only.

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

## Release (maintainers)

Releases are published to npm automatically by **semantic-release** in CI. The version is derived from commit messages (Conventional Commits), not from `package.json`.

- **Triggers a release:** `fix:` (patch), `feat:` (minor), `BREAKING CHANGE:` / `feat!:` (major).
- **Does not trigger a release:** `chore:`, `refactor:`, `docs:`, `style:`, `test:`.

If changes must be published, ensure at least one commit since the last tag uses `fix:` or `feat:`. See monorepo [docs/ai_context_leePrimero.md](../docs/ai_context_leePrimero.md) §4.D.

---

## License

MIT

---

## Philosophy

> Implementing Passkeys should take minutes, not weeks.
> The backend remains yours.
