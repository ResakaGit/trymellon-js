# Web Components — Usage Guide

Reference for using `<trymellon-auth>` and `<trymellon-auth-modal>` (entry point `@trymellon/js/ui`). No internal implementation details.

---

## Registration

```typescript
import '@trymellon/js/ui';
```

Import once to register both custom elements.

---

## `<trymellon-auth>` (button + modal)

Single tag: action button and built-in modal. Ideal for most integrations.

### Default usage (button + internal modal)

```html
<trymellon-auth
  app-id="your-app-id-uuid"
  publishable-key="cli_xxxx"
  mode="auto"
  external-user-id="user_123"
  theme="light"
></trymellon-auth>
```

| Attribute          | Type                            | Description                                                                                                             |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `app-id`           | string                          | Application ID (UUID)                                                                                                   |
| `publishable-key`  | string                          | Client ID (`cli_xxxx`)                                                                                                  |
| `mode`             | `auto` \| `login` \| `register` | Auth mode. `auto` = login by default.                                                                                   |
| `external-user-id` | string                          | User identifier                                                                                                         |
| `theme`            | `light` \| `dark`               | Visual theme                                                                                                            |
| `action`           | `open-modal` \| `direct-auth`   | Default: button + modal. `direct-auth`: direct ceremony without opening modal.                                          |
| `trigger-only`     | `true` \| `false`               | If `true`, only renders the button and emits `mellon:open-request`; the host must open `<trymellon-auth-modal>` itself. |

### Button-only option (`trigger-only="true"`)

To control where the modal is mounted (portal, custom overlay):

```html
<trymellon-auth app-id="…" publishable-key="…" trigger-only="true"></trymellon-auth>
<trymellon-auth-modal id="my-modal" app-id="…" publishable-key="…"></trymellon-auth-modal>
```

```js
document.querySelector('trymellon-auth').addEventListener('mellon:open-request', () => {
  document.getElementById('my-modal').open = true;
});
```

---

## `<trymellon-auth-modal>`

Modal with Login/Register tabs, onboarding, and open/close cycle.

### Attributes

| Attribute            | Type                  | Description                                                                                                    |
| -------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `app-id`             | string                | Application ID (UUID)                                                                                          |
| `publishable-key`    | string                | Client ID (`cli_xxxx`)                                                                                         |
| `open`               | `true` \| `false`     | Controls visibility                                                                                            |
| `tab`                | `login` \| `register` | Active tab                                                                                                     |
| `tab-labels`         | string                | Custom labels, comma-separated (e.g. `"Sign Up,Sign In"`)                                                      |
| `mode`               | `modal` \| `inline`   | Presentation mode                                                                                              |
| `theme`              | `light` \| `dark`     | Theme                                                                                                          |
| `dialog-title`       | string                | Modal title; if not set, "TryMellon — Sign in or register" or `app-name` + " — Sign in or register" is used.   |
| `dialog-description` | string                | Description below the title; if not set, SDK default text.                                                     |
| `session-id`         | string                | Session ID for onboarding                                                                                      |
| `onboarding-url`     | string                | External URL to complete onboarding                                                                            |
| `is-mobile-override` | `true` \| `false`     | Override mobile detection                                                                                      |
| `fallback-type`      | `email` \| `qr`       | Preferred fallback channel                                                                                     |
| `qr-load-timeout-ms` | number                | Timeout (ms) to show error if no content is injected into the cross-device slot after opening (default 12000). |

### API from JS

```typescript
const modal = document.querySelector('trymellon-auth-modal');
modal.open = true;
modal.tab = 'register';
modal.theme = 'dark';
modal.reset(); // Reset to initial state
```

### Core injection (when the host mounts the modal)

If you use `trigger-only` and mount `<trymellon-auth-modal>` yourself, you must inject the auth core:

```js
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: '…', publishableKey: '…' });
if (!clientResult.ok) throw clientResult.error;

const modal = document.querySelector('trymellon-auth-modal');
modal.attachCore(clientResult.value);
```

Before reopening the modal, call `modal.reset()` for a clean state.

---

## Cross-device (QR)

The modal shows by default a **button with QR icon** (illustration), not a scannable QR. On click it emits `mellon:fallback` with `detail.fallbackType === 'qr'`.

**Skeleton and timeout (modal):** On open, the modal sets the cross-device area to "waiting" and shows a minimal skeleton ("Loading QRs…"). If the host injects content into the `cross-device` slot before the timeout (`qr-load-timeout-ms`, default 12s), the modal switches to "loaded" and shows that content. If nothing is injected in time, the modal shows the error ("QR could not be loaded. Try again."). The host subscribes to `mellon:open`, performs the requests, and when URLs arrive injects the QRs into the slot.

To show a **scannable QR**, the host must:

1. Listen for `mellon:fallback` when `detail.fallbackType === 'qr'`.
2. Call the TryMellon client: `client.crossDevice.start()` (login) or `client.crossDevice.startRegistration({ externalUserId })` (register; `externalUserId` is optional for anonymous registration).
3. Get `qr_url` from the response and generate an image (e.g. with a lib like `qrcode`).
4. Inject the image into the slot: create a node with `slot="cross-device"` (e.g. `<div slot="cross-device"><img src="data:..."></div>`) and `appendChild` to the `<trymellon-auth-modal>` element. That content replaces the default button.

**QR generation dependency** (URL → image) is on the host today; the SDK does not bundle a QR lib. This lets the integrator choose the lib and bundle size. In the future the WC could offer a stateful mode that generates and shows the QR internally (with an optional SDK dependency).

---

## Events

Listen on the WC **element** (not on `document`), so the token is not exposed to third-party scripts.

| Event                 | Detail                                                   | Description                                                     |
| --------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| `mellon:open`         | `{}`                                                     | Modal opened                                                    |
| `mellon:close`        | `{ reason: 'success' \| 'cancel' \| 'error' \| 'user' }` | Modal closed                                                    |
| `mellon:open-request` | `{}`                                                     | Button click (when `action="open-modal"`)                       |
| `mellon:start`        | `{ operation }`                                          | Auth operation started (`'signUp' \| 'signIn' \| 'enroll'`)     |
| `mellon:success`      | `{ token, user, nonce? }`                                | Auth succeeded                                                  |
| `mellon:error`        | `{ error }`                                              | Auth error (`error.code: TryMellonErrorCode`)                   |
| `mellon:cancelled`    | `{}`                                                     | Auth cancelled                                                  |
| `mellon:fallback`     | `{ operation?, fallbackType? }`                          | Fallback (email/QR) triggered                                   |
| `mellon:tab-change`   | `{ tab }`                                                | Tab change                                                      |
| `mellon:context-ready`| `{ contextHash }`                                        | SHA-256 context hash bound to this enrollment session is ready  |

### Example: send token to backend

```js
const modal = document.querySelector('trymellon-auth-modal');
modal.addEventListener('mellon:success', (e) => {
  const { token } = e.detail;
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: token }),
  }).then(() => {
    /* redirect or close */
  });
});
```

The backend **must always validate** the token (TryMellon validation endpoint); do not create a session just because the front sent a string.

---

## `action` behavior

| `action`               | Effect                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `open-modal` (default) | Click → emits `mellon:open-request` and (if not `trigger-only`) opens the internal modal.                                           |
| `direct-auth`          | Click → direct ceremony in the WC; no modal opens. Listen for `mellon:success` or `mellon:error`/`mellon:cancelled` on the element. |

---

## Double click

With `action="open-modal"`, each click emits `mellon:open-request` and opens the modal. There is no debounce in the WC. If you use `trigger-only` and open your own modal, you can no-op when `modal.open === true` or apply debounce in the listener.
