# API Reference — `@trymellon/js` v4.0.0

Complete reference for the public surface of the `@trymellon/js` SDK.
Every symbol documented below is exported from the package and ships in
the TypeScript `.d.ts` — nothing here is internal.

The SDK is organised into one main entry and five sub-path entries:

| Import path                | What it exposes                                                                |
| -------------------------- | ------------------------------------------------------------------------------ |
| `@trymellon/js`            | `TryMellon` client, types, errors, webhook verifier, logger, AAGUID helpers   |
| `@trymellon/js/platform`   | `createPlatform()` — stateless hosted-signup helper (ADR-SDK-005)              |
| `@trymellon/js/web3`       | `prepareSiweMessage()` + EIP-4361 types; pure, wallet-agnostic                 |
| `@trymellon/js/ui`         | Web Components `<trymellon-auth>` / `<trymellon-auth-modal>` (side-effectful)  |
| `@trymellon/js/react`      | `TryMellonProvider`, `useTryMellon`, `useSignUp`, `useSignIn`, `useEnroll`    |
| `@trymellon/js/vue`        | `provideTryMellon`, `useTryMellon`, `useSignUp`, `useSignIn`, `useEnroll`     |
| `@trymellon/js/angular`    | `provideTryMellon`, `TryMellonService`, `TRYMELLON_CLIENT`                     |

---

## Table of Contents

1. [Conventions](#conventions)
2. [TryMellon Client](#trymellon-client)
   - [`TryMellon.create(config)`](#trymelloncreateconfig)
   - [`TryMellon.isSupported()`](#trymellonissupported)
   - [`client.signUp(options)`](#clientsignupoptions)
   - [`client.signIn(options)`](#clientsigninoptions)
   - [`client.enroll(options)`](#clientenrolloptions)
   - [`client.capabilities()`](#clientcapabilities)
   - [`client.getContextHash()`](#clientgetcontexthash)
   - [`client.version()`](#clientversion)
   - [`client.on(event, handler)`](#clientonevent-handler)
3. [Session Namespace — `client.session`](#session-namespace)
4. [OTP Namespace — `client.otp`](#otp-namespace)
5. [Passkey Recovery — `client.passkey`](#passkey-recovery)
6. [Cross-Device Namespace — `client.crossDevice`](#cross-device-namespace)
7. [Bridge Namespace — `client.bridge`](#bridge-namespace)
8. [Action Signing — `client.action`](#action-signing)
9. [Identity Linking — `client.identity` (preset: `web3`)](#identity-linking)
10. [SIWE — `client.siwe` (preset: `web3`)](#siwe)
11. [Webhook Verification](#webhook-verification)
12. [Logger & Device Helpers](#logger--device-helpers)
13. [`@trymellon/js/platform`](#trymellonjsplatform)
14. [`@trymellon/js/web3`](#trymellonjsweb3)
15. [`@trymellon/js/ui` — Web Components](#trymellonjsui--web-components)
16. [Framework Wrappers](#framework-wrappers)
17. [Error Codes](#error-codes)

---

## Conventions

### Result pattern

Every async operation in the SDK returns `Result<T, TryMellonError>`. The SDK
never throws from its public methods — you narrow the result with the `ok`
discriminant:

```ts
import type { Result } from '@trymellon/js';

const result = await client.signIn({ externalUserId: 'user_123' });

if (!result.ok) {
  // result.error is a TryMellonError with .code + .message + .details
  return renderError(result.error);
}

// result.value is the typed success payload
return renderSession(result.value.sessionToken);
```

Helpers re-exported from `@trymellon/js`:

```ts
import { ok, err, type Result } from '@trymellon/js';

const wrap = (token: string): Result<{ token: string }, never> => ok({ token });
```

### Error handling

```ts
import { isTryMellonError, type TryMellonError } from '@trymellon/js';

function handle(error: unknown) {
  if (!isTryMellonError(error)) return;
  switch (error.code) {
    case 'USER_CANCELLED':
      return showToast('Prompt cancelled');
    case 'RATE_LIMIT_EXCEEDED':
      return showToast('Slow down and try again');
    default:
      return reportToSentry(error);
  }
}
```

See [Error Codes](#error-codes) for the full list.

### Event bus

`client.on(event, handler)` subscribes to lifecycle signals (`start` / `success`
/ `error` / `cancelled`). The handler receives a discriminated `EventPayload`
whose `operation` field is one of `'signUp' | 'signIn' | 'enroll'`. Use this for
analytics, telemetry, or driving UI state without re-implementing the flow.

### Preset gating

`TryMellonConfig.preset` selects which namespaces are active on the client:

- `'saas'` (default) — `signUp`, `signIn`, `enroll`, `otp`, `session`, `bridge`,
  `crossDevice`, `action`, `passkey`. `identity` and `siwe` are typed `never`.
- `'web3'` — everything in `'saas'` plus `identity.*` and `siwe.*`.

The type checker rejects `client.identity.linkEmail(...)` on a `'saas'` client
at compile time.

---

## TryMellon Client

### `TryMellon.create(config)`

Validates configuration and constructs a client without throwing. This is the
recommended constructor — the class `new TryMellon(config)` form is
`@deprecated` and only retained for backward compatibility.

```ts
static create<P extends TryMellonPreset = 'saas'>(
  config: TryMellonConfig & { preset?: P },
): Result<TryMellonClient<P>, TryMellonError>
```

#### Parameters

| Field                 | Type                                      | Required | Description                                                                                                      |
| --------------------- | ----------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `appId`               | `string`                                  | yes      | Application identifier from the dashboard.                                                                       |
| `publishableKey`      | `string`                                  | yes      | Publishable key (`cli_…`). Safe to embed in client bundles.                                                      |
| `apiBaseUrl`          | `string`                                  | no       | Override the API base URL. Default: `'https://api.trymellonauth.com'`. Must be http/https.                        |
| `timeoutMs`           | `number`                                  | no       | HTTP timeout. Default `30000`. Range `1000`–`300000`.                                                            |
| `maxRetries`          | `number`                                  | no       | Max retries on transient errors. Default `3`. Range `0`–`10`.                                                    |
| `retryDelayMs`        | `number`                                  | no       | Initial backoff. Default `1000`. Range `100`–`10000`.                                                            |
| `logger`              | `Logger`                                  | no       | Injected logger. See [Logger & Device Helpers](#logger--device-helpers).                                         |
| `enableTelemetry`     | `boolean`                                 | no       | When `true`, emits anonymous latency telemetry after successful `signUp` / `signIn`. Opt-in only.                |
| `telemetrySender`     | `TelemetrySender`                         | no       | Custom sender for telemetry. Used only when `enableTelemetry === true`.                                          |
| `telemetryEndpoint`   | `string`                                  | no       | Endpoint for the default telemetry sender. Default `'https://api.trymellonauth.com/v1/telemetry'`.               |
| `sandbox`             | `boolean`                                 | no       | When `true`, `signUp` / `signIn` bypass WebAuthn and return a fixed token. Development only.                     |
| `sandboxToken`        | `string`                                  | no       | Override the sandbox token. Defaults to `SANDBOX_SESSION_TOKEN`.                                                 |
| `origin`              | `string`                                  | no       | Explicit `Origin` header. Defaults to `window.location.origin`. Required in Node/SSR contexts.                   |
| `contextHashStorage`  | `{ getItem; setItem }`                    | no       | Storage for context hash. Defaults to `sessionStorage`, then an in-memory fallback.                              |
| `preset`              | `'saas' \| 'web3'`                        | no       | Feature preset. Default `'saas'`. Controls `identity` / `siwe` visibility.                                       |

#### Returns

```ts
Result<TryMellonClient<P>, TryMellonError>
```

`TryMellonClient<P>` narrows the instance by preset:

```ts
type TryMellonClient<P extends TryMellonPreset = 'saas'> = Omit<
  TryMellon,
  'identity' | 'siwe'
> & {
  readonly platform: never;
  readonly identity: P extends 'web3' ? TryMellon['identity'] : never;
  readonly siwe: P extends 'web3' ? TryMellon['siwe'] : never;
};
```

#### Example

```ts
import { TryMellon } from '@trymellon/js';

const creation = TryMellon.create({
  appId: 'app_abc123',
  publishableKey: 'cli_xyz789',
  preset: 'saas',
});

if (!creation.ok) {
  throw creation.error;
}

const client = creation.value;
```

#### Errors

- `INVALID_ARGUMENT` — any field fails validation (`appId` empty, `timeoutMs`
  out of range, `apiBaseUrl` not a URL, `preset` not one of `'saas' | 'web3'`).

---

### `TryMellon.isSupported()`

Synchronous feature detection — `true` when the current environment exposes the
WebAuthn APIs.

```ts
static isSupported(): boolean
```

#### Example

```ts
if (!TryMellon.isSupported()) {
  window.location.assign('/login/fallback');
}
```

---

### `client.signUp(options)`

Registers a new credential (passkey) for the user and returns a session token.

```ts
signUp(options: RegisterOptions): Promise<Result<RegisterResult, TryMellonError>>
```

#### Parameters — `RegisterOptions`

| Field                | Type                                         | Required | Description                                                                             |
| -------------------- | -------------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `externalUserId`     | `string \| ExternalUserId`                   | no       | Stable user identifier in your system. Omit for anonymous signup (F1 · ADR-039).         |
| `external_user_id`   | `string \| ExternalUserId`                   | no       | **Deprecated.** snake_case alias of `externalUserId`.                                    |
| `authenticatorType`  | `'platform' \| 'cross-platform'`             | no       | Preferred authenticator attachment. Hint to the browser, not a guarantee.                |
| `successUrl`         | `string`                                     | no       | Post-success redirect URL. Validated server-side against the app allowlist.              |
| `customClaims`       | `CustomClaims`                               | no       | JWT custom claims. Max 10 keys, 2 KB serialised. Must match the app's schema.            |
| `signal`             | `AbortSignal`                                | no       | Aborts the WebAuthn ceremony. In-flight HTTP requests are not cancelled.                 |

#### Returns

```ts
interface RegisterResult {
  success: true;
  credentialId: string;
  /** snake_case alias. Prefer `credentialId`. */
  credential_id?: string;
  status: string;
  sessionToken: string;
  user: {
    userId: string;
    /** Undefined when signed up anonymously. */
    externalUserId?: string;
    email?: string;
    metadata?: Record<string, unknown>;
    /** `true` when registered without `externalUserId` (F1). */
    isAnonymous?: boolean;
  };
  /** Present when `successUrl` was accepted by the app allowlist. */
  redirectUrl?: string;
}
```

#### Example

```ts
import { TryMellon, type Result, type RegisterResult, type TryMellonError } from '@trymellon/js';

async function register(client: TryMellon, externalUserId: string) {
  const result: Result<RegisterResult, TryMellonError> = await client.signUp({
    externalUserId,
    authenticatorType: 'platform',
    customClaims: { plan: 'pro', orgId: 'org_42' },
  });
  if (!result.ok) throw result.error;
  return result.value.sessionToken;
}
```

#### Errors

- `NOT_SUPPORTED` · `USER_CANCELLED` · `ABORT_ERROR` · `TIMEOUT`
- `CHALLENGE_MISMATCH` · `INVALID_ARGUMENT` · `RATE_LIMIT_EXCEEDED`
- `CUSTOM_CLAIM_NOT_ALLOWED` · `CUSTOM_CLAIMS_TOO_LARGE`
- `FORBIDDEN` · `TENANT_INACTIVE` · `SERVER_ERROR`

---

### `client.signIn(options)`

Authenticates an existing user by prompting for a passkey assertion.

```ts
signIn(options: AuthenticateOptions): Promise<Result<AuthenticateResult, TryMellonError>>
```

#### Parameters — `AuthenticateOptions`

| Field                | Type                                         | Required | Description                                                                                   |
| -------------------- | -------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `externalUserId`     | `string \| ExternalUserId`                   | no       | Your user id. Omit to use discoverable (resident) passkeys.                                   |
| `external_user_id`   | `string \| ExternalUserId`                   | no       | **Deprecated.** snake_case alias.                                                              |
| `hint`               | `string`                                     | no       | Human-readable hint propagated to telemetry and analytics.                                     |
| `successUrl`         | `string`                                     | no       | Post-success redirect URL. Validated against the app allowlist.                                |
| `mediation`          | `'optional' \| 'conditional' \| 'required'`  | no       | WebAuthn mediation hint. Use `'conditional'` for passkey autofill.                             |
| `customClaims`       | `CustomClaims`                               | no       | JWT custom claims. Max 10 keys, 2 KB serialised.                                               |
| `signal`             | `AbortSignal`                                | no       | Aborts the WebAuthn ceremony.                                                                  |

#### Returns

```ts
interface AuthenticateResult {
  authenticated: boolean;
  sessionToken: string;
  user: {
    userId: string;
    externalUserId?: string;
    email?: string;
    metadata?: Record<string, unknown>;
    isAnonymous?: boolean;
  };
  signals?: {
    userVerification?: boolean;
    backupEligible?: boolean;
    backupStatus?: boolean;
  };
  redirectUrl?: string;
}
```

#### Example

```ts
const result = await client.signIn({ mediation: 'conditional' });
if (result.ok) {
  setSessionCookie(result.value.sessionToken);
}
```

#### Errors

- `NOT_SUPPORTED` · `USER_CANCELLED` · `ABORT_ERROR` · `TIMEOUT`
- `PASSKEY_NOT_FOUND` · `CHALLENGE_MISMATCH` · `SESSION_EXPIRED`
- `RATE_LIMIT_EXCEEDED` · `CUSTOM_CLAIM_NOT_ALLOWED` · `CUSTOM_CLAIMS_TOO_LARGE`

---

### `client.enroll(options)`

Redeems an enrollment ticket (issued by your backend via the `/v1/enrollment`
APIs) to attach a new passkey to an existing user.

```ts
enroll(options: EnrollOptions): Promise<Result<EnrollmentResult, TryMellonError>>
```

#### Parameters — `EnrollOptions`

| Field          | Type            | Required | Description                                           |
| -------------- | --------------- | -------- | ----------------------------------------------------- |
| `ticketId`     | `string`        | yes      | Opaque ticket id from `POST /v1/enrollment/tickets`.  |
| `customClaims` | `CustomClaims`  | no       | JWT custom claims. Max 10 keys, 2 KB serialised.      |
| `signal`       | `AbortSignal`   | no       | Aborts the WebAuthn ceremony.                          |

#### Returns

```ts
type EnrollmentResult = {
  sessionToken: string;
  credentialId: string;
  userId: string;
  entityId?: string;
};
```

#### Example

```ts
const result = await client.enroll({ ticketId: 'enr_abc123' });
if (!result.ok) return showError(result.error);

console.log(result.value.sessionToken, result.value.credentialId);
```

#### Errors

- `TICKET_NOT_FOUND` · `TICKET_EXPIRED` · `TICKET_ALREADY_USED`
- `CHALLENGE_MISMATCH` · `USER_CANCELLED` · `ABORT_ERROR` · `TIMEOUT`

---

### `client.capabilities()`

Reports whether WebAuthn, a platform authenticator, and which recommended flow
the client should present.

```ts
capabilities(): Promise<ClientStatus>
```

#### Returns

```ts
type ClientStatus = {
  isPasskeySupported: boolean;
  platformAuthenticatorAvailable: boolean;
  recommendedFlow: 'passkey' | 'fallback';
};
```

#### Example

```ts
const status = await client.capabilities();
if (status.recommendedFlow === 'fallback') {
  renderEmailOtpForm();
}
```

---

### `client.getContextHash()`

Returns the SHA-256 context hash bound to the current browser session. Pass it
to your backend when creating enrollment or bridge tickets so the ticket only
redeems from the browser that requested it.

```ts
getContextHash(): string
```

#### Example

```ts
const hash = client.getContextHash();
await fetch('/api/issue-ticket', {
  method: 'POST',
  body: JSON.stringify({ contextHash: hash }),
});
```

---

### `client.version()`

Returns the SDK version string baked in at build time.

```ts
version(): string
```

---

### `client.on(event, handler)`

Subscribes to SDK lifecycle events. Returns an unsubscribe function.

```ts
on(event: TryMellonEvent, handler: EventHandler): () => void

type TryMellonEvent = 'start' | 'success' | 'error' | 'cancelled';
type EventHandler = (payload: EventPayload) => void;

type EventPayload =
  | { type: 'start';     operation: 'signUp' | 'signIn' | 'enroll'; nonce?: string }
  | {
      type: 'success';
      operation: 'signUp' | 'signIn' | 'enroll';
      token: string;
      user?: { userId: string; externalUserId?: string; email?: string; metadata?: Record<string, unknown> };
      nonce?: string;
    }
  | { type: 'error';     error: TryMellonError; operation?: 'signUp' | 'signIn' | 'enroll'; nonce?: string }
  | { type: 'cancelled'; operation: 'signUp' | 'signIn'; nonce?: string };
```

> Note: `cancelled` is only emitted for `signUp` and `signIn` (not `enroll`).

#### Example

```ts
const off = client.on('success', (payload) => {
  if (payload.type !== 'success') return;
  analytics.track('auth_success', { op: payload.operation });
});

// later
off();
```

---

## Session Namespace

### `client.session.verify(sessionToken)`

Asks the API to introspect a session token. Use server-side for authoritative
validation.

```ts
session.verify(sessionToken: string): Promise<Result<SessionValidateResponse, TryMellonError>>

type SessionValidateResponse = {
  valid: boolean;
  userId: string;
  externalUserId: string;
  tenantId: string;
  appId: string;
};
```

#### Example — Express middleware

```ts
app.use(async (req, res, next) => {
  const token = req.cookies.trymellon_session;
  if (!token) return res.sendStatus(401);

  const result = await client.session.verify(token);
  if (!result.ok || !result.value.valid) return res.sendStatus(401);

  req.user = { userId: result.value.userId, tenantId: result.value.tenantId };
  next();
});
```

#### Errors

- `SESSION_EXPIRED` · `INVALID_ARGUMENT` · `NETWORK_FAILURE` · `SERVER_ERROR`

---

### `client.session.verifyOffline(sessionToken)`

Verifies the session JWT locally against the tenant JWKS. Zero round-trips
after the first JWKS fetch (cached for 1h). Suitable for hot paths where the
authoritative `verify()` is too expensive.

```ts
session.verifyOffline(sessionToken: string): Promise<Result<SessionClaims, TryMellonError>>

type SessionClaims = {
  userId: string;
  externalUserId?: string;
  tenantId: string;
  appId: string;
  customClaims?: Record<string, string | number | boolean>;
  iat: number;
  exp: number;
  kid?: string;
};
```

Only `alg: RS256` is accepted. A 30-second clock skew is tolerated on `exp`.

#### Example

```ts
const decoded = await client.session.verifyOffline(token);
if (!decoded.ok) return respond401();

const { userId, tenantId, customClaims } = decoded.value;
```

#### Errors

- `INVALID_ARGUMENT` (malformed JWT or missing claims) · `SESSION_EXPIRED`
- `JWT_KID_MISMATCH` (key not in JWKS or signature invalid)
- `NETWORK_FAILURE` (JWKS fetch failed)

---

## OTP Namespace

One-time-password (email) flow — used as a fallback when passkeys aren't
available or as a recovery rail.

### `client.otp.send(options)`

```ts
otp.send(options: EmailFallbackStartOptions): Promise<Result<void, TryMellonError>>

type EmailFallbackStartOptions = { userId: string; email: string };
```

### `client.otp.verify(options)`

```ts
otp.verify(options: EmailFallbackVerifyOptions): Promise<Result<EmailFallbackVerifyResult, TryMellonError>>

type EmailFallbackVerifyOptions = { userId: string; code: string; successUrl?: string };
type EmailFallbackVerifyResult  = { sessionToken: string; redirectUrl?: string };
```

#### Example

```ts
await client.otp.send({ userId: 'usr_42', email: 'augusto@example.com' });
// … user enters code …
const result = await client.otp.verify({ userId: 'usr_42', code: '123456' });
if (result.ok) setSession(result.value.sessionToken);
```

#### Errors

- `OTP_INVALID_OR_EXPIRED` · `RATE_LIMIT_EXCEEDED` · `INVALID_ARGUMENT`

---

## Passkey Recovery

### `client.passkey.recover(options)`

Redeems a recovery OTP, re-runs a WebAuthn registration ceremony, and returns a
fresh session token.

```ts
passkey.recover(options: RecoverAccountOptions): Promise<Result<RecoverAccountResult, TryMellonError>>
```

#### Parameters — `RecoverAccountOptions`

| Field              | Type                         | Required | Description                                        |
| ------------------ | ---------------------------- | -------- | -------------------------------------------------- |
| `externalUserId`   | `string \| ExternalUserId`   | yes      | The external id of the account being recovered.    |
| `external_user_id` | `string \| ExternalUserId`   | no       | **Deprecated.** snake_case alias.                  |
| `otp`              | `string`                     | yes      | 6-digit OTP delivered via email.                    |

#### Returns

```ts
interface RecoverAccountResult {
  success: true;
  credentialId: string;
  status: string;
  sessionToken: string;
  user: {
    userId: string;
    externalUserId?: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
  redirectUrl?: string;
}
```

#### Example

```ts
const result = await client.passkey.recover({
  externalUserId: 'user_42',
  otp: '123456',
});
if (!result.ok) return showError(result.error);
setSessionCookie(result.value.sessionToken);
```

#### Errors

- `OTP_INVALID_OR_EXPIRED` · `ANONYMOUS_RECOVERY_NOT_AVAILABLE`
- `USER_CANCELLED` · `ABORT_ERROR` · `INVALID_ARGUMENT`

---

## Cross-Device Namespace

Runs a QR-based cross-device flow. Desktop initiates, mobile approves with a
passkey, desktop polls (or streams via SSE) for completion.

### Shape

```ts
client.crossDevice = {
  start(): Promise<Result<CrossDeviceInitResult, TryMellonError>>;
  startRegistration(options?: { externalUserId?: string }):
    Promise<Result<CrossDeviceInitResult, TryMellonError>>;
  waitForCompletion(
    sessionId: string,
    signal?: AbortSignal,
    pollingToken?: string | null,
  ): Promise<Result<
    { sessionToken: string; userId: string; redirectUrl?: string },
    TryMellonError
  >>;
  getContext(sessionId: string):
    Promise<Result<CrossDeviceContextResult, TryMellonError>>;
  approve(sessionId: string): Promise<Result<void, TryMellonError>>;
};
```

### Types

```ts
type CrossDeviceInitResult = {
  session_id: string;
  qr_url: string;
  expires_at: string;
  polling_token: string;
  external_user_id?: string;
};

type CrossDeviceContextResult =
  | { type: 'auth'; options: AuthStartResponse['challenge']; approval_context?: string; application_name?: string }
  | { type: 'registration'; options: RegisterStartResponse['challenge']; approval_context?: string; application_name?: string };
```

### Desktop example

```ts
// 1. Desktop: generate the QR
const init = await client.crossDevice.start();
if (!init.ok) throw init.error;
renderQr(init.value.qr_url);

// 2. Desktop: wait for the mobile side to complete
const done = await client.crossDevice.waitForCompletion(
  init.value.session_id,
  undefined,
  init.value.polling_token,
);
if (done.ok) setSessionCookie(done.value.sessionToken);
```

### Mobile example

```ts
// Mobile: user scanned the QR; session id is in the URL
const sessionId = new URL(location.href).searchParams.get('session')!;

const context = await client.crossDevice.getContext(sessionId);
if (!context.ok) return showError(context.error);

// Shows the user what they're approving (auth or registration)
if (context.value.type === 'registration') renderConsent(context.value.application_name);

// Runs the WebAuthn ceremony and calls the backend verify endpoint.
await client.crossDevice.approve(sessionId);
```

---

## Bridge Namespace

Variant of cross-device where the second device completes a pin-gated bridge
flow (e.g. enrollment-bridge, auth-bridge).

### Shape

```ts
client.bridge = {
  getContext(sessionId: string, kind: 'enrollment' | 'auth'):
    Promise<Result<BridgeContextResponse, TryMellonError>>;

  verifyPresence(sessionId: string, pin: string, kind: 'enrollment' | 'auth'):
    Promise<Result<BridgeChallengeResponse, TryMellonError>>;

  complete(sessionId: string, options?: BridgeCompleteOptions):
    Promise<Result<BridgeResult, TryMellonError>>;

  waitForResult(
    sessionId: string,
    options?: {
      useSse?: boolean;
      kind?: 'enrollment' | 'auth';
      timeoutMs?: number;
      signal?: AbortSignal;
    },
  ): Promise<Result<BridgeStatusSnapshot, TryMellonError>>;
};
```

### Types

```ts
type BridgeContextResponse = {
  type: 'auth' | 'registration';
  options: Record<string, unknown>;
  application_name?: string;
};

type BridgeChallengeResponse = {
  session_id: string;
  challenge?: string;
  registration_options?: Record<string, unknown>;
  authentication_options?: Record<string, unknown>;
};

type BridgeOptions = {
  onPinRequired?: () => Promise<string>;
  presencePin?: string;
  signal?: AbortSignal;
};

type BridgeCompleteOptions = BridgeOptions & {
  /** Required — selects the bridge variant. */
  kind: 'enrollment' | 'auth';
  /** Required for enrollment bridges. */
  ticketId?: string;
  /** Required for enrollment bridges. */
  entityId?: string;
};

type BridgeEnrollmentResult = {
  kind: 'enrollment';
  sessionToken: string;
  credentialId?: string;
  userId?: string;
  entityId?: string;
};

type BridgeAuthResult = { kind: 'auth'; sessionToken: string };
type BridgeResult     = BridgeEnrollmentResult | BridgeAuthResult;

type BridgeStatusSnapshot = {
  status: 'pending' | 'pin_verified' | 'pin_locked' | 'completed' | 'expired' | 'cancelled';
  ts?: string;
};
```

### Example — enrollment bridge

```ts
const result = await client.bridge.complete(sessionId, {
  kind: 'enrollment',
  ticketId: 'tkt_…',
  entityId: 'ent_…',
  onPinRequired: () => promptForPin(),
});

if (!result.ok) return showError(result.error);
// Narrow by kind — BridgeResult is a discriminated union
if (result.value.kind === 'enrollment') {
  console.log(result.value.credentialId, result.value.sessionToken);
}
```

### Example — wait for terminal status

```ts
const status = await client.bridge.waitForResult(sessionId, {
  kind: 'enrollment',
  timeoutMs: 300_000,
});
if (status.ok && status.value.status === 'pin_locked') reset();
```

#### Errors

- `PIN_MISMATCH` · `PIN_LOCKED` · `BRIDGE_SESSION_EXPIRED`
- `TICKET_NOT_FOUND` · `TICKET_EXPIRED` · `TICKET_ALREADY_USED`
- `USER_CANCELLED` · `ABORT_ERROR` · `TIMEOUT`

---

## Action Signing

Prompts the user to authorise a specific payload with their passkey. Returns a
short-lived JWT (120 s TTL) scoped to `actionType + payloadHash`. Your backend
MUST verify the token before executing the action.

### `client.action.sign(options)`

```ts
action.sign(options: ActionSignOptions): Promise<Result<ActionSignResult, TryMellonError>>
```

#### Parameters — `ActionSignOptions`

| Field          | Type           | Required | Description                                                                                                      |
| -------------- | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `actionType`   | `string`       | yes      | `namespace:verb` format, `^[a-z0-9_]+:[a-z0-9_]+$`. Example: `'finance:wire_transfer'`.                           |
| `payloadHash`  | `string`       | yes      | 64-char lowercase hex SHA-256 of the exact payload being authorised. The SDK validates the format.                |
| `rpId`         | `string`       | yes      | Relying-Party ID. Must match the domain the passkey was registered under.                                         |
| `ttlSeconds`   | `number`       | no       | Challenge TTL. Default `300`. Backend clamps to 60–900.                                                            |
| `signal`       | `AbortSignal`  | no       | Aborts the WebAuthn ceremony.                                                                                     |

#### Returns

```ts
interface ActionSignResult {
  token: string;
  verifiedAt: string;
  actionType: string;
  credentialId: string;
}
```

#### Example

```ts
const payload = JSON.stringify({ to: '0xAbc…', amountCents: 1_000_000 });
const payloadHash = await sha256Hex(payload);

const result = await client.action.sign({
  actionType: 'finance:wire_transfer',
  payloadHash,
  rpId: 'app.example.com',
});

if (!result.ok) throw result.error;
// Attach to the request your backend will verify:
fetch('/api/transfer', {
  method: 'POST',
  headers: { 'X-Action-Token': result.value.token },
  body: payload,
});
```

#### Errors

- `INVALID_STATE` — no active session; call `signUp` / `signIn` / `enroll` first.
- `INVALID_ARGUMENT` — bad `actionType`, `payloadHash`, or `rpId`.
- `ACTION_CHALLENGE_EXPIRED` · `ACTION_ALREADY_CLAIMED` · `ACTION_PAYLOAD_MISMATCH`
- `USER_CANCELLED` · `ABORT_ERROR`

---

## Identity Linking

> **Preset gate:** only available when the client was created with
> `preset: 'web3'`. On a `'saas'` client, `client.identity` is typed `never`.

Associates additional identifiers (email, wallet, custom) to the authenticated
user. All methods read the `userId` from the active session.

### Shape

```ts
client.identity = {
  linkEmail(email: string):
    Promise<Result<LinkChallengeResult, TryMellonError>>;
  verifyEmailLink(options: LinkVerifyOptions):
    Promise<Result<LinkedIdentifier, TryMellonError>>;
  list(): Promise<Result<LinkedIdentifier[], TryMellonError>>;
  unlink(identifierId: string): Promise<Result<void, TryMellonError>>;
};
```

### Types

```ts
interface LinkChallengeResult { identifierId: string; expiresAt: string }

interface LinkVerifyOptions    { identifierId: string; otp: string }

interface LinkedIdentifier {
  id: string;
  type: 'email' | 'wallet' | 'custom';
  value: string;
  verified: boolean;
  linkedAt: string;
}
```

### Example

```ts
const challenge = await client.identity.linkEmail('augusto@example.com');
if (!challenge.ok) throw challenge.error;

// … user enters OTP from email …

const linked = await client.identity.verifyEmailLink({
  identifierId: challenge.value.identifierId,
  otp: userInput,
});
if (linked.ok) renderLinked(linked.value);
```

#### Errors

- `INVALID_ARGUMENT` — no active session.
- `LINK_CHALLENGE_NOT_FOUND` · `LINK_OTP_INVALID` · `LINK_OTP_EXPIRED`
- `IDENTIFIER_ALREADY_LINKED` · `IDENTIFIER_NOT_OWNED` · `EMAIL_ALREADY_TAKEN`
- `UNLINK_LAST_IDENTIFIER_DENIED`

---

## SIWE

> **Preset gate:** only when `preset: 'web3'`.

EIP-4361 "Sign-In with Ethereum". The SDK never signs — the external wallet
does. Flow: `getNonce` → `prepareMessage` (pure) → wallet signs → `verifyAndSignIn`.

### Shape

```ts
client.siwe = {
  getNonce(): Promise<Result<SiweNonceResult, TryMellonError>>;
  prepareMessage(options: SiwePrepareOptions): Result<string, TryMellonError>;
  verifyAndSignIn(options: SiweVerifyOptions):
    Promise<Result<SiweVerifyResult, TryMellonError>>;
};
```

### Types

```ts
interface SiweNonceResult   { nonce: string; expiresAt: string }
interface SiweVerifyOptions { message: string; signature: string }
interface SiweVerifyResult  { sessionToken: string; userId: string; walletAddress: string }
```

See also [`SiwePrepareOptions`](#trymellonjsweb3) — it is re-exported from the
main entry and from `@trymellon/js/web3`.

### Example

```ts
const nonceR = await client.siwe.getNonce();
if (!nonceR.ok) throw nonceR.error;

const messageR = client.siwe.prepareMessage({
  domain: 'app.example.com',
  address: wallet.address,
  chainId: 1,
  uri: 'https://app.example.com/login',
  nonce: nonceR.value.nonce,
  statement: 'Sign in to Example',
});
if (!messageR.ok) throw messageR.error;

const signature = await wallet.signMessage(messageR.value);

const result = await client.siwe.verifyAndSignIn({
  message: messageR.value,
  signature,
});
if (result.ok) setSessionCookie(result.value.sessionToken);
```

#### Errors

- `SIWE_NONCE_EXPIRED` · `SIWE_NONCE_REPLAY` · `SIWE_SIGNATURE_INVALID`
- `SIWE_MESSAGE_MALFORMED` · `SIWE_CHAIN_NOT_ALLOWED`
- `SIWE_DOMAIN_MISMATCH` · `SIWE_ADDRESS_MISMATCH`

---

## Webhook Verification

Verify the HMAC-SHA256 signature of an incoming webhook delivery. Zero runtime
dependencies — uses WebCrypto (`globalThis.crypto.subtle`), available on Node
19+ and all modern browsers.

### `verifyWebhookSignature(rawBody, signatureHeader, secret)`

```ts
async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean>
```

Returns `true` when the signature matches, `false` otherwise (including any
internal error). The comparison is constant-time.

### `WebhookEvent` — discriminated union

```ts
type WebhookEventType =
  | 'auth.success'
  | 'credential.revoked'
  | 'application.secret_rotated'
  | 'session.revoked'
  | 'session.logout'
  | 'user.locked'
  | 'identifier.linked'
  | 'identifier.unlinked'
  | 'recovery.enrollment.issued'
  | 'recovery.enrollment.completed';

type WebhookEvent =
  | { event: 'auth.success';                 timestamp: string; data: AuthSuccessPayload }
  | { event: 'credential.revoked';           timestamp: string; data: CredentialRevokedPayload }
  | { event: 'application.secret_rotated';   timestamp: string; data: ApplicationSecretRotatedPayload }
  | { event: 'session.revoked';              timestamp: string; data: SessionRevokedPayload }
  | { event: 'session.logout';               timestamp: string; data: SessionLogoutPayload }
  | { event: 'user.locked';                  timestamp: string; data: UserLockedPayload }
  | { event: 'identifier.linked';            timestamp: string; data: IdentifierLinkedPayload }
  | { event: 'identifier.unlinked';          timestamp: string; data: IdentifierUnlinkedPayload }
  | { event: 'recovery.enrollment.issued';   timestamp: string; data: RecoveryEnrollmentIssuedPayload }
  | { event: 'recovery.enrollment.completed'; timestamp: string; data: RecoveryEnrollmentCompletedPayload };

type WebhookPayload<E extends WebhookEventType = WebhookEventType> =
  Extract<WebhookEvent, { event: E }>;
```

Each payload type is exported individually (see the [index barrel](#trymellonjsplatform)
contents): `AuthSuccessPayload`, `CredentialRevokedPayload`,
`ApplicationSecretRotatedPayload`, `SessionRevokedPayload`,
`SessionLogoutPayload`, `UserLockedPayload`, `IdentifierLinkedPayload`,
`IdentifierUnlinkedPayload`, `RecoveryEnrollmentIssuedPayload`,
`RecoveryEnrollmentCompletedPayload`.

### Example — Express handler

```ts
import express from 'express';
import { verifyWebhookSignature, type WebhookEvent } from '@trymellon/js';

const app = express();

// Important: use raw body — do NOT parse before verifying.
app.post('/webhooks/trymellon', express.raw({ type: 'application/json' }), async (req, res) => {
  const raw = req.body.toString('utf8');
  const signature = req.header('X-TryMellon-Signature') ?? '';
  const valid = await verifyWebhookSignature(raw, signature, process.env.WEBHOOK_SECRET!);
  if (!valid) return res.sendStatus(401);

  const event = JSON.parse(raw) as WebhookEvent;
  switch (event.event) {
    case 'auth.success':
      await onAuthSuccess(event.data);
      break;
    case 'credential.revoked':
      await onCredentialRevoked(event.data);
      break;
    // … narrow the rest …
  }
  res.sendStatus(200);
});
```

---

## Logger & Device Helpers

### `Logger`, `LogLevel`, `ConsoleLogger`

```ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

class ConsoleLogger implements Logger { /* forwards to `console.*` */ }
```

Inject your own implementation via `TryMellonConfig.logger` to correlate
request ids with your observability stack.

### AAGUID helpers

Resolve a human-readable name for a credential given its AAGUID and/or a
user-set alias. Data sourced from the FIDO Alliance Metadata Service.

```ts
function getDeviceName(aaguid: string): string | null;

function resolveCredentialName(
  aaguid: string | null | undefined,
  alias: string | null | undefined,
): string;
```

Priority: alias → AAGUID lookup → `'Passkey'` fallback.

### `SANDBOX_SESSION_TOKEN`

```ts
const SANDBOX_SESSION_TOKEN: 'trymellon_sandbox_session_token_v1';
```

Exported for asserting sandbox behaviour in tests. Your production backend
MUST reject this value.

---

## `@trymellon/js/platform`

Stateless helper for integrators orchestrating TryMellon tenant sign-up via
the hosted signup link pattern (ADR-SDK-005 · ADR-076). No publishable key or
`TryMellon` instance required — `POST /v1/onboarding/start` is public by design.

### `createPlatform(config?)`

```ts
function createPlatform(config?: TryMellonPlatformConfig): TryMellonPlatform;

interface TryMellonPlatformConfig {
  /** @default 'https://api.trymellon.com' */
  apiBaseUrl?: string;
}

interface TryMellonPlatform {
  createSignupLink(opts: CreateSignupLinkOptions):
    Promise<Result<CreateSignupLinkResult, TryMellonError>>;

  getSignupStatus(sessionId: string):
    Promise<Result<SignupStatusResult, TryMellonError>>;

  awaitSignupCompletion(
    sessionId: string,
    opts?: AwaitSignupCompletionOptions,
  ): Promise<Result<AwaitSignupCompletionResult, TryMellonError>>;
}
```

### `createSignupLink(opts)`

| Field        | Type                                              | Required | Description                                                                                                  |
| ------------ | ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `returnUrl`  | `string`                                          | no       | https URL where the hosted page redirects on success. Omit to use polling-only coordination.                  |
| `refreshUrl` | `string`                                          | no       | https URL fallback used when the hosted `sessionId` expires.                                                  |
| `prefill`    | `{ companyName?: string; email?: string }`        | no       | UX prefill only — never treated as trust input.                                                               |
| `userRole`   | `'maintainer' \| 'app_user'`                      | no       | Defaults to `'maintainer'`.                                                                                  |

Returns:

```ts
interface CreateSignupLinkResult {
  sessionId: string;
  hostedUrl: string;
  expiresInSeconds: number;
}
```

### `getSignupStatus(sessionId)`

```ts
type SignupStatus =
  | 'pending_data'
  | 'pending_passkey'
  | 'completed'
  | 'expired'
  | 'failed';

interface SignupStatusResult {
  status: SignupStatus;
  hostedUrl?: string;
  expiresInSeconds?: number;
}
```

### `awaitSignupCompletion(sessionId, opts?)`

Polls `getSignupStatus` until the terminal state is reached.

```ts
interface AwaitSignupCompletionOptions {
  signal?: AbortSignal;
  /** @default 2000ms */
  intervalMs?: number;
  /** @default 60 (≈ 2 min with default intervalMs) */
  maxAttempts?: number;
}

interface AwaitSignupCompletionResult {
  status: 'completed';
  hostedUrl: string;
}
```

### Example — server-side orchestration

```ts
import { createPlatform } from '@trymellon/js/platform';

const platform = createPlatform();

const linkR = await platform.createSignupLink({
  userRole: 'maintainer',
  prefill: { companyName: 'ACME' },
});
if (!linkR.ok) throw linkR.error;

// Send linkR.value.hostedUrl to the user (email, QR, redirect, …)

const doneR = await platform.awaitSignupCompletion(linkR.value.sessionId, {
  intervalMs: 3000,
  maxAttempts: 120,
});
if (doneR.ok) markTenantProvisioned();
```

#### Errors

- `INVALID_ARGUMENT` (`returnUrl` / `refreshUrl` not https, bad `sessionId`)
- `RATE_LIMIT_EXCEEDED` · `NOT_FOUND` · `FORBIDDEN`
- `SESSION_EXPIRED` (terminal `'expired'`) · `TIMEOUT` · `ABORT_ERROR`
- `NETWORK_FAILURE` · `SERVER_ERROR`

---

## `@trymellon/js/web3`

Zero-dep helpers usable without instantiating a full `TryMellon` client.

### `prepareSiweMessage(options)`

Pure function that builds an EIP-4361 canonical SIWE message string. Caller
hands it to the external wallet (MetaMask, Rabby, Coinbase, …) for signing.

```ts
function prepareSiweMessage(options: SiwePrepareOptions): Result<string, TryMellonError>;
```

### `SiwePrepareOptions`

| Field            | Type                 | Required | Description                                                                                     |
| ---------------- | -------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `domain`         | `string`             | yes      | RFC 3986 authority the user signs in to (e.g. `app.example.com`). No whitespace or newlines.    |
| `address`        | `string`             | yes      | 0x-prefixed 40-char hex Ethereum address. EIP-55 checksum is the wallet's responsibility.        |
| `chainId`        | `number`             | yes      | EIP-155 positive integer.                                                                        |
| `uri`            | `string`             | yes      | RFC 3986 URI referring to the resource being signed in to.                                       |
| `nonce`          | `string`             | yes      | Nonce from `client.siwe.getNonce()`. At least 8 alphanumeric chars.                              |
| `statement`      | `string`             | no       | Human-readable assertion. ASCII printable, no newlines.                                          |
| `issuedAt`       | `string`             | no       | ISO 8601. Defaults to `new Date().toISOString()`.                                                |
| `expirationTime` | `string`             | no       | ISO 8601.                                                                                        |
| `notBefore`      | `string`             | no       | ISO 8601.                                                                                        |
| `requestId`      | `string`             | no       | Opaque correlation id.                                                                           |
| `resources`      | `readonly string[]`  | no       | Ordered list of RFC 3986 URIs.                                                                   |

### Example

```ts
import { prepareSiweMessage } from '@trymellon/js/web3';

const r = prepareSiweMessage({
  domain: 'app.example.com',
  address: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  uri: 'https://app.example.com/login',
  nonce: 'r4nd0m12',
  statement: 'Sign in to Example',
});
if (!r.ok) throw r.error;
const signature = await wallet.signMessage(r.value);
```

### Re-exported types

`LinkEmailOptions`, `LinkVerifyOptions`, `LinkChallengeResult`,
`LinkedIdentifier`, `SiweNonceResult`, `SiweVerifyOptions`, `SiweVerifyResult`
— identical to the shapes exposed on `client.identity` / `client.siwe`.

---

## `@trymellon/js/ui` — Web Components

Side-effectful sub-path. Importing registers two custom elements on the global
`customElements` registry:

| Tag                         | Constant                    | Role                                                |
| --------------------------- | --------------------------- | --------------------------------------------------- |
| `<trymellon-auth>`          | `TRYMELLON_AUTH_TAG`        | Button + internal modal, or trigger-only mode.      |
| `<trymellon-auth-modal>`    | `TRYMELLON_AUTH_MODAL_TAG`  | Standalone modal (hosted by the integrator).        |

### Example

```html
<script type="module">
  import '@trymellon/js/ui';
</script>

<trymellon-auth
  app-id="app_abc123"
  publishable-key="cli_xyz789"
  mode="signIn"
  button-variant="primary"
  button-label="Sign in with Passkey"
></trymellon-auth>
```

### Custom events

Consumers listen for the typed events below (all re-exported constants):

```ts
import {
  MELLON_START,
  MELLON_SUCCESS,
  MELLON_ERROR,
  MELLON_CANCELLED,
  MELLON_FALLBACK,
  MELLON_TAB_CHANGE,
  MELLON_OPEN,
  MELLON_OPEN_REQUEST,
  MELLON_CLOSE,
  type MellonSuccessDetail,
  type MellonErrorDetail,
} from '@trymellon/js/ui';
```

For the complete observed-attributes list, render styles, and the internal FSM
contract, see `documentation/WEB-COMPONENTS.md` alongside this file.

---

## Framework Wrappers

All wrappers delegate to the same `TryMellon` instance — they only wire the
dependency-injection idiomatic to each framework.

### React — `@trymellon/js/react`

```tsx
import { TryMellon } from '@trymellon/js';
import { TryMellonProvider, useSignUp } from '@trymellon/js/react';

const client = TryMellon.create({ appId: 'app_…', publishableKey: 'cli_…' });
if (!client.ok) throw client.error;

export function Root() {
  return (
    <TryMellonProvider client={client.value}>
      <SignUpButton />
    </TryMellonProvider>
  );
}

function SignUpButton() {
  const { execute, loading, error } = useSignUp();
  return (
    <button
      disabled={loading}
      onClick={() => execute({ externalUserId: 'user_42' })}
    >
      {loading ? 'Signing up…' : 'Sign up'}
      {error && <span>{error.message}</span>}
    </button>
  );
}
```

Hooks: `useSignUp`, `useSignIn`, `useEnroll`, `useTryMellon`.

### Vue — `@trymellon/js/vue`

```ts
import { TryMellon } from '@trymellon/js';
import { provideTryMellon, useSignIn } from '@trymellon/js/vue';

// Root setup
const clientR = TryMellon.create({ appId: 'app_…', publishableKey: 'cli_…' });
if (!clientR.ok) throw clientR.error;
provideTryMellon(clientR.value);

// Descendant component
const { execute, loading, error } = useSignIn();
```

Composables: `useSignUp`, `useSignIn`, `useEnroll`, `useTryMellon`,
`provideTryMellon`, `TryMellonKey`.

### Angular — `@trymellon/js/angular`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { TryMellon } from '@trymellon/js';
import { provideTryMellon, TryMellonService } from '@trymellon/js/angular';

const clientR = TryMellon.create({ appId: 'app_…', publishableKey: 'cli_…' });
if (!clientR.ok) throw clientR.error;

bootstrapApplication(AppComponent, {
  providers: [provideTryMellon(clientR.value)],
});

// In a component / service
@Component({ selector: 'app-login', template: '<button (click)="signIn()">Sign in</button>' })
export class LoginComponent {
  constructor(private readonly trymellon: TryMellonService) {}

  async signIn() {
    const r = await this.trymellon.client.signIn({ mediation: 'conditional' });
    if (r.ok) storeSession(r.value.sessionToken);
  }
}
```

Exports: `provideTryMellon`, `TryMellonService`, `TRYMELLON_CLIENT`.

---

## Error Codes

Every async SDK method resolves to `Result<T, TryMellonError>`. `error.code`
is a `TryMellonErrorCode` literal union.

### Core

| Code                      | Meaning                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `NOT_SUPPORTED`           | WebAuthn is not available in this environment.                            |
| `USER_CANCELLED`          | The user dismissed the WebAuthn prompt.                                    |
| `PASSKEY_NOT_FOUND`       | No passkey matched the allowCredentials list.                              |
| `SESSION_EXPIRED`         | Session or challenge is no longer valid.                                   |
| `NETWORK_FAILURE`         | Underlying `fetch` or DNS layer failed.                                    |
| `INVALID_ARGUMENT`        | Validation failed client-side or the backend rejected the payload.         |
| `TIMEOUT`                 | Deadline reached (HTTP timeout, polling budget, etc.).                     |
| `ABORT_ERROR`             | Aborted via `AbortSignal` or user-initiated.                               |
| `CHALLENGE_MISMATCH`      | Stale or replayed WebAuthn challenge.                                      |
| `RATE_LIMIT_EXCEEDED`     | Client hit the server rate limit.                                          |
| `FORBIDDEN`               | Caller lacks permission for the action.                                    |
| `NOT_FOUND`               | Requested resource does not exist.                                         |
| `TENANT_INACTIVE`         | Target tenant is suspended.                                                |
| `INVITATION_NOT_FOUND`    | Invitation was consumed, revoked, or never existed.                        |
| `SERVER_ERROR`            | Unspecified 5xx from the API.                                              |
| `UNKNOWN_ERROR`           | Fallback when no mapping applies.                                          |

### Enrollment / Bridge

| Code                      | Meaning                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `TICKET_NOT_FOUND`        | Enrollment ticket is missing or invalid.                                   |
| `TICKET_EXPIRED`          | Enrollment ticket TTL elapsed.                                             |
| `TICKET_ALREADY_USED`     | Ticket was redeemed previously.                                            |
| `PIN_MISMATCH`            | Bridge presence PIN is wrong.                                              |
| `PIN_LOCKED`              | Bridge PIN locked after too many attempts.                                 |
| `BRIDGE_SESSION_EXPIRED`  | Bridge session TTL elapsed.                                                |

### Action Signing

| Code                       | Meaning                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `INVALID_STATE`            | `action.sign` called without an active session.                           |
| `ACTION_CHALLENGE_EXPIRED` | Action challenge TTL elapsed — request a new one.                         |
| `ACTION_ALREADY_CLAIMED`   | Challenge was already consumed.                                           |
| `ACTION_PAYLOAD_MISMATCH`  | Signed data does not match the requested action.                          |

### OTP / JWT / Custom claims

| Code                       | Meaning                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `OTP_INVALID_OR_EXPIRED`   | Verification code was wrong or has expired.                               |
| `SECRET_ROTATION_FORBIDDEN`| Caller cannot rotate the application secret.                              |
| `JWT_KID_MISMATCH`         | JWT `kid` not found in JWKS, or signature invalid.                        |
| `INTROSPECTION_FAILED`     | Token introspection endpoint returned an error.                           |
| `CUSTOM_CLAIM_NOT_ALLOWED` | A claim key is not in the app `custom_claims_schema`.                     |
| `CUSTOM_CLAIMS_TOO_LARGE`  | Custom claims exceed 10 keys or 2 KB serialised.                          |

### Identity Linking (preset `web3`)

| Code                            | Meaning                                                             |
| ------------------------------- | ------------------------------------------------------------------- |
| `LINK_CHALLENGE_NOT_FOUND`      | Link challenge expired or was not found.                             |
| `LINK_OTP_INVALID`              | OTP entered is wrong.                                                |
| `LINK_OTP_EXPIRED`              | OTP TTL elapsed.                                                     |
| `IDENTIFIER_ALREADY_LINKED`     | Identifier already attached to another account.                       |
| `IDENTIFIER_NOT_OWNED`          | Identifier belongs to a different user.                               |
| `EMAIL_ALREADY_TAKEN`           | Email already associated with an account in this tenant.             |
| `UNLINK_LAST_IDENTIFIER_DENIED` | Cannot unlink the last identifier of an anonymous user.               |

### SIWE (preset `web3`)

| Code                       | Meaning                                                                  |
| -------------------------- | ------------------------------------------------------------------------ |
| `SIWE_NONCE_EXPIRED`       | SIWE nonce expired — request a new one.                                   |
| `SIWE_NONCE_REPLAY`        | SIWE nonce was already consumed.                                          |
| `SIWE_SIGNATURE_INVALID`   | Signature verification failed.                                            |
| `SIWE_MESSAGE_MALFORMED`   | Message is not EIP-4361 canonical.                                        |
| `SIWE_CHAIN_NOT_ALLOWED`   | Chain id not in the app allowlist.                                        |
| `SIWE_DOMAIN_MISMATCH`     | Message `domain` ≠ expected domain.                                       |
| `SIWE_ADDRESS_MISMATCH`    | Recovered address ≠ declared address.                                     |

### Recovery

| Code                                  | Meaning                                                         |
| ------------------------------------- | --------------------------------------------------------------- |
| `ANONYMOUS_RECOVERY_NOT_AVAILABLE`    | Anonymous accounts cannot be recovered.                          |
| `RECOVERY_USER_NOT_FOUND`             | Target user for B2B recovery enrollment does not exist.          |
| `RECOVERY_TICKET_LIMIT_EXCEEDED`      | Maximum recovery tickets already issued for this user.           |

### Error constructors

```ts
import {
  TryMellonError,
  createError,
  isTryMellonError,
  createNotSupportedError,
  createUserCancelledError,
  createNetworkError,
  createTimeoutError,
  createInvalidArgumentError,
  mapWebAuthnError,
} from '@trymellon/js';
```

- `createError(code, message?, details?)` — generic factory.
- `isTryMellonError(value)` — type guard.
- `createNotSupportedError()`, `createUserCancelledError()`,
  `createNetworkError(cause?)`, `createTimeoutError()` — preset constructors.
- `createInvalidArgumentError(field, reason)` — populates `details.field` and
  `details.reason`.
- `mapWebAuthnError(error)` — normalises a `DOMException` from
  `navigator.credentials.{create,get}` into a `TryMellonError`.

---

Last updated for SDK `v4.0.0`.
