# @trymellon/js — TryMellon JavaScript SDK

SDK cliente para integrar autenticación passwordless (WebAuthn/Passkeys) en cualquier aplicación web.

**Zero runtime dependencies · Framework-agnostic · TypeScript strict**

```bash
npm install @trymellon/js
```

---

## Entry Points

| Import | Para qué |
|--------|----------|
| `@trymellon/js` | Vanilla JS, Svelte, Node, cualquier bundler (ESM / CJS) |
| `@trymellon/js/react` | React hooks (`useTryMellon`, `useRegister`, `useAuthenticate`) |
| `@trymellon/js/vue` | Vue composables |
| `@trymellon/js/angular` | Angular service |
| `@trymellon/js/ui` | Web Components (`<trymellon-auth>`, `<trymellon-auth-modal>`) |

---

## Quick Start

```typescript
import { TryMellon } from '@trymellon/js'

const client = new TryMellon({
  appId: 'your-app-id',
  publishableKey: 'your-publishable-key',
  apiBaseUrl: 'https://api.trymellonauth.com'
})

const result = await client.register({ email: 'user@example.com' })
if (result.ok) console.log(result.value.sessionToken)
```

---

## Configuración del Cliente

El SDK se configura por instancia — sin variables de entorno en runtime.

| Opción | Requerida | Descripción |
|--------|-----------|-------------|
| `appId` | ✅ | UUID de la Application en WebAuthSaas. Se obtiene desde el dashboard → Applications. |
| `publishableKey` | ✅ | Publishable key de la app — Bearer token para las rutas de passkeys del API. |
| `apiBaseUrl` | ✅ | URL base del backend WebAuthSaas. Prod: `https://api.trymellonauth.com` |
| `sandbox` | ❌ | `true` activa sandbox mode — retorna token fijo sin llamar al API. Solo desarrollo y CI. |

---

## Variables de Entorno (solo tests de integración)

El SDK en runtime no usa variables de entorno (zero deps, configuración por instancia).

Para los tests de integración E2E:

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `TEST_API_URL` | ⚠️ | URL del backend para tests de integración. Default: `http://localhost:3000` |
| `TEST_API_KEY` | ⚠️ | API key para autenticar requests en tests de integración |

---

## Dependencias Externas

| Servicio | Configurado en | Para qué |
|----------|---------------|----------|
| WebAuthSaas API | `apiBaseUrl` | Start/finish de ceremonias WebAuthn, cross-device, fallback OTP |
| Browser WebAuthn API | nativa | `navigator.credentials.create` / `get` — orquestado por el SDK |
| WebCrypto API | nativa | `crypto.getRandomValues`, `crypto.subtle` — sin deps externos |

---

## Sandbox Mode

```typescript
const client = new TryMellon({ ..., sandbox: true })
// Retorna SANDBOX_SESSION_TOKEN fijo — sin llamadas al API
// El backend debe reconocer este token en modo dev
```

Útil para CI, storybooks y desarrollo sin backend corriendo.

---

## Scripts

```bash
npm run build          # tsup — genera ESM, CJS, UMD en dist/
npm run dev            # tsup --watch
npm run test           # Vitest
npm run test:coverage  # Vitest + coverage report
npm run lint           # ESLint
npm run type-check     # tsc --noEmit
```

---

## Build & Release

**Bundler:** tsup (esbuild)
**Outputs:** ESM · CJS · UMD (tree-shakeable, sideEffects: false)
**Release:** semantic-release — conventional commits → version bump + CHANGELOG + npm publish automático

Pre-publish checklist: lint ✓ · tests ✓ · build ✓ · coverage ≥ thresholds (lines 94, functions 95, branches 88)

---

## Documentación Interna

| Doc | Descripción |
|-----|-------------|
| `docs/TL/TS.md` | Technical Specifications (arquitectura interna, zero-deps design, ceremony flow, bundle targets, P95) |
| `docs/arquitectura/ADRs/` | ADRs: zero-deps, tsup, multi-entry-points, Result pattern, Web Components, sandbox mode |
| `docs/PM/BRD.md` | Business Requirements Document |
| `docs/sprints/SPRINT-MAP.md` | Historial de sprints y épicas |
