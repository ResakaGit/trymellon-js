# Usage Examples

Runnable integration recipes for `@trymellon/js` **v4.x**. Every snippet imports only symbols that the package actually exports and handles the `Result<T, TryMellonError>` shape the SDK returns.

> **Credentials.** `appId` is the **App ID** (UUID) and `publishableKey` is the **Client ID** (`cli_…`). Both are visible in Dashboard → Your app. The publishable key is safe to ship in a browser bundle; the webhook / secret key is not.

## Table of contents

1. [Bootstrap the client](#1-bootstrap-the-client)
2. [Sign-up + sign-in (passkey happy path)](#2-sign-up--sign-in-passkey-happy-path)
3. [Anonymous sign-up](#3-anonymous-sign-up)
4. [OTP fallback when WebAuthn is unavailable](#4-otp-fallback-when-webauthn-is-unavailable)
5. [Cross-device QR registration + auth](#5-cross-device-qr-registration--auth)
6. [Bridge — hosted enrollment from a trusted device](#6-bridge--hosted-enrollment-from-a-trusted-device)
7. [Action signing for high-trust operations](#7-action-signing-for-high-trust-operations)
8. [Server-side session verification (Express)](#8-server-side-session-verification-express)
9. [Account recovery](#9-account-recovery)
10. [SIWE — sign in with Ethereum](#10-siwe--sign-in-with-ethereum)
11. [Identity linking — attach an email to a wallet account](#11-identity-linking--attach-an-email-to-a-wallet-account)
12. [Hosted tenant sign-up via `@trymellon/js/platform`](#12-hosted-tenant-sign-up-via-trymellonjsplatform)
13. [Custom claims on sign-up / sign-in](#13-custom-claims-on-sign-up--sign-in)
14. [Webhook signature verification](#14-webhook-signature-verification)
15. [React integration](#15-react-integration)
16. [Vue integration](#16-vue-integration)
17. [Angular integration](#17-angular-integration)
18. [Web component drop-in](#18-web-component-drop-in)
19. [Migration notes (v3 → v4)](#19-migration-notes-v3--v4)

---

## 1. Bootstrap the client

Create one client per app at startup. `TryMellon.create` returns a `Result` so invalid config never throws at the call site.

```ts
import { TryMellon, type TryMellonClient } from '@trymellon/js';

const bootstrap = TryMellon.create({
  appId: 'your-app-id-uuid',
  publishableKey: 'cli_xxxxxxxxxxxxxxxxxxxxxxxx',
  // Optional — set in SSR where `window.location.origin` is not reliable.
  origin: 'https://app.example.com',
});

if (!bootstrap.ok) {
  // INVALID_ARGUMENT covers every validation error produced by `create`.
  console.error('[trymellon] bad config:', bootstrap.error.code, bootstrap.error.message);
  throw bootstrap.error;
}

const client: TryMellonClient = bootstrap.value;
```

**Why:** guard clauses at boot keep the rest of your app path "config is valid" — no optional chaining downstream.
**Errors to handle:** `INVALID_ARGUMENT` (missing `appId` / `publishableKey`, out-of-range `timeoutMs`, malformed `apiBaseUrl` / `telemetryEndpoint`).

---

## 2. Sign-up + sign-in (passkey happy path)

`signUp` creates a new passkey. `signIn` asserts an existing one. Both return a short-lived `sessionToken` that your backend exchanges for its own session cookie.

```ts
import { TryMellon } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

async function register(externalUserId: string): Promise<void> {
  const result = await client.signUp({ externalUserId });

  if (!result.ok) {
    switch (result.error.code) {
      case 'USER_CANCELLED':
        // User dismissed the browser prompt. Not an error, show a "try again" UI.
        return;
      case 'NOT_SUPPORTED':
        // Environment has no WebAuthn at all (old browser, iframe blocked, …).
        return fallbackToOtp(externalUserId);
      default:
        throw result.error;
    }
  }

  await fetch('/api/session/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  });
}

async function login(externalUserId: string): Promise<void> {
  const result = await client.signIn({ externalUserId });
  if (!result.ok) {
    if (result.error.code === 'USER_CANCELLED') return;
    if (result.error.code === 'PASSKEY_NOT_FOUND') {
      return register(externalUserId); // No credential yet → onboard.
    }
    throw result.error;
  }
  await fetch('/api/session/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  });
}

declare function fallbackToOtp(externalUserId: string): Promise<void>;
```

**Why:** treating `USER_CANCELLED` as terminal shows unnecessary red flashes — it is the default outcome when a user taps "Cancel" on the system sheet.
**Errors to handle:** `USER_CANCELLED`, `NOT_SUPPORTED`, `PASSKEY_NOT_FOUND` (sign-in without credential), `CHALLENGE_MISMATCH`, `NETWORK_FAILURE`, `TIMEOUT`.

---

## 3. Anonymous sign-up

Omit `externalUserId` to let the backend mint one. Inspect `user.isAnonymous` to branch your onboarding UI between "attached to a real identity" and "pseudonymous throwaway".

```ts
import { TryMellon } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

const result = await client.signUp({ /* no externalUserId */ });
if (!result.ok) throw result.error;

const { user, sessionToken } = result.value;
if (user.isAnonymous === true) {
  console.log('Anonymous user created:', user.userId);
  // Show "link an email later" banner so recovery becomes possible.
}
await fetch('/api/session/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionToken }),
});
```

**Why:** `externalUserId` is optional in F1 (ADR-039). `isAnonymous` is derived from the absence of an `externalUserId` at creation time — never a second source of truth.
**Errors to handle:** `NOT_SUPPORTED`, `USER_CANCELLED`, any `INVALID_ARGUMENT` surfaced by custom-claims validation.

---

## 4. OTP fallback when WebAuthn is unavailable

Reach for `client.otp.*` only when the passkey path is not viable (unsupported browser, user declined, no recovered credentials).

```ts
import { TryMellon } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

async function authenticate(userId: string, email: string): Promise<string> {
  if (!TryMellon.isSupported()) {
    return await emailFlow(userId, email);
  }

  const passkey = await client.signIn({ externalUserId: userId });
  if (passkey.ok) return passkey.value.sessionToken;

  if (passkey.error.code === 'NOT_SUPPORTED' || passkey.error.code === 'PASSKEY_NOT_FOUND') {
    return await emailFlow(userId, email);
  }
  throw passkey.error;
}

async function emailFlow(userId: string, email: string): Promise<string> {
  const sent = await client.otp.send({ userId, email });
  if (!sent.ok) throw sent.error;

  const code = window.prompt('Enter the 6-digit code from your inbox') ?? '';
  const verified = await client.otp.verify({ userId, code });
  if (!verified.ok) throw verified.error;

  return verified.value.sessionToken;
}
```

**Why:** short-circuiting on `isSupported()` saves one round-trip on browsers without WebAuthn (older Edge, WebViews with the API stripped).
**Errors to handle:** `OTP_INVALID_OR_EXPIRED`, `RATE_LIMIT_EXCEEDED`, `INVALID_ARGUMENT` (`email_required_for_fallback` from the backend is mapped to `INVALID_ARGUMENT`).

---

## 5. Cross-device QR registration + auth

Desktop shows a QR → the user scans it on a phone → the phone completes the WebAuthn ceremony → desktop observes completion via SSE/polling.

```ts
import { TryMellon, type TryMellonClient } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client: TryMellonClient = bootstrap.value;

// --- Desktop side ---
async function startDesktopFlow(externalUserId: string): Promise<void> {
  const init = await client.crossDevice.startRegistration({ externalUserId });
  if (!init.ok) throw init.error;
  const { session_id, qr_url, polling_token, expires_at } = init.value;

  renderQrCode(qr_url);
  scheduleExpiryCountdown(expires_at);

  // SSE by default; falls back to polling transparently.
  const completion = await client.crossDevice.waitForCompletion(
    session_id,
    AbortSignal.timeout(180_000), // 3-minute safety cap
    polling_token
  );
  if (!completion.ok) throw completion.error;

  await fetch('/api/session/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: completion.value.sessionToken }),
  });
}

// --- Phone side (entry URL decoded from the QR) ---
async function approveOnPhone(sessionId: string): Promise<void> {
  const approval = await client.crossDevice.approve(sessionId);
  if (!approval.ok) throw approval.error;
  // UI: "You can return to your computer — you are signed in."
}

declare function renderQrCode(url: string): void;
declare function scheduleExpiryCountdown(expiresAt: string): void;
```

**Why:** `pollingToken` binds the listener to the initiating session — without it the backend rejects status polls as unauthorized.
**Errors to handle:** `SESSION_EXPIRED` (QR aged out), `CHALLENGE_MISMATCH` (replay / stale QR), `RATE_LIMIT_EXCEEDED`, `TIMEOUT`, `ABORT_ERROR`.

---

## 6. Bridge — hosted enrollment from a trusted device

The Bridge is the pattern for enrolling a passkey on a device the user does not own yet (B2B onboarding, recovery on a shared laptop). A 4-digit PIN binds the session.

```ts
import { TryMellon } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

async function completeEnrollmentBridge(sessionId: string, ticketId: string, entityId: string) {
  const ctx = await client.bridge.getContext(sessionId, 'enrollment');
  if (!ctx.ok) throw ctx.error;

  // PIN gate — usually the user reads this on a trusted device.
  const pin = window.prompt('Enter the 4-digit PIN shown on your other device') ?? '';
  const verify = await client.bridge.verifyPresence(sessionId, pin, 'enrollment');
  if (!verify.ok) throw verify.error; // PIN_MISMATCH / PIN_LOCKED

  const completion = await client.bridge.complete(sessionId, {
    kind: 'enrollment',
    ticketId,
    entityId,
    // Alternative to the explicit prompt above:
    // onPinRequired: async () => window.prompt('PIN?') ?? '',
  });
  if (!completion.ok) throw completion.error;

  if (completion.value.kind !== 'enrollment') {
    throw new Error(`Unexpected bridge kind: ${completion.value.kind}`);
  }

  // `credentialId` and `userId` live on the result — not on the request options.
  const { sessionToken, credentialId, userId } = completion.value;
  console.log('Enrolled', { userId, credentialId });

  // Optional: the other device can observe terminal state via SSE.
  const snapshot = await client.bridge.waitForResult(sessionId, {
    kind: 'enrollment',
    timeoutMs: 60_000,
  });
  if (snapshot.ok) console.log('Final status:', snapshot.value.status);

  return sessionToken;
}
```

**Why:** `kind` narrows the result type (`BridgeEnrollmentResult | BridgeAuthResult`). Always branch on it before reading `credentialId` — the auth variant has neither a credential nor a user id field.
**Errors to handle:** `PIN_MISMATCH`, `PIN_LOCKED`, `BRIDGE_SESSION_EXPIRED`, `TICKET_NOT_FOUND`, `TICKET_EXPIRED`, `TICKET_ALREADY_USED`.

---

## 7. Action signing for high-trust operations

`client.action.sign` produces a short-lived JWT (120 s TTL) that proves the current user explicitly approved one specific payload — use it for wire transfers, privilege escalation, signing contracts.

```ts
import { TryMellon } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

// 1. Authenticate (this is what wires the session token the action call needs).
const signIn = await client.signIn({ externalUserId: 'alice' });
if (!signIn.ok) throw signIn.error;

// 2. Hash the exact payload you intend to authorize.
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const payload = JSON.stringify({ to: '0xabc…', amountUsd: 50_000, memo: 'Wire #17' });
const payloadHash = await sha256Hex(payload);

// 3. Prompt the passkey for this action.
const actionResult = await client.action.sign({
  actionType: 'finance:wire_transfer',
  payloadHash,
  rpId: window.location.hostname,
  ttlSeconds: 300, // backend clamps to 60..900
});
if (!actionResult.ok) throw actionResult.error;

// 4. Ship token + payload to the backend. Your backend MUST verify the JWT
//    and re-hash the payload before executing the transfer.
await fetch('/api/wire', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Action-Token': actionResult.value.token,
  },
  body: payload,
});
```

**Why:** the backend trusts the action JWT only if (a) signature is valid, (b) `payloadHash` matches the request body, (c) token has not been claimed yet, (d) not expired. That is a different trust boundary than the session token.
**Errors to handle:** `INVALID_STATE` (no active session), `ACTION_CHALLENGE_EXPIRED`, `ACTION_ALREADY_CLAIMED`, `ACTION_PAYLOAD_MISMATCH`, `USER_CANCELLED`.

---

## 8. Server-side session verification (Express)

`client.session.verifyOffline` verifies the JWT locally against the public JWKS — no network hop per request once the keys are cached. Use `verify` instead if you need the authoritative "token not revoked" signal.

```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { TryMellon, type SessionClaims } from '@trymellon/js';

const bootstrap = TryMellon.create({
  appId: process.env.TRYMELLON_APP_ID!,
  publishableKey: process.env.TRYMELLON_PUBLISHABLE_KEY!,
});
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

declare module 'express-serve-static-core' {
  interface Request {
    mellon?: SessionClaims;
  }
}

export const requireSession: RequestHandler = async (req, res, next) => {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token === '') {
    res.status(401).json({ error: 'missing_bearer_token' });
    return;
  }

  const verified = await client.session.verifyOffline(token);
  if (!verified.ok) {
    res.status(401).json({ error: verified.error.code });
    return;
  }

  req.mellon = verified.value; // userId, externalUserId, tenantId, appId, customClaims, iat, exp
  next();
};

// Example route
export const whoami = (req: Request, res: Response): void => {
  res.json({ userId: req.mellon?.userId, tenantId: req.mellon?.tenantId });
};
```

**Why:** offline verification keeps your hot path free of a TryMellon API call per request. Fall back to `client.session.verify(token)` when you must reject revoked sessions immediately.
**Errors to handle:** `SESSION_EXPIRED`, `JWT_KID_MISMATCH` (JWKS rotated — refresh and retry), `INVALID_ARGUMENT` (malformed token).

---

## 9. Account recovery

Triggered after the user has requested a recovery OTP (out-of-band, via the dashboard or your own flow). `passkey.recover` consumes the OTP and re-enrolls a fresh passkey.

```ts
import { TryMellon } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

async function recoverAccount(externalUserId: string, otp: string): Promise<string> {
  const recovered = await client.passkey.recover({ externalUserId, otp });
  if (!recovered.ok) {
    switch (recovered.error.code) {
      case 'OTP_INVALID_OR_EXPIRED':
      case 'ANONYMOUS_RECOVERY_NOT_AVAILABLE':
      case 'RECOVERY_USER_NOT_FOUND':
      case 'RECOVERY_TICKET_LIMIT_EXCEEDED':
        // User-visible copy.
        throw recovered.error;
      default:
        throw recovered.error;
    }
  }
  return recovered.value.sessionToken;
}
```

**Why:** recovery reuses the same session-token contract as `signIn`, so the downstream backend handshake stays identical.
**Errors to handle:** `OTP_INVALID_OR_EXPIRED`, `ANONYMOUS_RECOVERY_NOT_AVAILABLE` (anonymous accounts have no recovery path), `RECOVERY_USER_NOT_FOUND`, `RECOVERY_TICKET_LIMIT_EXCEEDED`, `USER_CANCELLED`.

---

## 10. SIWE — sign in with Ethereum

Enable the web3 preset to expose `client.siwe.*` and `client.identity.*`. The SDK never signs; it only builds the canonical EIP-4361 message and verifies the signature server-side.

```ts
import { TryMellon } from '@trymellon/js';
import { useAccount, useSignMessage } from 'wagmi';

const bootstrap = TryMellon.create({
  appId,
  publishableKey,
  preset: 'web3', // without this, `siwe` and `identity` are typed `never`
});
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

async function siweLogin(): Promise<void> {
  const { address, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  if (!address || !chain) throw new Error('wallet_not_connected');

  const nonce = await client.siwe.getNonce();
  if (!nonce.ok) throw nonce.error;

  const message = client.siwe.prepareMessage({
    domain: window.location.host,
    address,
    chainId: chain.id,
    uri: window.location.origin,
    nonce: nonce.value.nonce,
    statement: 'Sign in to Example App',
    issuedAt: new Date().toISOString(),
  });
  if (!message.ok) throw message.error;

  const signature = await signMessageAsync({ message: message.value });

  const verified = await client.siwe.verifyAndSignIn({
    message: message.value,
    signature,
  });
  if (!verified.ok) throw verified.error;

  await fetch('/api/session/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: verified.value.sessionToken }),
  });
}
```

### Standalone `prepareSiweMessage`

If you need to build the SIWE message from a server or a different client (e.g. a Node worker), import the helper from the `/web3` sub-path — no client instance, zero runtime deps.

```ts
import { prepareSiweMessage } from '@trymellon/js/web3';

const built = prepareSiweMessage({
  domain: 'app.example.com',
  address: '0x000000000000000000000000000000000000dEaD',
  chainId: 1,
  uri: 'https://app.example.com',
  nonce: 'abc12345',
});
if (!built.ok) throw built.error;
console.log(built.value); // canonical EIP-4361 string
```

**Why:** `prepareMessage` is a pure function. Running it server-side lets you keep the nonce issuance + message assembly on a trusted boundary.
**Errors to handle:** `SIWE_NONCE_EXPIRED`, `SIWE_NONCE_REPLAY`, `SIWE_SIGNATURE_INVALID`, `SIWE_MESSAGE_MALFORMED`, `SIWE_CHAIN_NOT_ALLOWED`, `SIWE_DOMAIN_MISMATCH`, `SIWE_ADDRESS_MISMATCH`, `INVALID_ARGUMENT` (rejected by `prepareMessage` before any network call).

---

## 11. Identity linking — attach an email to a wallet account

Linking happens after the user is authenticated. `client.identity.linkEmail` issues a challenge; the user enters the OTP from their inbox; `verifyEmailLink` persists the link.

```ts
import { TryMellon } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey, preset: 'web3' });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

// Precondition: user is already authenticated (signIn / signUp / enroll / SIWE).
await client.signIn({ externalUserId: 'alice' });

const challenge = await client.identity.linkEmail('alice@example.com');
if (!challenge.ok) throw challenge.error;

const otp = window.prompt('Enter the 6-digit verification code') ?? '';
const linked = await client.identity.verifyEmailLink({
  identifierId: challenge.value.identifierId,
  otp,
});
if (!linked.ok) throw linked.error;

// Inspect and prune linked identifiers later.
const list = await client.identity.list();
if (list.ok) console.log('Linked identifiers:', list.value);

// Unlink (e.g. user deletes their email):
const unlink = await client.identity.unlink(linked.value.id);
if (!unlink.ok) throw unlink.error;
```

**Why:** identity linking is the bridge between web3 (wallet-rooted) and traditional (email-rooted) identities. The SDK enforces "you must be signed in" by returning `INVALID_ARGUMENT` before any HTTP call if no session is active.
**Errors to handle:** `LINK_CHALLENGE_NOT_FOUND`, `LINK_OTP_INVALID`, `LINK_OTP_EXPIRED`, `IDENTIFIER_ALREADY_LINKED`, `IDENTIFIER_NOT_OWNED`, `EMAIL_ALREADY_TAKEN`, `UNLINK_LAST_IDENTIFIER_DENIED` (anonymous account would be unreachable).

---

## 12. Hosted tenant sign-up via `@trymellon/js/platform`

`createPlatform()` is a stateless helper that drives `POST /v1/onboarding/start` — used by integrators embedding the TryMellon hosted onboarding page. No publishable key required: the endpoint is public by design.

```ts
import { createPlatform } from '@trymellon/js/platform';

const platform = createPlatform({ apiBaseUrl: 'https://api.trymellon.com' });

async function startTenantSignup(): Promise<string> {
  const link = await platform.createSignupLink({
    userRole: 'maintainer',
    // returnUrl is optional — omit to rely on polling + default redirect.
    returnUrl: 'https://dashboard.example.com/onboarding/done',
    prefill: { email: 'founder@example.com', companyName: 'Acme' },
  });
  if (!link.ok) throw link.error;

  // Redirect the user (or render the QR):
  window.location.assign(link.value.hostedUrl);

  // If you prefer to keep the user on-page, poll for completion instead:
  const done = await platform.awaitSignupCompletion(link.value.sessionId, {
    intervalMs: 2_000,
    maxAttempts: 90,
    signal: AbortSignal.timeout(300_000),
  });
  if (!done.ok) throw done.error;

  return done.value.hostedUrl;
}
```

**Why:** the `/platform` entry is a Node-friendly (5 KB gzipped) sub-path. Keep it off the browser critical path — bundle it only on admin / onboarding surfaces.
**Errors to handle:** `INVALID_ARGUMENT` (`invalid_return_url`, `invalid_refresh_url`), `SESSION_EXPIRED` (terminal `expired` status), `SERVER_ERROR`, `TIMEOUT`, `ABORT_ERROR`, `RATE_LIMIT_EXCEEDED`.

---

## 13. Custom claims on sign-up / sign-in

Custom claims land in the session JWT under `https://trymellon.dev/claims`. Every key must exist in the application's `custom_claims_schema` (configured in the dashboard) or the backend rejects the request.

```ts
import { TryMellon, type CustomClaims } from '@trymellon/js';

const bootstrap = TryMellon.create({ appId, publishableKey });
if (!bootstrap.ok) throw bootstrap.error;
const client = bootstrap.value;

const claims: CustomClaims = {
  role: 'admin',
  tier: 'enterprise',
  seatId: 42,
  canWire: true,
};

const result = await client.signUp({
  externalUserId: 'alice',
  customClaims: claims,
});
if (!result.ok) {
  if (result.error.code === 'CUSTOM_CLAIM_NOT_ALLOWED') {
    // A key is missing from the app's schema — add it in the dashboard.
  }
  if (result.error.code === 'CUSTOM_CLAIMS_TOO_LARGE') {
    // Max 10 keys, 2 KB serialized.
  }
  throw result.error;
}
```

**Why:** the SDK ships claims untouched; the backend is authoritative. Schema enforcement happens server-side so tampering with the bundle cannot inject unknown claims.
**Errors to handle:** `CUSTOM_CLAIM_NOT_ALLOWED`, `CUSTOM_CLAIMS_TOO_LARGE`, `INVALID_ARGUMENT` (non-primitive claim value).

---

## 14. Webhook signature verification

`verifyWebhookSignature` is a pure function over the raw request body. Feed it the *unparsed* string — parsing before verifying will give you inconsistent bytes and false negatives.

```ts
import type { Request, Response } from 'express';
import express from 'express';
import {
  verifyWebhookSignature,
  type WebhookEvent,
} from '@trymellon/js';

const app = express();
// IMPORTANT: keep the raw body. Do NOT use `express.json()` on this route.
app.post(
  '/webhooks/trymellon',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const raw = (req.body as Buffer).toString('utf8');
    const signature = req.header('x-trymellon-signature') ?? '';
    const secret = process.env.TRYMELLON_WEBHOOK_SECRET ?? '';

    const valid = await verifyWebhookSignature(raw, signature, secret);
    if (!valid) {
      res.status(401).send('invalid_signature');
      return;
    }

    const event = JSON.parse(raw) as WebhookEvent;

    switch (event.event) {
      case 'auth.success':
        // event.data is narrowed to AuthSuccessPayload
        await recordLogin(event.data.user_id, event.data.credential_id);
        break;
      case 'credential.revoked':
        await invalidateLocalCache(event.data.credential_id);
        break;
      case 'session.revoked':
      case 'session.logout':
        await revokeLocalSession(event.data.session_id);
        break;
      case 'user.locked':
        await alertSecurity(event.data.user_id, event.data.lockout_level);
        break;
      case 'identifier.linked':
      case 'identifier.unlinked':
      case 'application.secret_rotated':
      case 'recovery.enrollment.issued':
      case 'recovery.enrollment.completed':
        // handle as needed
        break;
    }

    res.status(200).send('ok');
  }
);

declare function recordLogin(userId: string, credentialId: string): Promise<void>;
declare function invalidateLocalCache(credentialId: string): Promise<void>;
declare function revokeLocalSession(sessionId: string): Promise<void>;
declare function alertSecurity(userId: string, level: 'soft' | 'hard'): Promise<void>;
```

**Why:** HMAC is computed over bytes, not over semantically-equivalent JSON. A single whitespace added by `express.json()` changes the signature.
**Errors to handle:** 401 on signature mismatch. On parse failure (valid signature but malformed JSON) return 400 so the dashboard marks the delivery for retry.

---

## 15. React integration

Import the framework bindings from the `/react` sub-path. They are zero-dep on top of the core client — the provider only wires `TryMellon` into React context.

```tsx
import { useEffect, useState } from 'react';
import { TryMellon, type TryMellonClient } from '@trymellon/js';
import { TryMellonProvider, useSignIn, useSignUp } from '@trymellon/js/react';

function createClient(): TryMellonClient {
  const boot = TryMellon.create({ appId, publishableKey });
  if (!boot.ok) throw boot.error;
  return boot.value;
}

export function App(): JSX.Element {
  const [client] = useState(createClient);
  return (
    <TryMellonProvider client={client}>
      <AuthPanel />
    </TryMellonProvider>
  );
}

function AuthPanel(): JSX.Element {
  const signUp = useSignUp();
  const signIn = useSignIn();

  return (
    <section>
      <button disabled={signUp.loading} onClick={() => signUp.execute({ externalUserId: 'alice' })}>
        {signUp.loading ? 'Creating passkey…' : 'Sign up'}
      </button>
      <button disabled={signIn.loading} onClick={() => signIn.execute({ externalUserId: 'alice' })}>
        {signIn.loading ? 'Signing in…' : 'Sign in'}
      </button>

      {signUp.error && <p role="alert">sign-up: {signUp.error.message}</p>}
      {signIn.error && <p role="alert">sign-in: {signIn.error.message}</p>}
    </section>
  );
}
```

`useSignUp` / `useSignIn` expose `{ result, loading, error, execute }`. `execute` returns the same `Result` the core client returns — awaiting it lets you branch on the exact error code, mirrored in `error` for declarative UI.

**Why:** keeping the hooks thin (no event-emitter bridge) means they re-export the `Result` contract unchanged — you do not have two sources of truth.
**Errors to handle:** anything the underlying `signUp` / `signIn` returns (see §2).

---

## 16. Vue integration

Symmetric surface on the `/vue` sub-path. `provideTryMellon` must run inside a `setup` scope (either a component `setup()` or the app's root component).

```vue
<script setup lang="ts">
import { TryMellon, type TryMellonClient } from '@trymellon/js';
import { provideTryMellon, useSignIn, useSignUp } from '@trymellon/js/vue';

const boot = TryMellon.create({ appId, publishableKey });
if (!boot.ok) throw boot.error;
const client: TryMellonClient = boot.value;
provideTryMellon(client);

const signUp = useSignUp();
const signIn = useSignIn();
</script>

<template>
  <button :disabled="signUp.loading.value" @click="signUp.execute({ externalUserId: 'alice' })">
    {{ signUp.loading.value ? 'Creating passkey…' : 'Sign up' }}
  </button>
  <button :disabled="signIn.loading.value" @click="signIn.execute({ externalUserId: 'alice' })">
    {{ signIn.loading.value ? 'Signing in…' : 'Sign in' }}
  </button>

  <p v-if="signUp.error.value" role="alert">sign-up: {{ signUp.error.value.message }}</p>
  <p v-if="signIn.error.value" role="alert">sign-in: {{ signIn.error.value.message }}</p>
</template>
```

**Why:** all reactive state is exposed as `Ref`s. Dereference with `.value` in templates or destructure with `toRefs` if you prefer.
**Errors to handle:** same as §2.

---

## 17. Angular integration

Wire the client via the `provideTryMellon` provider, then inject `TryMellonService` wherever you need it.

```ts
// app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { TryMellon } from '@trymellon/js';
import { provideTryMellon } from '@trymellon/js/angular';

const boot = TryMellon.create({ appId, publishableKey });
if (!boot.ok) throw boot.error;

export const appConfig: ApplicationConfig = {
  providers: [provideTryMellon(boot.value)],
};
```

```ts
// auth-panel.component.ts
import { Component, inject, signal } from '@angular/core';
import { TryMellonService } from '@trymellon/js/angular';

@Component({
  selector: 'auth-panel',
  standalone: true,
  template: `
    <button [disabled]="loading()" (click)="signIn()">Sign in</button>
    <p *ngIf="errorMessage()" role="alert">{{ errorMessage() }}</p>
  `,
})
export class AuthPanelComponent {
  private readonly mellon = inject(TryMellonService);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async signIn(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    const result = await this.mellon.client.signIn({ externalUserId: 'alice' });
    this.loading.set(false);
    if (!result.ok) this.errorMessage.set(result.error.message);
  }
}
```

**Why:** `TryMellonService` exposes the fully typed `TryMellon` client via `service.client`. Thin helpers (`enroll`, `getContextHash`) are provided as passthroughs — the rest of the surface lives on `service.client.*`.
**Errors to handle:** same as §2.

---

## 18. Web component drop-in

Side-effect import `@trymellon/js/ui` once to register `<trymellon-auth>` in `customElements`. No JS glue required beyond reading `mellon:success` / `mellon:error`.

```html
<!doctype html>
<html>
  <body>
    <trymellon-auth
      app-id="your-app-id-uuid"
      publishable-key="cli_xxxxxxxxxxxxxxxxxxxxxxxx"
    ></trymellon-auth>

    <script type="module">
      // Side-effect import — registers <trymellon-auth> with customElements.
      import '@trymellon/js/ui';

      const el = document.querySelector('trymellon-auth');

      el.addEventListener('mellon:success', async (ev) => {
        // ev.detail: { operation, token, user?, redirectUrl?, nonce? }
        await fetch('/api/session/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: ev.detail.token }),
        });
      });

      el.addEventListener('mellon:error', (ev) => {
        // ev.detail: { operation, code, message, nonce? }
        console.error('[mellon]', ev.detail.code, ev.detail.message);
      });
    </script>
  </body>
</html>
```

**Why:** the web component is the only part of the SDK with a `sideEffects: true` entry — it self-registers with `customElements.define` at import time. See `documentation/WEB-COMPONENTS.md` for the full attribute and event contract.
**Errors to handle:** every `mellon:error` detail carries `{ code, message, operation }`. Treat `USER_CANCELLED` and `NOT_SUPPORTED` as UX, not exceptions.

---

## 19. Migration notes (v3 → v4)

| v3 (legacy)                           | v4 (current)                              | Notes                                                                                      |
| ------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `client.register(...)`                | `client.signUp(...)`                      | Types `RegisterOptions` / `RegisterResult` kept for back-compat.                           |
| `client.authenticate(...)`            | `client.signIn(...)`                      | Types `AuthenticateOptions` / `AuthenticateResult` kept for back-compat.                   |
| `client.fallback.email.start(...)`    | `client.otp.send(...)`                    | Same payload shape (`EmailFallbackStartOptions`).                                          |
| `client.fallback.email.verify(...)`   | `client.otp.verify(...)`                  | Same payload + result shapes.                                                              |
| `client.getStatus()`                  | `client.capabilities()`                   | Returns the same `ClientStatus` type.                                                      |
| `client.invite.accept(...)`           | `client.enroll({ ticketId })`             | Enrollment is the canonical path for pre-issued tickets.                                   |
| `client.auth.crossDevice.*`           | `client.crossDevice.*`                    | Flattened. `startRegistration`, `start`, `waitForCompletion`, `getContext`, `approve`.     |
| Event `operation: 'register'`         | Event `operation: 'signUp'`               | Update listeners on `client.on('start'\|'success'\|'error'\|'cancelled', …)`.              |
| Event `operation: 'authenticate'`     | Event `operation: 'signIn'`               | Idem.                                                                                      |
| `client.platform.*`                   | `createPlatform()` from `/platform`       | Hosted onboarding moved out of the main client (ADR-SDK-005). Saves bytes on every bundle. |
| Web3 surface on the default client    | `preset: 'web3'` required                 | `client.identity` / `client.siwe` are typed `never` without the preset (ADR-SDK-004).      |

**Why the renames:** `signUp` / `signIn` align with industry vocabulary (Apple, Auth0, Clerk) and eliminate the ambiguity of "authenticate" meaning both "prove identity" and "create credential" depending on context.

---

Need something not covered here? Reach out at [support@trymellonauth.com](mailto:support@trymellonauth.com) or file an issue at [github.com/ResakaGit/trymellon-js](https://github.com/ResakaGit/trymellon-js).
