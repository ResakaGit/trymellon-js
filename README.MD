# @trymellon/js

**Add passkeys to your existing auth. No migration. No new user model.**

The official JavaScript SDK for [TryMellon](https://trymellonauth.com) — a WebAuthn/FIDO2 authentication API that plugs into your current stack. Your users get biometric sign-in (Face ID, Touch ID, Windows Hello); your backend keeps its existing session model.

[![npm version](https://img.shields.io/npm/v/@trymellon/js)](https://www.npmjs.com/package/@trymellon/js)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```bash
npm install @trymellon/js
```

**Zero runtime dependencies · TypeScript-first · Browser + Node.js · ESM + CJS**

---

## Quick Start

```typescript
import { TryMellon } from '@trymellon/js'

// Create client — returns Result<TryMellon, TryMellonError> (no throw)
const clientResult = TryMellon.create({
  appId: 'YOUR_APP_ID',
  publishableKey: 'pk_YOUR_KEY',
})
if (!clientResult.ok) throw clientResult.error
const client = clientResult.value

// Register a passkey
const result = await client.signUp({ externalUserId: 'user_123' })
if (result.ok) {
  // Send result.value.sessionToken to your backend
  await fetch('/api/session', {
    method: 'POST',
    body: JSON.stringify({ token: result.value.sessionToken }),
  })
} else {
  console.error(result.error.code) // 'USER_CANCELLED' | 'NOT_SUPPORTED' | ...
}

// Authenticate with an existing passkey
const auth = await client.signIn({ externalUserId: 'user_123' })
```

> Your backend validates the `sessionToken` against `GET /v1/sessions/validate` — that's the only integration point required.

---

## Client Configuration

```typescript
TryMellon.create({
  appId: 'YOUR_APP_ID',       // Required — Application ID from the TryMellon dashboard
  publishableKey: 'pk_...',   // Required — Publishable key (safe to expose in browser)
  apiBaseUrl: '...',          // Optional — default: https://api.trymellonauth.com
  timeoutMs: 30_000,          // Optional — HTTP timeout, 1 000–300 000 ms
  sandbox: false,             // Optional — returns a fixed token without hitting the API (CI/dev)
})
```

`TryMellon.create()` validates the config and returns a `Result` — no constructor throws in your user code.

---

## API Reference

### Authentication

```typescript
// Register a new passkey
await client.signUp({ externalUserId: string })
// → Result<{ sessionToken: string }, TryMellonError>

// Authenticate with an existing passkey
await client.signIn({ externalUserId: string })
// → Result<{ sessionToken: string }, TryMellonError>
```

### Session

```typescript
// Validate a session token (call from your backend or BFF)
await client.session.verify(sessionToken)
// → Result<{ valid: boolean; userId: string; externalUserId: string; tenantId: string }, TryMellonError>
```

### Cross-Device Authentication (QR)

Desktop initiates, mobile approves via the user's passkey. Uses **SSE** in the browser for instant push completion; falls back to polling in Node.js.

```typescript
// Desktop — initialize QR session
const init = await client.crossDevice.start()
if (init.ok) renderQrCode(init.value.qr_url)

// Desktop — wait for mobile approval
const controller = new AbortController()
const result = await client.crossDevice.waitForCompletion(
  init.value.session_id,
  controller.signal,
)
if (result.ok) sendTokenToBackend(result.value.sessionToken)

// Mobile (on the /mobile-auth page) — approve with biometrics
await client.crossDevice.approve(sessionId)
```

### Email OTP Fallback

```typescript
await client.otp.send({ userId: 'user_123', email: 'user@example.com' })
await client.otp.verify({ userId: 'user_123', code: '123456' })
// → Result<{ sessionToken: string }, TryMellonError>
```

### Account Recovery

```typescript
await client.passkey.recover({ externalUserId: 'user_123', otp: '...' })
```

### Capabilities

```typescript
const status = await client.getCapabilities()
// → { webAuthnSupported: boolean; platformAuthenticatorAvailable: boolean; ... }
```

### Events

```typescript
const unsubscribe = client.on('success', ({ operation, token }) => {
  console.log(`${operation} succeeded`)
})
// unsubscribe() to remove the listener
```

---

## Result Pattern

Every async method returns `Result<T, TryMellonError>` — never throws. No try/catch required.

```typescript
import type { Result } from '@trymellon/js'

const result = await client.signIn({ externalUserId: 'user_123' })

if (result.ok) {
  console.log(result.value.sessionToken)
} else {
  switch (result.error.code) {
    case 'USER_CANCELLED':    // user dismissed the biometric prompt
    case 'NOT_SUPPORTED':     // device/browser doesn't support WebAuthn
    case 'TIMEOUT':           // ceremony timed out
    case 'NETWORK_FAILURE':   // API unreachable
    case 'CREDENTIAL_NOT_FOUND': // no passkey registered for this user
  }
}
```

---

## Framework Bindings

| Import | Use case |
|--------|----------|
| `@trymellon/js` | Vanilla JS, Svelte, Node.js, any bundler |
| `@trymellon/js/react` | `TryMellonProvider`, `useTryMellon`, `useSignUp`, `useSignIn`, `useEnroll` |
| `@trymellon/js/vue` | Vue composables |
| `@trymellon/js/angular` | Angular service |
| `@trymellon/js/ui` | Drop-in Web Components — `<trymellon-auth>`, `<trymellon-auth-modal>` |

### React

```tsx
import { TryMellonProvider, useSignIn } from '@trymellon/js/react'

function App() {
  return (
    <TryMellonProvider appId="YOUR_APP_ID" publishableKey="pk_...">
      <LoginButton />
    </TryMellonProvider>
  )
}

function LoginButton() {
  const { signIn, loading, error } = useSignIn()
  return <button onClick={() => signIn({ externalUserId: 'user_123' })}>Sign in</button>
}
```

---

## Utilities

```typescript
import { resolveCredentialName } from '@trymellon/js'

// Human-readable authenticator name from AAGUID (FIDO MDS)
resolveCredentialName('dd4ec289-e01d-41c9-bb89-70fa845d4bf2')
// → 'iCloud Keychain'

resolveCredentialName('2fc0579f-8113-47ea-b116-bb5a8db9202a')
// → 'YubiKey 5 NFC'
```

---

## Sandbox Mode

```typescript
const client = TryMellon.create({ ..., sandbox: true }).value!

const result = await client.signUp({ externalUserId: 'test_user' })
// result.ok === true, result.value.sessionToken === 'trymellon_sandbox_session_token_v1'
// No API calls are made — safe for CI, Storybook, and local dev without a backend
```

---

## Backend Integration

The only backend requirement: validate the `sessionToken` returned by `signUp` or `signIn`.

```bash
GET /v1/sessions/validate
Authorization: Bearer <sessionToken>
```

```json
{
  "ok": true,
  "data": {
    "valid": true,
    "userId": "uuid",
    "externalUserId": "your-internal-user-id",
    "tenantId": "uuid"
  }
}
```

Your backend decides what happens next (set a cookie, return a JWT, etc.). TryMellon handles only the WebAuthn ceremony and session issuance.

---

## Links

- **Docs:** [trymellonauth.com/docs](https://trymellonauth.com/docs)
- **Dashboard:** [trymellonauth.com](https://trymellonauth.com)
- **Status:** [status.trymellonauth.com](https://status.trymellonauth.com)
- **npm:** [@trymellon/js](https://www.npmjs.com/package/@trymellon/js)
