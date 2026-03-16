---
name: trymellon-js-examples
description: >
  Provides quick-start examples for integrating the @trymellon/js SDK in pure
  logic (Vanilla TypeScript), React, Vue 3, Angular and Web Components. Use it
  when the agent needs to generate minimal frontend snippets aligned with the
  trymellon-js-sdk skill.
---

# @trymellon/js – Quick examples

## Philosophy

- Focus on **small, readable examples**, centered on:
  - Safe initialization with `TryMellon.create`.
  - Explicit `Result` handling (`result.ok` / `result.error.code`).
  - Sending the `sessionToken` to the backend, with no business logic in the client.
- For the full API contract, error codes and advanced options, see
  [.cursor/skills/trymellon-js-sdk/SKILL.md](../../.cursor/skills/trymellon-js-sdk/SKILL.md).

## General rules

- Always initialize with `TryMellon.create(config)` and check `clientResult.ok`.
- Every `register` / `authenticate` call should:
  - Inspect `result.ok`.
  - Branch on `result.error.code` when relevant (e.g. `NOT_SUPPORTED`, `PASSKEY_NOT_FOUND`).
- The `sessionToken` is always sent to the backend (e.g. `POST /api/login`) so that your server validates it and creates your own session. The optional `client.validateSession(sessionToken)` helper from the main SDK skill is only for lightweight frontend checks and must not replace backend validation in production.
- Always use the following names:
  - `externalUserId` (camelCase).
  - `sessionToken`.
  - `TryMellon`.

---

## Pure logic (Vanilla TypeScript)

### Context

Domain module that receives an already initialized `TryMellon` client and exposes pure functions to register and authenticate. It does not touch the DOM or any framework.

### Snippet

```ts
import type { TryMellon } from '@trymellon/js';

type RegisterOptions = {
  externalUserId: string;
};

export async function registerUser(client: TryMellon, options: RegisterOptions) {
  const result = await client.register({
    externalUserId: options.externalUserId,
  });

  if (!result.ok) {
    // Minimal handling; specific branching by error.code should live elsewhere
    return result;
  }

  // Send sessionToken to the backend in another layer
  return result;
}

export async function authenticateUser(client: TryMellon, externalUserId: string) {
  const result = await client.authenticate({ externalUserId });
  return result;
}
```

---

## React ( @trymellon/js/react )

### Context

Use `TryMellonProvider` at the root and `useRegister` / `useAuthenticate` hooks in components. The hook exposes `execute`, `loading` and `error`.

### Snippet – Provider

```tsx
// app/TryMellonProvider.tsx
import React from 'react';
import { TryMellon } from '@trymellon/js';
import { TryMellonProvider } from '@trymellon/js/react';

const clientResult = TryMellon.create({
  appId: 'app_live_xxxx',
  publishableKey: 'key_live_xxxx',
});

if (!clientResult.ok) {
  throw clientResult.error;
}

const mellonClient = clientResult.value;

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <TryMellonProvider client={mellonClient}>{children}</TryMellonProvider>;
}
```

### Snippet – Botón de registro

```tsx
// components/RegisterButton.tsx
import { useRegister } from '@trymellon/js/react';

type Props = {
  externalUserId: string;
};

export function RegisterButton({ externalUserId }: Props) {
  const { execute, loading, error } = useRegister();

  const handleClick = async () => {
    const result = await execute({ externalUserId });
    if (!result.ok) {
      if (result.error.code === 'NOT_SUPPORTED') {
        // Email fallback or other flow here
      }
      return;
    }

    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.value.sessionToken }),
    });
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Registrando…' : 'Registrar con passkey'}
      {error && <span>{error.message}</span>}
    </button>
  );
}
```

---

## Vue 3 ( @trymellon/js/vue )

### Context

Provide the `TryMellon` instance in the app root with `provideTryMellon` and consume `useRegister` / `useAuthenticate` in components.

### Snippet – Bootstrap

```ts
// main.ts
import { createApp } from 'vue';
import { TryMellon } from '@trymellon/js';
import { provideTryMellon } from '@trymellon/js/vue';
import App from './App.vue';

const clientResult = TryMellon.create({
  appId: 'app_live_xxxx',
  publishableKey: 'key_live_xxxx',
});

if (!clientResult.ok) {
  throw clientResult.error;
}

const app = createApp(App);
provideTryMellon(app, clientResult.value);
app.mount('#app');
```

### Snippet – Botón de registro

```vue
<!-- components/RegisterButton.vue -->
<script setup lang="ts">
import { useRegister } from '@trymellon/js/vue';

const props = defineProps<{
  externalUserId: string;
}>();

const { execute, loading, error } = useRegister();

const handleClick = async () => {
  const result = await execute({ externalUserId: props.externalUserId });
  if (!result.ok) return;

  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  });
};
</script>

<template>
  <button :disabled="loading" @click="handleClick">
    {{ loading ? 'Registrando…' : 'Registrar con passkey' }}
    <span v-if="error">{{ error.message }}</span>
  </button>
</template>
```

---

## Angular ( @trymellon/js/angular )

### Context

Configure `provideTryMellonConfig` during app bootstrap and use `TryMellonService` in components to access the client.

### Snippet – Bootstrap

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideTryMellonConfig } from '@trymellon/js/angular';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideTryMellonConfig({
      appId: 'app_live_xxxx',
      publishableKey: 'key_live_xxxx',
    }),
  ],
});
```

### Snippet – Componente de registro

```ts
// app/register-button.component.ts
import { Component, Input } from '@angular/core';
import { TryMellonService } from '@trymellon/js/angular';

@Component({
  selector: 'mellon-register-button',
  standalone: true,
  template: `
    <button (click)="onClick()" [disabled]="loading">
      {{ loading ? 'Registrando…' : 'Registrar con passkey' }}
    </button>
  `,
})
export class RegisterButtonComponent {
  @Input() externalUserId = '';
  loading = false;

  constructor(private readonly mellon: TryMellonService) {}

  async onClick() {
    this.loading = true;
    const result = await this.mellon.client.register({
      externalUserId: this.externalUserId,
    });
    this.loading = false;

    if (!result.ok) return;

    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.value.sessionToken }),
    });
  }
}
```

---

## Web Component (Custom Element)

### Context

Framework-agnostic Custom Element that receives the `TryMellon` client and emits an event when authentication succeeds.

### Snippet

```ts
// mellon-login-button.ts
import type { TryMellon } from '@trymellon/js';

export class MellonLoginButton extends HTMLElement {
  private client: TryMellon | null = null;
  private button!: HTMLButtonElement;
  externalUserId = '';

  set mellonClient(client: TryMellon) {
    this.client = client;
  }

  connectedCallback() {
    this.button = document.createElement('button');
    this.button.textContent = 'Login con passkey';
    this.button.addEventListener('click', () => {
      void this.handleClick();
    });
    this.appendChild(this.button);
  }

  private async handleClick() {
    if (!this.client) return;

    const result = await this.client.authenticate({
      externalUserId: this.externalUserId,
    });

    if (!result.ok) return;

    this.dispatchEvent(
      new CustomEvent('mellon:authenticated', {
        detail: { sessionToken: result.value.sessionToken },
        bubbles: true,
      })
    );
  }
}

customElements.define('mellon-login-button', MellonLoginButton);
```

---

## Referencias

- Main SDK skill: [.cursor/skills/trymellon-js-sdk/SKILL.md](../../.cursor/skills/trymellon-js-sdk/SKILL.md)
- External documentation (npm, GitHub): linked from the SDK skill; not repeated here.
