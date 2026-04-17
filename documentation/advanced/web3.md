# Advanced — Web3 (F1)

Opt-in surface that enables identity linking and Sign-In with Ethereum (EIP-4361).
Gated by the `'web3'` preset so the SaaS-only default bundle stays small and the IDE
autocomplete is not polluted with crypto-specific symbols.

See ADR-SDK-004 for design rationale (naming, preset gate, sub-path export, size targets).

## When do I need this?

| Need | Preset |
|------|--------|
| Passkey signup + signIn only | `'saas'` (default) |
| Users sign in with an Ethereum wallet (SIWE) | `'web3'` |
| Link email / wallet identifiers to existing users | `'web3'` |
| Build an EIP-4361 message standalone (no `TryMellon` instance) | any — import from `@trymellon/js/web3` |

## Enabling the preset

```ts
import { TryMellon } from '@trymellon/js';

const client = TryMellon.create({
  appId: 'app_...',
  publishableKey: 'pk_...',
  preset: 'web3', // <-- opts in to client.identity and client.siwe
});

if (!client.ok) throw client.error;
const trymellon = client.value;

// With preset: 'saas' (default), `trymellon.identity` and `trymellon.siwe`
// are typed `never` and will fail type-checking at the call site.
```

## `client.identity` — linking identifiers

All methods require an authenticated session. Call `signUp`, `signIn`, or `enroll`
successfully first; the SDK caches the `userId` from the emitted `success` event.

```ts
// Send an OTP to the email the user wants to link
const challenge = await trymellon.identity.linkEmail('alice@example.com');
if (!challenge.ok) return challenge.error;

// Confirm with the 6-digit code the user receives
const identifier = await trymellon.identity.verifyEmailLink({
  identifierId: challenge.value.identifierId,
  otp: '123456',
});

// List all identifiers linked to the current user
const identifiers = await trymellon.identity.list();

// Unlink (fails with UNLINK_LAST_IDENTIFIER_DENIED on anonymous users
// whose only identifier is the one being removed)
await trymellon.identity.unlink(identifier.value.id);
```

Error codes: `LINK_CHALLENGE_NOT_FOUND`, `LINK_OTP_INVALID`, `LINK_OTP_EXPIRED`,
`IDENTIFIER_ALREADY_LINKED`, `IDENTIFIER_NOT_OWNED`, `EMAIL_ALREADY_TAKEN`,
`UNLINK_LAST_IDENTIFIER_DENIED`.

## `client.siwe` — Sign-In with Ethereum (EIP-4361)

The SDK never signs. The external wallet (MetaMask, Rabby, Coinbase Wallet, wagmi/viem)
does. The SDK prepares the canonical message and submits the signature.

```ts
// 1. Get a nonce
const nonceR = await trymellon.siwe.getNonce();
if (!nonceR.ok) return nonceR.error;

// 2. Build the canonical EIP-4361 message
const messageR = trymellon.siwe.prepareMessage({
  domain: window.location.host,
  address: walletAddress,         // from wallet.getAddress()
  chainId: 1,
  uri: window.location.origin,
  nonce: nonceR.value.nonce,
  statement: 'Sign in to Example App',
});
if (!messageR.ok) return messageR.error;

// 3. Ask the wallet to sign
const signature = await wallet.signMessage(messageR.value);

// 4. Send to the backend; returns the same AuthResult as a passkey signIn
const authR = await trymellon.siwe.verifyAndSignIn({
  message: messageR.value,
  signature,
});
```

Error codes: `SIWE_NONCE_EXPIRED`, `SIWE_NONCE_REPLAY`, `SIWE_SIGNATURE_INVALID`,
`SIWE_MESSAGE_MALFORMED`, `SIWE_CHAIN_NOT_ALLOWED`, `SIWE_DOMAIN_MISMATCH`,
`SIWE_ADDRESS_MISMATCH`.

## Sub-path import — `@trymellon/js/web3`

Use when you want only the pure EIP-4361 builder without instantiating a client
(e.g. server-side validation, tests, or a thin worker).

```ts
import { prepareSiweMessage, type SiwePrepareOptions } from '@trymellon/js/web3';

const result = prepareSiweMessage({
  domain: 'example.com',
  address: '0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB',
  chainId: 1,
  uri: 'https://example.com/login',
  nonce: await fetchNonceFromBackend(),
});
```

Bundle target: `< 10 KB` gzipped (enforced by `size-limit` in CI).

## Integration with wallet libraries

### wagmi (v2)

```ts
import { useSignMessage } from 'wagmi';
import { prepareSiweMessage } from '@trymellon/js/web3';

const { signMessageAsync } = useSignMessage();

async function signIn() {
  const nonce = await trymellon.siwe.getNonce();
  if (!nonce.ok) return;

  const msg = prepareSiweMessage({
    domain: window.location.host,
    address: accountAddress,
    chainId: chain.id,
    uri: window.location.origin,
    nonce: nonce.value.nonce,
  });
  if (!msg.ok) return;

  const signature = await signMessageAsync({ message: msg.value });
  return trymellon.siwe.verifyAndSignIn({ message: msg.value, signature });
}
```

### viem

```ts
import { createWalletClient, custom } from 'viem';

const walletClient = createWalletClient({ transport: custom(window.ethereum!) });
const [address] = await walletClient.getAddresses();

const signature = await walletClient.signMessage({ account: address, message });
```

### ethers v6

```ts
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const signature = await signer.signMessage(message);
```

## Scope explicitly out

- **`client.identity.linkWallet`** — requires a backend endpoint to link a wallet
  to an already-authenticated user. Tracked as SPRINT-F1.3-BACK-WALLET-LINK.
- **`RegisterResult.isAnonymous`** — tracked as SPRINT-F1.4-BACK-ANONYMOUS-FLAG.
- **Wallet connection UI** — the SDK deliberately avoids shipping wallet connectors;
  use wagmi, RainbowKit, Web3Modal, ConnectKit, or your own.
- **EIP-712 / ERC-1271 / session keys** — F2 scope (ADR-041, ADR-042, ADR-043).

## Size-limit targets (CI-enforced)

| Entry | Limit (gzipped) |
|-------|------------------|
| `dist/index.global.js` (core IIFE) | 20 KB |
| `dist/web3/index.js` (sub-path ESM) | 10 KB |
