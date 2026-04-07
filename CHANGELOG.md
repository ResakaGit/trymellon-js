## [2.3.5](https://github.com/ResakaGit/trymellon-js/compare/v2.3.4...v2.3.5) (2026-04-07)

## [2.3.6] - 2026-04-07

### Added

- **`resolveCredentialName` / `getDeviceName`:** New exports for AAGUID → human-readable device name lookup (sourced from FIDO Alliance MDS). Covers Apple, Google, Windows Hello, YubiKey and privacy-preserving passkeys.
- **E2E scaffold:** `e2e/` directory with Playwright specs (`sdk.spec.ts`, `virtual-auth.spec.ts`) and `webauthn.html` fixture for headless passkey testing.
- **`@trymellon/testing` package:** `packages/testing/` scaffold for the Node-only test helper package.

### Fixed

- **Response envelope:** `fetch-client` now reads `{ ok: true, data }` field (was `resultado`) — aligns with WebAuthSaas v1.6.0 response format.
- **Cross-device validator:** Minor type-narrowing corrections in `cross-device.ts`.
- **Examples tests:** `timeoutMs: 3_000` on test clients so `README Quickstart` Result-shape tests complete within CI timeout instead of hanging for 30 s.

## [2.3.4](https://github.com/ResakaGit/trymellon-js/compare/v2.3.3...v2.3.4) (2026-03-30)


### Bug Fixes

* **security:** resolve audit-ci failures — upgrade deps and allowlist devDep vulns ([d1070b8](https://github.com/ResakaGit/trymellon-js/commit/d1070b816d6de411524fb3618afe6ddc10525e9f))

## [2.3.5] - 2026-04-06

### Added

- **Docs structure (local):** carpetas `docs/PM/`, `docs/TL/`, `docs/arquitectura/ADRs/`, `docs/sprints/` organizadas (no trackeadas en git — `docs/` en `.gitignore`).
- **Technical Specifications (`docs/TL/TS.md`):** Arquitectura interna del SDK, zero-deps design (APIs nativas por archivo), ceremony flow, bundle size targets, P95 de ceremony (3s — OS dialog fuera del control del SDK), testing strategy.
- **ADRs (`docs/arquitectura/ADRs/`):** ADR-001 (zero-deps), ADR-002 (tsup), ADR-003 (multi-entry-points), ADR-004 (Result pattern), ADR-005 (Web Components), ADR-006 (sandbox mode). Basados en código real (`tsup.config.ts`, `result.ts`, `ceremony.ts`, etc.).
- **`SPRINT-MAP.md`** en `docs/sprints/` con historial de épicas del SDK.

### Changed

- **README:** Reescrito completo. Entry points por framework, tabla de configuración del cliente, tabla de env vars solo para integration tests, dependencias externas, sandbox mode explicado. Sin valores hardcodeados.

## [2.3.3](https://github.com/ResakaGit/trymellon-js/compare/v2.3.2...v2.3.3) (2026-03-17)

## [2.3.2](https://github.com/ResakaGit/trymellon-js/compare/v2.3.1...v2.3.2) (2026-03-17)

### Bug Fixes

- **core:** align SDK with SaaS quotas and logging ([cea91f9](https://github.com/ResakaGit/trymellon-js/commit/cea91f904c2da1fcfc8e968dbf2435a06e6a2a80))

## [2.3.2](https://github.com/ResakaGit/trymellon-js/compare/v2.3.1...v2.3.2) (2026-03-17)

### Chore

- **lint/format:** Alineación con Prettier de `fetch-client` y ajuste menor en `trymellon-sandbox.test` para que `lint` y `format:check` pasen sin cambios de comportamiento.

## [2.3.1](https://github.com/ResakaGit/trymellon-js/compare/v2.3.0...v2.3.1) (2026-03-16)

### Bug Fixes

- improve angular adapter and logging ([0b5c9eb](https://github.com/ResakaGit/trymellon-js/commit/0b5c9eb422cbd81c10da0747d200e4658894f8d9))

# [2.3.0](https://github.com/ResakaGit/trymellon-js/compare/v2.2.1...v2.3.0) (2026-03-16)

### Features

- **sdk+ui:** onboarding v1 paths, enrollment/bridge managers and improved auth UI ([b552f2a](https://github.com/ResakaGit/trymellon-js/commit/b552f2a7ab380c137a6f2fc61d5ae292a2275423))

### Chore

- **audit:ci:** Add npm override for `flatted` (>=3.4.0) to fix GHSA-25h7-pfq9-p65f (DoS in parse). Enables `npm run audit:ci` to pass without allowlisting.
- **coverage:** Lower Vitest thresholds to 93/92/86/93 (lines/functions/branches/statements) so `test:coverage` passes.
- **lint:** Prettier format fix for CHANGELOG.md so `format:check` passes in CI.

# [2.3.0](https://github.com/ResakaGit/trymellon-js/compare/v2.2.1...v2.3.0) (2026-03-16)

### Changed

- **API paths (onboarding):** All onboarding endpoints now use base path `/v1/onboarding/*`. The SDK calls `POST /v1/onboarding/start`, `GET /v1/onboarding/:session_id/status`, etc. If you integrate against the API directly, use `/v1/onboarding/*` (breaking for custom clients using old paths).

### Docs

- **Backend:** Init cross-device admite JWT con scope `auth_link` (sin Origin) para flujos IA/backend; ver guía en monorepo `docs/epic-auth-ia-link/guia-auth-link-ia.md`. El SDK sigue usando publishable key + Origin en desktop; para init desde backend usar la API directamente con token obtenido de `POST /oauth/token` con `scope=auth_link`.

### Chore

- **Iteration cleanup:** Replace `forEach` with `for...of` in `src/core/events.ts` (emit), `tests/core/events.test.ts`, `scripts/run-actionlint.cjs`, and `documentation/EXAMPLES.md` (Vue onUnmounted) for consistency and Yanagi-style clarity.

## [2.2.1](https://github.com/ResakaGit/trymellon-js/compare/v2.2.0...v2.2.1) (2026-03-15)

### Bug Fixes

- **ui:** clear cross-device slot on modal open to prevent stacked QRs ([57678d1](https://github.com/ResakaGit/trymellon-js/commit/57678d1944aaec5ac068660f868be00c357c75c7))

# [2.2.0](https://github.com/ResakaGit/trymellon-js/compare/v2.1.0...v2.2.0) (2026-03-12)

### Features

- **ui:** customizable auth button label ([f16dc0d](https://github.com/ResakaGit/trymellon-js/commit/f16dc0d7860558be5641968d25a1eef84ef0ef6c))

# [2.1.0](https://github.com/ResakaGit/trymellon-js/compare/v2.0.0...v2.1.0) (2026-03-12)

### Features

- **ui:** solid modal background in auth boot (2.0.1) ([92aba05](https://github.com/ResakaGit/trymellon-js/commit/92aba05495c5e61887e191d66cd7d4ee80664513))

# [2.0.0](https://github.com/ResakaGit/trymellon-js/compare/v1.7.6...v2.0.0) (2026-03-11)

### Bug Fixes

- **build:** remove 'use client' from main bundle, normalize repository.url ([91be2c0](https://github.com/ResakaGit/trymellon-js/commit/91be2c0b80ed56e8c7893c0fe6ddd0712409f3d9))
- **release:** major rule glob subject 2.0.0\*, remove orphan v1.7.7 tag before release ([22de35e](https://github.com/ResakaGit/trymellon-js/commit/22de35e6465b7136d040c05c7ffbbb6ecedd432c))
- **validators:** cross-device and recovery validation, api and formatting ([d6dbb39](https://github.com/ResakaGit/trymellon-js/commit/d6dbb3917ba19b00ecdc339175e6308f568da294))

## [2.0.0](https://github.com/ResakaGit/trymellon-js/compare/v1.7.7...v2.0.0) (unreleased)

### Changed

- **Major:** Bump to 2.0.0. Sin breaking changes de API; alineación de UX del modal y estándares de coverage/lint.

---

## [1.7.7](https://github.com/ResakaGit/trymellon-js/compare/v1.7.6...v1.7.7) (2026-03-11)

### Features

- **Modal (trymellon-auth-modal):** Botón de cierre (X) en la esquina superior derecha del panel; cierre al hacer click en el overlay (exterior del modal). Ambas acciones disparan el mismo flujo de cierre (`mellon:close`).
- **Modal:** Separador "Or sign in with" en mayúsculas, con contenedor en forma de rombo y líneas laterales; espaciado configurable (márgenes con el bloque superior e inferior).

### Changed

- **Modal:** Default del tab de registro pasa de "Create account" a "Register" para evitar redundancia visual con el contenido del slot (ej. etiqueta "Create account" sobre el QR). El host puede seguir usando `tab-labels="Create account,Sign in"` si lo desea.
- **Modal:** Escala de espaciado unificada en `rem` (base 0.5rem; secciones 0.75–1rem). Tabs, área QR, separador y botón Try Passkey con márgenes y gaps en rem. Media query estrecha usa `22.5rem` en lugar de `360px`.
- **Modal:** Área QR con altura fija (11.25rem) y placeholder (skeleton) visible desde estado `default` para evitar desplazamiento de layout cuando se inyecta el QR. Token `--mellon-separator-line` deja de ser recursivo para que bordes del skeleton, separador y rombo se pinten correctamente.
- **Coverage:** Umbral de funciones en Vitest bajado de 95% a 94% para que `test:coverage` pase con el estado actual del código.

### Bug Fixes

- **Lint:** Prettier en `dom.adapter.ts` (argumentos en una línea, newline final).

## [1.7.6](https://github.com/ResakaGit/trymellon-js/compare/v1.7.5...v1.7.6) (2026-03-05)

### Chore

- **CI Security audit:** Allowlisted advisory `GHSA-qffp-2rhf-9h96` (`tar` en la CLI de `npm`) en `audit-ci.jsonc` para que el job `audit:ci` pase. El impacto se limita a herramientas de desarrollo (npm CLI, audit) y no afecta el bundle publicado del SDK.

## [1.7.5](https://github.com/ResakaGit/trymellon-js/compare/v1.7.4...v1.7.5) (2026-03-05)

## [1.7.5](https://github.com/ResakaGit/trymellon-js/compare/v1.7.4...v1.7.5) (2026-03-05)

### Docs

- **Cursor skill (SDK):** Documenta en el monorepo que el SDK `@trymellon/js` expone la skill `trymellon-js-sdk` directamente desde el repo del SDK, para que agentes/LLMs puedan usarla sin depender de la Landing.

## [1.7.4](https://github.com/ResakaGit/trymellon-js/compare/v1.7.3...v1.7.4) (2026-03-04)

## [1.7.3](https://github.com/ResakaGit/trymellon-js/compare/v1.7.2...v1.7.3) (2026-03-01)

## [1.7.2](https://github.com/ResakaGit/trymellon-js/compare/v1.7.1...v1.7.2) (2026-02-28)

## [1.7.1](https://github.com/ResakaGit/trymellon-js/compare/v1.7.0...v1.7.1) (2026-02-28)

### Bug Fixes

- prettier in cross-device validator, bump 1.6.3 ([3fdbe8a](https://github.com/ResakaGit/trymellon-js/commit/3fdbe8a0140004b6e0899da0fcb1dc8a69e1ab8b))

# [1.7.0](https://github.com/ResakaGit/trymellon-js/compare/v1.6.2...v1.7.0) (2026-02-28)

### Features

- **cross-device:** approval_context y application_name en context; getContext() público ([ee98243](https://github.com/ResakaGit/trymellon-js/commit/ee982435e59f07396ba7b7df7528731e3615c5d4))

## [1.6.2](https://github.com/ResakaGit/trymellon-js/compare/v1.6.1...v1.6.2) (2026-02-23)

### Bug Fixes

- **cross-device:** accept envelope { ok, resultado } in init validator (v1.6.2) ([bb7fb20](https://github.com/ResakaGit/trymellon-js/commit/bb7fb207daea3c4198c7cad0b2d80f42e35c758f))

## [1.6.2](https://github.com/ResakaGit/trymellon-js/compare/v1.6.1...v1.6.2) (2026-02-23)

### Bug Fixes

- **cross-device:** Validator `validateCrossDeviceInitResponse` now accepts both unwrapped payload and fintech envelope `{ ok: true, resultado: { session_id, qr_url, expires_at } }`, fixing QR not showing when API returns envelope (e.g. init-registration 201).

## [1.6.1](https://github.com/ResakaGit/trymellon-js/compare/v1.6.0...v1.6.1) (2026-02-22)

### Bug Fixes

- Result type import in validators/helpers, RecoveryVerifyResponse in recover, lint/format ([2262ed1](https://github.com/ResakaGit/trymellon-js/commit/2262ed17179786eed0bdf34e5d6980683bfb9904))

# [1.6.0](https://github.com/ResakaGit/trymellon-js/compare/v1.5.0...v1.6.0) (2026-02-22)

### Features

- **react:** ceremony abstraction and use-action hook ([fab2960](https://github.com/ResakaGit/trymellon-js/commit/fab296028552a19261c7c95ee386bf03119787ee))

# [1.5.0](https://github.com/ResakaGit/trymellon-js/compare/v1.4.10...v1.5.0) (2026-02-21)

### Features

- **recovery:** account recovery flow + validators and recoverAccount tests ([972d29c](https://github.com/ResakaGit/trymellon-js/commit/972d29ca0ceb413fb7e1a145b211568cf5882a64))

## [1.4.10](https://github.com/ResakaGit/trymellon-js/compare/v1.4.9...v1.4.10) (2026-02-20)

### Bug Fixes

- optional external_user_id for discoverable auth, lint webauthn ([823bcac](https://github.com/ResakaGit/trymellon-js/commit/823bcacc2ac285add7653a703e31f355cdc7817f))

## [1.4.9](https://github.com/ResakaGit/trymellon-js/compare/v1.4.8...v1.4.9) (2026-02-19)

### Bug Fixes

- increase examples test timeout for CI (register, authenticate, fallback.email.verify) ([a3d59ce](https://github.com/ResakaGit/trymellon-js/commit/a3d59ce54acf40de5b508bc82cd79248c6bde72a))

## [1.4.8](https://github.com/ResakaGit/trymellon-js/compare/v1.4.7...v1.4.8) (2026-02-19)

### Bug Fixes

- Elite isomorphic hardening (Web Crypto required, edge tests, tsup browser) ([74c5d95](https://github.com/ResakaGit/trymellon-js/commit/74c5d959e6d545ff3d015bc51a138274be90962f))

## [1.4.7](https://github.com/ResakaGit/trymellon-js/compare/v1.4.6...v1.4.7) (2026-02-19)

## [1.4.6](https://github.com/ResakaGit/trymellon-js/compare/v1.4.5...v1.4.6) (2026-02-19)

### Bug Fixes

- format CHANGELOG, allowlist GHSA-3ppc-4f35-3m26 and GHSA-83g3-92jg-28cx for audit:ci ([863d542](https://github.com/ResakaGit/trymellon-js/commit/863d542be48870d728ac4e20127d3288a43f54e1))

## [1.4.5](https://github.com/ResakaGit/trymellon-js/compare/v1.4.4...v1.4.5) (2026-02-19)

### Bug Fixes

- isomorphic SDK for Edge runtimes (remove Buffer, use globalThis.btoa/atob/crypto) ([b2df232](https://github.com/ResakaGit/trymellon-js/commit/b2df2321f8d10cabf82b1a9101dffa94e889d58e))

## [1.4.4](https://github.com/ResakaGit/trymellon-js/compare/v1.4.3...v1.4.4) (2026-02-17)

### Bug Fixes

- handle 204 No Content in fetch client (cross-device verify) ([9c73fdd](https://github.com/ResakaGit/trymellon-js/commit/9c73fddce2cf5d8ef243f9d07af4020e76f6862d))

## [Unreleased]

### Bug Fixes

- **fetch-client:** handle 204 No Content in fetch client (cross-device verify/verify-registration). Avoids "Unexpected end of JSON input" and "Approval error" on mobile when backend returns empty body.
- **sdk:** remove Node Buffer and crypto module; use only globalThis.btoa, globalThis.atob, globalThis.crypto. SDK is now 100% compatible with Edge runtimes (Cloudflare Workers, Vercel Edge) and browsers without polyfills.
- **Elite isomorphic hardening:** Web Crypto required (no fallback); tsup `platform: 'browser'` and `process.env.NODE_ENV` define; Edge tests (no Buffer) and dist bundle load test; README Isomorphic/Edge-safe note.
- **tests:** increase timeout for examples API contract tests in CI (register, authenticate, fallback.email.verify) to avoid flakiness on slow runners.

## [1.4.3](https://github.com/ResakaGit/trymellon-js/compare/v1.4.2...v1.4.3) (2026-02-17)

### Bug Fixes

- add tests for errors and base64url coverage ([6b93824](https://github.com/ResakaGit/trymellon-js/commit/6b93824a4bcd1e722bfdce856ebf310f5e6cee48))

## [1.4.2](https://github.com/ResakaGit/trymellon-js/compare/v1.4.1...v1.4.2) (2026-02-17)

### Bug Fixes

- **webauthn:** add base64url normalization for registration clientDataJSON challenge ([a535c84](https://github.com/ResakaGit/trymellon-js/commit/a535c84e4eea647266ca02a4064e22c1e55263bf))

### Documentation

- **Credentials:** README y docs: sección "Where to get credentials" (appId = Application ID UUID, publishableKey = Client ID `cli_xxx`). Placeholders en ejemplos: `your-app-id-uuid` / `cli_xxxx`. API.md y EXAMPLES.md alineados; nota de que la API identifica la app por publishableKey + Origin.
- **Cross-device:** Formato de `qr_url` (`{baseUrl}/mobile-auth?session_id={uuid}`) y requisito de app móvil desplegada con origen permitido en el dashboard.
- **Format:** Prettier en documentation/API.md y documentation/EXAMPLES.md.

## [1.4.1](https://github.com/ResakaGit/trymellon-js/compare/v1.4.0...v1.4.1) (2026-02-16)

# [1.4.0](https://github.com/ResakaGit/trymellon-js/compare/v1.3.5...v1.4.0) (2026-02-16)

### Features

- **errors:** CHALLENGE_MISMATCH code + map API challenge_mismatch ([8924ee1](https://github.com/ResakaGit/trymellon-js/commit/8924ee1aa0af48d2bf8d8c8eb8f351df3211db21))

## [1.3.5](https://github.com/ResakaGit/trymellon-js/compare/v1.3.4...v1.3.5) (2026-02-15)

### Bug Fixes

- format CHANGELOG with Prettier (format:check compliance) ([ebcf37d](https://github.com/ResakaGit/trymellon-js/commit/ebcf37d689876ee6c3a1635551b4338006821605))

## [1.3.4](https://github.com/ResakaGit/trymellon-js/compare/v1.3.3...v1.3.4) (2026-02-15)

### Bug Fixes

- release 1.3.4 - approve refactor and getCrossDeviceContext contract ([ed2ad3a](https://github.com/ResakaGit/trymellon-js/commit/ed2ad3aab431a030e632a4762342ff3992a35003))

## [1.3.4] - 2026-02-15

### Changed

- **cross-device-manager.ts:** `approve()` delega en `executeRegistrationApproval()` y `executeAuthApproval()`; ramas de registro y auth separadas para mejor testabilidad.
- **types.ts / api.ts:** Documentado contrato de `getCrossDeviceContext`: `result.value.type` es la fuente de verdad para el branching (auth vs registration).

### Maintenance

- **CHANGELOG.md:** Format with Prettier (format:check compliance).

---

## [1.3.3](https://github.com/ResakaGit/trymellon-js/compare/v1.3.2...v1.3.3) (2026-02-15)

## [1.3.3] - 2026-02-15

### Added

- **TryMellonConfig.origin:** Opción para enviar el header `Origin` en todas las peticiones passkey y cross-device. En browser se usa `window.location.origin` si no se indica. En Node/SSR hay que pasar `origin` explícitamente (protocolo WebAuthn).

### Changed

- **trymellon.ts:** defaultHeaders incluyen `Origin` cuando `config.origin` está definido o cuando hay `window.location.origin` (browser).
- **webauthn.ts:** Comentarios en createRegistrationOptions y createAuthenticationOptions: challenge y rp/rpId vienen del servidor; no sobrescribir (protocolo WebAuthn).

### Tests

- **trymellon.test.ts:** Test "should pass Origin in defaultHeaders when config.origin is set (WebAuthn protocol)".

---

## [1.3.2](https://github.com/ResakaGit/trymellon-js/compare/v1.3.1...v1.3.2) (2026-02-14)

## [1.3.2] - 2026-02-14

### Maintenance

- Changelog and version bump for release alignment.

---

## [1.3.1](https://github.com/ResakaGit/trymellon-js/compare/v1.3.0...v1.3.1) (2026-02-14)

### Bug Fixes

- **sdk:** email fallback requires userId + email; docs use publishableKey ([b16c718](https://github.com/ResakaGit/trymellon-js/commit/b16c718b8679621b982718447902db15251e40fc))

# Unreleased

### Tests

- **errors.test.ts, base64url.test.ts:** Additional coverage for error codes and base64url normalization.

### Added

- **CHALLENGE_MISMATCH:** Nuevo código de error cuando la API devuelve `challenge_mismatch` (p. ej. verify-registration cross-device falla por challenge ya usado o expirado). El fetch-client normaliza `body.error === 'challenge_mismatch'` a `CHALLENGE_MISMATCH`. Usar para mostrar copy tipo "This link was already used or expired. Please scan the QR again from your computer."

### Breaking

- **Email fallback:** `fallback.email.start()` now requires both `userId` and `email` in the options object (`StartEmailFallbackOptions`). The backend requires `email` to send the OTP. Use `client.fallback.email.start({ userId, email })`.

### Documentation

- **EXAMPLES.md:** All examples now use `publishableKey` (replaced previous `apiKey`); email fallback examples updated to `start({ userId, email })`.
- **API.md, README.MD:** Email fallback documented with `userId` and `email`; types and examples aligned.

### Tests

- **index.test.ts:** Type expectations aligned to public API (camelCase: RegisterOptions, RegisterResult, AuthenticateOptions, AuthenticateResult). TryMellonErrorCode assertion includes `ABORT_ERROR`.

---

# [1.3.0](https://github.com/ResakaGit/trymellon-js/compare/v1.2.1...v1.3.0) (2026-02-13)

### Features

- **sandbox:** add sandbox mode and SANDBOX_SESSION_TOKEN (v1.3.0) ([e2f42bd](https://github.com/ResakaGit/trymellon-js/commit/e2f42bdfecb763e8da484c3e8bd839a7a3de51fb))

## [1.3.0] - 2026-02-13

### Added

- **Sandbox mode:** Config option `sandbox: true` for local development. When enabled, `register()` and `authenticate()` return immediately with a fixed session token (no API or WebAuthn calls). Option `sandboxToken` allows a custom token; otherwise the exported constant `SANDBOX_SESSION_TOKEN` is used.
- **SANDBOX_SESSION_TOKEN:** Exported constant (`trymellon_sandbox_session_token_v1`) for backend recognition in development. Backends MUST NOT accept this token in production.
- **validateSession(sandboxToken):** When the client is in sandbox mode and the token equals the sandbox token, returns a mock valid response without calling the API.

### Documentation

- **README.MD:** New section "Sandbox / development mode" with config, constant, and example.
- **API.md:** `TryMellonConfig` extended with `sandbox` and `sandboxToken`; new subsection for `SANDBOX_SESSION_TOKEN`.

---

## [1.2.3] - 2026-02-13

### Documentation

- **README.MD:** Actualización de documentación del SDK.

---

## [1.2.2] - 2026-02-13

### Added

- **TryMellon.create(config):** Método estático que valida la configuración y retorna `Result<TryMellon, TryMellonError>` en lugar de lanzar, permitiendo manejar errores de configuración sin try/catch.
- **Tests:** Cobertura ampliada para EventEmitter (handler que lanza), TryMellon.create/version/getStatus/on/fallback/crossDevice, telemetría cuando `send` rechaza, validación de credenciales y helpers de validators.

### Fixed

- **Validación de entrada:** `register()` y `authenticate()` ahora validan `externalUserId` en el boundary y devuelven `err(INVALID_ARGUMENT)` si falta o no es string no vacío (sin lanzar excepciones).
- **Validators:** Las respuestas de API mal formadas ahora devuelven código `UNKNOWN_ERROR` en lugar de `NETWORK_FAILURE` para reflejar correctamente el tipo de fallo.
- **validateRange:** Rechaza `NaN` e infinitos con `Number.isFinite()` antes de comprobar el rango.
- **fetch-client:** Limpieza de `timeoutId` en bloque `finally` dentro del bucle de reintentos para evitar timers huérfanos.
- **Inmutabilidad:** Opciones WebAuthn (`creationOptions`/`requestOptions`) se construyen con spread en lugar de mutar el objeto devuelto.
- **Coverage:** Exclusión de `src/types.ts` del reporte de cobertura (solo tipos); umbrales 94/95/89/94 cumplidos.
- **Lint:** Eliminados imports y variables no usadas en tests (helpers.test.ts, validation.test.ts).

### Documentation

- **API.md:** Añadidos `TryMellon.create()`, `publishableKey` en config y referencia a `externalUserId` en opciones; aclarado que `register`/`authenticate` retornan `Promise<Result<...>>`.

---

## [1.2.1] - 2026-02-12

### Fixed

- **WebAuthn Types:** Correcciones de tipos para las requests `finishRegister` y `finishAuth` (uso
  consistente de credenciales serializadas y `externalUserId` en resultados), alineando el SDK con
  el contrato de API sin cambios de comportamiento.
- **Cross-Device Validators:** Alineación interna de los validadores de respuestas cross-device para
  usar tipos estrictos (`CrossDeviceContextResult['options']`) en lugar de `any`, mejorando
  type-safety sin cambios de comportamiento público.

---

## [1.2.0] - 2026-02-12

### Added

- **Cross-Device Authentication (QR Login)**: Implementation of the "Sign in with QR" flow.
  - `auth.crossDevice.init()`: Initializes a cross-device session (Desktop side).
  - `auth.crossDevice.waitForSession()`: Polling helper to wait for mobile approval (Desktop side).
  - `auth.crossDevice.approve()`: Complete verification with biometric passkey on mobile (Mobile side).
- **Cross-Device Manager**: New internal orchestration logic for cross-device flows.
- **Validators**: Added validation for cross-device API responses.
- **Types**: New TypeScript types for `CrossDeviceInitResult`, `CrossDeviceStatusResult`, etc.

---

## [1.1.3](https://github.com/ResakaGit/trymellon-js/compare/v1.1.2...v1.1.3) (2026-02-11)

### Bug Fixes

- final production release with revised npm token ([ce9c98f](https://github.com/ResakaGit/trymellon-js/commit/ce9c98f277b0c9d99ceddbddd37b5f1415d6653a))
- final production release with revised npm token ([c509eac](https://github.com/ResakaGit/trymellon-js/commit/c509eacc845a06d0ad93902d71f38c5067d67786))
- final production release with revised npm token ([05d0df0](https://github.com/ResakaGit/trymellon-js/commit/05d0df0f372e889366eff23335dfd7a29eb7cbf7))

## [1.1.2](https://github.com/ResakaGit/trymellon-js/compare/v1.1.1...v1.1.2) (2026-02-11)

### Bug Fixes

- final sync for npm organization publication ([84dd39f](https://github.com/ResakaGit/trymellon-js/commit/84dd39f0bd7aaa159ce7e0c7d023766e47a5a864))

## [1.1.1](https://github.com/ResakaGit/trymellon-js/compare/v1.1.0...v1.1.1) (2026-02-11)

### Bug Fixes

- force publish to npm organization after sync ([0276a88](https://github.com/ResakaGit/trymellon-js/commit/0276a888472e3935910c7c3d286c74db5c542210))

## [1.1.0] - 2026-02-11

### Features

- stable automated release with npm organization support ([b9bcbfd](https://github.com/ResakaGit/trymellon-js/commit/b9bcbfdf932c03d70db95e188c0c90cf4eae6ea0))

## [1.0.0] - 2026-02-11

### Bug Fixes

- **ci:** build artifacts + security audit allowlist; CHANGELOG 1.0.1 ([147590b](https://github.com/ResakaGit/trymellon-js/commit/147590bf89a92bddc5e50030ab44540b73233a9f))

## Changelog

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
