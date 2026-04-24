# Changelog

## [4.0.1](https://github.com/ResakaGit/trymellon-js/compare/v4.0.0...v4.0.1) (2026-04-24)

# [4.0.0](https://github.com/ResakaGit/trymellon-js/compare/v3.7.0...v4.0.0) (2026-04-24)

All notable changes to `@trymellon/js` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_No unreleased changes._

---

## [4.0.0] - 2026-04-24

Hosted onboarding moves to a dedicated sub-path; action signing now requires an explicit session token on the wire.

### Added

- **`@trymellon/js/platform`** sub-path — stateless `createPlatform({ apiBaseUrl })` factory. Public surface (3 methods, no publishable key required):
  - `createSignupLink({ returnUrl, refreshUrl?, prefill?, userRole? })` → `{ sessionId, hostedUrl, expiresInSeconds }`.
  - `getSignupStatus(sessionId)` → snapshot of the onboarding FSM.
  - `awaitSignupCompletion(sessionId, { signal?, intervalMs?, maxAttempts? })` — loop polling with `AbortSignal` + backoff; resolves on `completed`, rejects `SESSION_EXPIRED`/`SERVER_ERROR` on terminal failure, `ABORT_ERROR` on cancel.
- `package.json` exports `./platform` + tsup entry + `size-limit` gate **< 5 KB gzip** (measured: 2.92 KB).
- `TryMellonErrorCode` gains `INVALID_STATE` — emitted by `client.action.sign()` when called without an active session (fail-fast, zero HTTP).

### Changed

- **`client.action.sign()`** (ADR-028 Amendment + ADR-SDK-001 Amendment 2026-04-23): the SDK now passes the current `user_session` JWT as an explicit `Authorization: Bearer <session>` override for `POST /v1/actions/challenges` and `POST /v1/actions/:id/verify`. No active session → `INVALID_STATE` before any network I/O.
- **`TryMellon.create(config).platform`** typed `never` (ADR-SDK-005 §2.3) — the TS compiler rejects `client.platform.signUp` on all presets.

### Removed

- **BREAKING — `client.platform.signUp()` and the `OnboardingManager` class** are no longer part of the main client bundle (ADR-SDK-005). The hosted onboarding surface lives exclusively under `@trymellon/js/platform`.
- **BREAKING — `OnboardingStartOptions` + `OnboardingCompleteResult`** removed from the main bundle; re-exported under new types in `@trymellon/js/platform`.
- **BREAKING — `X-App-Id` header** removed from `defaultHeaders` (backend never read it — ghost header cleanup). The `appId` config field is still validated at construction-time for back-compat but no longer attached to requests.
- **BREAKING — `ApiClient.issueActionChallenge(body, sessionToken)` and `ApiClient.verifyActionSignature(challengeId, body, sessionToken)`** now require the session token as a positional argument.

### Performance

- **Core bundle:** `19.97 KB` → `19.69 KB` gzip (−0.28 KB from `OnboardingManager` removal).
- **Web3 sub-path:** 2.70 KB / 10 KB budget (unchanged).
- **Platform sub-path:** 2.92 KB / 5 KB budget (new).

### Migration Guide

```ts
// Before (v3.x)
const client = TryMellon.create({ apiBaseUrl, appId, publishableKey });
const result = await client.platform.signUp({ user_role: 'founder', company_name: 'ACME' });

// After (v4.x)
import { createPlatform } from '@trymellon/js/platform';
const platform = createPlatform({ apiBaseUrl });
const link = await platform.createSignupLink({
  returnUrl: 'https://acme.com/onboarded',
  prefill: { companyName: 'ACME' },
  userRole: 'maintainer',
});
if (link.ok) {
  window.location.href = link.value.hostedUrl; // or render as QR
}
```

---

## [3.7.0] - 2026-04-17

### Added

- **`TryMellonErrorCode`** gains `RECOVERY_USER_NOT_FOUND` (maps backend HTTP 404 `recovery_user_not_found`) and `RECOVERY_TICKET_LIMIT_EXCEEDED` (maps backend HTTP 409 `recovery_ticket_limit_exceeded`). Added to `DEFAULT_MESSAGES` with B2B-oriented wording.
- **`WebhookEventType`** gains `recovery.enrollment.issued` and `recovery.enrollment.completed`.
- **`WebhookEvent`** discriminated union extended with both events and their payload types `RecoveryEnrollmentIssuedPayload` / `RecoveryEnrollmentCompletedPayload`, both exported from the main entry.
- `recovery.enrollment.completed` payload carries `reason: 'b2b_enrollment'` (literal) — distinguishes the B2B flow from the legacy OTP-based recovery at the webhook consumer level.

### Changed

- **`mapBackendErrorCodeToTryMellon`** covers the two new backend wire codes. Case normalization already handled by the existing `toLowerCase().trim()` pipeline.

### Notes

- **No new `TryMellonClient` surface** — B2B recovery completion reuses the existing `client.enroll({ ticketId })` (ADR-045). Integrators issue the ticket via the backend S2S endpoint and deliver the enrollment URL through their own channel.

---

## [3.6.0] - 2026-04-17

### Added

- **`RegisterResult.user.isAnonymous`** and **`AuthenticateResult.user.isAnonymous`** — optional boolean reflecting whether the user was registered anonymously (no `externalUserId`). The backend already emits `is_anonymous` in `POST /v1/passkeys/{register,auth}/finish` responses (F1 · ADR-039); SDK now propagates it through the validators + camelCase transform. Absent when the backend omits the field (older deployments — back-compat preserved).

### Fixed

- **`validateUserEntity` accepts `external_user_id: null`** for anonymous users. The previous strict `isString` check rejected the anonymous response shape at validator level, making the flow unreachable via SDK end-to-end. Null is mapped to `undefined` on the camelCase side (`RegisterResult.user.externalUserId` stays optional).
- **`validateUserEntity` validates optional `is_anonymous: boolean`** — non-boolean values return `INVALID_ARGUMENT` with the `is_anonymous` field hint.

---

## [3.5.0] - 2026-04-17

Web3 identity interop: SIWE + identifier linking surfaces, `web3` preset, tree-shakeable sub-path.

### Added

- **`client.identity.*` namespace** (preset `'web3'`): `linkEmail(email)`, `verifyEmailLink({ identifierId, otp })`, `list()`, `unlink(identifierId)`. `userId` is read from the active session (no parameter needed). Backed by `POST /v1/users/:id/identifiers(/verify)` and `DELETE /v1/users/:id/identifiers/:identifier_id`.
- **`client.siwe.*` namespace** (preset `'web3'`, EIP-4361): `getNonce()`, `prepareMessage(opts)` (pure, zero-dep), `verifyAndSignIn({ message, signature })`. Signing is always the wallet's responsibility.
- **Preset `'web3'` + type narrowing:** `TryMellon.create({ preset: 'web3' })` exposes the new namespaces; `'saas'` (default) types them as `never`, hiding them from autocomplete. Exported helper type `TryMellonClient<P>`.
- **Sub-path export `@trymellon/js/web3`:** tree-shakeable entry exposing `prepareSiweMessage` and F1 types without loading the core client. Size-limit gate `< 10 KB` gzipped.
- **Error codes (F1):** `IDENTIFIER_NOT_OWNED`, `UNLINK_LAST_IDENTIFIER_DENIED`, `SIWE_MESSAGE_MALFORMED`, `SIWE_ADDRESS_MISMATCH`. Full mapping documented in ADR-SDK-004 §2.6.
- **Docs:** `documentation/advanced/web3.md` — integration guide (wagmi / viem / ethers).

### Changed

- **`TryMellonPreset`** expanded from `'saas'` to `'saas' | 'web3'`. Default remains `'saas'` — existing integrators are not affected.
- **`client.siwe.verifyAndSignIn`** emits the standard `success` event (`operation: 'signIn'`), wiring SIWE sign-ins into the existing observability surface.

### Fixed

- **`confirmLinkEmail` request body:** the SDK was sending `{ otp }` but the backend schema requires `{ identifier_id, otp }`. Requests now include `identifier_id` propagated from `linkEmail` challenge. `LinkVerifyOptions` gained the `identifierId` field.
- **Error mapping — `identity_link_unlink_last_identifier_denied`:** previously aliased to `IDENTIFIER_ALREADY_LINKED` (wrong semantics); now maps to the new `UNLINK_LAST_IDENTIFIER_DENIED` code.
- **Error mapping — `identity_link_identifier_not_owned_by_user`:** previously aliased to `FORBIDDEN`; now maps to the specific `IDENTIFIER_NOT_OWNED` code.
- **`prepareSiweMessage` — `statement` runtime guard:** the field is typed `string`, but a consumer passing a non-string via `as any` previously reached `.includes('\n')` and threw a `TypeError`. Now validates `typeof === 'string'` and returns `INVALID_ARGUMENT` — consistent with every other SIWE field validator.

### Migration

Existing integrators using the default `'saas'` preset see no behavior changes. To opt into F1:

```ts
const client = TryMellon.create({ ..., preset: 'web3' });
```

Then `client.value.identity` and `client.value.siwe` become available. No import changes needed — the main entry re-exports everything. For tree-shaken sub-path usage:

```ts
import { prepareSiweMessage } from '@trymellon/js/web3';
```

---

## [3.4.0] - 2026-04-15

### Added

- **`client.session.verifyOffline(token)`:** local JWT validation consuming the backend JWKS (`/.well-known/jwks.json`). Zero runtime dependencies (native WebCrypto). Module-level JWKS cache (TTL 1h). Clock skew ±30s on `exp`. Rejects anything other than RS256 (algorithm-confusion defense). Flattens `https://trymellon.dev/claims` into `customClaims` on the returned `SessionClaims`. New exported type `SessionClaims`. Design and trade-offs documented in ADR-SDK-003.

---

## [3.3.0] - 2026-04-15

F0 Drop-In SaaS surface: preset scaffolding, custom claims, webhook types + HMAC verifier.

### Added

- **`preset` field in `TryMellonConfig`:** opt-in mechanism for future F1/F2 feature namespaces. Default is `'saas'` (only value accepted in F0 — reserves the API surface without shipping unimplemented namespaces). Unknown values fail validation with `INVALID_ARGUMENT`.
- **`customClaims` parameter in `signUp`, `signIn`, and `enroll`:** integrators can inject allow-listed claims into the session JWT under the `https://trymellon.dev/claims` namespace. Validated server-side against the application's `custom_claims_schema`. Limits: 10 keys, 2 KB serialized. Backend rejects with `CUSTOM_CLAIM_NOT_ALLOWED` or `CUSTOM_CLAIMS_TOO_LARGE`.
- **Webhook types + HMAC verifier (`src/core/webhook.ts`):** new public surface for integrators consuming webhook deliveries.
  - Discriminated union `WebhookEvent` over event types: `auth.success`, `credential.revoked`, `application.secret_rotated`, `session.revoked`, `session.logout`, `user.locked`.
  - `verifyWebhookSignature(rawBody, signatureHeader, secret)` with constant-time HMAC-SHA256 comparison, using WebCrypto (zero runtime deps).
- **Error codes (F0 Drop-In SaaS surface):** `SECRET_ROTATION_FORBIDDEN`, `JWT_KID_MISMATCH`, `INTROSPECTION_FAILED`, `CUSTOM_CLAIM_NOT_ALLOWED`, `CUSTOM_CLAIMS_TOO_LARGE`. Mapped from the backend `<bc>.errors.ts` catalog.
- **Semantic error codes:** `NOT_FOUND`, `TENANT_INACTIVE`, `INVITATION_NOT_FOUND` — disambiguate from `INVALID_ARGUMENT` / `FORBIDDEN` / `TICKET_NOT_FOUND` for clearer integrator debugging.
- **`OTP_INVALID_OR_EXPIRED`:** maps backend `invalid_or_expired_code` (email fallback + recovery paths).
- **`documentation/advanced/` folder:** placeholder marking the progressive-disclosure pattern — F1/F2 opt-in namespaces will land here.

### Changed

- **Backend error code mapper coverage** extended to cover `credential_not_found`, `no_credentials`, `replay_detected`, `gone`, `application_not_found`, `tenant_inactive`, `invitation_not_found`, OTP codes, and F0 codes. Previously these fell through to `UNKNOWN_ERROR`.
- **Comments in `src/errors.ts`** stripped of sprint/ADR references; comments now describe *what* the codes are for, not *when they were added*.

### Removed

- **Alias `already_claimed` → `ACTION_ALREADY_CLAIMED`:** backend emits only the specific `challenge_already_claimed`. The loose alias would mis-categorize unrelated "X already claimed" codes.
- **`'ABORTED'`** from the `API.md` error-code list — it was a documentation-only entry and never present in the `TryMellonErrorCode` union.

---

## [3.2.0] - 2026-04-09

Shared SSE + polling fallback between cross-device and bridge flows. Unified abort semantics. Action signing wiring note.

### Added

- **Shared SSE-with-polling fallback (`withSseFallback`).** Internal utility extracted from `CrossDeviceManager` and `BridgeManager` into `polling-utils`. Both cross-device and bridge flows now share a single, tested SSE implementation with automatic polling fallback when `EventSource` is unavailable.
- **README: `### Action Signing` section.** Documents `client.action.sign(opts)` (the only public action-signing surface) with `ActionSignOptions` / `ActionSignResult` types and the error codes `ACTION_CHALLENGE_EXPIRED`, `ACTION_ALREADY_CLAIMED`, `ACTION_PAYLOAD_MISMATCH`. Backend verification pattern covered per KP Trust Layer ADR-029.

### Fixed

- **Bridge: abort signal was silently dropped during SSE wait.** Calling `bridge.waitForResult()` with an `AbortSignal` and firing that signal while an SSE connection was open caused the operation to hang instead of resolving. The signal is now wired through `withSseFallback` and cancels correctly.
- **Unified `ABORT_ERROR` code.** Two codes (`ABORT_ERROR` and `ABORTED`) existed for aborted operations, leading to inconsistent error handling. All abort paths now return `ABORT_ERROR`. **Breaking at the consumer level** for any code checking for `ABORTED` — rename to `ABORT_ERROR`.
- **`QR_*` backend error codes now map to SDK errors.** 13 server error codes prefixed `QR_` (e.g. `qr_rate_limited`, `qr_session_expired`) were previously surfaced as unknown errors. They now map to the correct SDK error codes. Rate-limit errors trigger the exponential backoff logic in `crossDevice.waitForCompletion()`.
- **`StorageLike | undefined` in `EnrollmentManager` and `TryMellon`.** Both classes now fall back to `createInMemoryStorage()` when the provided storage is `undefined` (SSR/Node environments), preventing a TypeScript error on construction.
- **`onboarding-manager.ts`: `'pending'` not in `OnboardingStatus` union.** Status literal corrected to `'pending_data'` — the actual value emitted by the backend.
- **`BridgeManager` + `CrossDeviceManager`: SSE callback type widened.** `parseBridgeStatusMessage` and `parseCrossDeviceMessage` callbacks now accept `MessageEvent | { data: string }` to cover both browser SSE and polling paths without a type error.
- **`validateSession`: 30 s cache + request coalescing.** `ApiClient.validateSession()` now caches successful responses for 30 s and deduplicates in-flight requests for the same token. Concurrent calls during a single page render (e.g., multiple middleware guards) hit the network once. Revocations propagate within the TTL window.
- **`startEmailFallback` / `verifyEmailCode`: payload field renamed `userId` → `user_id`.** The SDK was sending camelCase `userId` but the backend expects `user_id`. Fixed in `api.ts`. Previously both email fallback endpoints would always return a validation error silently.
- **`getCrossDeviceStatusUrl`: polling token removed from query string.** The URL no longer appends `?polling_token=xxx`. The polling token is now sent via the `X-Polling-Token` header (fetch-based SSE path) to avoid exposure in server access logs and `Referer` headers. **Breaking for SSE via native `EventSource`** — but `EventSource` cannot send custom headers, so that path already required the workaround; the SDK's internal fetch-based SSE is unaffected.
- **`context-hash.ts`: module-level singleton removed (SSR contamination fix).** The previous `inMemoryStorageFallback` was a module-level constant, meaning all SSR requests in the same Node.js process shared the same context hash. `getOrCreateContextHash` now requires an explicit `StorageLike` argument. Callers that need in-memory fallback must create one via `createInMemoryStorage()` and keep it as an instance-level field.
- **`BridgeManager`: `MAX_BRIDGE_POLL_ATTEMPTS` cap + instance-level `_inMemoryFallback`.** The poll loop is now a bounded `for` loop (max 200 iterations ≈ 300 s at 1.5 s interval). Previously an unbounded `for (;;)` could run forever if the signal was never fired. Each `BridgeManager` instance owns its own `_inMemoryFallback` storage to prevent SSR cross-request contamination.

### Docs

- **`enroll()` is the correct method for entity enrollment.** The API reference and entity enrollment guide previously showed `client.invite.accept()`, which does not exist. The correct call is `client.enroll({ ticketId })`.
- **`/v1/enrollment-bridge/init` now returns `entity_id`.** The backend echoes the `entity_id` you sent in the init request, so you no longer need to store it between `/init` and `/complete`.
- **Quick-start guide no longer uses `.value!`.** The sandbox example now uses a proper `.ok` check before accessing `.value`. Using `!` on a `Result` without checking `.ok` first will crash if the config is invalid.
- **`signIn()` options: `mediation` and `successUrl` now documented** in the Register & Authenticate guide (previously only in the API reference).

---

## [3.1.5] - 2026-04-09

### Fixed

- **`withSseFallback` — EventSource closed on abort.** The abort handler (`onAbort`) now calls `es?.close()` before resolving with `ABORT_ERROR`. `es` is declared before the handler so the closure captures the binding by reference. Previously the EventSource stayed open if the signal was fired externally.
- **`startEmailFallback` / `verifyEmailCode` — snake_case payload correct.** Tests aligned to reflect that the SDK sends `user_id` (snake_case) to the backend, not `userId`. Matches the SDK → backend convention.
- **`bridge-manager.test.ts` — missing `createInMemoryStorage` mock added.** `vi.mock('../../src/core/context-hash')` now includes `createInMemoryStorage` required by `bridge-manager.ts`. 18 tests that failed due to the missing export now pass.
- **`context-hash.test.ts` — tests aligned to the new behavior.** Removed the expectation of hash consistency across calls when storage throws. The new design has no fallback singleton; each failed call generates a fresh hash. Callers needing consistency must pass their own `createInMemoryStorage()`.
- **`cross-device-manager.test.ts` — `pollingToken` via `X-Polling-Token` header.** Test updated to verify that when `pollingToken` is provided, the fetch-based SSE path is used (not `EventSource`), `X-Polling-Token` is sent as a header, and `getCrossDeviceStatusUrl` is called with `sessionId` only.

---

## [3.1.4] - 2026-04-08

### Fixed

- **Audit-21 — bridge terminal states, enrollment result fields, bridge discriminator.** Closes #11, #12, #15. See commit `eeb9702`.

---

## [3.1.3] - 2026-04-08

### Fixed

- **Audit wave fixes — wire types, bridge statuses, error codes.** See commit `573ec7b`.
- **Tests updated to match audit fixes** from the previous session. See commit `2d445ea`.

---

## [3.1.2] - 2026-04-08

### Fixed

- Release-only version bump (`chore(release): 3.1.2`). No user-facing changes.

---

## [3.1.1] - 2026-04-08

### Fixed

- Release-only version bump (`chore(release): 3.1.1`). No user-facing changes.

---

## [3.1.0] - 2026-04-08

### Added

- **Cross-device real-time push via SSE.** `crossDevice.waitForCompletion()` now opens a Server-Sent Events connection in the browser, receiving a push notification the instant the mobile device approves the session. Falls back automatically to polling when `EventSource` is unavailable (Node.js, server-side rendering). No configuration required.
- **Polling token passed as query param for SSE.** `EventSource` cannot send custom request headers. The SDK now appends `polling_token` as a query parameter in the SSE URL so authenticated connections work without additional configuration. (Later tightened in 3.2.0 — moved to `X-Polling-Token` header on the fetch-based path.)

### Fixed

- **Abort signal race on SSE → polling fallback.** If a signal fired between SSE teardown and polling startup, the operation would ignore the cancellation. The signal is now tracked continuously across the SSE-to-polling transition.
- **`EventSource` constructor error now triggers polling fallback.** A constructor throw is treated as an SSE failure and falls back to polling immediately instead of propagating an unhandled error.

### Performance

- **Cross-device polling interval raised from 2 s to 3 s** when SSE is unavailable. Rate-limit backoff increased from 5 s to 8 s. Reduces API load on slow or constrained clients.

---

## [3.0.1] - 2026-04-08

### Fixed

- Release-only version bump (`chore(release): 3.0.1`). No user-facing changes.

---

## [3.0.0] - 2026-04-08

**All renames are intent-based — no behavior changes. Update call sites as listed.**

### Changed

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

## [2.3.6] - 2026-04-08

### Added

- **`resolveCredentialName(aaguid, alias)`:** Maps a passkey AAGUID to a human-readable authenticator name (e.g. `"Apple Face ID"`, `"Windows Hello"`, `"YubiKey 5C NFC"`). Source: FIDO Alliance Metadata Service. Use this in your dashboard UI to show users which device holds their passkey.
- **`@trymellon/testing` package:** Node-only test helpers for simulating passkey flows in CI without a real authenticator device. Install as a dev dependency; this package imports Node modules and must not be bundled for the browser.

### Fixed

- **Response envelope updated to `{ ok, data }`.** The SDK now reads the fintech envelope format used by the backend since WebAuthSaas v1.6.0. This was a silent failure — API responses were parsed as errors even on success.

---

## [2.3.0] - 2026-03-16

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

## [1.7.0] - 2026-02-28

### Added

- **`crossDevice.getContext(sessionId)` is now public.** Fetch the WebAuthn context on the mobile side of a cross-device session. The response includes `type` (`'auth' | 'registration'`), the WebAuthn `options` object, and optional `approvalContext` and `applicationName` fields.
- **`approvalContext` in cross-device context.** When a session is initiated with an approval context (e.g. for AI agent flows), the mobile side can read it via `getContext()` and show it to the user before approving.

---

## [1.6.0] - 2026-02-22

### Added

- **React adapter (`@trymellon/js/react`).** `useSignUp`, `useSignIn`, and `useEnroll` hooks for React 18 and 19. Manages loading state, errors, and result handling. Import from `@trymellon/js/react`.

---

## [1.5.0] - 2026-02-21

### Added

- **Account recovery (`passkey.recover(options)`).** Lets a user regain access after losing their passkey device. Flow:
  1. Your backend calls `POST /v1/users/recovery/start` (server-to-server) to send an OTP to the user's email.
  2. The user enters the 6-digit OTP in your frontend.
  3. Call `client.passkey.recover({ externalUserId, otp })`. The SDK verifies the OTP, prompts the OS for a new passkey registration, and returns a fresh session token.

---

## [1.4.5] - 2026-02-19

### Fixed

- **Edge runtime compatibility.** Removed all Node.js dependencies (`Buffer`, `node:crypto`). All crypto operations now use `globalThis.crypto` (Web Crypto API). The SDK runs in Cloudflare Workers, Vercel Edge Functions, Deno, and any browser without polyfills.

---

## [1.4.4] - 2026-02-17

### Fixed

- **`204 No Content` handling.** The fetch client previously threw `"Unexpected end of JSON input"` on responses with no body (e.g. cross-device verify). These are now handled correctly and resolve to `ok(undefined)`.

---

## [1.4.0] - 2026-02-16

### Added

- **`CHALLENGE_MISMATCH` error code.** Returned when the WebAuthn challenge has already been used or has expired. This is common in cross-device flows if the user delays. Display a message such as: *"This session expired. Please scan the QR code again."*

---

## [1.3.3] - 2026-02-15

### Added

- **`origin` config option.** Explicitly set the `Origin` header sent with all passkey and cross-device API calls. In browser environments the SDK defaults to `window.location.origin`. In Node.js, SSR, or server-side flows, you must set this explicitly — WebAuthn requires a matching origin.

---

## [1.3.0] - 2026-02-13

### Added

- **Sandbox mode (`sandbox: true`).** Add `sandbox: true` to `TryMellonConfig` to skip all API calls and WebAuthn ceremonies during local development. `signUp()` and `signIn()` return immediately with the constant `SANDBOX_SESSION_TOKEN`. Your backend **must not** accept this token in production.
- **`SANDBOX_SESSION_TOKEN` constant.** Export this in your backend to recognize and reject sandbox tokens in production.

---

## [1.2.2] - 2026-02-13

### Added

- **`TryMellon.create(config)` factory.** Validates configuration and returns `Result<TryMellon, TryMellonError>` instead of throwing. Prefer this over `new TryMellon(config)` — it lets you handle config errors without try/catch.

---

## [1.2.0] - 2026-02-12

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

## [1.0.0] - 2026-02-11

### Added

- **B2B onboarding flows.** Full SDK support for the TryMellon onboarding session flow for both `maintainer` and `app_user` roles.

---

## [0.1.0] - initial release

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

---

[Unreleased]: https://github.com/ResakaGit/trymellon-js/compare/v4.0.0...HEAD
[4.0.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.7.0...v4.0.0
[3.7.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.6.0...v3.7.0
[3.6.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.5.0...v3.6.0
[3.5.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.4.0...v3.5.0
[3.4.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.1.5...v3.2.0
[3.1.5]: https://github.com/ResakaGit/trymellon-js/compare/v3.1.4...v3.1.5
[3.1.4]: https://github.com/ResakaGit/trymellon-js/compare/v3.1.3...v3.1.4
[3.1.3]: https://github.com/ResakaGit/trymellon-js/compare/v3.1.2...v3.1.3
[3.1.2]: https://github.com/ResakaGit/trymellon-js/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/ResakaGit/trymellon-js/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/ResakaGit/trymellon-js/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/ResakaGit/trymellon-js/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/ResakaGit/trymellon-js/compare/v2.3.13...v3.0.0
[2.3.6]: https://github.com/ResakaGit/trymellon-js/compare/v2.3.5...v2.3.6
[2.3.0]: https://github.com/ResakaGit/trymellon-js/compare/v1.7.0...v2.3.0
[1.7.0]: https://github.com/ResakaGit/trymellon-js/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/ResakaGit/trymellon-js/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/ResakaGit/trymellon-js/compare/v1.4.5...v1.5.0
[1.4.5]: https://github.com/ResakaGit/trymellon-js/compare/v1.4.4...v1.4.5
[1.4.4]: https://github.com/ResakaGit/trymellon-js/compare/v1.4.0...v1.4.4
[1.4.0]: https://github.com/ResakaGit/trymellon-js/compare/v1.3.3...v1.4.0
[1.3.3]: https://github.com/ResakaGit/trymellon-js/compare/v1.3.0...v1.3.3
[1.3.0]: https://github.com/ResakaGit/trymellon-js/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/ResakaGit/trymellon-js/compare/v1.2.0...v1.2.2
[1.2.0]: https://github.com/ResakaGit/trymellon-js/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/ResakaGit/trymellon-js/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/ResakaGit/trymellon-js/releases/tag/v0.1.0
