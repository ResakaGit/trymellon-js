## [3.1.3](https://github.com/ResakaGit/trymellon-js/compare/v3.1.2...v3.1.3) (2026-04-08)


### Bug Fixes

* **sdk:** audit wave fixes — wire types, bridge statuses, error codes ([573ec7b](https://github.com/ResakaGit/trymellon-js/commit/573ec7b2d2140137275f2715f888611008db4e38))
* **tests:** update tests to match audit fixes from previous session ([2d445ea](https://github.com/ResakaGit/trymellon-js/commit/2d445eae36679e0c9d73877d0e4bfbba97b4a031))

## [3.1.2](https://github.com/ResakaGit/trymellon-js/compare/v3.1.1...v3.1.2) (2026-04-08)

# Changelog

All notable changes to `@trymellon/js` are documented in this file.
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Newest entries appear first.

---

## [3.2.0] — 2026-04-08

### Added

- **Shared SSE-with-polling fallback (`withSseFallback`).** Internal utility extracted from `CrossDeviceManager` and `BridgeManager` into `polling-utils`. Both cross-device and bridge flows now share a single, tested SSE implementation with automatic polling fallback when `EventSource` is unavailable.

### Fixed

- **Bridge: abort signal was silently dropped during SSE wait.** Calling `bridge.waitForResult()` with an `AbortSignal` and firing that signal while an SSE connection was open caused the operation to hang instead of resolving. The signal is now wired through `withSseFallback` and cancels correctly.
- **Unified `ABORT_ERROR` code.** Two codes (`ABORT_ERROR` and `ABORTED`) existed for aborted operations, leading to inconsistent error handling. All abort paths now return `ABORT_ERROR`. If your code checks for `ABORTED`, rename it to `ABORT_ERROR`.
- **`QR_*` backend error codes now map to SDK errors.** 13 server error codes prefixed `QR_` (e.g. `qr_rate_limited`, `qr_session_expired`) were previously surfaced as unknown errors. They now map to the correct SDK error codes. Rate-limit errors trigger the exponential backoff logic in `crossDevice.waitForCompletion()`.

### Docs

- **`enroll()` is the correct method for entity enrollment.** The API reference and entity enrollment guide previously showed `client.invite.accept()`, which does not exist. The correct call is `client.enroll({ ticketId })`.
- **`/v1/enrollment-bridge/init` now returns `entity_id`.** The backend echoes the `entity_id` you sent in the init request, so you no longer need to store it between `/init` and `/complete`.
- **Quick-start guide no longer uses `.value!`.** The sandbox example now uses a proper `.ok` check before accessing `.value`. Using `!` on a `Result` without checking `.ok` first will crash if the config is invalid.
- **`signIn()` options: `mediation` and `successUrl` now documented** in the Register & Authenticate guide (previously only in the API reference).

---

## [3.1.0] — 2026-04-08

### Added

- **Cross-device real-time push via SSE.** `crossDevice.waitForCompletion()` now opens a Server-Sent Events connection in the browser, receiving a push notification the instant the mobile device approves the session. Falls back automatically to polling when `EventSource` is unavailable (Node.js, server-side rendering). No configuration required.
- **Polling token passed as query param for SSE.** `EventSource` cannot send custom request headers. The SDK now appends `polling_token` as a query parameter in the SSE URL so authenticated connections work without additional configuration.

### Fixed

- **Abort signal race on SSE → polling fallback.** If a signal fired between SSE teardown and polling startup, the operation would ignore the cancellation. The signal is now tracked continuously across the SSE-to-polling transition.
- **`EventSource` constructor error now triggers polling fallback.** A constructor throw is treated as an SSE failure and falls back to polling immediately instead of propagating an unhandled error.

### Performance

- **Cross-device polling interval raised from 2 s to 3 s** when SSE is unavailable. Rate-limit backoff increased from 5 s to 8 s. Reduces API load on slow or constrained clients.

---

## [3.0.0] — 2026-04-08

### ⚠️ Breaking Changes

**All renames are intent-based — no behavior changes. Update call sites as listed.**

#### `TryMellon` class — method renames

| Before | After | Why |
|--------|-------|-----|
| `register(options)` | `signUp(options)` | Intent over ceremony |
| `authenticate(options)` | `signIn(options)` | Intent over ceremony |
| `crossDevice.context(id)` | `crossDevice.getContext(id)` | Verb-prefixed convention |
| `bridge.context(id, kind)` | `bridge.getContext(id, kind)` | Verb-prefixed convention |
| `bridge.subscribe(id, opts)` | `bridge.waitForResult(id, opts)` | One-shot wait, not a stream |
| `invite.accept(opts)` | `enroll(opts)` | Top-level method; `invite` implied a social invitation flow |

#### Framework adapters — hook and service renames

| Package | Before | After |
|---------|--------|-------|
| `@trymellon/js/react` | `useRegister` | `useSignUp` |
| `@trymellon/js/react` | `useAuthenticate` | `useSignIn` |
| `@trymellon/js/react` | `useInviteAccept` | `useEnroll` |
| `@trymellon/js/vue` | `useRegister` | `useSignUp` |
| `@trymellon/js/vue` | `useAuthenticate` | `useSignIn` |
| `@trymellon/js/vue` | `useInviteAccept` | `useEnroll` |
| Angular `TryMellonService` | `inviteAccept()` | `enroll()` |

#### Event `operation` field in `client.on()` callbacks

| Before | After |
|--------|-------|
| `operation: 'register'` | `operation: 'signUp'` |
| `operation: 'authenticate'` | `operation: 'signIn'` |

`operation: 'enroll'` is unchanged.

### Fixed

- **`crossDevice.waitForCompletion()` returns camelCase.** Previously returned mixed casing (`{ session_token, user_id }`). Now returns `{ sessionToken, userId, redirectUrl? }`, consistent with all other SDK `Result` types.

---

## [2.3.6] — 2026-04-08

### Added

- **`resolveCredentialName(aaguid, alias)`:** Maps a passkey AAGUID to a human-readable authenticator name (e.g. `"Apple Face ID"`, `"Windows Hello"`, `"YubiKey 5C NFC"`). Source: FIDO Alliance Metadata Service. Use this in your dashboard UI to show users which device holds their passkey.
- **`@trymellon/testing` package:** Node-only test helpers for simulating passkey flows in CI without a real authenticator device. Install as a dev dependency; this package imports Node modules and must not be bundled for the browser.

### Fixed

- **Response envelope updated to `{ ok, data }`.** The SDK now reads the fintech envelope format used by the backend since WebAuthSaas v1.6.0. This was a silent failure — API responses were parsed as errors even on success.

---

## [2.3.0] — 2026-03-16

### Added

- **Bridge flows (`bridge.*`).** Full support for QR-based enrollment and authentication where the ceremony runs on a second device (e.g. a mobile phone scanning a QR code on a desktop screen).

  | Method | Side | Description |
  |--------|------|-------------|
  | `bridge.getContext(sessionId, kind)` | Mobile | Fetch WebAuthn options for the session |
  | `bridge.verifyPresence(sessionId, pin, kind)` | Mobile | Verify the presence PIN shown on the desktop |
  | `bridge.complete(sessionId, options)` | Mobile | Run the full ceremony: context → PIN → WebAuthn → server |
  | `bridge.waitForResult(sessionId, options)` | Desktop | Wait (SSE or polling) until the session reaches a terminal state |

  `kind` is `'enrollment'` for device enrollment flows and `'auth'` for login flows.

- **Vue adapter (`@trymellon/js/vue`).** `useSignUp`, `useSignIn`, and `useEnroll` composables for Vue 3.3+.
- **Angular adapter (`@trymellon/js/angular`).** `TryMellonService` for Angular 17, 18, and 19.

---

## [1.7.0] — 2026-02-28

### Added

- **`crossDevice.getContext(sessionId)` is now public.** Fetch the WebAuthn context on the mobile side of a cross-device session. The response includes `type` (`'auth' | 'registration'`), the WebAuthn `options` object, and optional `approvalContext` and `applicationName` fields.
- **`approvalContext` in cross-device context.** When a session is initiated with an approval context (e.g. for AI agent flows), the mobile side can read it via `getContext()` and show it to the user before approving.

---

## [1.6.0] — 2026-02-22

### Added

- **React adapter (`@trymellon/js/react`).** `useSignUp`, `useSignIn`, and `useEnroll` hooks for React 18 and 19. Manages loading state, errors, and result handling. Import from `@trymellon/js/react`.

---

## [1.5.0] — 2026-02-21

### Added

- **Account recovery (`passkey.recover(options)`).** Lets a user regain access after losing their passkey device. Flow:
  1. Your backend calls `POST /v1/users/recovery/start` (server-to-server) to send an OTP to the user's email.
  2. The user enters the 6-digit OTP in your frontend.
  3. Call `client.passkey.recover({ externalUserId, otp })`. The SDK verifies the OTP, prompts the OS for a new passkey registration, and returns a fresh session token.

---

## [1.4.5] — 2026-02-19

### Fixed

- **Edge runtime compatibility.** Removed all Node.js dependencies (`Buffer`, `node:crypto`). All crypto operations now use `globalThis.crypto` (Web Crypto API). The SDK runs in Cloudflare Workers, Vercel Edge Functions, Deno, and any browser without polyfills.

---

## [1.4.4] — 2026-02-17

### Fixed

- **`204 No Content` handling.** The fetch client previously threw `"Unexpected end of JSON input"` on responses with no body (e.g. cross-device verify). These are now handled correctly and resolve to `ok(undefined)`.

---

## [1.4.0] — 2026-02-16

### Added

- **`CHALLENGE_MISMATCH` error code.** Returned when the WebAuthn challenge has already been used or has expired. This is common in cross-device flows if the user delays. Display a message such as: *"This session expired. Please scan the QR code again."*

---

## [1.3.3] — 2026-02-15

### Added

- **`origin` config option.** Explicitly set the `Origin` header sent with all passkey and cross-device API calls. In browser environments the SDK defaults to `window.location.origin`. In Node.js, SSR, or server-side flows, you must set this explicitly — WebAuthn requires a matching origin.

---

## [1.3.0] — 2026-02-13

### Added

- **Sandbox mode (`sandbox: true`).** Add `sandbox: true` to `TryMellonConfig` to skip all API calls and WebAuthn ceremonies during local development. `signUp()` and `signIn()` return immediately with the constant `SANDBOX_SESSION_TOKEN`. Your backend **must not** accept this token in production.
- **`SANDBOX_SESSION_TOKEN` constant.** Export this in your backend to recognize and reject sandbox tokens in production.

---

## [1.2.2] — 2026-02-13

### Added

- **`TryMellon.create(config)` factory.** Validates configuration and returns `Result<TryMellon, TryMellonError>` instead of throwing. Prefer this over `new TryMellon(config)` — it lets you handle config errors without try/catch.

---

## [1.2.0] — 2026-02-12

### Added

- **Cross-device QR authentication.** Desktop initiates, mobile approves using its native passkey.

  | Method | Side | Description |
  |--------|------|-------------|
  | `crossDevice.start()` | Desktop | Create a session; get `{ session_id, qr_url, polling_token }` |
  | `crossDevice.startRegistration(options?)` | Desktop | Cross-device passkey registration; `options.externalUserId` is optional |
  | `crossDevice.waitForCompletion(sessionId, signal?, pollingToken?)` | Desktop | Poll/SSE until mobile approves; returns `{ sessionToken, userId, redirectUrl? }` |
  | `crossDevice.getContext(sessionId)` | Mobile | Fetch the WebAuthn options to perform the ceremony |
  | `crossDevice.approve(sessionId)` | Mobile | Run the WebAuthn ceremony and complete the session |

---

## [1.0.0] — 2026-02-11

### Added

- **B2B onboarding flows.** Full SDK support for the TryMellon onboarding session flow for both `maintainer` and `app_user` roles.

---

## [0.1.0] — initial release

### Added

- **`signUp(options)`** — register a new passkey. Returns `Result<{ success, credentialId, sessionToken, user, redirectUrl? }, TryMellonError>`.
- **`signIn(options)`** — authenticate with an existing passkey. Returns `Result<{ authenticated, sessionToken, user, signals, redirectUrl? }, TryMellonError>`.
- **`session.verify(token)`** — validate a session token. Returns `Result<{ valid, userId, externalUserId, tenantId, appId }, TryMellonError>`.
- **`capabilities()`** — check environment support. Returns `{ isPasskeySupported, platformAuthenticatorAvailable, recommendedFlow }`.
- **`otp.send({ userId, email })`** — send an email OTP when WebAuthn is unavailable.
- **`otp.verify({ userId, code, successUrl? })`** — verify the OTP and return a session token.
- **`enroll({ ticketId })`** — enroll a device or entity using a single-use ticket issued by your backend.
- **`client.on(event, handler)`** — subscribe to `start`, `success`, `error`, and `cancelled` events. Returns an unsubscribe function.
- **Automatic retries with exponential backoff** for transient network failures (configurable via `maxRetries` and `retryDelayMs`).
- **`AbortSignal` support** on all async operations.
- **Zero runtime dependencies.** ESM, CJS, and UMD builds. Works in browser, Node.js 18+, and Edge runtimes.
- **TypeScript strict mode.** Complete type coverage with `Result<T, E>` on all public methods.
