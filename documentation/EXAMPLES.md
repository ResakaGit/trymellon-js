# Ejemplos de Uso

Ejemplos prácticos de integración del SDK `@trymellon/js` en diferentes escenarios.

---

## Ejemplo Básico: Registro

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({
  appId: 'app_123',
  publishableKey: 'key_123',
});

async function registerUser(externalUserId: string) {
  const result = await client.register({ externalUserId });

  if (result.ok) {
    console.log('Passkey registrada exitosamente');
    // Enviar session_token a tu backend para crear sesión
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.value.sessionToken }),
    });
  } else {
    if (result.error.code === 'USER_CANCELLED') {
      console.log('Usuario canceló el registro');
    } else {
      console.error('Error al registrar:', result.error.message);
    }
  }
}
```

---

## Ejemplo Básico: Autenticación

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({
  appId: 'app_123',
  publishableKey: 'key_123',
});

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
      console.log('Login exitoso:', data);
    }
  } else {
    if (result.error.code === 'USER_CANCELLED') {
      console.log('Usuario canceló');
    } else {
      console.error('Error al autenticar:', result.error.message);
    }
  }
}
```

---

## Ejemplo con Eventos

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({
  appId: 'app_123',
  publishableKey: 'key_123',
});

// Suscribirse a eventos
client.on('start', (payload) => {
  console.log('Operación iniciada:', payload.operation);
  // Mostrar spinner
});

client.on('success', (payload) => {
  console.log('Operación exitosa:', payload.operation);
  // Ocultar spinner
});

client.on('error', (payload) => {
  console.error('Error:', payload.error);
  // Mostrar mensaje de error
});

client.on('cancelled', (payload) => {
  console.log('Operación cancelada:', payload.operation);
  // Ocultar spinner
});

// Usar el cliente
const result = await client.register({ externalUserId: 'user_123' });
if (result.ok) console.log('Registro OK:', result.value.sessionToken);
```

---

## Ejemplo con Fallback

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({
  appId: 'app_123',
  publishableKey: 'key_123',
});

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

  const code = prompt('Ingresa el código enviado por email:');
  if (!code) throw new Error('Código requerido');

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

## Ejemplo con React

```tsx
import { useState, useEffect } from 'react';
import { TryMellon } from '@trymellon/js';

function PasskeyAuth() {
  const [client] = useState(() => new TryMellon({ appId: 'app_123', publishableKey: 'key_123' }));
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
    // Opcional: enviar result.value.sessionToken al backend
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
      {loading && <p>Procesando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleRegister} disabled={loading}>
        Registrar Passkey
      </button>
      <button onClick={handleLogin} disabled={loading}>
        Iniciar Sesión
      </button>
    </div>
  );
}
```

---

## Ejemplo con Vue

```vue
<template>
  <div>
    <p v-if="loading">Procesando...</p>
    <p v-if="error" style="color: red">{{ error }}</p>
    <button @click="handleRegister" :disabled="loading">Registrar Passkey</button>
    <button @click="handleLogin" :disabled="loading">Iniciar Sesión</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({ appId: 'app_123', publishableKey: 'key_123' });
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
  unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
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

## Ejemplo con Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Passkey Auth</title>
  </head>
  <body>
    <button id="registerBtn">Registrar Passkey</button>
    <button id="loginBtn">Iniciar Sesión</button>
    <div id="status"></div>

    <script type="module">
      import { TryMellon } from '@trymellon/js';

      const client = new TryMellon({ appId: 'app_123', publishableKey: 'key_123' });
      const statusDiv = document.getElementById('status');

      function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'red' : 'black';
      }

      client.on('start', () => showStatus('Procesando...'));
      client.on('success', () => showStatus('Operación exitosa'));
      client.on('error', (payload) => showStatus(payload.error.message, true));
      client.on('cancelled', () => showStatus('Operación cancelada'));

      document.getElementById('registerBtn').addEventListener('click', async () => {
        const result = await client.register({ externalUserId: 'user_123' });
        if (result.ok) showStatus('Registro exitoso');
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
        if (response.ok) showStatus('Login exitoso');
      });
    </script>
  </body>
</html>
```

---

## Ejemplo con AbortSignal

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({ appId: 'app_123', publishableKey: 'key_123' });

const controller = new AbortController();

// Cancelar después de 10 segundos
setTimeout(() => {
  controller.abort();
}, 10000);

const result = await client.register({
  externalUserId: 'user_123',
  signal: controller.signal,
});
if (!result.ok && result.error.code === 'USER_CANCELLED') {
  console.log('Operación cancelada por timeout o usuario');
}
```

---

## Ejemplo con Verificación de Estado

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({ appId: 'app_123', publishableKey: 'key_123' });

async function checkSupport() {
  const status = await client.getStatus();

  if (!status.isPasskeySupported) {
    console.log('WebAuthn no está disponible');
    return false;
  }

  if (status.platformAuthenticatorAvailable) {
    console.log('Authenticator platform disponible');
  } else {
    console.log('Solo authenticators cross-platform disponibles');
  }

  if (status.recommendedFlow === 'fallback') {
    console.log('Se recomienda usar fallback');
  }

  return true;
}
```

---

## Ejemplo Completo: Registro y Login

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({ appId: 'app_123', publishableKey: 'key_123' });

async function completeFlow() {
  // Verificar soporte
  if (!TryMellon.isSupported()) {
    console.log('WebAuthn no disponible, usando fallback');
    return await useEmailFallback();
  }

  const registerResult = await client.register({ externalUserId: 'user_123' });
  if (!registerResult.ok) {
    if (registerResult.error.code === 'USER_CANCELLED') {
      console.log('Registro cancelado');
      return;
    }
    throw new Error(registerResult.error.message);
  }
  console.log('Registro exitoso');
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: registerResult.value.sessionToken }),
  });
  if (response.ok) {
    console.log('Usuario autenticado después del registro');
    return;
  }

  const authResult = await client.authenticate({ externalUserId: 'user_123' });
  if (!authResult.ok) {
    if (authResult.error.code === 'USER_CANCELLED') console.log('Cancelado');
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
  const code = prompt('Ingresa el código:');
  const verifyResult = await client.fallback.email.verify({
    userId: 'user_123',
    code: code!,
  });
  if (!verifyResult.ok) throw new Error(verifyResult.error.message);
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: verifyResult.value.sessionToken }),
  });
}
```
