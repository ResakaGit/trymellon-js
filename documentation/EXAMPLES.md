# Usage Examples

Practical integration examples for the `@trymellon/js` SDK in different scenarios.

**Credentials:** In all examples, `appId` is your **App ID** (UUID) and `publishableKey` is your **Client ID** (value `cli_xxx`). Get both from Dashboard → Your app → App ID and Client ID.

---

## Basic Example: Registration

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({
  appId: 'your-app-id-uuid', // Dashboard → Your app → App ID
  publishableKey: 'cli_xxxx', // Dashboard → Your app → Client ID
});
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;

async function registerUser(externalUserId: string) {
  const result = await client.register({ externalUserId });

  if (result.ok) {
    console.log('Passkey registered successfully');
    // Send session_token to your backend to create session
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.value.sessionToken }),
    });
  } else {
    if (result.error.code === 'USER_CANCELLED') {
      console.log('User cancelled registration');
    } else {
      console.error('Registration error:', result.error.message);
    }
  }
}
```

---

## Basic Example: Authentication

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;

async function loginUser(externalUserId: string) {
  const result = await client.authenticate({ externalUserId });

  if (result.ok) {
    const response = await fetch('/api/login/passkey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.value.sessionToken }),
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful:', data);
    }
  } else {
    if (result.error.code === 'USER_CANCELLED') {
      console.log('User cancelled');
    } else {
      console.error('Authentication error:', result.error.message);
    }
  }
}
```

---

## Example with Events

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;

// Subscribe to events
client.on('start', (payload) => {
  console.log('Operation started:', payload.operation);
  // Show spinner
});

client.on('success', (payload) => {
  console.log('Operation succeeded:', payload.operation);
  // Hide spinner
});

client.on('error', (payload) => {
  console.error('Error:', payload.error);
  // Show error message
});

client.on('cancelled', (payload) => {
  console.log('Operation cancelled:', payload.operation);
  // Hide spinner
});

// Use the client
const result = await client.register({ externalUserId: 'user_123' });
if (result.ok) console.log('Registration OK:', result.value.sessionToken);
```

---

## Example with Fallback

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;

async function authenticateWithFallback(userId: string) {
  if (!TryMellon.isSupported()) {
    return await authenticateWithEmail(userId, userId);
  }

  const result = await client.authenticate({ externalUserId: userId });
  if (result.ok) return await sendToBackend(result.value.sessionToken);

  if (result.error.code === 'NOT_SUPPORTED' || result.error.code === 'USER_CANCELLED') {
    return await authenticateWithEmail(userId, userId);
  }
  throw new Error(result.error.message);
}

async function authenticateWithEmail(userId: string, email: string) {
  const startResult = await client.fallback.email.start({ userId, email });
  if (!startResult.ok) throw new Error(startResult.error.message);

  const code = prompt('Enter the code sent by email:');
  if (!code) throw new Error('Code required');

  const verifyResult = await client.fallback.email.verify({ userId, code });
  if (!verifyResult.ok) throw new Error(verifyResult.error.message);

  return await sendToBackend(verifyResult.value.sessionToken);
}

async function sendToBackend(sessionToken: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken }),
  });

  return response.json();
}
```

---

## Example with React

```tsx
import { useState, useEffect } from 'react';
import { TryMellon } from '@trymellon/js';

function PasskeyAuth() {
  const [client] = useState(() => {
    const result = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
    if (!result.ok) throw result.error;
    return result.value;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeStart = client.on('start', () => setLoading(true));
    const unsubscribeSuccess = client.on('success', () => setLoading(false));
    const unsubscribeError = client.on('error', (payload) => {
      setLoading(false);
      setError(payload.error.message);
    });
    const unsubscribeCancelled = client.on('cancelled', () => setLoading(false));

    return () => {
      unsubscribeStart();
      unsubscribeSuccess();
      unsubscribeError();
      unsubscribeCancelled();
    };
  }, [client]);

  const handleRegister = async () => {
    setError(null);
    const result = await client.register({ externalUserId: 'user_123' });
    if (!result.ok) {
      if (result.error.code !== 'USER_CANCELLED') setError(result.error.message);
      return;
    }
    // Optional: send result.value.sessionToken to backend
  };

  const handleLogin = async () => {
    setError(null);
    const result = await client.authenticate({ externalUserId: 'user_123' });
    if (!result.ok) {
      if (result.error.code !== 'USER_CANCELLED') setError(result.error.message);
      return;
    }
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.value.sessionToken }),
    });
  };

  return (
    <div>
      {loading && <p>Processing...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleRegister} disabled={loading}>
        Register Passkey
      </button>
      <button onClick={handleLogin} disabled={loading}>
        Sign In
      </button>
    </div>
  );
}
```

---

## Example with Vue

```vue
<template>
  <div>
    <p v-if="loading">Processing...</p>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button @click="handleRegister" :disabled="loading">Register Passkey</button>
    <button @click="handleLogin" :disabled="loading">Sign In</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;
const loading = ref(false);
const error = ref<string | null>(null);

let unsubscribeFunctions: (() => void)[] = [];

onMounted(() => {
  unsubscribeFunctions = [
    client.on('start', () => {
      loading.value = true;
    }),
    client.on('success', () => {
      loading.value = false;
    }),
    client.on('error', (payload) => {
      loading.value = false;
      error.value = payload.error.message;
    }),
    client.on('cancelled', () => {
      loading.value = false;
    }),
  ];
});

onUnmounted(() => {
  for (const unsubscribe of unsubscribeFunctions) unsubscribe();
});

const handleRegister = async () => {
  error.value = null;
  const result = await client.register({ externalUserId: 'user_123' });
  if (!result.ok && result.error.code !== 'USER_CANCELLED') {
    error.value = result.error.message;
  }
};

const handleLogin = async () => {
  error.value = null;
  const result = await client.authenticate({ externalUserId: 'user_123' });
  if (!result.ok) {
    if (result.error.code !== 'USER_CANCELLED') error.value = result.error.message;
    return;
  }
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.value.sessionToken }),
  });
};
</script>
```

---

## Example with Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Passkey Auth</title>
  </head>
  <body>
    <button id="registerBtn">Register Passkey</button>
    <button id="loginBtn">Sign In</button>
    <div id="status"></div>

    <script type="module">
      import { TryMellon } from '@trymellon/js';

      const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
      if (!clientResult.ok) throw clientResult.error;
      const client = clientResult.value;
      const statusDiv = document.getElementById('status');

      function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'red' : 'black';
      }

      client.on('start', () => showStatus('Processing...'));
      client.on('success', () => showStatus('Operation succeeded'));
      client.on('error', (payload) => showStatus(payload.error.message, true));
      client.on('cancelled', () => showStatus('Operation cancelled'));

      document.getElementById('registerBtn').addEventListener('click', async () => {
        const result = await client.register({ externalUserId: 'user_123' });
        if (result.ok) showStatus('Registration successful');
        else if (result.error.code !== 'USER_CANCELLED') showStatus(result.error.message, true);
      });

      document.getElementById('loginBtn').addEventListener('click', async () => {
        const result = await client.authenticate({ externalUserId: 'user_123' });
        if (!result.ok) {
          if (result.error.code !== 'USER_CANCELLED') showStatus(result.error.message, true);
          return;
        }
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: result.value.sessionToken }),
        });
        if (response.ok) showStatus('Login successful');
      });
    </script>
  </body>
</html>
```

---

## Example with AbortSignal

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;

const controller = new AbortController();

// Cancel after 10 seconds
setTimeout(() => {
  controller.abort();
}, 10000);

const result = await client.register({
  externalUserId: 'user_123',
  signal: controller.signal,
});
if (!result.ok && result.error.code === 'USER_CANCELLED') {
  console.log('Operation cancelled by timeout or user');
}
```

---

## Example with Status Check

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;

async function checkSupport() {
  const status = await client.getStatus();

  if (!status.isPasskeySupported) {
    console.log('WebAuthn is not available');
    return false;
  }

  if (status.platformAuthenticatorAvailable) {
    console.log('Platform authenticator available');
  } else {
    console.log('Only cross-platform authenticators available');
  }

  if (status.recommendedFlow === 'fallback') {
    console.log('Fallback flow is recommended');
  }

  return true;
}
```

---

## Complete Example: Registration and Login

```typescript
import { TryMellon } from '@trymellon/js';

const clientResult = TryMellon.create({ appId: 'your-app-id-uuid', publishableKey: 'cli_xxxx' });
if (!clientResult.ok) throw clientResult.error;
const client = clientResult.value;

async function completeFlow() {
  // Check support
  if (!TryMellon.isSupported()) {
    console.log('WebAuthn not available, using fallback');
    return await useEmailFallback();
  }

  const registerResult = await client.register({ externalUserId: 'user_123' });
  if (!registerResult.ok) {
    if (registerResult.error.code === 'USER_CANCELLED') {
      console.log('Registration cancelled');
      return;
    }
    throw new Error(registerResult.error.message);
  }
  console.log('Registration successful');
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: registerResult.value.sessionToken }),
  });
  if (response.ok) {
    console.log('User authenticated after registration');
    return;
  }

  const authResult = await client.authenticate({ externalUserId: 'user_123' });
  if (!authResult.ok) {
    if (authResult.error.code === 'USER_CANCELLED') console.log('Cancelled');
    else throw new Error(authResult.error.message);
    return;
  }
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: authResult.value.sessionToken }),
  });
}

async function useEmailFallback() {
  const startResult = await client.fallback.email.start({
    userId: 'user_123',
    email: 'user@example.com',
  });
  if (!startResult.ok) throw new Error(startResult.error.message);
  const code = prompt('Enter the code:');
  const verifyResult = await client.fallback.email.verify({
    userId: 'user_123',
    code: code!,
  });
  if (!verifyResult.ok) throw new Error(verifyResult.error.message);
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: verifyResult.value.sessionToken }),
  });
}
```
