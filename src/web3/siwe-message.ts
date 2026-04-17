import { createError, type TryMellonError } from '../errors';
import { err, ok, type Result } from '../utils/result';

/**
 * Inputs for `prepareSiweMessage`. Matches EIP-4361 field names.
 * The SDK never signs — the external wallet (MetaMask, Rabby, Coinbase) does.
 */
export interface SiwePrepareOptions {
  /** EIP-4361 `domain`: RFC 3986 authority the user signs in to (e.g. `app.example.com`). */
  domain: string;
  /** EIP-55 checksummed 0x-prefixed Ethereum address. Checksum is wallet's responsibility; SDK validates format only. */
  address: string;
  /** EIP-155 chain id. Positive integer. */
  chainId: number;
  /** RFC 3986 URI referring to the resource that is the subject of the signing. */
  uri: string;
  /** Random nonce issued by `client.siwe.getNonce()`. Min 8 alphanumeric chars per spec. */
  nonce: string;
  /** Optional human-readable assertion. ASCII printable, no line breaks. */
  statement?: string;
  /** ISO 8601 datetime. Defaults to `new Date().toISOString()` when omitted. */
  issuedAt?: string;
  /** ISO 8601 datetime. */
  expirationTime?: string;
  /** ISO 8601 datetime. */
  notBefore?: string;
  /** Opaque correlation id. */
  requestId?: string;
  /** Ordered list of RFC 3986 URIs. */
  resources?: readonly string[];
}

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const NONCE_PATTERN = /^[a-zA-Z0-9]{8,}$/;
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const SIWE_VERSION = '1';

function invalid(field: string, reason: string): Result<never, TryMellonError> {
  return err(
    createError('INVALID_ARGUMENT', `Invalid SIWE field: ${field} — ${reason}`, { field })
  );
}

function validateDomain(domain: string): Result<string, TryMellonError> {
  if (typeof domain !== 'string' || domain.trim() === '') {
    return invalid('domain', 'must be a non-empty RFC 3986 authority');
  }
  if (domain.includes('\n') || domain.includes(' ')) {
    return invalid('domain', 'must not contain whitespace or line breaks');
  }
  return ok(domain);
}

function validateAddress(address: string): Result<string, TryMellonError> {
  if (typeof address !== 'string' || !ADDRESS_PATTERN.test(address)) {
    return invalid('address', 'must be a 0x-prefixed 40-char hex string');
  }
  return ok(address);
}

function validateChainId(chainId: number): Result<number, TryMellonError> {
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return invalid('chainId', 'must be a positive integer');
  }
  return ok(chainId);
}

function validateUri(uri: string, field: string): Result<string, TryMellonError> {
  if (typeof uri !== 'string' || uri.trim() === '') {
    return invalid(field, 'must be a non-empty RFC 3986 URI');
  }
  try {
    new URL(uri);
  } catch {
    return invalid(field, 'must be a valid URI');
  }
  return ok(uri);
}

function validateNonce(nonce: string): Result<string, TryMellonError> {
  if (typeof nonce !== 'string' || !NONCE_PATTERN.test(nonce)) {
    return invalid('nonce', 'must be at least 8 alphanumeric characters');
  }
  return ok(nonce);
}

function validateStatement(statement: string): Result<string, TryMellonError> {
  if (statement.includes('\n')) {
    return invalid('statement', 'must not contain line breaks');
  }
  return ok(statement);
}

function validateIso8601(value: string, field: string): Result<string, TryMellonError> {
  if (!ISO_8601_PATTERN.test(value)) {
    return invalid(field, 'must be an ISO 8601 datetime');
  }
  return ok(value);
}

/**
 * Builds an EIP-4361 "Sign-In with Ethereum" message in canonical form.
 *
 * Pure: no network, no side effects, no dependencies beyond stdlib.
 * The caller passes the resulting string to the external wallet for signing.
 *
 * @see https://eips.ethereum.org/EIPS/eip-4361
 */
export function prepareSiweMessage(opts: SiwePrepareOptions): Result<string, TryMellonError> {
  const domain = validateDomain(opts.domain);
  if (!domain.ok) return domain;

  const address = validateAddress(opts.address);
  if (!address.ok) return address;

  const chainId = validateChainId(opts.chainId);
  if (!chainId.ok) return chainId;

  const uri = validateUri(opts.uri, 'uri');
  if (!uri.ok) return uri;

  const nonce = validateNonce(opts.nonce);
  if (!nonce.ok) return nonce;

  const issuedAtRaw = opts.issuedAt ?? new Date().toISOString();
  const issuedAt = validateIso8601(issuedAtRaw, 'issuedAt');
  if (!issuedAt.ok) return issuedAt;

  if (opts.statement !== undefined) {
    const s = validateStatement(opts.statement);
    if (!s.ok) return s;
  }

  if (opts.expirationTime !== undefined) {
    const r = validateIso8601(opts.expirationTime, 'expirationTime');
    if (!r.ok) return r;
  }

  if (opts.notBefore !== undefined) {
    const r = validateIso8601(opts.notBefore, 'notBefore');
    if (!r.ok) return r;
  }

  if (opts.resources !== undefined) {
    for (let i = 0; i < opts.resources.length; i++) {
      const r = validateUri(opts.resources[i] as string, `resources[${i}]`);
      if (!r.ok) return r;
    }
  }

  const header = `${domain.value} wants you to sign in with your Ethereum account:\n${address.value}`;

  const suffixLines = [
    `URI: ${uri.value}`,
    `Version: ${SIWE_VERSION}`,
    `Chain ID: ${chainId.value}`,
    `Nonce: ${nonce.value}`,
    `Issued At: ${issuedAt.value}`,
  ];
  if (opts.expirationTime !== undefined)
    suffixLines.push(`Expiration Time: ${opts.expirationTime}`);
  if (opts.notBefore !== undefined) suffixLines.push(`Not Before: ${opts.notBefore}`);
  if (opts.requestId !== undefined) suffixLines.push(`Request ID: ${opts.requestId}`);
  if (opts.resources !== undefined && opts.resources.length > 0) {
    suffixLines.push(`Resources:\n${opts.resources.map((r) => `- ${r}`).join('\n')}`);
  }

  const body = opts.statement !== undefined ? `\n\n${opts.statement}\n\n` : '\n\n';

  return ok(`${header}${body}${suffixLines.join('\n')}`);
}
