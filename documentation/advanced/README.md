# Advanced — tryMellon SDK

This folder documents **opt-in** features that are not part of the default `preset: 'saas'` core.
It exists to keep the getting-started surface of the SDK small: README and top-level `API.md` show
only `signUp`, `signIn`, `enroll`, `otp`, `session` and `capabilities` — the 90% path.

Everything here requires either a non-default preset or an additional namespace that the
integrator explicitly imports.

## What lives here

- **[`web3.md`](./web3.md)** — F1 Web3 surface: identity linking (email / wallet) and Sign-In
  with Ethereum (EIP-4361). Gated by `preset: 'web3'` plus the `@trymellon/js/web3` sub-path.
- **Future (F2 planned):** on-chain action signing (EIP-712 typed data), ERC-1271 smart wallet
  verification, scoped session keys. Tracked under ADR-041 / ADR-042 / ADR-043.

## Why progressive disclosure

The SDK is zero-dep and tree-shakeable. Advanced capabilities do **not** appear in the
`TryMellon` client by default; they are either unlocked via `preset` (e.g. `preset: 'web3'`)
or imported as sub-path exports (e.g. `@trymellon/js/web3`). See `ADR-SDK-002` in the
backend repo for the canonical surface design.

## Accepted presets

| Preset          | Unlocks                                                        |
| --------------- | -------------------------------------------------------------- |
| `'saas'` (default) | Passkey-only surface: `signUp`, `signIn`, `enroll`, `otp`, `session`, `capabilities`, `bridge`, `crossDevice`, `action`, `passkey.recover`. |
| `'web3'`        | Everything in `'saas'` **plus** `client.identity.*` and `client.siwe.*`. See [`web3.md`](./web3.md). |

Any other value for `preset` raises `INVALID_ARGUMENT` at client creation. New presets ship
only when the backend endpoints behind them are stable.
