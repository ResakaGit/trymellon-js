# Contributing Guide

Thank you for your interest in contributing to `@trymellon/js`. This guide will help you understand how to contribute to the project.

---

## Development

### Requirements

- Node.js >= 18
- npm >= 9
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/trymellon/js-sdk.git
cd js-sdk

# Install dependencies
npm install

# Run tests
npm test

# Run lint
npm run lint

# Type check
npm run typecheck
```

---

## Running Each Part of the Pipeline (Local)

CI runs several jobs; you can reproduce them locally with these commands.

| Part                 | Command                             | Description                                                                                                                               |
| -------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Tests**            | `npm test`                          | Vitest, all tests (except Angular).                                                                                                       |
| **Coverage**         | `npm run test:coverage`             | Tests with coverage report; fails if thresholds are not met (93% lines/statements/functions, 87% branches).                               |
| **Angular tests**    | `npm run test:angular`              | Runs `build` then only the Angular adapter tests (Vitest with dedicated config).                                                          |
| **E2E**              | `npm run build && npm run test:e2e` | Build + Playwright; opens Chromium, serves the app and verifies SDK load and `isSupported()`. Requires prior build.                       |
| **Lint**             | `npm run lint`                      | ESLint on the codebase.                                                                                                                   |
| **Format**           | `npm run format:check`              | Prettier in check mode.                                                                                                                   |
| **Typecheck**        | `npm run typecheck`                 | `tsc --noEmit`.                                                                                                                           |
| **Dependency audit** | `npm run audit:ci`                  | audit-ci with repo policy (fails on high/critical).                                                                                       |
| **Workflow lint**    | `npm run lint:workflows`            | Validates `.github/workflows` YAML with actionlint. If actionlint is not in PATH, the script downloads it to `scripts/.cache/actionlint`. |

**Recommendation before a PR:** run at least `npm run lint`, `npm run typecheck`, and `npm run test:coverage`. Optional: `npm run test:angular`, `npm run test:e2e`, `npm run audit:ci`, `npm run lint:workflows`.

Coverage thresholds are in `vitest.config.ts`; the pipeline definition is in `.github/workflows`.

---

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Avoid `any`, use specific types
- Export public types in `src/types.ts`
- Use JSDoc only when needed for the public API

### Style

- Use Prettier for formatting (runs automatically)
- Follow ESLint rules
- No unnecessary comments
- Code should be self-documenting

### Functions

- Prefer stateless functions when possible
- Use pure functions where appropriate
- Avoid unnecessary side effects

### Testing

- Write tests before implementing (TDD)
- Coverage target: thresholds in `vitest.config.ts` (93% lines/statements/functions, 87% branches); see `npm run test:coverage`
- Use mocks for external dependencies
- Tests must be fast and deterministic

---

## Development Process

### 1. Create a Branch

```bash
git checkout -b feature/new-feature
```

### 2. Development

1. Write tests first (TDD)
2. Implement the feature
3. Ensure all tests pass
4. Run lint and typecheck

```bash
npm run lint
npm run typecheck
npm test
```

### 3. Commit

Use descriptive commit messages:

```bash
git commit -m "feat: add new feature X"
```

Recommended prefixes:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Add or modify tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### 4. Push

```bash
git push origin feature/new-feature
```

---

## Pull Request Process

### Before Creating a PR

1. Ensure all tests pass
2. Run `npm run lint` and fix any errors
3. Run `npm run typecheck` and fix any errors
4. Verify test coverage does not decrease
5. Update documentation if needed

### Creating the PR

1. Go to GitHub and create a Pull Request
2. Describe the changes clearly
3. Mention any related issues
4. Wait for review

### Review

- PRs require at least one approval
- Tests must pass in CI
- Code must follow project standards

---

## Testing Guidelines

### Test Structure

- Tests in `tests/` or next to code with `.test.ts`
- Use `describe` to group related tests
- Use `it` or `test` for individual cases

### Mocks

- Use Vitest mocks for external dependencies
- Use `tests/mocks/webauthn.ts` for WebAuthn mocks
- No unnecessary mocks, only when required

### Example

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

## Project Structure

```
src/
  core/          # Core SDK logic
  utils/         # Utilities
  fallback/      # Email fallback
  types.ts       # Public types
  errors.ts      # Error system
  index.ts       # Entry point

tests/
  core/          # Core tests
  utils/         # Utils tests
  fallback/      # Fallback tests
  mocks/         # Test mocks
  setup.ts       # Test configuration

documentation/
  API.md         # API reference
  EXAMPLES.md    # Usage examples
  CONTRIBUTING.md # This guide

docs/            # Development docs (gitignored)
  ROADMAP.md     # Development plan
  ARCHITECTURE.md # SDK architecture
  README.md      # Documentation index
```

---

## FAQ

### How do I add a new feature?

1. Check [ROADMAP.md](./ROADMAP.md) to see if it is planned
2. Create an issue to discuss the feature
3. Follow the development process described above

### How do I report a bug?

1. Create an issue on GitHub
2. Describe the problem clearly
3. Include steps to reproduce
4. Include environment info (browser, version, etc.)

### How do I suggest an improvement?

1. Create an issue with the "enhancement" label
2. Describe the improvement and its benefit
3. Wait for feedback before implementing

---

## Contact

If you have questions, you can:

- Create an issue on GitHub
- Contact the TryMellon team

---

Thank you for contributing to `@trymellon/js`! 🎉
