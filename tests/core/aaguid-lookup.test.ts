import { describe, it, expect } from 'vitest';
import { getDeviceName, resolveCredentialName } from '../../src/core/aaguid-lookup';

describe('getDeviceName', () => {
  it('returns known device name for a valid AAGUID', () => {
    expect(getDeviceName('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4')).toBe('Google Password Manager');
  });

  it('is case-insensitive', () => {
    expect(getDeviceName('EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4')).toBe('Google Password Manager');
  });

  it('returns null for an unknown AAGUID', () => {
    expect(getDeviceName('cafebabe-0000-0000-0000-000000000000')).toBeNull();
  });

  it('recognizes the all-zeros privacy-preserving AAGUID', () => {
    expect(getDeviceName('00000000-0000-0000-0000-000000000000')).toBe('Passkey');
  });

  it('recognizes YubiKey 5 NFC', () => {
    expect(getDeviceName('2fc0579f-8113-47ea-b116-bb5a8db9202a')).toBe('YubiKey 5 NFC');
  });
});

describe('resolveCredentialName', () => {
  it('returns alias when provided — alias wins over AAGUID', () => {
    expect(resolveCredentialName('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4', 'My work key')).toBe(
      'My work key'
    );
  });

  it('returns device name from AAGUID when alias is null', () => {
    expect(resolveCredentialName('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4', null)).toBe(
      'Google Password Manager'
    );
  });

  it('returns "Passkey" fallback when AAGUID is unknown and no alias', () => {
    expect(resolveCredentialName('cafebabe-0000-0000-0000-000000000000', null)).toBe('Passkey');
  });

  it('returns "Passkey" fallback when both AAGUID and alias are null', () => {
    expect(resolveCredentialName(null, null)).toBe('Passkey');
  });

  it('returns "Passkey" fallback when AAGUID is undefined and no alias', () => {
    expect(resolveCredentialName(undefined, undefined)).toBe('Passkey');
  });

  it('returns alias even when AAGUID is null', () => {
    expect(resolveCredentialName(null, 'Personal device')).toBe('Personal device');
  });
});
