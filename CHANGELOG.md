## [1.1.3](https://github.com/ResakaGit/trymellon-js/compare/v1.1.2...v1.1.3) (2026-02-11)


### Bug Fixes

* final production release with revised npm token ([ce9c98f](https://github.com/ResakaGit/trymellon-js/commit/ce9c98f277b0c9d99ceddbddd37b5f1415d6653a))
* final production release with revised npm token ([c509eac](https://github.com/ResakaGit/trymellon-js/commit/c509eacc845a06d0ad93902d71f38c5067d67786))
* final production release with revised npm token ([05d0df0](https://github.com/ResakaGit/trymellon-js/commit/05d0df0f372e889366eff23335dfd7a29eb7cbf7))

## [1.1.2](https://github.com/ResakaGit/trymellon-js/compare/v1.1.1...v1.1.2) (2026-02-11)


### Bug Fixes

* final sync for npm organization publication ([84dd39f](https://github.com/ResakaGit/trymellon-js/commit/84dd39f0bd7aaa159ce7e0c7d023766e47a5a864))

## [1.1.1](https://github.com/ResakaGit/trymellon-js/compare/v1.1.0...v1.1.1) (2026-02-11)


### Bug Fixes

* force publish to npm organization after sync ([0276a88](https://github.com/ResakaGit/trymellon-js/commit/0276a888472e3935910c7c3d286c74db5c542210))

# [1.1.0](https://github.com/ResakaGit/trymellon-js/compare/v1.0.0...v1.1.0) (2026-02-11)

### Features

- stable automated release with npm organization support ([b9bcbfd](https://github.com/ResakaGit/trymellon-js/commit/b9bcbfdf932c03d70db95e188c0c90cf4eae6ea0))

# 1.0.0 (2026-02-11)

### Bug Fixes

- **ci:** build artifacts + security audit allowlist; CHANGELOG 1.0.1 ([147590b](https://github.com/ResakaGit/trymellon-js/commit/147590bf89a92bddc5e50030ab44540b73233a9f))

# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.1] - 2026-02-11

### Changed

- **Default API URL**: `DEFAULT_API_BASE_URL` and `DEFAULT_TELEMETRY_ENDPOINT` now use `https://api.trymellonauth.com` (was `https://api.trymellon.com`). SDK docs and examples updated to the same domain.
- **README**: Full translation to English; badge URLs updated to `ResakaGit/trymellon-js`.
- **package.json**: `repository.url` set to `https://github.com/ResakaGit/trymellon-js.git`.

### Fixed

- **CI Build**: Build script now cleans `dist/` before tsup; first tsup bundle uses `clean: false` so all artifacts (index.\*, react, vue, angular) are produced reliably. Added `ls -la dist/` in workflow for debugging.
- **CI Security audit**: Allowlisted 4 dev-only advisories (GHSA-34x7-hfp2-rc4v, GHSA-5j98-mcp5-4vw2, GHSA-8qq5-rm4j-mr97, GHSA-r6q2-hw4h-h46w) in `audit-ci.jsonc` so the audit job passes; vulnerabilities are in semantic-release and vitest devDependencies only.

### Release / CI-CD

- **Release workflow**: Job fails fast at start when `NPM_TOKEN` secret is not set (with error message pointing to Settings > Secrets). Ensures publish is only attempted when token exists. `NPM_TOKEN` is used only in the Release workflow step that runs semantic-release.
- **package.json**: Added `publishConfig.access: "public"` so the scoped package `@trymellon/js` is published as public on npm.
- **CI**: Single build per run. The Build job uploads `dist/` as an artifact; Test Angular adapter and E2E jobs depend on it and download the artifact instead of running `npm run build`, reducing CI from 3 builds to 1.

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
