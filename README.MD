# @trymellon/js

JavaScript/TypeScript SDK for passkey-based authentication with TryMellon. Zero runtime dependencies. Works in browsers, React, Vue, Angular, and as a drop-in Web Component.

[![npm version](https://img.shields.io/npm/v/@trymellon/js)](https://www.npmjs.com/package/@trymellon/js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```bash
npm install @trymellon/js
```

**Zero runtime dependencies · TypeScript-first · Browser + Node ≥ 18 · ESM + CJS + UMD**

---

## How it works

Your users get biometric sign-in (Face ID, Touch ID, Windows Hello, hardware keys). Your backend keeps its existing session model. The only required integration point: validate the `sessionToken` the SDK returns against your backend.

```
browser                 TryMellon API           your backend
  │── signUp() ────────► /register ─────────────────────────────►│
  │◄─ sessionToken ─────────────────────────────────────────────►│
  │                                              validate token  │
  │                                              set cookie/JWT  │
```

---

## Quick start

```ts
import { TryMellon } from '@trymellon/js';

// TryMellon.create validates config and returns Result — no throw
const clientResult = TryMellon.create({
  appId: 'your-app-id',
  publishableKey: 'your-publishable-key',
});

if (!clientResult.ok) {
  console.error(clientResult.error.message);
  throw clientResult.error;
}

const client = clientResult.value;

// Register a new passkey
const signUpResult = await client.signUp({ externalUserId: 'user_123' });

if (!signUpResult.ok) {
  console.error(signUpResult.error.code); // 'USER_CANCELLED' | 'NOT_SUPPORTED' | ...
  return;
}

// Send the token to your backend to create a session
await fetch('/api/session', {
  method: 'POST',
  body: JSON.stringify({ token: signUpResult.value.sessionToken }),
});
```

---

## Core API

### `TryMellon.create(config)`

Validates config synchronously. Returns `Result<TryMellon, TryMellonError>` — never throws.

```ts
const result = TryMellon.create({
  appId: 'your-app-id',           // Required
  publishableKey: 'your-pk',      // Required — safe to include in browser code
  apiBaseUrl: '...',              // Optional — default: https://api.trymellonauth.com
  timeoutMs: 30_000,              // Optional — 1000–300000 ms
  maxRetries: 3,                  // Optional — 0–10
  retryDelayMs: 1_000,            // Optional — 100–10000 ms
  origin: 'https://app.example.com', // Optional — defaults to window.location.origin
  sandbox: false,                 // Optional — dev/CI mode, see Sandbox below
  enableTelemetry: false,         // Optional — anonymous event+latency data on success
  logger: myLogger,               // Optional — custom Logger
  contextHashStorage: sessionStorage, // Optional — custom storage for enrollment context hash
});
```

### `TryMellon.isSupported()`

Static check: returns `true` if the WebAuthn API is available in the current environment.

---

### `client.signUp(options)`

Registers a new passkey. Triggers the browser's credential creation prompt.

```ts
const result = await client.signUp({
  externalUserId: 'user_123',         // Your internal user ID
  authenticatorType: 'platform',      // 'platform' (Face ID/Touch ID) | 'cross-platform' (hardware key)
  successUrl: 'https://app.example.com/dashboard', // Optional — returned as redirectUrl if allowed by app allowlist
  signal: abortController.signal,     // Optional
});

if (!result.ok) {
  // handle result.error.code
  return;
}

const { sessionToken, credentialId, user, redirectUrl } = result.value;
// sessionToken → send to your backend
// user: { userId, externalUserId, email?, metadata? }
```

---

### `client.signIn(options)`

Authenticates a returning user. Triggers the browser's credential selector.

```ts
const result = await client.signIn({
  externalUserId: 'user_123',  // Optional — omit to use discoverable (resident) passkeys
  mediation: 'conditional',   // 'optional' | 'conditional' | 'required'
                               // Use 'conditional' for passkey autofill in <input autocomplete="webauthn">
  successUrl: 'https://app.example.com/dashboard',
  signal: abortController.signal,
});

if (!result.ok) return;

const { sessionToken, authenticated, user, signals, redirectUrl } = result.value;
// signals: { userVerification?, backupEligible?, backupStatus? }
```

---

### `client.enroll(options)`

Enrolls a new device for an existing user via an invitation ticket. The ticket is issued server-side and delivered to the user (e.g. by email).

```ts
const result = await client.enroll({
  ticketId: 'ticket_abc123', // From your server-side invitation flow
  signal: abortController.signal,
});

if (!result.ok) {
  // result.error.code: 'TICKET_NOT_FOUND' | 'TICKET_EXPIRED' | 'TICKET_ALREADY_USED'
  return;
}

const { sessionToken, credentialId, userId, entityId } = result.value;
```

The SDK binds a SHA-256 context hash to the ticket automatically. A ticket opened in a different browser or device will fail with `CHALLENGE_MISMATCH`.

---

### `client.passkey.recover(options)`

Recovers an account when a user has lost all their passkeys. Uses an email OTP to verify identity, then registers a fresh passkey.

```ts
// 1. Your backend sends an OTP to the user's email (outside this SDK)
// 2. User enters the 6-digit code

const result = await client.passkey.recover({
  externalUserId: 'user_123',
  otp: '482910',   // exactly 6 digits
});

if (!result.ok) return;

const { sessionToken, credentialId, user } = result.value;
```

---

### `client.otp` — Email OTP fallback

For users on devices that don't support passkeys.

```ts
// Send OTP — userId is the TryMellon user ID, not externalUserId
await client.otp.send({
  userId: 'trymellon-user-id',
  email: 'user@example.com',
});

// Verify OTP
const result = await client.otp.verify({
  userId: 'trymellon-user-id',
  code: '482910',
  successUrl: 'https://app.example.com', // Optional
});

if (result.ok) {
  const { sessionToken, redirectUrl } = result.value;
}
```

---

### `client.session.verify(sessionToken)`

Validates a session token. In sandbox mode, returns a mocked valid response for the sandbox token.

```ts
const result = await client.session.verify(sessionToken);

if (!result.ok || !result.value.valid) {
  // redirect to login
  return;
}

const { userId, externalUserId, tenantId, appId } = result.value;
```

Your backend should always validate tokens server-side — use this for lightweight client-side checks only.

---

### `client.capabilities()`

Check WebAuthn support before rendering your auth UI.

```ts
const status = await client.capabilities();

// status.isPasskeySupported                — WebAuthn API available
// status.platformAuthenticatorAvailable    — Face ID / Touch ID / Windows Hello present
// status.recommendedFlow: 'passkey' | 'fallback'

if (status.recommendedFlow === 'fallback') {
  // show OTP flow instead of passkey button
}
```

---

### `client.crossDevice` — QR code authentication

Desktop initiates, mobile approves with its passkey.

**Desktop (initiator):**

```ts
// Start an auth session
const init = await client.crossDevice.start();
if (!init.ok) return;

const { qr_url, session_id, polling_token, expires_at } = init.value;
renderQrCode(qr_url); // display to user

// Wait for completion — uses SSE in browsers, polling in Node.js
const controller = new AbortController();
const result = await client.crossDevice.waitForCompletion(
  session_id,
  controller.signal,
  polling_token,    // Always pass — prevents polling abuse
);

if (result.ok) {
  const { sessionToken, userId, redirectUrl } = result.value;
}
```

**Start a registration (new user) via QR:**

```ts
const init = await client.crossDevice.startRegistration({
  externalUserId: 'user_123', // Optional — omit for anonymous registration
});
```

**Mobile (approver):**

```ts
// After scanning the QR, parse sessionId from the URL
const result = await client.crossDevice.approve(sessionId);
// Branches automatically: registration → credentials.create; auth → credentials.get
```

`waitForCompletion` uses SSE (EventSource) in browsers and falls back to polling on SSE error. In Node.js it always polls (3s interval, max 3 min).

---

### `client.bridge` — Cross-device enrollment and auth bridge

Used when a second device must complete an enrollment or authentication session initiated from the primary device.

**Primary device — wait for terminal status:**

```ts
const statusResult = await client.bridge.waitForResult(sessionId, {
  kind: 'enrollment',  // 'enrollment' | 'auth'
  timeoutMs: 120_000,  // default: 300s
  useSse: true,        // default: true
  signal: abortController.signal,
});

if (statusResult.ok) {
  // statusResult.value.status:
  //   'pin_verified' | 'pin_locked' | 'completed' | 'expired' | 'cancelled'
}
```

**Second device — complete the bridge:**

```ts
// Step 1: fetch the WebAuthn context for this session
const context = await client.bridge.getContext(sessionId, 'enrollment');

// Step 2: verify the presence PIN shown on the primary device
const challenge = await client.bridge.verifyPresence(sessionId, '4821', 'enrollment');

// Step 3: run the full WebAuthn ceremony and post the result
const result = await client.bridge.complete(sessionId, {
  kind: 'enrollment',
  ticketId: 'ticket_abc123',  // Required for enrollment
  entityId: 'entity_xyz',     // Required for enrollment
  presencePin: '4821',        // Or pass onPinRequired: () => Promise<string>
});

if (result.ok) {
  if (result.value.kind === 'enrollment') {
    const { sessionToken, credentialId, userId, entityId } = result.value;
  } else {
    const { sessionToken } = result.value; // kind === 'auth'
  }
}
```

**Bridge status lifecycle:**

```
pending → pin_verified → completed
        ↘ pin_locked
        ↘ expired
        ↘ cancelled
```

---

### `client.on(event, handler)` — Events

```ts
const unsubscribe = client.on('success', (payload) => {
  console.log(payload.operation); // 'signUp' | 'signIn' | 'enroll'
  console.log(payload.token);
});

client.on('error', (payload) => {
  console.error(payload.error.code, payload.error.message);
});

client.on('cancelled', () => {
  // User dismissed the browser prompt
});

client.on('start', (payload) => {
  // Operation initiated, before the browser prompt
});

unsubscribe(); // remove the listener
```

---

### `client.getContextHash()`

Returns a stable SHA-256 hex string (64 chars) bound to the current browser session. Used internally by `enroll()` and `bridge.complete()` as an anti-replay mechanism for enrollment tickets.

```ts
const hash = client.getContextHash();
// Include in your server-side enrollment link generation: ?context_hash=<hash>
```

---

## Error handling

All async methods return `Result<T, TryMellonError>`. No exceptions leak from the public API.

```ts
import type { TryMellonErrorCode } from '@trymellon/js';

const result = await client.signIn({});

if (!result.ok) {
  const { code, message } = result.error;

  switch (code) {
    case 'USER_CANCELLED':         // User dismissed the browser prompt
      break;
    case 'NOT_SUPPORTED':          // WebAuthn not available in this environment
      break;
    case 'PASSKEY_NOT_FOUND':      // No matching passkey for this user
      break;
    case 'SESSION_EXPIRED':        // Challenge or session TTL exceeded
      break;
    case 'NETWORK_FAILURE':        // Request failed after retries
      break;
    case 'TIMEOUT':                // Operation exceeded timeoutMs
      break;
    case 'ABORT_ERROR':            // Aborted via AbortSignal
      break;
    case 'CHALLENGE_MISMATCH':     // Ticket/challenge used in the wrong browser context
      break;
    case 'TICKET_NOT_FOUND':       // Enrollment ticket is invalid or missing
      break;
    case 'TICKET_EXPIRED':         // Enrollment ticket TTL exceeded
      break;
    case 'TICKET_ALREADY_USED':    // Ticket was already consumed
      break;
    case 'PIN_MISMATCH':           // Wrong presence PIN in bridge flow
      break;
    case 'PIN_LOCKED':             // Too many failed PIN attempts
      break;
    case 'BRIDGE_SESSION_EXPIRED': // Bridge session TTL exceeded
      break;
    case 'RATE_LIMIT_EXCEEDED':    // Slow down — too many requests
      break;
    case 'FORBIDDEN':              // Insufficient permissions
      break;
    case 'SERVER_ERROR':           // Transient server error — retry later
      break;
    case 'INVALID_ARGUMENT':       // Bad input — check error.details for the field
      break;
    case 'UNKNOWN_ERROR':
      break;
  }
}
```

`TryMellon.create` is the one synchronous path that can return an error — handle it at app bootstrap.

---

## Sandbox mode

Skips all API and WebAuthn calls. `signUp`, `signIn`, and `enroll` return immediately with a fixed token. Safe for CI, Storybook, and local development without a running backend.

```ts
import { TryMellon, SANDBOX_SESSION_TOKEN } from '@trymellon/js';

const result = TryMellon.create({
  appId: 'any',
  publishableKey: 'any',
  sandbox: true,
  sandboxToken: 'my-dev-token', // Optional — defaults to SANDBOX_SESSION_TOKEN
});

if (!result.ok) throw result.error;
const client = result.value;

const auth = await client.signIn({});
// auth.ok === true
// auth.value.sessionToken === 'my-dev-token'
```

> **Your backend must reject the sandbox token in production.** The SDK logs a console warning when `sandbox: true` and the current origin is not `localhost` or `127.0.0.1`.

---

## React

```tsx
import { TryMellonProvider, useTryMellon, useSignUp, useSignIn, useEnroll } from '@trymellon/js/react';
import { TryMellon } from '@trymellon/js';

// Create the client once (outside React render)
const clientResult = TryMellon.create({ appId: '...', publishableKey: '...' });
if (!clientResult.ok) throw clientResult.error;

function App() {
  return (
    <TryMellonProvider client={clientResult.value}>
      <LoginButton />
    </TryMellonProvider>
  );
}

function LoginButton() {
  const { execute, loading, error } = useSignIn();

  return (
    <button
      onClick={() => execute({ externalUserId: 'user_123' })}
      disabled={loading}
    >
      {loading ? 'Signing in…' : 'Sign in with passkey'}
    </button>
  );
}
```

Available hooks:

| Hook | Wraps |
|------|-------|
| `useSignUp()` | `client.signUp` |
| `useSignIn()` | `client.signIn` |
| `useEnroll()` | `client.enroll` |
| `useTryMellon()` | Full `TryMellon` instance |

Each hook returns `{ execute, loading, error, result }`.

---

## Vue 3

```ts
// main.ts
import { createApp } from 'vue';
import { TryMellonKey } from '@trymellon/js/vue';
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: '...', publishableKey: '...' });
if (!clientResult.ok) throw clientResult.error;

const app = createApp(App);
app.provide(TryMellonKey, clientResult.value);
app.mount('#app');
```

```vue
<script setup lang="ts">
import { useSignIn } from '@trymellon/js/vue';

const { execute, loading, error, result } = useSignIn();
</script>

<template>
  <button @click="execute({ externalUserId: 'user_123' })" :disabled="loading">
    Sign in
  </button>
  <p v-if="error">{{ error.message }}</p>
</template>
```

Available composables: `useSignUp`, `useSignIn`, `useEnroll`, `useTryMellon`.

---

## Angular

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideTryMellon } from '@trymellon/js/angular';
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: '...', publishableKey: '...' });
if (!clientResult.ok) throw clientResult.error;

export const appConfig: ApplicationConfig = {
  providers: [provideTryMellon(clientResult.value)],
};
```

```ts
// auth.component.ts
import { Component } from '@angular/core';
import { TryMellonService } from '@trymellon/js/angular';

@Component({ selector: 'app-auth', template: `<button (click)="signIn()">Sign in</button>` })
export class AuthComponent {
  constructor(private tryMellon: TryMellonService) {}

  async signIn() {
    const result = await this.tryMellon.client.signIn({ externalUserId: 'user_123' });
    if (result.ok) {
      // handle result.value.sessionToken
    }
  }
}
```

---

## Web Component (drop-in UI)

Zero-dependency button + modal. No framework required.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@trymellon/js/dist/ui/index.js"></script>

<trymellon-auth
  app-id="your-app-id"
  publishable-key="your-publishable-key"
  mode="auto"
  button-variant="primary"
  theme="light"
></trymellon-auth>

<script>
  document.querySelector('trymellon-auth').addEventListener('mellon:success', (e) => {
    const { token, user } = e.detail;
    // send token to your backend
  });
</script>
```

Or via npm:

```ts
import '@trymellon/js/ui';
```

**Attributes:**

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `app-id` | string | — | Required |
| `publishable-key` | string | — | Required |
| `mode` | `auto` \| `register` \| `login` | `auto` | Controls the active tab |
| `button-variant` | `primary` \| `secondary` \| `minimal` | `primary` | Visual style |
| `theme` | `light` \| `dark` | `light` | Color scheme |
| `action` | `inline` \| `open-modal` | `inline` | `open-modal` renders a viewport-covering modal |
| `trigger-only` | boolean | false | Only emits `mellon:open-request`; mount `<trymellon-auth-modal>` yourself |
| `ticket-id` | string | — | Activates enrollment mode |

**Events:**

| Event | When | `detail` |
|-------|------|----------|
| `mellon:success` | Auth/registration succeeded | `{ token, user }` |
| `mellon:error` | Operation failed | `{ error }` |
| `mellon:open-request` | Button clicked (action=open-modal) | `{}` |
| `mellon:fallback` | User requested OTP or QR fallback | `{ operation? }` |
| `mellon:context-ready` | Enrollment context hash is ready | `{ contextHash }` |

---

## Utilities

### `getDeviceName(aaguid)`

Resolves an AAGUID to a human-readable device name. Sourced from the FIDO Alliance MDS.

```ts
import { getDeviceName } from '@trymellon/js';

getDeviceName('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4'); // → 'Google Password Manager'
getDeviceName('dd4ec289-e01d-41c9-bb89-70fa845d4bf2'); // → 'iCloud Keychain'
getDeviceName('cafebabe-0000-0000-0000-000000000000'); // → null (unknown)
```

### `resolveCredentialName(aaguid, alias)`

Picks the best display name for a credential: user alias → AAGUID lookup → `'Passkey'` fallback.

```ts
import { resolveCredentialName } from '@trymellon/js';

resolveCredentialName('ea9b8d66-...', null);      // → 'Google Password Manager'
resolveCredentialName(null, 'My YubiKey');         // → 'My YubiKey'
resolveCredentialName('unknown-aaguid', null);     // → 'Passkey'
resolveCredentialName(null, null);                 // → 'Passkey'
```

---

## UMD / CDN

```html
<script src="https://cdn.jsdelivr.net/npm/@trymellon/js/dist/index.global.js"></script>
<script>
  const { TryMellon } = window.TryMellonSDK;

  const result = TryMellon.create({
    appId: 'your-app-id',
    publishableKey: 'your-publishable-key',
  });
  if (!result.ok) throw result.error;
</script>
```

---

## TypeScript types

All types are exported from the root entry point.

```ts
import type {
  Result,
  TryMellonConfig,
  RegisterOptions,
  RegisterResult,
  AuthenticateOptions,
  AuthenticateResult,
  EnrollOptions,
  EnrollmentResult,
  RecoverAccountOptions,
  RecoverAccountResult,
  ClientStatus,
  TryMellonEvent,
  EventPayload,
  EventHandler,
  EmailFallbackStartOptions,
  EmailFallbackVerifyOptions,
  EmailFallbackVerifyResult,
  SessionValidateResponse,
  BridgeOptions,
  BridgeCompleteOptions,
  BridgeResult,
  BridgeEnrollmentResult,
  BridgeAuthResult,
  BridgeStatusSnapshot,
  BridgeContextResponse,
  BridgeChallengeResponse,
  ContextHash,
} from '@trymellon/js';

import type { TryMellonErrorCode } from '@trymellon/js';
```

The `Result<T, E>` type — no exceptions from the public API:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

---

## License

MIT
