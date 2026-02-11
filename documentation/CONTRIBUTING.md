# Guía de Contribución

Gracias por tu interés en contribuir a `@trymellon/js`. Esta guía te ayudará a entender cómo contribuir al proyecto.

---

## Desarrollo

### Requisitos

- Node.js >= 18
- npm >= 9
- Git

### Setup

```bash
# Clonar el repositorio
git clone https://github.com/trymellon/js-sdk.git
cd js-sdk

# Instalar dependencias
npm install

# Ejecutar tests
npm test

# Ejecutar lint
npm run lint

# Verificar tipos
npm run typecheck
```

---

## Ejecutar cada parte del pipeline (local)

El CI ejecuta varios jobs; puedes reproducirlos en local con estos comandos.

| Parte                         | Comando                             | Descripción                                                                                                                                |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tests**                     | `npm test`                          | Vitest, todos los tests (excepto Angular).                                                                                                 |
| **Cobertura**                 | `npm run test:coverage`             | Tests con reporte de cobertura; falla si no se cumplen los umbrales (93% lines/statements/functions, 87% branches).                        |
| **Tests Angular**             | `npm run test:angular`              | Hace `build` y luego ejecuta solo los tests del adapter Angular (Vitest con config dedicada).                                              |
| **E2E**                       | `npm run build && npm run test:e2e` | Build + Playwright; abre Chromium, sirve la app y verifica carga del SDK e `isSupported()`. Requiere build previo.                         |
| **Lint**                      | `npm run lint`                      | ESLint sobre el código.                                                                                                                    |
| **Formato**                   | `npm run format:check`              | Prettier en modo check.                                                                                                                    |
| **Typecheck**                 | `npm run typecheck`                 | `tsc --noEmit`.                                                                                                                            |
| **Auditoría de dependencias** | `npm run audit:ci`                  | audit-ci con la política del repo (falla en high/critical).                                                                                |
| **Lint de workflows**         | `npm run lint:workflows`            | Valida los YAML de `.github/workflows` con actionlint. Si actionlint no está en PATH, el script lo descarga a `scripts/.cache/actionlint`. |

**Recomendación antes de un PR:** ejecutar al menos `npm run lint`, `npm run typecheck` y `npm run test:coverage`. Opcional: `npm run test:angular`, `npm run test:e2e`, `npm run audit:ci`, `npm run lint:workflows`.

Los criterios completos del pipeline (umbrales, seguridad, E2E) están documentados en [CI-FINTECH-STANDARDS.md](./CI-FINTECH-STANDARDS.md).

---

## Estándares de Código

### TypeScript

- Usa TypeScript strict mode
- Evita `any`, usa tipos específicos
- Exporta tipos públicos en `src/types.ts`
- Usa JSDoc solo cuando sea necesario para la API pública

### Estilo

- Usa Prettier para formateo (se ejecuta automáticamente)
- Sigue las reglas de ESLint
- No uses comentarios innecesarios
- Código debe ser autodocumentado

### Funciones

- Prefiere funciones stateless cuando sea posible
- Usa funciones puras donde sea apropiado
- Evita efectos secundarios innecesarios

### Testing

- Escribe tests antes de implementar (TDD)
- Cobertura objetivo: umbrales en `vitest.config.ts` (93% lines/statements/functions, 87% branches); ver `npm run test:coverage`
- Usa mocks para dependencias externas
- Tests deben ser rápidos y determinísticos

---

## Proceso de Desarrollo

### 1. Crear una Branch

```bash
git checkout -b feature/nueva-funcionalidad
```

### 2. Desarrollo

1. Escribe tests primero (TDD)
2. Implementa la funcionalidad
3. Asegúrate de que todos los tests pasen
4. Ejecuta lint y typecheck

```bash
npm run lint
npm run typecheck
npm test
```

### 3. Commit

Usa mensajes de commit descriptivos:

```bash
git commit -m "feat: agregar nueva funcionalidad X"
```

Prefijos recomendados:

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Cambios en documentación
- `test:` - Agregar o modificar tests
- `refactor:` - Refactorización de código
- `chore:` - Tareas de mantenimiento

### 4. Push

```bash
git push origin feature/nueva-funcionalidad
```

---

## Proceso de Pull Request

### Antes de Crear un PR

1. Asegúrate de que todos los tests pasen
2. Ejecuta `npm run lint` y corrige errores
3. Ejecuta `npm run typecheck` y corrige errores
4. Verifica que la cobertura de tests no disminuya
5. Actualiza la documentación si es necesario

### Crear el PR

1. Ve a GitHub y crea un Pull Request
2. Describe claramente los cambios
3. Menciona cualquier issue relacionado
4. Espera la revisión

### Revisión

- Los PRs requieren al menos una aprobación
- Los tests deben pasar en CI
- El código debe seguir los estándares del proyecto

---

## Testing Guidelines

### Estructura de Tests

- Tests en `tests/` o junto al código con `.test.ts`
- Usa `describe` para agrupar tests relacionados
- Usa `it` o `test` para casos individuales

### Mocks

- Usa mocks de Vitest para dependencias externas
- Usa `tests/mocks/webauthn.ts` para mocks de WebAuthn
- No mocks innecesarios, solo cuando sea requerido

### Ejemplo

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

---

## Estructura del Proyecto

```
src/
  core/          # Lógica principal del SDK
  utils/         # Utilidades
  fallback/     # Fallback por email
  types.ts      # Tipos públicos
  errors.ts     # Sistema de errores
  index.ts      # Punto de entrada

tests/
  core/         # Tests de core
  utils/        # Tests de utils
  fallback/     # Tests de fallback
  mocks/        # Mocks para tests
  setup.ts      # Configuración de tests

documentation/
  API.md        # Referencia de API
  EXAMPLES.md   # Ejemplos de uso
  CONTRIBUTING.md # Esta guía

docs/           # Documentación de desarrollo (ignorada en git)
  ROADMAP.md    # Plan de desarrollo
  ARCHITECTURE.md # Arquitectura del SDK
  README.md     # Índice de documentación
```

---

## Preguntas Frecuentes

### ¿Cómo agrego una nueva funcionalidad?

1. Revisa el [ROADMAP.md](./ROADMAP.md) para ver si está planificado
2. Crea una issue para discutir la funcionalidad
3. Sigue el proceso de desarrollo descrito arriba

### ¿Cómo reporto un bug?

1. Crea una issue en GitHub
2. Describe el problema claramente
3. Incluye pasos para reproducir
4. Incluye información del entorno (navegador, versión, etc.)

### ¿Cómo sugiero una mejora?

1. Crea una issue con la etiqueta "enhancement"
2. Describe la mejora y su beneficio
3. Espera feedback antes de implementar

---

## Contacto

Si tienes preguntas, puedes:

- Crear una issue en GitHub
- Contactar al equipo de TryMellon

---

Gracias por contribuir a `@trymellon/js`! 🎉
