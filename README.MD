# @trymellon/js

[![npm version](https://img.shields.io/npm/v/@trymellon/js)](https://www.npmjs.com/package/@trymellon/js)
[![Build Status](https://img.shields.io/github/actions/workflow/status/trymellon/js-sdk/ci.yml)](https://github.com/trymellon/js-sdk/actions)
[![Coverage](https://img.shields.io/codecov/c/github/trymellon/js-sdk)](https://codecov.io/gh/trymellon/js-sdk)

SDK oficial de **TryMellon** para integrar autenticación passwordless con **Passkeys / WebAuthn** desde aplicaciones web.

Este SDK abstrae completamente WebAuthn y permite autenticar usuarios sin passwords, enviando el resultado a tu backend para que crees tu propia sesión.

---

## ¿Qué hace este SDK?

* ✅ Maneja el flujo completo de Passkeys en el browser
* ✅ Se comunica directamente con TryMellon API
* ✅ Devuelve un `session_token` verificable por tu backend
* ✅ Maneja conversiones Base64URL ↔ ArrayBuffer automáticamente
* ✅ Incluye sistema de eventos para mejorar UX
* ✅ Soporta fallback por email (OTP) cuando WebAuthn no está disponible
* ✅ Reintentos automáticos con backoff exponencial
* ✅ Validación exhaustiva de inputs y respuestas

---

## ¿Qué NO hace?

* ❌ No crea sesiones de usuario (tu backend lo hace)
* ❌ No reemplaza tu sistema de auth
* ❌ No guarda usuarios finales
* ❌ No expone APIs WebAuthn directamente
* ❌ No maneja cookies ni almacenamiento local

---

## Instalación

```bash
npm install @trymellon/js
```

---

## Requisitos

* Navegador con soporte WebAuthn (Chrome, Safari, Firefox, Edge)
* HTTPS (obligatorio excepto `localhost`)
* Una Application creada en TryMellon con el origin configurado

---

## Quickstart (5 minutos)

```bash
npm install @trymellon/js
```

```typescript
import { TryMellon } from '@trymellon/js'

const client = new TryMellon({
  appId: 'app_live_xxxx',   // De tu dashboard TryMellon
  publishableKey: 'key_live_xxxx', // API Key de la aplicación
})

// Registrar passkey (recomendado: camelCase en opciones)
const registerResult = await client.register({ externalUserId: 'user_123' })
if (registerResult.ok) {
  console.log('Session token:', registerResult.value.session_token)
}

// Autenticar
const authResult = await client.authenticate({ externalUserId: 'user_123' })
if (authResult.ok) {
  console.log('Session token:', authResult.value.session_token)
}
```

---

## Inicialización

```typescript
import { TryMellon } from '@trymellon/js'

const client = new TryMellon({
  appId: 'app_live_xxxx',     // Requerido: identificador de la aplicación (tenant)
  publishableKey: 'key_live_xxxx',   // Requerido: API Key para autenticación
  apiBaseUrl: 'https://api.trymellonauth.com', // opcional
  timeoutMs: 30000,          // opcional, default: 30000
  maxRetries: 3,             // opcional
  retryDelayMs: 1000,        // opcional
})
```

**Opciones de configuración:**

- `appId` (requerido): Identificador de tu aplicación en TryMellon. Se envía en header `X-App-Id`.
- `publishableKey` (requerido): API Key pública para autenticación. Se envía en header `Authorization: Bearer <publishableKey>`.
- `apiBaseUrl` (opcional): URL base de la API. Default: `'https://api.trymellonauth.com'`
- `timeoutMs` (opcional): Timeout para requests HTTP. Rango: `1000` - `300000`. Default: `30000`
- `maxRetries` (opcional): Reintentos para errores de red. Rango: `0` - `10`. Default: `3`
- `retryDelayMs` (opcional): Delay entre reintentos. Rango: `100` - `10000`. Default: `1000`
- `logger` (opcional): Implementación de `Logger` para correlación de requests (p. ej. `requestId` en logs y en `error.details`).

**Opciones de registro/autenticación:** Se aceptan `externalUserId` (camelCase, recomendado) o `external_user_id` (snake_case). El SDK normaliza internamente a snake_case para la API.

---

## Uso básico

### Verificar soporte de WebAuthn

```typescript
if (TryMellon.isSupported()) {
  // WebAuthn está disponible, usar passkeys
} else {
  // Usar fallback por email
}
```

### Registro de Passkey

```typescript
const result = await client.register({
  externalUserId: 'user_123'  // recomendado: camelCase. También acepta external_user_id
})

if (!result.ok) {
  console.error(result.error.code, result.error.message)
  return
}

// Enviar session_token al backend
await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    sessionToken: result.value.session_token 
  })
})
```

**Opciones de registro:**

- `externalUserId` o `external_user_id` (requerido uno de los dos): ID único del usuario en tu sistema. Se recomienda camelCase.
- `authenticatorType` (opcional): `'platform'` (dispositivo) o `'cross-platform'` (USB/NFC)
- `signal` (opcional): `AbortSignal` para cancelar la operación

**Respuesta:**

```typescript
{
  success: true,
  credential_id: string,
  status: string,
  session_token: string,
  user: {
    user_id: string,
    external_user_id: string,
    email?: string,
    metadata?: Record<string, unknown>
  }
}
```

### Autenticación con Passkey

```typescript
const result = await client.authenticate({
  external_user_id: 'user_123',
  hint: 'user@example.com'  // opcional, mejora la UX
})

// Enviar al backend
await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: result.session_token
  })
})
```

**Opciones de autenticación:**

- `externalUserId` o `external_user_id` (requerido uno de los dos): ID del usuario. Recomendado camelCase.
- `hint` (opcional): Hint para la passkey (ej: email)
- `signal` (opcional): AbortSignal para cancelar

**Respuesta:**

```typescript
{
  authenticated: boolean,
  session_token: string,
  user: {
    user_id: string,
    external_user_id: string,
    email?: string,
    metadata?: Record<string, unknown>
  },
  signals: {
    userVerification?: boolean,
    backupEligible?: boolean,
    backupStatus?: boolean
  }
}
```

### Validar sesión

```typescript
const validationResult = await client.validateSession('session_token_123')

if (validationResult.ok && validationResult.value.valid) {
  const v = validationResult.value
  console.log('Usuario:', v.external_user_id, 'Tenant:', v.tenant_id, 'App:', v.app_id)
}
```

**Respuesta:**

```typescript
{
  valid: boolean,
  user_id: string,
  external_user_id: string,
  tenant_id: string,
  app_id: string
}
```

### Obtener estado del cliente

```typescript
const status = await client.getStatus()

if (status.isPasskeySupported) {
  console.log('Passkeys disponibles')
  if (status.platformAuthenticatorAvailable) {
    console.log('Authenticator platform disponible')
  }
} else {
  console.log('Usar fallback')
}
```

**Respuesta:**

```typescript
{
  isPasskeySupported: boolean,
  platformAuthenticatorAvailable: boolean,
  recommendedFlow: 'passkey' | 'fallback'
}
```

---

## Sistema de eventos

El SDK emite eventos para mejorar la UX y permitir analytics:

```typescript
// Suscribirse a eventos
client.on('start', (payload) => {
  console.log('Operación iniciada:', payload.operation)  // 'register' | 'authenticate'
  showSpinner()
})

client.on('success', (payload) => {
  console.log('Operación exitosa:', payload.operation)
  hideSpinner()
  showSuccessMessage()
})

client.on('error', (payload) => {
  console.error('Error:', payload.error)
  hideSpinner()
  showError(payload.error.message)
})

// Desuscribirse
const unsubscribe = client.on('start', handler)
unsubscribe()
```

**Eventos disponibles:**

- `'start'`: Operación iniciada (`register` o `authenticate`)
- `'success'`: Operación completada exitosamente
- `'error'`: Error durante la operación
- `'cancelled'`: Operación cancelada (futuro)

---

## Fallback por email (OTP)

Cuando WebAuthn no está disponible, puedes usar el fallback por email. Todos los métodos devuelven `Result<T, TryMellonError>`:

```typescript
// 1. Enviar código OTP por email
const startResult = await client.fallback.email.start({ userId: 'user_123' })
if (!startResult.ok) { console.error(startResult.error); return }

// 2. Solicitar código al usuario
const code = prompt('Ingresa el código enviado por email:')

// 3. Verificar código
const verifyResult = await client.fallback.email.verify({
  userId: 'user_123',
  code: code
})
if (!verifyResult.ok) { console.error(verifyResult.error); return }

// 4. Enviar sessionToken al backend
await fetch('/api/login', {
  method: 'POST',
  body: JSON.stringify({ sessionToken: verifyResult.value.sessionToken })
})
```

**Flujo completo con fallback:**

```typescript
async function authenticateUser(userId: string) {
  // Verificar soporte
  if (!TryMellon.isSupported()) {
    return await authenticateWithEmail(userId)
  }

  const authResult = await client.authenticate({ externalUserId: userId })
  if (authResult.ok) return authResult
  if (authResult.error.code === 'PASSKEY_NOT_FOUND' || authResult.error.code === 'NOT_SUPPORTED') {
    return await authenticateWithEmail(userId)
  }
  return authResult
}

async function authenticateWithEmail(userId: string) {
  const startRes = await client.fallback.email.start({ userId })
  if (!startRes.ok) return startRes
  const code = prompt('Ingresa el código enviado por email:')
  return await client.fallback.email.verify({ userId, code })
}
```

---

## Result type

El SDK exporta el tipo `Result<T, E>` y las funciones `ok(value)` y `err(error)` para tipado y construcción de resultados (útil en tests o utilidades):

```typescript
import { Result, ok, err } from '@trymellon/js'

const result: Result<{ id: string }, Error> = ok({ id: '123' })
if (result.ok) console.log(result.value.id)
```

---

## Manejo de errores

El SDK devuelve `Result<T, TryMellonError>`: comprueba `result.ok` y en caso de error usa `result.error.code`:

```typescript
import { isTryMellonError } from '@trymellon/js'

const result = await client.authenticate({ externalUserId: 'user_123' })

if (!result.ok) {
  const error = result.error
  switch (error.code) {
    case 'USER_CANCELLED':
      console.log('Usuario canceló la operación')
      break
    case 'NOT_SUPPORTED':
      await client.fallback.email.start({ userId: 'user_123' })
      break
    case 'PASSKEY_NOT_FOUND':
      await client.register({ externalUserId: 'user_123' })
      break
    case 'NETWORK_FAILURE':
      console.error('Error de red:', error.details)
      break
    case 'TIMEOUT':
      console.error('Operación expiró')
      break
    default:
      console.error('Error:', error.code, error.message)
  }
  return
}

// result.value contiene session_token, user, etc.
```

**Códigos de error:**

| Código | Descripción |
|--------|-------------|
| `NOT_SUPPORTED` | WebAuthn no está disponible en este entorno |
| `USER_CANCELLED` | Usuario canceló la operación |
| `PASSKEY_NOT_FOUND` | No se encontró passkey para el usuario |
| `SESSION_EXPIRED` | Sesión expirada |
| `NETWORK_FAILURE` | Error de red (con reintentos automáticos) |
| `INVALID_ARGUMENT` | Argumento inválido en configuración o métodos |
| `TIMEOUT` | Operación expiró |
| `ABORTED` | Operación abortada por AbortSignal |
| `UNKNOWN_ERROR` | Error desconocido |

---

## Cancelación de operaciones

Puedes cancelar operaciones usando `AbortSignal`:

```typescript
const controller = new AbortController()

// Cancelar después de 10 segundos
setTimeout(() => controller.abort(), 10000)

const result = await client.register({
  externalUserId: 'user_123',
  signal: controller.signal
})
if (!result.ok && result.error.code === 'ABORTED') {
  console.log('Operación cancelada')
}
```

---

## Backend del cliente

Tu backend debe validar el `session_token` con TryMellon y crear su propia sesión:

```typescript
// POST /api/login
POST https://api.trymellonauth.com/v1/sessions/validate
Authorization: Bearer {session_token}

// Respuesta de TryMellon
{
  valid: true,
  user_id: string,
  external_user_id: string,
  tenant_id: string,
  app_id: string
}
```

Luego crea tu propia sesión en tu sistema.

---

## Seguridad

* ✅ WebAuthn nativo del navegador (no hay criptografía del lado del cliente)
* ✅ Challenges con TTL corto generados por TryMellon
* ✅ Protección contra replay attacks (counters automáticos)
* ✅ El SDK nunca maneja secretos ni claves privadas
* ✅ Validación exhaustiva de inputs y respuestas de API
* ✅ Manejo robusto de errores con tipos seguros
* ✅ Limpieza garantizada de recursos (timeouts, signals)
* ✅ Origin validation automática

---

## Compatibilidad

| Browser | Soporte WebAuthn | Soporte Passkeys |
|---------|------------------|------------------|
| Chrome  | ✅                | ✅                |
| Safari  | ✅                | ✅                |
| Firefox | ✅                | ✅                |
| Edge    | ✅                | ✅                |

**Requisitos:**
- HTTPS (obligatorio excepto `localhost`)
- Navegador moderno con soporte WebAuthn

---

## Características

* ✅ **Zero runtime dependencies** - Sin dependencias externas en runtime
* ✅ **TypeScript first** - Tipos completos y strict mode
* ✅ **Framework agnostic** - Funciona con React, Vue, Angular, Vanilla JS, etc.
* ✅ **Reintentos automáticos** - Backoff exponencial para errores transitorios
* ✅ **Validación exhaustiva** - Validación de inputs y respuestas de API
* ✅ **Manejo robusto de errores** - Errores tipados y descriptivos
* ✅ **Eventos para UX** - Sistema de eventos para spinners y analytics
* ✅ **Fallback por email** - OTP por email cuando WebAuthn no está disponible
* ✅ **Cancelación de operaciones** - Soporte para AbortSignal
* ✅ **Detección automática** - Origin y soporte WebAuthn detectados automáticamente

---

## Troubleshooting

### WebAuthn no está disponible

Si `TryMellon.isSupported()` retorna `false`:

- Verifica que estás usando HTTPS (requerido excepto en `localhost`)
- Verifica que tu navegador soporta WebAuthn (Chrome, Safari, Firefox, Edge)
- Usa el fallback por email: `client.fallback.email.start({ userId })`

### Usuario canceló la operación

Si recibes el error `USER_CANCELLED`:

- Esto es normal cuando el usuario cierra el prompt
- No es un error crítico, simplemente informa al usuario
- Puedes reintentar la operación si es necesario

### Passkey no encontrada

Si recibes el error `PASSKEY_NOT_FOUND`:

- El usuario no tiene una passkey registrada
- Ofrece la opción de registrar una nueva passkey: `client.register()`
- O usa el fallback por email: `client.fallback.email.start()`

### Errores de red

Si recibes el error `NETWORK_FAILURE`:

- Verifica tu conexión a internet
- Verifica que `apiBaseUrl` sea una URL válida
- El SDK reintenta automáticamente con backoff exponencial para:
  - Errores HTTP 5xx (errores del servidor)
  - Errores HTTP 429 (rate limiting)
  - Errores de red transitorios
- Puedes configurar `maxRetries` y `retryDelayMs` para ajustar el comportamiento

---

## Seguridad: CSP y SRI

### Content-Security-Policy (CSP)

Si cargas el SDK vía `<script>` o restringes políticas de contenido, incluye en tu `Content-Security-Policy`:

- **script-src:** el origen del script (ej. `https://cdn.trymellon.com` o `'self'`) y `'unsafe-inline'` solo si usas inline scripts; para el SDK en bundle no hace falta `unsafe-inline`.
- **connect-src:** el origen de la API TryMellon (ej. `https://api.trymellonauth.com`) para que las peticiones de registro/autenticación no se bloqueen.

Ejemplo mínimo (ajusta orígenes a tu entorno):

```
Content-Security-Policy: script-src 'self'; connect-src 'self' https://api.trymellonauth.com;
```

### SRI (Subresource Integrity)

Para cargar `index.global.js` con integridad, genera el hash SRI después del build:

```bash
openssl dgst -sha384 -binary dist/index.global.js | openssl base64 -A
```

Usa el valor en el atributo `integrity`:

```html
<script
  src="https://cdn.example.com/trymellon/index.global.js"
  integrity="sha384-<hash-generado>"
  crossorigin="anonymous"
></script>
```

Opcional: en el build se puede generar `dist/sri.json` con el hash (script en `package.json`: `"sri": "node -e \"...\""`).

---

## Telemetría (opt-in)

El SDK puede enviar telemetría anónima (evento + latencia, sin identificadores de usuario) cuando `enableTelemetry: true` en la config. Útil para mejorar el producto. Payload mínimo: `{ event: 'register'|'authenticate', latencyMs: number, ok: true }`. Puedes inyectar un `telemetrySender` custom para enviar a tu propio endpoint o desactivar con `enableTelemetry: false` (por defecto).

---

## Documentación adicional

- [API Reference](./documentation/API.md) - Referencia completa de la API
- [Ejemplos de Uso](./documentation/EXAMPLES.md) - Ejemplos prácticos de integración
- [Guía de Contribución](./documentation/CONTRIBUTING.md) - Cómo contribuir al proyecto (incl. cómo ejecutar tests, cobertura, Angular, E2E, audit y lint de workflows en local)
- [Estándares CI (fintech)](./documentation/CI-FINTECH-STANDARDS.md) - Criterios de cobertura, seguridad, E2E y validación de workflows

---

## Changelog

Ver [CHANGELOG.md](./CHANGELOG.md) para el historial de cambios.

---

## Licencia

MIT

---

## Filosofía

> Implementar Passkeys debería tomar minutos, no semanas.
> El backend sigue siendo tuyo.
