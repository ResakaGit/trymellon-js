# API Reference

Referencia completa de la API pública del SDK `@trymellon/js`.

---

## Clase TryMellon

Clase principal del SDK para autenticación passwordless con Passkeys/WebAuthn.

### Constructor

```typescript
new TryMellon(config: TryMellonConfig)
```

**Parámetros:**

- `config.appId` (string, requerido): ID de la aplicación en TryMellon
- `config.apiBaseUrl` (string, opcional): URL base de la API. Por defecto: `'https://api.trymellonauth.com'`
  - Debe ser una URL válida
- `config.timeoutMs` (number, opcional): Timeout en milisegundos para requests HTTP. Por defecto: `30000`
  - Rango válido: `1000` - `300000` (1 segundo - 5 minutos)
- `config.maxRetries` (number, opcional): Número máximo de reintentos para requests HTTP fallidos. Por defecto: `3`
  - Rango válido: `0` - `10`
  - Solo se reintentan errores 5xx y errores de red transitorios
- `config.retryDelayMs` (number, opcional): Delay inicial en milisegundos entre reintentos. Por defecto: `1000`
  - Rango válido: `100` - `10000` (100ms - 10 segundos)
  - El delay aumenta exponencialmente en cada reintento

**Ejemplo:**

```typescript
import { TryMellon } from '@trymellon/js';

const client = new TryMellon({
  appId: 'app_123',
  apiBaseUrl: 'https://api.trymellonauth.com',
  timeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
});
```

**Errores:**

- Lanza `TryMellonError` con código `'INVALID_ARGUMENT'` si:
  - `appId` está vacío o no es un string
  - `apiBaseUrl` no es una URL válida
  - `timeoutMs` está fuera del rango válido
  - `maxRetries` está fuera del rango válido
  - `retryDelayMs` está fuera del rango válido

---

## Métodos Estáticos

### `TryMellon.isSupported()`

Verifica si el navegador soporta WebAuthn/Passkeys.

```typescript
static isSupported(): boolean
```

**Retorna:**

- `true` si WebAuthn está soportado
- `false` si no está soportado

**Ejemplo:**

```typescript
if (!TryMellon.isSupported()) {
  console.log('WebAuthn no está disponible');
  // Mostrar fallback
}
```

---

## Métodos de Instancia

### `register()`

Registra una nueva passkey para un usuario.

```typescript
register(options: RegisterOptions): Promise<RegisterResult>
```

**Parámetros:**

- `options.userId` (string, requerido): ID único del usuario
- `options.authenticatorType` ('platform' | 'cross-platform', opcional): Tipo de authenticator preferido
- `options.signal` (AbortSignal, opcional): Signal para cancelar la operación

**Retorna:**

- `Promise<RegisterResult>`: Objeto con `success: true` y opcionalmente `sessionToken` si TryMellon Backend lo proporciona

**Ejemplo:**

```typescript
try {
  const result = await client.register({
    userId: 'user_123',
    authenticatorType: 'platform',
  });

  console.log('Passkey registrada exitosamente');

  // Si TryMellon Backend retorna sessionToken, puedes usarlo inmediatamente
  if (result.sessionToken) {
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: result.sessionToken }),
    });
  }
} catch (error) {
  if (error.code === 'USER_CANCELLED') {
    console.log('Usuario canceló el registro');
  }
}
```

**Errores:**

- `NOT_SUPPORTED`: WebAuthn no está disponible
- `USER_CANCELLED`: Usuario canceló la operación
- `INVALID_ARGUMENT`: `userId` inválido
- `NETWORK_FAILURE`: Error de red
- `TIMEOUT`: Operación expiró

---

### `authenticate()`

Autentica un usuario usando su passkey.

```typescript
authenticate(options: AuthenticateOptions): Promise<AuthenticateResult>
```

**Parámetros:**

- `options.userId` (string, opcional): ID del usuario. Si no se proporciona, se mostrarán todas las passkeys disponibles
- `options.hint` (string, opcional): Hint para ayudar al usuario a seleccionar la passkey correcta (ej: email)
- `options.signal` (AbortSignal, opcional): Signal para cancelar la operación

**Retorna:**

- `Promise<AuthenticateResult>`: Objeto con `sessionToken` y opcionalmente `user`

**Ejemplo:**

```typescript
try {
  const result = await client.authenticate({
    userId: 'user_123',
    hint: 'user@example.com',
  });

  // Enviar sessionToken al backend
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.sessionToken }),
  });
} catch (error) {
  if (error.code === 'PASSKEY_NOT_FOUND') {
    console.log('No se encontró passkey para este usuario');
  }
}
```

**Errores:**

- `NOT_SUPPORTED`: WebAuthn no está disponible
- `USER_CANCELLED`: Usuario canceló la operación
- `PASSKEY_NOT_FOUND`: No se encontró passkey para el usuario
- `NETWORK_FAILURE`: Error de red
- `TIMEOUT`: Operación expiró

---

### `getStatus()`

Obtiene el estado de soporte de WebAuthn en el cliente.

```typescript
getStatus(): Promise<ClientStatus>
```

**Retorna:**

- `Promise<ClientStatus>`: Objeto con información sobre el soporte de WebAuthn

**Ejemplo:**

```typescript
const status = await client.getStatus();

if (status.isPasskeySupported) {
  console.log('Passkeys disponibles');
  if (status.platformAuthenticatorAvailable) {
    console.log('Authenticator platform disponible');
  }
} else {
  console.log('Usar fallback');
}
```

---

### `on()`

Suscribe un handler a eventos del SDK.

```typescript
on(event: TryMellonEvent, handler: EventHandler): () => void
```

**Parámetros:**

- `event`: Tipo de evento ('start' | 'success' | 'error' | 'cancelled')
- `handler`: Función que se ejecutará cuando ocurra el evento

**Retorna:**

- Función para desuscribirse del evento

**Ejemplo:**

```typescript
const unsubscribe = client.on('start', (payload) => {
  console.log('Operación iniciada:', payload.operation);
});

client.on('success', (payload) => {
  console.log('Operación exitosa:', payload.operation);
});

client.on('error', (payload) => {
  console.error('Error:', payload.error);
});

// Desuscribirse
unsubscribe();
```

---

### `version()`

Retorna la versión del SDK.

```typescript
version(): string
```

**Retorna:**

- Versión del SDK como string

**Ejemplo:**

```typescript
console.log('SDK version:', client.version());
```

---

## Fallback por Email

### `fallback.email.start()`

Inicia el flujo de fallback por email, enviando un código OTP.

```typescript
fallback.email.start(options: EmailFallbackStartOptions): Promise<void>
```

**Parámetros:**

- `options.userId` (string, requerido): ID del usuario

**Ejemplo:**

```typescript
try {
  await client.fallback.email.start({ userId: 'user_123' });
  console.log('Código OTP enviado por email');
} catch (error) {
  console.error('Error al enviar OTP:', error);
}
```

**Errores:**

- `INVALID_ARGUMENT`: `userId` inválido
- `NETWORK_FAILURE`: Error de red

---

### `fallback.email.verify()`

Verifica el código OTP y retorna un sessionToken.

```typescript
fallback.email.verify(options: EmailFallbackVerifyOptions): Promise<EmailFallbackVerifyResult>
```

**Parámetros:**

- `options.userId` (string, requerido): ID del usuario
- `options.code` (string, requerido): Código OTP recibido por email

**Retorna:**

- `Promise<EmailFallbackVerifyResult>`: Objeto con `sessionToken`

**Ejemplo:**

```typescript
try {
  const result = await client.fallback.email.verify({
    userId: 'user_123',
    code: '123456',
  });

  // Enviar sessionToken al backend
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionToken: result.sessionToken }),
  });
} catch (error) {
  console.error('Código inválido:', error);
}
```

**Errores:**

- `INVALID_ARGUMENT`: `userId` o `code` inválidos
- `NETWORK_FAILURE`: Error de red

---

## Tipos

### `TryMellonConfig`

```typescript
type TryMellonConfig = {
  appId: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};
```

**Validaciones:**

- `appId`: Debe ser un string no vacío
- `apiBaseUrl`: Debe ser una URL válida (validada con `new URL()`)
- `timeoutMs`: Debe estar entre `1000` y `300000` milisegundos
- `maxRetries`: Debe estar entre `0` y `10`
- `retryDelayMs`: Debe estar entre `100` y `10000` milisegundos

### `RegisterOptions`

```typescript
type RegisterOptions = {
  userId: string;
  authenticatorType?: 'platform' | 'cross-platform';
  signal?: AbortSignal;
};
```

### `RegisterResult`

```typescript
type RegisterResult = {
  success: true;
  sessionToken?: string;
};
```

**Nota:** El `sessionToken` es opcional y solo estará presente si TryMellon Backend lo proporciona durante el registro. Si está presente, puedes usarlo inmediatamente para autenticar al usuario sin necesidad de llamar a `authenticate()`.

### `AuthenticateOptions`

```typescript
type AuthenticateOptions = {
  userId?: string;
  hint?: string;
  signal?: AbortSignal;
};
```

### `AuthenticateResult`

```typescript
type AuthenticateResult = {
  sessionToken: string;
  user?: {
    userId: string;
    externalUserId: string;
    email?: string;
    metadata?: Record<string, unknown>;
  };
};
```

### `ClientStatus`

```typescript
type ClientStatus = {
  isPasskeySupported: boolean;
  platformAuthenticatorAvailable: boolean;
  recommendedFlow: 'passkey' | 'fallback';
};
```

### `TryMellonEvent`

```typescript
type TryMellonEvent = 'start' | 'success' | 'error' | 'cancelled';
```

### `EventPayload`

```typescript
type EventPayload =
  | { type: 'start'; operation: 'register' | 'authenticate' }
  | { type: 'success'; operation: 'register' | 'authenticate' }
  | { type: 'error'; error: TryMellonError }
  | { type: 'cancelled'; operation: 'register' | 'authenticate' };
```

### `EventHandler`

```typescript
type EventHandler = (payload: EventPayload) => void;
```

### `EmailFallbackStartOptions`

```typescript
type EmailFallbackStartOptions = {
  userId: string;
};
```

### `EmailFallbackVerifyOptions`

```typescript
type EmailFallbackVerifyOptions = {
  userId: string;
  code: string;
};
```

### `EmailFallbackVerifyResult`

```typescript
type EmailFallbackVerifyResult = {
  sessionToken: string;
};
```

---

## Errores

### `TryMellonError`

Clase de error principal del SDK.

```typescript
class TryMellonError extends Error {
  readonly code: TryMellonErrorCode;
  readonly details?: unknown;
  readonly isTryMellonError: true;
}
```

**Propiedades:**

- `code`: Código del error
- `details`: Detalles adicionales del error (opcional)
- `isTryMellonError`: Siempre `true` para identificación de tipo

**Ejemplo:**

```typescript
try {
  await client.authenticate({ userId: 'user_123' });
} catch (error) {
  if (error instanceof TryMellonError) {
    console.error('Error code:', error.code);
    console.error('Details:', error.details);
  }
}
```

### `TryMellonErrorCode`

Códigos de error disponibles:

- `'NOT_SUPPORTED'`: WebAuthn no está disponible
- `'USER_CANCELLED'`: Usuario canceló la operación
- `'PASSKEY_NOT_FOUND'`: No se encontró passkey
- `'SESSION_EXPIRED'`: Sesión expirada
- `'NETWORK_FAILURE'`: Error de red
- `'INVALID_ARGUMENT'`: Argumento inválido
- `'TIMEOUT'`: Operación expiró
- `'ABORTED'`: Operación abortada
- `'UNKNOWN_ERROR'`: Error desconocido

**Nota sobre reintentos:**

El SDK implementa reintentos automáticos con backoff exponencial para:

- Errores HTTP 5xx (errores del servidor)
- Errores HTTP 429 (rate limiting)
- Errores de red transitorios (TypeError, errores de conexión)

Los reintentos NO se aplican a:

- Errores HTTP 4xx (errores del cliente, excepto 429)
- Errores de timeout (se lanzan inmediatamente)
- Errores de validación

### Funciones Helper de Errores

#### `isTryMellonError()`

Type guard para verificar si un error es `TryMellonError`.

```typescript
isTryMellonError(error: unknown): error is TryMellonError
```

**Ejemplo:**

```typescript
try {
  await client.authenticate({ userId: 'user_123' });
} catch (error) {
  if (isTryMellonError(error)) {
    console.error('TryMellon error:', error.code);
  } else {
    console.error('Unknown error:', error);
  }
}
```

#### `createError()`

Crea un `TryMellonError` con un código específico.

```typescript
createError(code: TryMellonErrorCode, message?: string, details?: unknown): TryMellonError
```

#### `createNotSupportedError()`

Crea un error de tipo `NOT_SUPPORTED`.

```typescript
createNotSupportedError(): TryMellonError
```

#### `createUserCancelledError()`

Crea un error de tipo `USER_CANCELLED`.

```typescript
createUserCancelledError(): TryMellonError
```

#### `createNetworkError()`

Crea un error de tipo `NETWORK_FAILURE`.

```typescript
createNetworkError(cause?: Error): TryMellonError
```

#### `createTimeoutError()`

Crea un error de tipo `TIMEOUT`.

```typescript
createTimeoutError(): TryMellonError
```

#### `createInvalidArgumentError()`

Crea un error de tipo `INVALID_ARGUMENT`.

```typescript
createInvalidArgumentError(field: string, reason: string): TryMellonError
```

#### `mapWebAuthnError()`

Mapea errores nativos de WebAuthn a `TryMellonError`.

```typescript
mapWebAuthnError(error: unknown): TryMellonError
```

---

## Ejemplos de Uso

Ver [EXAMPLES.md](./EXAMPLES.md) para ejemplos completos de integración.
