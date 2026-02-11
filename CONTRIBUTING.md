# Contributing to TryMellon SDK

Thanks for your interest in contributing to the TryMellon JS SDK! We welcome contributions from the community.

## Getting Started

1. **Fork and Clone** the repository.
2. **Install Dependencies**: `npm install`
3. **Run Tests**: `npm test` to ensure everything is working.

## Development Workflow

- **Branching**: Create a feature branch for your changes (e.g., `feat/add-new-adapter`).
- **Commits**: We use [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat: add new adapter`
  - `fix: resolve issue in validator`
  - `docs: update README`
- **Linting**: Run `npm run lint` before committing.
- **Testing**: Add tests for any new functionality. We aim for high test coverage.

## Project Structure

- `src/core`: Core logic (validators, API client, WebAuthn helpers).
- `src/adapters`: Framework-specific adapters (React, Vue, etc.).
- `tests`: Unit and integration tests.

## Pull Request Process

1. Ensure all tests pass.
2. Update documentation if necessary.
3. Open a PR against the `main` branch.
4. Provide a clear description of your changes.

Thanks for helping us build better auth for everyone!
