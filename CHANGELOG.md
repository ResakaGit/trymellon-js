# [Unreleased]

### Added

- **`preset` field in `TryMellonConfig`:** opt-in mechanism for future F1/F2 feature namespaces. Default is `'saas'` (only value accepted in F0 — reserves the API surface without shipping unimplemented namespaces). Unknown values fail validation with `INVALID_ARGUMENT`.
- **`customClaims` parameter in `signUp`, `signIn`, and `enroll`:** integrators can inject allow-listed claims into the session JWT under the `https://trymellon.dev/claims` namespace. Validated server-side against the application's `custom_claims_schema`. Limits: 10 keys, 2KB serialized. Backend rejects with `CUSTOM_CLAIM_NOT_ALLOWED` or `CUSTOM_CLAIMS_TOO_LARGE`.
- **Webhook types + HMAC verifier (`src/core/webhook.ts`):** new public surface for integrators consuming webhook deliveries.
  - Discriminated union `WebhookEvent` over event types: `auth.success`, `credential.revoked`, `application.secret_rotated`, `session.revoked`, `session.logout`, `user.locked`.
  - `verifyWebhookSignature(rawBody, signatureHeader, secret)` with constant-time HMAC-SHA256 comparison, using WebCrypto (zero runtime deps).
- **Error codes (F0 Drop-In SaaS surface):** `SECRET_ROTATION_FORBIDDEN`, `JWT_KID_MISMATCH`, `INTROSPECTION_FAILED`, `CUSTOM_CLAIM_NOT_ALLOWED`, `CUSTOM_CLAIMS_TOO_LARGE`. Mapped from the backend `<bc>.errors.ts` catalog.
- **Semantic error codes:** `NOT_FOUND`, `TENANT_INACTIVE`, `INVITATION_NOT_FOUND` — disambiguate from `INVALID_ARGUMENT` / `FORBIDDEN` / `TICKET_NOT_FOUND` for clearer integrator debugging.
- **`OTP_INVALID_OR_EXPIRED`:** maps backend `invalid_or_expired_code` (email fallback + recovery paths).
- **`documentation/advanced/` folder:** placeholder marking the progressive-disclosure pattern — F1/F2 opt-in namespaces will land here.

### Changed

- **Backend error code mapper coverage** extended to cover `credential_not_found`, `no_credentials`, `replay_detected`, `gone`, `application_not_found`, `tenant_inactive`, `invitation_not_found`, OTP codes, and F0 codes. Previously these fell through to `UNKNOWN_ERROR`.
- **Comments stripped of sprint/ADR references** in `src/errors.ts` per CLAUDE.md Yanagi rule; comments now describe *what* the codes are for, not *when they were added*.

### Removed

- **Alias `already_claimed` → `ACTION_ALREADY_CLAIMED`:** backend emits only the specific `challenge_already_claimed`. The loose alias would mis-categorize unrelated "X already claimed" codes.
- **`'ABORTED'` from `API.md` error-code list:** was a documentation-only entry; not present in the `TryMellonErrorCode` union.

---

# [3.2.0](https://github.com/ResakaGit/trymellon-js/compare/v3.1.5...v3.2.0) (2026-04-09)


### Features

* **release:** v3.2.0 — ActionManager (KP-ACTION-01) ([4271818](https://github.com/ResakaGit/trymellon-js/commit/4271818dc179396864e9746d241618dce37c826b))

## [3.2.0] - 2026-04-08

### Added

- **`ActionManager` — API pública para Action Signing (KP-ACTION-01):** Nueva clase `ActionManager` exportada desde `@trymellon/js`. Expone `client.action.issueChallenge(payload)` y `client.action.verify(challenge, payload, options)` para el flujo de firma WebAuthn de acciones críticas (transfers, confirmaciones). Integrado en `TryMellon` como `this.action`. Tipos `ActionChallenge`, `ActionVerifyOptions`, `ActionVerifyResult` exportados desde el índice público.
- **`createError` — nuevo código `ACTION_SIGN_ERROR`:** Agregado a `errors.ts` para errores específicos del flujo de firma de acción.
- **Tipos de SDK extendidos:** `src/types.ts` incluye los nuevos tipos de Action Signing. `src/index.ts` exporta `ActionManager`, tipos de acción y `ACTION_SIGN_ERROR`.
- **Tests unitarios para `ActionManager` y validators:** 38 tests cubriendo happy path, sad paths de seguridad (challenge expirado, payload mismatch, signature inválida) y edge cases.
- **`validateIssueActionChallengeResponse` / `validateVerifyActionSignatureResponse`:** Validators en `src/core/validators/action.ts` para verificar shapes de respuesta del backend.

### Changed

- **`README.MD` actualizado:** Documentación del nuevo flujo de Action Signing con ejemplos de uso de `client.action.issueChallenge()` y `client.action.verify()`.

## [3.1.5](https://github.com/ResakaGit/trymellon-js/compare/v3.1.4...v3.1.5) (2026-04-09)


### Bug Fixes

* **sdk:** close EventSource on abort, snake_case body fields, test alignment ([b402f94](https://github.com/ResakaGit/trymellon-js/commit/b402f94625975f611ec159a30da16c54e1c69418))

## [3.1.5] - 2026-04-08

### Fixed

- **`withSseFallback` — cierra EventSource en abort:** El handler de abort (`onAbort`) ahora llama a `es?.close()` antes de resolver el error `ABORT_ERROR`. La `es` se declara antes del handler para que la closure capture el binding por referencia. Antes el EventSource quedaba abierto si se abortaba la señal externamente.
- **`startEmailFallback` / `verifyEmailCode` — payload snake_case correcto:** Los tests actualizados para reflejar que el SDK envía `user_id` (snake_case) al backend, no `userId`. Alineado con la convención SDK → backend de la plataforma.
- **`bridge-manager.test.ts` — mock `createInMemoryStorage` agregado:** El `vi.mock('../../src/core/context-hash')` ahora incluye `createInMemoryStorage` que `bridge-manager.ts` requiere. 18 tests que fallaban por export faltante ahora pasan.
- **`context-hash.test.ts` — tests actualizados al nuevo comportamiento:** Eliminada expectativa de hash consistente entre llamadas cuando el storage lanza excepción. El nuevo diseño no tiene singleton de fallback; cada llamada fallida genera un hash fresco. Callers que necesiten consistencia deben pasar un `createInMemoryStorage()` propio.
- **`cross-device-manager.test.ts` — pollingToken via X-Polling-Token header:** Test actualizado para verificar que cuando se provee `pollingToken`, se usa el path fetch-based SSE (no EventSource), el header `X-Polling-Token` se envía, y `getCrossDeviceStatusUrl` se llama solo con `sessionId`.

## [3.1.4](https://github.com/ResakaGit/trymellon-js/compare/v3.1.3...v3.1.4) (2026-04-08)


### Bug Fixes

* **sdk:** audit-21 — bridge terminal states, enrollment result fields, bridge discriminator ([eeb9702](https://github.com/ResakaGit/trymellon-js/commit/eeb9702279fd24c737984917fb14198a36339a40)), closes [#11](https://github.com/ResakaGit/trymellon-js/issues/11) [#12](https://github.com/ResakaGit/trymellon-js/issues/12) [#15](https://github.com/ResakaGit/trymellon-js/issues/15)

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
- **README: `### Action Signing` section.** Documents `client.action.sign()` API (challenge/verify flow), error codes (`ACTION_CHALLENGE_EXPIRED`, `ACTION_ALREADY_CLAIMED`, `ACTION_PAYLOAD_MISMATCH`), and backend verification pattern. Feature is gated behind backend wiring (KP Trust Layer ADR-029) — SDK UI layer pending sprint implementation.

### Fixed

- **Bridge: abort signal was silently dropped during SSE wait.** Calling `bridge.waitForResult()` with an `AbortSignal` and firing that signal while an SSE connection was open caused the operation to hang instead of resolving. The signal is now wired through `withSseFallback` and cancels correctly.
- **Unified `ABORT_ERROR` code.** Two codes (`ABORT_ERROR` and `ABORTED`) existed for aborted operations, leading to inconsistent error handling. All abort paths now return `ABORT_ERROR`. If your code checks for `ABORTED`, rename it to `ABORT_ERROR`.
- **`QR_*` backend error codes now map to SDK errors.** 13 server error codes prefixed `QR_` (e.g. `qr_rate_limited`, `qr_session_expired`) were previously surfaced as unknown errors. They now map to the correct SDK error codes. Rate-limit errors trigger the exponential backoff logic in `crossDevice.waitForCompletion()`.
- **`StorageLike | undefined` in `EnrollmentManager` and `TryMellon`.** Both classes now fall back to `createInMemoryStorage()` when the provided storage is `undefined` (SSR/Node environments), preventing a TypeScript error on construction.
- **`onboarding-manager.ts`: `'pending'` not in `OnboardingStatus` union.** Status literal corrected to `'pending_data'` — the actual value emitted by the backend.
- **`BridgeManager` + `CrossDeviceManager`: SSE callback type widened.** `parseBridgeStatusMessage` and `parseCrossDeviceMessage` callbacks now accept `MessageEvent | { data: string }` to cover both browser SSE and polling paths without a type error.
- **`validateSession`: 30 s cache + request coalescing.** `ApiClient.validateSession()` now caches successful responses for 30 s and deduplicates in-flight requests for the same token. Concurrent calls during a single page render (e.g., multiple middleware guards) hit the network once. Revocations propagate within the TTL window.
- **`startEmailFallback` / `verifyEmailCode`: payload field renamed `userId` → `user_id`.** The SDK was sending camelCase `userId` but the backend expects `user_id`. Fixed in `api.ts`. Previously both email fallback endpoints would always return a validation error silently.
- **`getCrossDeviceStatusUrl`: polling token removed from query string.** The URL no longer appends `?polling_token=xxx`. The polling token is now sent via the `X-Polling-Token` header (fetch-based SSE path) to avoid exposure in server access logs and Referer headers. **Breaking for SSE via native `EventSource`** — but `EventSource` cannot send custom headers, so that path already required the workaround; the SDK's internal fetch-based SSE is unaffected.
- **`context-hash.ts`: module-level singleton removed (SSR contamination fix).** The previous `inMemoryStorageFallback` was a module-level constant, meaning all SSR requests in the same Node.js process shared the same context hash. `getOrCreateContextHash` now requires an explicit `StorageLike` argument. Callers that need in-memory fallback must create one via `createInMemoryStorage()` and keep it as an instance-level field.
- **`BridgeManager`: `MAX_BRIDGE_POLL_ATTEMPTS` cap + instance-level `_inMemoryFallback`.** The poll loop is now a bounded `for` loop (max 200 iterations ≈ 300 s / 1.5 s interval). Previously an unbounded `for(;;)` could run forever if the signal was never fired. Each `BridgeManager` instance owns its own `_inMemoryFallback` storage to prevent SSR cross-request contamination.

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
