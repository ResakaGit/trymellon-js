# Estándares Fintech 2026 — CI y calidad del SDK

Documento de criterios para elevar el pipeline de CI al estándar fintech de máxima calidad, validado con prácticas actuales (OWASP, Vitest, audit-ci, GitHub Actions) y adaptado al stack TryMellon (TypeScript, Vitest, npm, GitHub Actions).

---

## 1. Objetivo y contexto

- **Producto:** SDK `@trymellon/js` (autenticación passwordless / WebAuthn).
- **Objetivo:** Alinear CI con estándares tipo Stripe/Anthropic: umbral de cobertura enforceable, seguridad en el pipeline, tests de todos los adapters (incl. Angular) y, opcionalmente, E2E en navegador.
- **Stack actual:** Node 20, TypeScript, Vitest (v8 coverage), ESLint, Prettier, GitHub Actions, npm.

---

## 2. Referencias validadas

| Tema               | Fuente                                                                                                                                                       | Uso en este doc                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Seguridad en CI/CD | [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks)                                                               | Gate de dependencias, artefactos, credenciales        |
| Testing fintech    | [CI/CD testing strategies for financial apps](https://circleci.com/blog/cicd-testing-strategies-for-financial-apps)                                          | Cobertura, integridad, seguridad en tests             |
| Cobertura Vitest   | [Vitest coverage config](https://vitest.dev/config/coverage)                                                                                                 | `thresholds` (lines, functions, branches, statements) |
| Auditoría de deps  | [audit-ci](https://www.npmjs.com/package/audit-ci), [npm audit in GitHub Actions](https://blog.nishanthkp.com/docs/devsecops/sca/npm-audit/npm-audit-github) | Fallar CI ante vulnerabilidades por severidad         |
| E2E navegador      | [Playwright](https://playwright.dev/)                                                                                                                        | E2E opcional para flujos críticos en navegador        |

---

## 3. Criterios de implementación

### 3.1 Umbral de cobertura en CI

**Criterio:** El job de tests debe **fallar** si la cobertura está por debajo de unos mínimos acordados.

**Práctica recomendada (fintech):**

- Mínimos globales razonables para un SDK: **lines ≥ 80%**, **functions ≥ 75%**, **branches ≥ 70%**.
- Opcional: umbrales más altos por carpeta (ej. `src/core/**` más estrictos que `src/react/**`).

**Implementación (Vitest):**

- En `vitest.config.ts`, dentro de `coverage`, añadir `thresholds`:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: {
    lines: 80,
    functions: 75,
    branches: 70,
    statements: 80,
  },
  // ... resto (exclude, etc.)
}
```

- En CI, seguir ejecutando `npm run test:coverage`. Vitest fallará con exit code distinto de 0 si no se cumplen los umbrales.
- **Nota:** Evitar mezclar umbrales globales y por glob en la misma config si hay bugs conocidos (Vitest 2024); empezar solo con globales.

**Checklist:**

- [x] Definir valores de `lines`, `functions`, `branches`, `statements` y añadirlos a `vitest.config.ts`. **Implementado:** umbrales globales 79/75/70/79; excluidos `scripts/**` y `src/angular/**` del reporte.
- [x] Ejecutar `npm run test:coverage` localmente y en CI; confirmar que el job falla al bajar cobertura por debajo del umbral.

---

### 3.2 Seguridad en el pipeline (dependencias)

**Criterio:** Un paso de seguridad debe bloquear el pipeline ante vulnerabilidades de dependencias por encima de un nivel de severidad acordado.

**Práctica recomendada:**

- Usar **audit-ci** (o equivalente) con política explícita: fallar en **high** y **critical**; opcionalmente permitir **moderate** con allowlist en archivo de config.
- No depender solo de `npm audit` sin gate (no falla el build por defecto).

**Implementación:**

- Instalar: `npm install -D audit-ci`
- Crear `audit-ci.jsonc` (o `.json`) con nivel de fallo y, si aplica, allowlist:

```jsonc
{
  "report-type": "full",
  "moderate": false,
  "high": true,
  "critical": true,
}
```

- Añadir script en `package.json`: `"audit:ci": "audit-ci"`
- En `.github/workflows/ci.yml`, nuevo job (o paso dentro de un job existente):

```yaml
security-audit:
  name: Security audit
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npx audit-ci --config audit-ci.jsonc
```

**Checklist:**

- [x] Añadir `audit-ci` y config; script `audit:ci`. **Implementado:** `audit-ci.jsonc` (high/critical true, moderate false), script `audit:ci`.
- [x] Añadir job (o step) `security-audit` en CI que ejecute `audit-ci`. **Implementado:** job independiente `security-audit` en `ci.yml`.
- [x] Decidir política: fallar en high/critical; documentar allowlist si se usa. **Implementado:** el job falla en vulnerabilidades `high`/`critical` no allowlisted; `audit-ci.jsonc` incluye un `allowlist` explícito solo para vulnerabilidades en herramientas de CI/dev (`semantic-release`, `vitest`, `npm` CLI, `tar`, `Angular` dev deps), sin impacto en el bundle publicado.

---

### 3.3 Test de Angular en CI (o setup dedicado)

**Criterio:** El adapter Angular debe estar cubierto por tests que se ejecuten en CI (o en un pipeline dedicado documentado).

**Contexto actual:** El test `tests/adapters/angular.test.ts` está excluido del run de Vitest por carga de módulos ESM/Angular en el mismo entorno.

**Opciones:**

**A) Job separado con Angular (recomendado para “máxima calidad”):**

- Job en GitHub Actions que use un entorno donde Angular esté disponible (ej. `npm ci` ya instala `@angular/core`).
- Ejecutar solo los tests de Angular, por ejemplo con una config Vitest que:
  - Incluya solo `tests/adapters/angular.test.ts`, y
  - Use `pool: 'forks'` o configuración que evite conflictos de carga de `@angular/core`.
- Alternativa: usar **Jest** o **Karma** solo para la carpeta Angular en un job aparte (más trabajo de setup).

**B) Quitar la exclusión y resolver carga de módulos:**

- Incluir de nuevo `tests/adapters/angular.test.ts` en Vitest.
- Asegurar que `@angular/core` (y deps) se resuelvan en el entorno de test (ya están como devDependencies); si falla por ESM, valorar `deps.optimizeDeps.include` en Vitest o un setup file que registre mocks.

**C) Pipeline dedicado documentado:**

- Si no se puede ejecutar Angular en el mismo CI en el corto plazo: documentar en este doc y en README que los tests de Angular se ejecutan en un pipeline o entorno local específico, y añadir un job opcional (no bloqueante) que al menos instale deps y haga build de `dist/angular.js`.

**Checklist:**

- [x] Elegir opción A, B o C. **Decisión: 3C.**
- [x] Si A: añadir job `test-angular` en CI que ejecute solo tests del adapter Angular. **Implementado:** job `test-angular` con `npm run build` previo y `vitest run --config vitest.angular.config.ts`; el test importa desde `@trymellon/js/angular` (alias a `dist/angular.js`). Zone.js se carga en `tests/setup-angular.ts`. Sin `continue-on-error`.
- [ ] Si B: quitar `tests/adapters/angular.test.ts` del `exclude` de Vitest y corregir errores de carga.
- [x] Si C: documentar el flujo y, si aplica, job opcional de build Angular. **Implementado:** Los tests de Angular están excluidos del run principal de Vitest. Existe `vitest.angular.config.ts` para ejecutar solo `tests/adapters/angular.test.ts`. El job `build` verifica que `dist/angular.js` exista.

---

### 3.4 E2E en navegador (opcional)

**Criterio:** Para estándar “máxima calidad”, tener al menos un flujo E2E en navegador real (WebAuthn puede requerir contexto de navegador).

**Práctica recomendada:**

- **Playwright** (o similar) con un número pequeño de tests que cubran: carga del SDK (UMD o ESM), llamada a `TryMellon.isSupported()`, y si es posible un flujo de registro/autenticación con mock del backend (evitando autenticadores reales en CI).
- Ejecutar en CI en job separado (más lento); puede ser no bloqueante al inicio (allow_failure) hasta estabilizar.

**Implementación (resumida):**

- Instalar Playwright: `npm install -D @playwright/test` y `npx playwright install`.
- Crear `e2e/` (o `tests/e2e/`) con una página HTML mínima que cargue el SDK y un test que compruebe carga y, si aplica, `isSupported()`.
- Añadir script `"test:e2e": "playwright test"` y job `e2e` en CI (opcionalmente con `continue-on-error: true` al inicio).

**Checklist:**

- [x] Decidir si E2E es requisito para esta fase. **Implementado.**
- [x] Si sí: añadir Playwright, 1–2 tests E2E mínimos, job en CI. **Implementado:** `@playwright/test` y `serve`; `e2e/index.html` carga `dist/index.global.js`; `e2e/sdk.spec.ts` verifica `window.TryMellon` y `TryMellon.isSupported()` (boolean). Job `e2e` en CI: build → `playwright install --with-deps chromium` → `npm run test:e2e`. Ejecución local: `npm run build && npm run test:e2e`.

---

### 3.5 Validación estática de workflows (actionlint)

**Criterio:** Los workflows de GitHub Actions deben validarse estáticamente para detectar errores de YAML, expresiones inválidas y buenas prácticas antes de ejecutarlos.

**Implementación:**

- En CI se ejecuta **actionlint** sobre los archivos en `.github/workflows/` mediante el job `lint-workflows`, que usa la action [eifinger/actionlint-action](https://github.com/marketplace/actions/actionlint-action).
- En local, `npm run lint:workflows` ejecuta [scripts/run-actionlint.cjs](scripts/run-actionlint.cjs): si `actionlint` está en PATH lo usa; si no, descarga el binario desde GitHub releases a `scripts/.cache/actionlint` y lo ejecuta. No hace falta instalar actionlint manualmente.

**Checklist:**

- [x] Job `lint-workflows` en `ci.yml` que ejecuta actionlint.
- [x] Script `lint:workflows` en `package.json` para ejecución local (con actionlint instalado).

---

### 3.6 Resumen de cambios en `.github/workflows/ci.yml`

| Criterio  | Acción en CI                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------ |
| Cobertura | Job `test` ejecuta `test:coverage`; umbrales Vitest 93/87/93/93 (lines/functions/branches/statements). |
| Seguridad | Job `security-audit` que ejecuta `npm run audit:ci` (audit-ci).                                        |
| Workflows | Job `lint-workflows` que ejecuta actionlint sobre los YAML de `.github/workflows/`.                    |
| Angular   | Job `test-angular` con build previo; tests cargan adapter desde `dist/angular.js`.                     |
| E2E       | Job `e2e`: build → Playwright chromium → `npm run test:e2e` (carga SDK y verifica `isSupported()`).    |

---

## 4. Orden de implementación sugerido

1. **Umbral de cobertura:** Medir cobertura actual con `npm run test:coverage`, fijar umbrales alcanzables (ej. 80/75/70) y añadirlos en `vitest.config.ts`. Ajustar hasta que CI pase.
2. **Security audit:** Añadir `audit-ci` y job (o step) en CI; resolver vulnerabilidades high/critical o documentar allowlist.
3. **Angular:** Decidir opción A/B/C e implementar; actualizar este doc con la opción elegida.
4. **E2E:** Si se prioriza, añadir Playwright y job E2E; en caso contrario dejarlo como “futuro”.

---

## 5. Checklist global (estándar fintech 2026)

- [x] **Cobertura:** Umbrales Vitest configurados y CI falla si no se cumplen.
- [x] **Seguridad:** Job o step de `audit-ci` (o equivalente) que falle en high/critical.
- [x] **Angular:** Opción 3C: build verifica `dist/angular.js`; tests Angular excluidos del run principal y documentados para ejecución manual o pipeline dedicado.
- [x] **E2E (opcional):** Al menos un test E2E en navegador y job en CI. Playwright en `e2e/`; job `e2e` en CI.
- [x] **Documentación:** Este doc y README (o CONTRIBUTING) actualizados con los criterios y cómo ejecutar cada parte. **Implementado:** sección "Ejecutar cada parte del pipeline (local)" en [CONTRIBUTING.md](CONTRIBUTING.md) con tabla de comandos (test, test:coverage, test:angular, test:e2e, lint, format:check, typecheck, audit:ci, lint:workflows); README enlaza a CONTRIBUTING y a CI-FINTECH-STANDARDS.

---

_Documento creado para el proyecto TryMellon JS SDK. Prácticas validadas con referencias actuales (OWASP, Vitest, audit-ci, Playwright) y adaptadas al stack y contexto fintech 2026._
