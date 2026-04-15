# Advanced — tryMellon SDK

This folder documents **opt-in** features that are not part of the default `preset: 'saas'` core.
It exists to keep the getting-started surface of the SDK small: README and top-level `API.md` show
only `signUp`, `signIn`, `enroll`, `otp`, `session` and `capabilities` — the 90% path.

Everything here requires either a non-default preset or an additional namespace that the
integrator explicitly imports.

## What lives here

*(empty at F0 — this folder exists as a placeholder for the patterns landing in F1 and F2)*

- **F1 (planned):** identity linking (email / wallet association to anonymous users), SIWE
  (EIP-4361) login, wallet namespace.
- **F2 (planned):** on-chain action signing (EIP-712 typed data), ERC-1271 smart wallet
  verification, scoped session keys.

## Why progressive disclosure

The SDK is zero-dep and tree-shakeable. Advanced capabilities do **not** appear in the
`TryMellon` client by default; they are either unlocked via `preset` (e.g. `preset: 'web3'`)
or imported as sub-path exports (e.g. `@trymellon/sdk/web3`). See `ADR-SDK-002` in the
backend repo for the canonical surface design.

## Current preset

Only `'saas'` is accepted. Any other value raises `INVALID_ARGUMENT` at client creation.
This gate is intentional — presets ship when the backend endpoints behind them are stable.
