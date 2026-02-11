# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.1] - 2026-02-11

### Changed

- **Default API URL**: `DEFAULT_API_BASE_URL` y `DEFAULT_TELEMETRY_ENDPOINT` usan ahora `https://api.trymellonauth.com` (antes `https://api.trymellon.com`). Documentación y ejemplos del SDK actualizados al mismo dominio.

---

## [1.0.0] - 2026-01-22

### Added

- **Onboarding completo**: Implementación de todos los endpoints de onboarding para flujos B2B
  - `startOnboarding()`: Iniciar proceso de onboarding para maintainers o app users
  - `getOnboardingStatus()`: Obtener estado actual de sesión de onboarding
  - `getOnboardingRegister()`: Obtener información para registro de passkey durante onboarding
  - `registerOnboardingPasskey()`: Registrar passkey durante el proceso de onboarding
  - `completeOnboarding()`: Completar onboarding con datos adicionales (solo maintainer)
- Soporte completo para `authenticatorSelection` del servidor en registro de passkeys
  - Respeta `userVerification` y `residentKey` del servidor
  - Permite override controlado de `authenticatorAttachment` mediante `authenticatorType`
  - Fallback seguro cuando el servidor no proporciona `authenticatorSelection`
- Tipos TypeScript completos para todos los endpoints de onboarding
- Validación exhaustiva de respuestas de onboarding
- Tests TDD completos para todos los endpoints de onboarding (5 nuevos tests)

### Changed

- **Mejora crítica**: `createRegistrationOptions()` ahora respeta `authenticatorSelection` del servidor
  - Prioriza valores del servidor sobre valores hardcodeados
  - Mantiene compatibilidad con código existente
  - Permite override de `authenticatorAttachment` cuando el usuario especifica `authenticatorType`
- Mejorada la estructura de tipos para incluir `authenticatorSelection` opcional en `RegisterStartResponse`
- Optimizada la lógica de construcción de `authenticatorSelection` para mejor mantenibilidad

### Fixed

- Corregido uso de `authenticatorSelection`: ahora se respetan los valores del servidor en lugar de usar valores hardcodeados
- Mejorado el manejo de tipos opcionales en requests de onboarding para evitar errores de TypeScript strict

### Documentation

- Documentación TSDoc completa para todos los métodos de onboarding
- Ejemplos de uso actualizados en documentación

---

## [0.1.0] - 2024-XX-XX

### Added

- Registro de passkeys con soporte para platform y cross-platform authenticators
- Autenticación con passkeys
- Fallback por email (OTP) cuando WebAuthn no está disponible
- Sistema de eventos para UX (start, success, error, cancelled)
- Detección de soporte WebAuthn (`isSupported()` y `getStatus()`)
- Reintentos automáticos con backoff exponencial para errores transitorios
- Validación exhaustiva de inputs y respuestas de API
- Manejo robusto de errores con tipos seguros (9 códigos de error específicos)
- Soporte para `sessionToken` opcional en registro (si TryMellon Backend lo proporciona)
- Soporte para `AbortSignal` para cancelar operaciones
- Configuración flexible de timeouts y reintentos
- TypeScript strict mode con tipos completos
- Zero runtime dependencies
- Múltiples formatos de módulo (ESM, CJS, UMD)

### Security

- Validación de protocolos HTTP/HTTPS en URLs
- Validación exhaustiva de estructura de credenciales
- Validación de formato base64url
- Limpieza garantizada de recursos (timeouts, signals)
- Protección contra errores de handlers en EventEmitter

### Changed

- Mejorada la organización de constantes (centralizadas en `constants.ts`)
- Simplificada la lógica condicional en `createRegistrationOptions`
- Extraída función helper `parseErrorResponse` para eliminar duplicación
- Extraída función helper `validateCredentialStructure` para mejor reutilización
- Optimizada función `base64UrlEncode` eliminando validación innecesaria
- Mejorado type safety en merge de AbortSignals

### Fixed

- Eliminada validación redundante en `EventEmitter.on()`
- Eliminado `console.error` en producción
- Mejorado manejo de errores en EventEmitter (aislamiento de errores de handlers)
