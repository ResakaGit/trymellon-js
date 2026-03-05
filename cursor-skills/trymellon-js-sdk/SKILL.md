---
name: trymellon-js-sdk
description: Integrates and uses the @trymellon/js SDK for passkey/WebAuthn, email fallback, and cross-device auth. Use when implementing login, registration, or frontend auth with TryMellon in Vanilla JS, Svelte, React, Vue, or Angular, or when reviewing code that calls the SDK.
---

# @trymellon/js SDK

Official SDK for passwordless authentication (Passkeys/WebAuthn). All main operations return `Result<T, TryMellonError>`: check `result.ok` and use `result.error.code` to branch.

**Official sources (validate API, version and examples):**
- **npm:** https://www.npmjs.com/package/@trymellon/js?activeTab=readme
- **GitHub:** https://github.com/ResakaGit/trymellon-js#readme

---

## Entry points

| Import | Usage |
|--------|-----|
| `@trymellon/js` | Core: Vanilla, Svelte, Node. `TryMellon`, `TryMellon.create()`, `TryMellon.isSupported()`, `Result`, `ok`, `err`, `isTryMellonError`, `SANDBOX_SESSION_TOKEN`, types |
| `@trymellon/js/react` | React 18+: `TryMellonProvider`, `useTryMellon`, `useRegister`, `useAuthenticate` |
| `@trymellon/js/vue` | Vue 3: `provideTryMellon`, `useTryMellon`, `useRegister`, `useAuthenticate` |
| `@trymellon/js/angular` | Angular: `TryMellonService`, `provideTryMellonConfig` |

Svelte: use the core only; one `TryMellon` instance per app (module or store) and call `register()`/`authenticate()` from components.

---

## Initialization

Prefer the **factory** to avoid throwing on invalid config:

```typescript
import { TryMellon } from '@trymellon/js'

const clientResult = TryMellon.create({
  appId: 'app_live_xxxx',
  publishableKey: 'key_live_xxxx',
  // optional: apiBaseUrl, timeoutMs, maxRetries, retryDelayMs, logger
})

if (!clientResult.ok) {
  console.error(clientResult.error.code, clientResult.error.message)
  throw clientResult.error
}
const client = clientResult.value
```

Direct constructor `new TryMellon(config)` throws if config is invalid. Options: `appId`, `publishableKey` (required); `apiBaseUrl`, `timeoutMs`, `maxRetries`, `retryDelayMs`, `logger`, `sandbox`, `sandboxToken`.

On the Landing, `appId` and `publishableKey` are injected from `PUBLIC_TRYMELLON_APP_ID` and `PUBLIC_TRYMELLON_PUBLISHABLE_KEY`; API URL from `PUBLIC_TRYMELLON_API_BASE_URL` (see project Landing README).

---

## Main flows

### WebAuthn support

```typescript
if (!TryMellon.isSupported()) {
  // Use email fallback
}
// Optional: more detailed status
const status = await client.getStatus()
// status.isPasskeySupported, platformAuthenticatorAvailable, recommendedFlow
```

### Registration

```typescript
const result = await client.register({
  externalUserId: 'user_123',  // camelCase recommended
  // authenticatorType?: 'platform' | 'cross-platform'
  // signal?: AbortSignal
})
if (!result.ok) {
  switch (result.error.code) {
    case 'USER_CANCELLED': return
    case 'NOT_SUPPORTED': /* fallback */ break
    default: console.error(result.error.message)
  }
  return
}
// Send result.value.sessionToken to backend
await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionToken: result.value.sessionToken }) })
```

### Authentication

```typescript
const result = await client.authenticate({
  externalUserId: 'user_123',
  hint: 'user@example.com',  // optional, improves UX
  // signal?: AbortSignal
  // mediation?: 'optional' | 'conditional' | 'required'
})
if (!result.ok) {
  if (result.error.code === 'PASSKEY_NOT_FOUND') {
    // Offer registration or fallback
  }
  return
}
// result.value.sessionToken → backend
```

### Validate session (client-side)

```typescript
const validationResult = await client.validateSession(sessionToken)
if (validationResult.ok && validationResult.value.valid) {
  const v = validationResult.value
  // v.external_user_id, v.tenant_id, v.app_id
}
```

---

## Error codes

Use `result.error.code` for logic. Do not invent codes.

| Code | Typical action |
|------|----------------|
| `NOT_SUPPORTED` | Use email fallback |
| `USER_CANCELLED` | Do not treat as critical error; optional retry |
| `PASSKEY_NOT_FOUND` | Offer `register()` or fallback |
| `SESSION_EXPIRED` | Re-authenticate |
| `NETWORK_FAILURE` | Automatic retries in SDK; show message to user |
| `INVALID_ARGUMENT` | Check arguments (externalUserId, config) |
| `TIMEOUT` | Increase timeout or retry |
| `ABORTED` | Operation cancelled with AbortSignal |
| `CHALLENGE_MISMATCH` | Cross-device: link already used or expired; ask user to scan QR again from desktop |

Type guard: `isTryMellonError(error)` to check if an `unknown` is `TryMellonError`.

---

## Email fallback (OTP)

When WebAuthn is not available or the user has no passkey:

```typescript
// 1. Send OTP
const startResult = await client.fallback.email.start({ userId: 'user_123', email: 'user@example.com' })
if (!startResult.ok) return

// 2. User enters code
const code = prompt('Code sent by email:')

// 3. Verify
const verifyResult = await client.fallback.email.verify({ userId: 'user_123', code })
if (!verifyResult.ok) return
// verifyResult.value.sessionToken → backend
```

Note: in fallback the options use `userId` and `email`/`code`, not `externalUserId`.

---

## Cross-Device (QR login)

**Desktop:** start session and show QR; then poll until mobile approves.

```typescript
const initResult = await client.auth.crossDevice.init()
if (!initResult.ok) return
const { session_id, qr_url } = initResult.value
// Show QR with qr_url

const controller = new AbortController()
const pollResult = await client.auth.crossDevice.waitForSession(session_id, controller.signal)
if (!pollResult.ok) {
  if (pollResult.error.code === 'TIMEOUT') { /* QR expired */ }
  return
}
// pollResult.value.sessionToken
```

**Mobile:** user scans QR; the app gets `session_id` from the URL and calls:

```typescript
const approveResult = await client.auth.crossDevice.approve(sessionId)
if (approveResult.ok) { /* Success; notify on desktop */ }
else if (approveResult.error.code === 'CHALLENGE_MISMATCH') {
  // Link already used or expired; show message and ask to scan again
}
```

---

## Sandbox (development)

For testing without real backend/WebAuthn:

```typescript
const client = new TryMellon({
  sandbox: true,
  appId: 'sandbox',
  publishableKey: 'sandbox',
})
// register() and authenticate() return immediately with sessionToken = SANDBOX_SESSION_TOKEN
```

Import the constant so the backend recognizes the token in dev:

```typescript
import { SANDBOX_SESSION_TOKEN } from '@trymellon/js'
```

**Rule:** the backend must NOT accept `SANDBOX_SESSION_TOKEN` in production; only in development.

---

## Events

For spinners and analytics:

```typescript
const unsubStart = client.on('start', (p) => { /* p.operation */ })
client.on('success', (p) => { /* p.operation */ })
client.on('error', (p) => { /* p.error */ })
client.on('cancelled', (p) => { /* p.operation */ })
// Unsubscribe: unsubStart()
```

---

## Cancellation

Pass `AbortSignal` in `register` and `authenticate`:

```typescript
const controller = new AbortController()
setTimeout(() => controller.abort(), 10000)
const result = await client.register({ externalUserId: 'user_123', signal: controller.signal })
// If cancelled: result.error.code === 'ABORTED'
```

---

## Framework quick reference

- **React:** `TryMellonProvider` with `client`, then `useRegister()` / `useAuthenticate()`; `execute(options)` and `loading`/`error` state.
- **Vue:** `provideTryMellon(client)` at root; in components `useRegister()` / `useAuthenticate()`.
- **Angular:** `provideTryMellonConfig({ appId, publishableKey })` in providers; inject `TryMellonService` and use `.client.register()` / `.client.authenticate()`.
- **Svelte:** one `TryMellon` instance (module or store); call methods from components; no provider.

---

## Checklist (implementation/review)

- [ ] Initialization with `TryMellon.create()` or `new TryMellon()` with valid `appId` and `publishableKey`.
- [ ] All calls to `register`/`authenticate` check `result.ok` and handle `result.error.code`.
- [ ] `sessionToken` is sent to the backend (POST /api/login or equivalent); backend validates with TryMellon API.
- [ ] If fallback: `TryMellon.isSupported()` or `PASSKEY_NOT_FOUND` → email flow with `fallback.email.start` + `verify`.
- [ ] In dev with sandbox: use of `SANDBOX_SESSION_TOKEN` only in development backend.
- [ ] Events `on('start'|'success'|'error'|'cancelled')` unsubscribed on unmount (React/Vue) to avoid leaks.

---

## Maintainers / Release

- Before publishing a new version of `@trymellon/js`, run the `pushprotocol` command at the monorepo root to ensure lint, tests with coverage and build are all green for `LandingPage`, `tryMellonJs` and `WebAuthSaas`.
- The SDK repo (`tryMellonJs`) ships a GitHub Actions workflow `Release` that runs on every push to `main` and uses `semantic-release` to cut versions and publish to npm when there are `fix:`, `feat:` or `chore(release): ...` commits since the last tag.

---

## Detailed reference

Full types, config options and extended API: [reference.md](reference.md).

## External sources

To validate version, changelog or official examples: [npm @trymellon/js](https://www.npmjs.com/package/@trymellon/js?activeTab=readme), [GitHub trymellon-js](https://github.com/ResakaGit/trymellon-js#readme).
