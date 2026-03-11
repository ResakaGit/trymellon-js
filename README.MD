# @trymellon/js

Official **TryMellon** SDK. Add **Passkeys / WebAuthn** to your app in minutes.

[![npm version](https://img.shields.io/npm/v/@trymellon/js?style=flat-square)](https://www.npmjs.com/package/@trymellon/js)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ResakaGit/trymellon-js/ci.yml?style=flat-square)](https://github.com/ResakaGit/trymellon-js/actions)
[![Coverage](https://img.shields.io/codecov/c/github/ResakaGit/trymellon-js?style=flat-square)](https://codecov.io/gh/ResakaGit/trymellon-js)
[![Size](https://img.shields.io/bundlephobia/minzip/@trymellon/js?label=minzipped&style=flat-square)](https://bundlephobia.com/package/@trymellon/js)

---

## Table of Contents

- [Why TryMellon?](#why-trymellon)
- [Installation](#installation)
- [Requirements](#requirements)
- [Credentials](#where-to-get-credentials)
- [Quickstart (5 minutes)](#quickstart-5-minutes)
- [Framework Support](#framework-support--entry-points)
  - [React](#react)
  - [Vue](#vue)
  - [Angular](#angular)
  - [Vanilla JS / Svelte](#vanilla-javascript)
- [Web Components](#web-components)
- [Initialization](#initialization)
- [Sandbox Mode](#sandbox--development-mode)
- [Basic Usage](#basic-usage)
  - [Check WebAuthn Support](#check-webauthn-support)
  - [Passkey Registration](#passkey-registration)
  - [Passkey Authentication](#passkey-authentication)
  - [Conditional UI (Passkey Autofill)](#conditional-ui-passkey-autofill)
  - [Validate Session](#validate-session)
  - [Get Client Status](#get-client-status)
- [Event System](#event-system)
- [Email Fallback (OTP)](#email-fallback-otp)
- [Cross-Device Authentication (QR Login)](#cross-device-authentication-qr-login)
- [Account Recovery](#account-recovery)
- [Programmatic Onboarding](#programmatic-onboarding)
- [Result Type](#result-type)
- [Error Handling](#error-handling)
- [Cancelling Operations](#cancelling-operations)
- [Logging](#logging)
- [Client Backend](#client-backend)
- [Security](#security)
- [CSP and SRI](#security-csp-and-sri)
- [Compatibility](#compatibility)
- [Telemetry (opt-in)](#telemetry-opt-in)
- [For AI Agents](#for-ai-agents)
- [Additional Documentation](#additional-documentation)
- [License](#license)

---

## Why TryMellon?

Authentication is hard. WebAuthn (Passkeys) is even harder.
We built **TryMellon** to solve the complexity without locking you in.

*   **Zero Dependencies:** No runtime dependencies. No bloat.
*   **Zero Lock-in:** You own your users. We just verify them.
*   **Zero Friction:** Drop-in SDK that "just works" (cross-browser handling included).

**What you get:**

*   Passkeys first -- biometric login (FaceID, TouchID, Windows Hello)
*   Email fallback -- magic OTPs when biometrics are not available
*   Cross-device auth -- login on desktop by scanning a QR with mobile
*   Account recovery -- OTP-based credential reset with new passkey registration
*   Web Components -- drop-in `<trymellon-auth>` and `<trymellon-auth-modal>` elements
*   Framework adapters -- React hooks, Vue composables, Angular service
*   Type-safe -- first-class TypeScript with `Result` pattern, branded types, strict mode
*   Sandbox mode -- test the full integration flow without a backend or WebAuthn hardware

---

## Installation

```bash
npm install @trymellon/js
```

No peer dependencies. No bloat.

---

## Requirements

* Node 18+ / browsers / Edge runtimes (Cloudflare Workers, Vercel Edge)
* Browser with WebAuthn support (Chrome, Safari, Firefox, Edge)
* HTTPS (required except on `localhost`)
* A TryMellon Application with the correct origin configured

**Isomorphic / Edge-safe:** The runtime bundle uses only `globalThis.crypto`, `btoa`/`atob`, and `ArrayBuffer`/`Uint8Array` -- no Node `Buffer` or `node:crypto`. Safe to import in SSR on Edge. Build-time scripts (e.g. `scripts/sri.js`) may use Node APIs; they do not affect the published bundle.

---

## Where to get credentials

You need two values to initialize the SDK. Get both from the [TryMellon dashboard](https://trymellon-landing.pages.dev/dashboard) after creating an application and adding your app’s origin.

| SDK parameter    | What it is              | Where to find it                          |
|------------------|-------------------------|-------------------------------------------|
| `appId`          | **Application ID** (UUID) | Dashboard > Your app > **App ID**        |
| `publishableKey` | **Client ID** (starts with `cli_`) | Dashboard > Your app > **Client ID** (same value is your publishable key) |

The API identifies your app by `publishableKey` (sent as `Authorization: Bearer <publishableKey>`) and the request **Origin**. Ensure your app’s origin is allowed in the dashboard for that application.

---

## Quickstart (5 minutes)

```typescript
import { TryMellon } from ‘@trymellon/js’

// 1. Initialize (Factory Pattern -- returns Result, never throws)
const clientResult = TryMellon.create({
  appId: ‘your-app-id-uuid’,   // App ID (UUID) from Dashboard
  publishableKey: ‘cli_xxxx’,  // Client ID from Dashboard
})

if (!clientResult.ok) {
  console.error(‘Invalid config:’, clientResult.error.message)
  throw clientResult.error
}

const client = clientResult.value

// 2. Register a passkey
const registerResult = await client.register({ externalUserId: ‘user_123’ })
if (registerResult.ok) {
  console.log(‘Session token:’, registerResult.value.sessionToken)
}

// 3. Authenticate
const authResult = await client.authenticate({ externalUserId: ‘user_123’ })
if (authResult.ok) {
  console.log(‘Session token:’, authResult.value.sessionToken)
}
```

---

## Framework support & entry points

The SDK is **framework-agnostic**. Use the main entry for Vanilla JS, Svelte, or any environment; use framework-specific entry points for React, Vue, and Angular to get idiomatic hooks/services and tree-shaking.

| Entry point | Use case | Key exports |
|-------------|----------|-------------|
| `@trymellon/js` | Vanilla JS, Svelte, Node, any bundler | `TryMellon`, `TryMellon.isSupported()`, `Result`, `ok`, `err`, `isTryMellonError`, types |
| `@trymellon/js/react` | React 18+ | `TryMellonProvider`, `useTryMellon`, `useRegister`, `useAuthenticate` |
| `@trymellon/js/vue` | Vue 3 (Composition API) | `provideTryMellon`, `useTryMellon`, `useRegister`, `useAuthenticate`, `TryMellonKey` |
| `@trymellon/js/angular` | Angular (standalone or NgModule) | `TryMellonService`, `provideTryMellonConfig`, `TRYMELLON_CONFIG` |
| `@trymellon/js/ui` | Web Components | `TryMellonAuthElement`, `TryMellonAuthModalElement` |

**Runtime:** ESM and CJS supported. For UMD/script tag use `@trymellon/js/umd` or the built `dist/index.global.js` (exposes `window.TryMellon`).

### React

```tsx
import { TryMellon } from ‘@trymellon/js’
import { TryMellonProvider, useRegister, useAuthenticate } from ‘@trymellon/js/react’

const clientResult = TryMellon.create({
  appId: ‘your-app-id-uuid’,
  publishableKey: ‘cli_xxxx’,
})
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

  return (
    <>
      <button onClick={() => register({ externalUserId: ‘user_123’ })} disabled={loading}>
        Register passkey
      </button>
      <button onClick={() => authenticate({ externalUserId: ‘user_123’ })} disabled={loading}>
        Sign in
      </button>
    </>
  )
}
```

**Requirements:** React 18+. Wrap your app (or auth subtree) with `TryMellonProvider` passing `client={client}`; then use `useTryMellon()`, `useRegister()`, and `useAuthenticate()` in children.

### Vue

```vue
<script setup lang="ts">
import { TryMellon } from ‘@trymellon/js’
import { provideTryMellon, useRegister, useAuthenticate } from ‘@trymellon/js/vue’

const clientResult = TryMellon.create({
  appId: ‘your-app-id-uuid’,
  publishableKey: ‘cli_xxxx’,
})
if (!clientResult.ok) throw clientResult.error
provideTryMellon(clientResult.value)

const { execute: register, loading } = useRegister()
const { execute: authenticate } = useAuthenticate()
</script>

<template>
  <button @click="register({ externalUserId: ‘user_123’ })" :disabled="loading">
    Register passkey
  </button>
  <button @click="authenticate({ externalUserId: ‘user_123’ })" :disabled="loading">
    Sign in
  </button>
</template>
```

**Requirements:** Vue 3 with Composition API. Call `provideTryMellon(client)` once in a parent component; then use `useTryMellon()`, `useRegister()`, and `useAuthenticate()` in descendants.

### Angular

In your app config (e.g. `app.config.ts` or root module):

```typescript
import { provideTryMellonConfig } from ‘@trymellon/js/angular’

export const appConfig = {
  providers: [
    provideTryMellonConfig({
      appId: ‘your-app-id-uuid’,
      publishableKey: ‘cli_xxxx’,
    }),
  ],
}
```

In a component or service:

```typescript
import { inject, Injectable } from ‘@angular/core’
import { TryMellonService } from ‘@trymellon/js/angular’

@Injectable({ providedIn: ‘root’ })
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

**Requirements:** Angular (standalone or NgModule). Add `provideTryMellonConfig(config)` to your app `providers`; inject `TryMellonService` and use `.client` for all SDK methods.

### Vanilla JavaScript

Use the main entry and instantiate `TryMellon` directly (see [Quickstart](#quickstart-5-minutes)). Works in any ES module or CJS environment. For script-tag usage, use the UMD build: `@trymellon/js/umd` or `dist/index.global.js` (exposes `window.TryMellon`).

### Svelte (and other frameworks)

No dedicated adapter needed. Use the **main entry** `@trymellon/js`: create one `TryMellon` instance (e.g. in a module or store) and call `register()` / `authenticate()` from your components. Same API as the Quickstart.

---

## Web Components

The SDK ships two custom elements via the `@trymellon/js/ui` entry point. Import the entry once to auto-register both elements. **Tag canónico:** `<trymellon-auth>` (botón + modal por defecto). **Escape hatch:** `trigger-only="true"` — solo emite `mellon:open-request`; el host monta/abre el modal. Ver [Web Components](./documentation/WEB-COMPONENTS.md).

```typescript
import ‘@trymellon/js/ui’
```

### `<trymellon-auth>` (tag canónico)

Inline authentication widget: **one tag** for both button and modal. Handles environment detection, passkey flows, and fallback states internally.

- **Option A (default):** Button + internal modal. Click emits `mellon:open-request` and opens the modal inside the same WC.
- **Option B (escape hatch):** Set `trigger-only="true"`. The WC only renders the button and emits `mellon:open-request` on click; it does **not** create or mount a modal. The host must listen for the event and open a separate `<trymellon-auth-modal>`. See [Web Components](./documentation/WEB-COMPONENTS.md).

```html
<trymellon-auth
  app-id="your-app-id-uuid"
  publishable-key="cli_xxxx"
  mode="auto"
  external-user-id="user_123"
  theme="light"
></trymellon-auth>
```

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `app-id` | `string` | Application ID (UUID) |
| `publishable-key` | `string` | Client ID (`cli_xxxx`) |
| `mode` | `’auto’` \| `’login’` \| `’register’` | Auth mode. `auto` defaults to login. |
| `external-user-id` | `string` | User identifier for the auth flow |
| `theme` | `’light’` \| `’dark’` | Visual theme |
| `action` | `'open-modal'` \| `'direct-auth'` | Default: botón + modal. `direct-auth`: ceremonia directa sin modal. |
| `trigger-only` | `'true'` \| `'false'` | Si `true`, solo emite `mellon:open-request`; el host monta/abre `<trymellon-auth-modal>`. |

### `<trymellon-auth-modal>`

Modal-based authentication component with tab switching, onboarding support, and open/close lifecycle.

```html
<trymellon-auth-modal
  app-id="your-app-id-uuid"
  publishable-key="cli_xxxx"
  open="false"
  tab="login"
  theme="light"
></trymellon-auth-modal>
```

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `app-id` | `string` | Application ID (UUID) |
| `publishable-key` | `string` | Client ID (`cli_xxxx`) |
| `open` | `’true’` \| `’false’` | Controls modal visibility |
| `tab` | `’login’` \| `’register’` | Active tab |
| `tab-labels` | `string` | Custom tab labels, comma-separated (e.g. `"Sign Up,Sign In"`) |
| `mode` | `’modal’` \| `’inline’` | Display mode |
| `theme` | `’light’` \| `’dark’` | Visual theme |
| `session-id` | `string` | Onboarding session ID |
| `onboarding-url` | `string` | Onboarding URL for external completion |
| `is-mobile-override` | `’true’` \| `’false’` | Override mobile detection |
| `fallback-type` | `’email’` \| `’qr’` | Preferred fallback channel |

**JavaScript API:**

```typescript
const modal = document.querySelector(‘trymellon-auth-modal’)
modal.open = true
modal.tab = ‘register’
modal.theme = ‘dark’
modal.reset() // Reset to idle state
```

**Custom Events:**

| Event | Detail | Description |
|-------|--------|-------------|
| `mellon:open` | `{}` | Modal opened |
| `mellon:close` | `{ reason: ‘success’ \| ‘cancel’ \| ‘error’ \| ‘user’ }` | Modal closed |
| `mellon:start` | `{ operation }` | Auth operation started |
| `mellon:success` | `{ token, user }` | Auth succeeded |
| `mellon:error` | `{ error }` | Auth error |
| `mellon:cancelled` | `{}` | Auth cancelled |
| `mellon:fallback` | `{ operation? }` | Fallback triggered |
| `mellon:tab-change` | `{ tab }` | Tab switched |

---

## Initialization

Prefer **`TryMellon.create()`** so invalid config returns a Result instead of throwing:

```typescript
import { TryMellon } from ‘@trymellon/js’

const clientResult = TryMellon.create({
  appId: ‘your-app-id-uuid’,
  publishableKey: ‘cli_xxxx’,
  apiBaseUrl: ‘https://api.trymellonauth.com’, // optional
  timeoutMs: 30000,     // 1000 - 300000
  maxRetries: 3,         // 0 - 10
  retryDelayMs: 1000,    // 100 - 10000
})

if (!clientResult.ok) {
  console.error(‘Invalid config:’, clientResult.error.message)
  throw clientResult.error
}
const client = clientResult.value
```

> **Tip:** For static, validated config you can use `new TryMellon(config)` (throws on invalid config). Prefer `TryMellon.create()` for user- or env-driven config so you can handle errors without try/catch.

**Configuration options:**

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `appId` | Yes | -- | Application ID (UUID). Sent as `X-App-Id` header. |
| `publishableKey` | Yes | -- | Client ID (`cli_xxxx`). Sent as `Authorization: Bearer`. |
| `apiBaseUrl` | No | `’https://api.trymellonauth.com’` | API base URL. |
| `timeoutMs` | No | `30000` | HTTP request timeout in ms (`1000`-`300000`). |
| `maxRetries` | No | `3` | Retries for network/5xx errors (`0`-`10`). |
| `retryDelayMs` | No | `1000` | Initial delay between retries in ms (`100`-`10000`). Exponential backoff. |
| `logger` | No | -- | `Logger` implementation for request correlation. |
| `sandbox` | No | `false` | Enable sandbox mode (no API/WebAuthn calls). |
| `sandboxToken` | No | `SANDBOX_SESSION_TOKEN` | Custom token for sandbox mode. |
| `origin` | No | `window.location.origin` | Override origin header. Useful for SSR or Node environments. |
| `enableTelemetry` | No | `false` | Send anonymous telemetry (event + latency). |

**Register/authenticate options:** Both `externalUserId` (camelCase, recommended) and `external_user_id` (snake_case, deprecated) are accepted. The SDK normalizes to snake_case for the API.

---

## Sandbox / development mode

For local development or testing the integration flow without a real backend or WebAuthn hardware, enable **sandbox mode**. With `sandbox: true`, `register()` and `authenticate()` return immediately with a fixed session token and a demo user -- no API or WebAuthn calls.

```typescript
import { TryMellon, SANDBOX_SESSION_TOKEN } from ‘@trymellon/js’

const clientResult = TryMellon.create({
  sandbox: true,
  appId: ‘sandbox’,
  publishableKey: ‘sandbox’,
})
if (!clientResult.ok) throw clientResult.error
const client = clientResult.value

const result = await client.authenticate({ externalUserId: ‘dev_user_1’ })
if (result.ok) {
  // result.value.sessionToken === SANDBOX_SESSION_TOKEN
  await fetch(‘/api/login’, {
    method: ‘POST’,
    headers: { ‘Content-Type’: ‘application/json’ },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  })
}
```

**Exported constant:** Import `SANDBOX_SESSION_TOKEN` from `@trymellon/js` so your backend can recognize the sandbox token in development. **Your backend MUST NOT accept this token in production.**

`validateSession()` also supports sandbox mode -- if called with the sandbox token, it returns a mock valid response.

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
  externalUserId: ‘user_123’,
  authenticatorType: ‘platform’,  // optional: ‘platform’ or ‘cross-platform’
  successUrl: ‘https://app.example.com/welcome’, // optional: redirect URL
  signal: controller.signal,      // optional: AbortSignal
})

if (!result.ok) {
  console.error(result.error.code, result.error.message)
  return
}

// result.value contains:
// {
//   success: true,
//   credentialId: string,
//   status: string,
//   sessionToken: string,
//   user: { userId, externalUserId, email?, metadata? },
//   redirectUrl?: string  -- present when successUrl was allowed
// }

await fetch(‘/api/login’, {
  method: ‘POST’,
  headers: { ‘Content-Type’: ‘application/json’ },
  body: JSON.stringify({ sessionToken: result.value.sessionToken }),
})
```

### Passkey authentication

```typescript
const result = await client.authenticate({
  externalUserId: ‘user_123’,
  hint: ‘user@example.com’,    // optional: improves passkey selection UX
  successUrl: ‘https://app.example.com/dashboard’, // optional
  signal: controller.signal,   // optional
})

if (result.ok) {
  // result.value contains:
  // {
  //   authenticated: boolean,
  //   sessionToken: string,
  //   user: { userId, externalUserId, email?, metadata? },
  //   signals?: { userVerification?, backupEligible?, backupStatus? },
  //   redirectUrl?: string
  // }

  await fetch(‘/api/login’, {
    method: ‘POST’,
    headers: { ‘Content-Type’: ‘application/json’ },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  })
}
```

### Conditional UI (passkey autofill)

Use the `mediation` option to integrate with the browser’s passkey autofill (conditional UI). This lets users authenticate by selecting a passkey from the browser’s autofill prompt on an input field.

```typescript
const result = await client.authenticate({
  mediation: ‘conditional’,
})

if (result.ok) {
  console.log(‘Authenticated via autofill:’, result.value.sessionToken)
}
```

Supported `mediation` values: `’optional’` (default), `’conditional’` (autofill), `’required’`.

### Validate session

```typescript
const validationResult = await client.validateSession(‘session_token_123’)

if (validationResult.ok && validationResult.value.valid) {
  const v = validationResult.value
  console.log(‘User:’, v.external_user_id, ‘Tenant:’, v.tenant_id, ‘App:’, v.app_id)
}
```

**Response shape:**

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
  console.log(‘Passkeys available’)
  if (status.platformAuthenticatorAvailable) {
    console.log(‘Platform authenticator available’)
  }
} else {
  console.log(‘Use fallback:’, status.recommendedFlow)
}
```

### SDK version

```typescript
console.log(‘SDK version:’, client.version()) // e.g. "1.7.6"
```

---

## Event system

The SDK emits lifecycle events for UX feedback and analytics:

```typescript
client.on(‘start’, (payload) => {
  console.log(‘Operation started:’, payload.operation)  // ‘register’ | ‘authenticate’
  showSpinner()
})

client.on(‘success’, (payload) => {
  // payload.token -- session token
  // payload.user  -- user info (userId, externalUserId, email)
  hideSpinner()
  showSuccessMessage()
})

client.on(‘error’, (payload) => {
  console.error(‘Error:’, payload.error)
  hideSpinner()
  showError(payload.error.message)
})

client.on(‘cancelled’, (payload) => {
  console.log(‘Cancelled:’, payload.operation)
  hideSpinner()
})

// Unsubscribe
const unsubscribe = client.on(‘start’, handler)
unsubscribe()
```

**Available events:**

| Event | Payload | Description |
|-------|---------|-------------|
| `’start’` | `{ type, operation, nonce? }` | Operation started |
| `’success’` | `{ type, operation, token, user?, nonce? }` | Operation completed successfully |
| `’error’` | `{ type, error, operation?, nonce? }` | Error during operation |
| `’cancelled’` | `{ type, operation, nonce? }` | Operation cancelled by user or abort |

---

## Email fallback (OTP)

When WebAuthn is not available, you can use the email fallback. All methods return `Result<T, TryMellonError>`:

```typescript
// 1. Send OTP code by email
const startResult = await client.fallback.email.start({
  userId: ‘user_123’,
  email: ‘user@example.com’,
})
if (!startResult.ok) { console.error(startResult.error); return }

// 2. Ask user for the code
const code = prompt(‘Enter the code sent by email:’)

// 3. Verify code
const verifyResult = await client.fallback.email.verify({
  userId: ‘user_123’,
  code: code,
  successUrl: ‘https://app.example.com/dashboard’, // optional
})
if (!verifyResult.ok) { console.error(verifyResult.error); return }

// verifyResult.value: { sessionToken: string, redirectUrl?: string }
await fetch(‘/api/login’, {
  method: ‘POST’,
  body: JSON.stringify({ sessionToken: verifyResult.value.sessionToken }),
})
```

**Full flow with automatic fallback:**

```typescript
async function authenticateUser(userId: string, email: string) {
  if (!TryMellon.isSupported()) {
    return await authenticateWithEmail(userId, email)
  }

  const authResult = await client.authenticate({ externalUserId: userId })
  if (authResult.ok) return authResult

  if (authResult.error.code === ‘PASSKEY_NOT_FOUND’ || authResult.error.code === ‘NOT_SUPPORTED’) {
    return await authenticateWithEmail(userId, email)
  }
  return authResult
}

async function authenticateWithEmail(userId: string, email: string) {
  const startRes = await client.fallback.email.start({ userId, email })
  if (!startRes.ok) return startRes
  const code = prompt(‘Enter the code sent by email:’)
  return await client.fallback.email.verify({ userId, code: code! })
}
```

---

## Cross-Device Authentication (QR Login)

Enable users to sign in or register on a desktop device by scanning a QR code with their mobile phone (where their passkey is stored or will be created).

**About `qr_url` and the mobile app:** The API returns `qr_url` in the form `{baseUrl}/mobile-auth?session_id={session_id}`. Your **mobile web app** must be deployed and its URL/origin **allowed in the TryMellon dashboard**. The user scans the QR, opens that URL, and your mobile app calls `approve(session_id)` to complete the flow.

### Desktop: Authentication via QR

```typescript
// Initialize session
const initResult = await client.auth.crossDevice.init()
if (!initResult.ok) { console.error(initResult.error); return }

const { session_id, qr_url, polling_token } = initResult.value

// Show QR code with qr_url (use any QR library)
renderQrCode(qr_url)

// Start polling for approval
const controller = new AbortController()
const pollResult = await client.auth.crossDevice.waitForSession(
  session_id,
  controller.signal,
  polling_token,  // pass the polling token for secure polling
)

if (!pollResult.ok) {
  if (pollResult.error.code === ‘TIMEOUT’) showError(‘QR code expired’)
  return
}

console.log(‘Session token:’, pollResult.value.session_token)
```

### Desktop: Registration via QR

For anonymous registration you can omit `externalUserId` in `initRegistration()`; the backend will generate an id.

```typescript
const initResult = await client.auth.crossDevice.initRegistration({
  externalUserId: ‘new_user_123’,
})
if (!initResult.ok) { console.error(initResult.error); return }

const { session_id, qr_url, polling_token } = initResult.value
renderQrCode(qr_url)

const pollResult = await client.auth.crossDevice.waitForSession(
  session_id,
  controller.signal,
  polling_token,
)
```

### Mobile: Approve

When the user scans the QR code, your mobile web app handles the URL and calls `approve`. The SDK auto-detects whether the session is for authentication or registration and runs the appropriate WebAuthn ceremony.

```typescript
const sessionId = getSessionIdFromUrl()

const approveResult = await client.auth.crossDevice.approve(sessionId)

if (approveResult.ok) {
  showSuccess(‘Done! Check your desktop.’)
} else {
  showError(‘Failed: ‘ + approveResult.error.message)
}
```

### Get Session Context (advanced)

```typescript
const contextResult = await client.auth.crossDevice.getContext(sessionId)
if (contextResult.ok) {
  // contextResult.value.type === ‘auth’ | ‘registration’
  // contextResult.value.options -- WebAuthn challenge options
  // contextResult.value.application_name -- app name for display
}
```

---

## Account Recovery

When a user loses access to their passkey (new device, cleared browser data), they can recover their account via email OTP and register a new passkey in a single operation.

```typescript
const result = await client.auth.recoverAccount({
  externalUserId: ‘user_123’,
  otp: ‘123456’, // 6-digit code sent to user’s email
})

if (result.ok) {
  // result.value contains:
  // {
  //   success: true,
  //   credentialId: string,
  //   status: string,
  //   sessionToken: string,
  //   user: { userId, externalUserId, email?, metadata? },
  //   redirectUrl?: string
  // }
  console.log(‘Account recovered, new passkey registered’)
  console.log(‘Session token:’, result.value.sessionToken)
}
```

The flow: your backend sends a recovery OTP to the user’s email. The user enters the OTP. The SDK verifies the OTP with the API, triggers a WebAuthn registration ceremony for the new passkey, and returns a session token on success.

---

## Programmatic Onboarding

The SDK provides a programmatic onboarding flow for new tenants/users. This handles the complete lifecycle: start session, poll for status, register passkey via WebAuthn, and complete onboarding.

```typescript
const result = await client.onboarding.startFlow({
  user_role: ‘maintainer’, // ‘maintainer’ or ‘app_user’
  company_name: ‘Acme Corp’, // optional
})

if (result.ok) {
  // result.value contains:
  // {
  //   session_id: string,
  //   status: ‘completed’,
  //   user_id: string,
  //   tenant_id: string,
  //   session_token: string
  // }
  console.log(‘Onboarding complete:’, result.value.tenant_id)
}
```

If the onboarding requires the user to complete passkey registration externally (e.g. in a browser when running from a non-WebAuthn environment), the SDK returns a `NOT_SUPPORTED` error with the `onboarding_url` in `error.details` for the user to complete the flow.

---

## Result type

Every SDK method returns `Result<T, TryMellonError>` -- a discriminated union that eliminates try/catch:

```typescript
import { Result, ok, err } from ‘@trymellon/js’

// Check results
const result = await client.register({ externalUserId: ‘user_123’ })
if (result.ok) {
  console.log(result.value.sessionToken) // T
} else {
  console.error(result.error.code)       // TryMellonError
}

// Build results (useful in tests or utilities)
const success: Result<{ id: string }, Error> = ok({ id: ‘123’ })
const failure: Result<never, Error> = err(new Error(‘fail’))
```

---

## Error handling

Check `result.ok` and use `result.error.code` for structured error handling:

```typescript
import { isTryMellonError } from ‘@trymellon/js’

const result = await client.authenticate({ externalUserId: ‘user_123’ })

if (!result.ok) {
  switch (result.error.code) {
    case ‘USER_CANCELLED’:
      console.log(‘User dismissed the prompt’)
      break
    case ‘NOT_SUPPORTED’:
      await client.fallback.email.start({ userId: ‘user_123’, email: ‘user@example.com’ })
      break
    case ‘PASSKEY_NOT_FOUND’:
      await client.register({ externalUserId: ‘user_123’ })
      break
    case ‘NETWORK_FAILURE’:
      console.error(‘Network error:’, result.error.details)
      break
    case ‘TIMEOUT’:
      console.error(‘Operation timed out’)
      break
    case ‘CHALLENGE_MISMATCH’:
      console.error(‘QR link expired or already used -- scan again’)
      break
    default:
      console.error(‘Error:’, result.error.code, result.error.message)
  }
  return
}
```

**Error codes:**

| Code | Description |
|------|-------------|
| `NOT_SUPPORTED` | WebAuthn not available in this environment |
| `USER_CANCELLED` | User cancelled the operation (dismissed prompt) |
| `PASSKEY_NOT_FOUND` | No passkey found for the user |
| `SESSION_EXPIRED` | Session expired |
| `NETWORK_FAILURE` | Network error (with automatic retries) |
| `INVALID_ARGUMENT` | Invalid argument in config or method call |
| `TIMEOUT` | Operation timed out |
| `ABORTED` | Operation aborted via AbortSignal |
| `ABORT_ERROR` | Operation aborted by user or timeout (cross-device polling) |
| `CHALLENGE_MISMATCH` | Cross-device: link already used or expired |
| `UNKNOWN_ERROR` | Unknown or unmapped error |

**Retry behavior:** The SDK retries automatically with exponential backoff for HTTP 5xx, HTTP 429 (rate limiting), and transient network errors. HTTP 4xx (except 429), timeouts, and validation errors are not retried.

---

## Cancelling operations

Cancel any operation with `AbortSignal`:

```typescript
const controller = new AbortController()

// Cancel after 10 seconds
setTimeout(() => controller.abort(), 10000)

const result = await client.register({
  externalUserId: ‘user_123’,
  signal: controller.signal,
})
if (!result.ok && result.error.code === ‘ABORTED’) {
  console.log(‘Operation cancelled’)
}
```

Works with `register()`, `authenticate()`, and `waitForSession()`.

---

## Logging

Inject a `Logger` for request correlation and debugging. The SDK exports a `ConsoleLogger` or you can implement the `Logger` interface:

```typescript
import { TryMellon, ConsoleLogger } from ‘@trymellon/js’

const clientResult = TryMellon.create({
  appId: ‘your-app-id-uuid’,
  publishableKey: ‘cli_xxxx’,
  logger: new ConsoleLogger(),
})
```

**Logger interface:**

```typescript
interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}
```

---

## Client backend

Your backend must validate the `session_token` with TryMellon and create its own session:

```
POST https://api.trymellonauth.com/v1/sessions/validate
Authorization: Bearer {session_token}
```

**Response:**

```json
{
  "valid": true,
  "user_id": "...",
  "external_user_id": "...",
  "tenant_id": "...",
  "app_id": "..."
}
```

Then create your own session (JWT, cookie, etc.) in your system. The SDK also provides `client.validateSession(token)` if you want to validate from the client side.

---

## Security

* Native browser WebAuthn -- no client-side cryptography
* Short-lived challenges generated by TryMellon
* Replay attack protection (automatic counters)
* SDK never handles secrets or private keys
* Thorough validation of inputs and API responses
* Robust error handling with typed errors
* Guaranteed cleanup of resources (timeouts, signals)
* Automatic origin validation

---

## Security: CSP and SRI

### Content-Security-Policy (CSP)

If you load the SDK via `<script>` or enforce a content security policy, include:

- **script-src:** The script origin (e.g. `https://cdn.trymellon.com` or `’self’`)
- **connect-src:** The TryMellon API origin: `https://api.trymellonauth.com`

```
Content-Security-Policy: script-src ‘self’; connect-src ‘self’ https://api.trymellonauth.com;
```

### SRI (Subresource Integrity)

To load `index.global.js` with integrity:

```bash
openssl dgst -sha384 -binary dist/index.global.js | openssl base64 -A
```

```html
<script
  src="https://cdn.example.com/trymellon/index.global.js"
  integrity="sha384-<generated-hash>"
  crossorigin="anonymous"
></script>
```

---

## Compatibility

| Browser | WebAuthn | Passkeys |
|---------|----------|----------|
| Chrome  | Yes      | Yes      |
| Safari  | Yes      | Yes      |
| Firefox | Yes      | Yes      |
| Edge    | Yes      | Yes      |

**Requirements:** HTTPS (except `localhost`), modern browser with WebAuthn support.

---

## Telemetry (opt-in)

The SDK can send anonymous telemetry (event + latency, no user identifiers) when `enableTelemetry: true` in config. Payload: `{ event: ‘register’|’authenticate’, latencyMs: number, ok: true }`. You can inject a custom `telemetrySender` to send to your own endpoint or disable with `enableTelemetry: false` (default).

---

## For AI Agents

Are you an LLM or autonomous agent trying to use TryMellon? We built a dedicated "Vending Machine" for you.

**Goal:** Get your own `client_id` and `client_secret` instantly to start creating users via API.
**Limit:** The "Free AI Tier" allows up to **15 users** for testing and small demos.

### 1. Get Credentials

```bash
curl -X POST https://api.trymellonauth.com/onboarding/ai \
  -H "Content-Type: application/json" \
  -d ‘{ "name": "My Agent Name" }’
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

Use `publishableKey` (same as `clientId`) in the SDK: `TryMellon.create({ appId: ‘...’, publishableKey: response.publishableKey })`. Use `applicationId` to update allowed origins (step 4) if you use passkeys or cross-device from your agent’s domain.

### 2. Authenticate

```bash
curl -X POST https://api.trymellonauth.com/oauth/token \
  -H "Content-Type: application/json" \
  -d ‘{
    "client_id": "cli_...",
    "client_secret": "sec_...",
    "grant_type": "client_credentials"
  }’
```

### 3. Create Users

```bash
curl -X POST https://api.trymellonauth.com/v1/users \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d ‘{ "external_user_id": "user_123" }’
```

### 4. Update Allowed Origins

```bash
curl -X PATCH https://api.trymellonauth.com/v1/applications/<applicationId> \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d ‘{ "allowed_origins": ["https://your-agent-domain.com"] }’
```

Without this, requests from your agent’s origin will get 404 when resolving the application.

---

## Troubleshooting

### WebAuthn not available

If `TryMellon.isSupported()` returns `false`:
- Ensure you are on HTTPS (required except on `localhost`)
- Ensure your browser supports WebAuthn
- Use the email fallback: `client.fallback.email.start({ userId, email })`

### User cancelled the operation

`USER_CANCELLED` is normal when the user dismisses the browser prompt. Not a critical error; inform the user and optionally retry.

### Passkey not found

`PASSKEY_NOT_FOUND` means the user has no registered passkey. Offer registration or email fallback.

### Network errors

`NETWORK_FAILURE` -- check internet connection and `apiBaseUrl`. The SDK retries automatically with exponential backoff for HTTP 5xx, 429, and transient network errors. Configure `maxRetries` and `retryDelayMs` to tune.

### QR link expired

`CHALLENGE_MISMATCH` -- the cross-device link was already used or expired. Ask the user to scan a new QR code from the desktop.

---

## Additional documentation

- [API Reference](./documentation/API.md) — Full API reference
- [Web Components](./documentation/WEB-COMPONENTS.md) — `<trymellon-auth>` and `<trymellon-auth-modal>`: attributes, events, trigger-only
- [Usage examples](./documentation/EXAMPLES.md) — Practical integration examples
- [Contributing](./CONTRIBUTING.md) — How to contribute (tests, coverage, E2E)

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the change history.

---

## Release (maintainers)

Releases are published to npm automatically by **semantic-release** in CI. The version is derived from commit messages (Conventional Commits), not from `package.json`.

- **Triggers a release:** `fix:` (patch), `feat:` (minor), `BREAKING CHANGE:` / `feat!:` (major).
- **Does not trigger a release:** `chore:`, `refactor:`, `docs:`, `style:`, `test:`.

---

## Contact & Landing

- **Landing:** [https://trymellon-landing.pages.dev/](https://trymellon-landing.pages.dev/)
- **Contact:** [siliangrove@gmail.com](mailto:siliangrove@gmail.com)

---

## License

MIT

---

> Implementing Passkeys should take minutes, not weeks. The backend remains yours.
