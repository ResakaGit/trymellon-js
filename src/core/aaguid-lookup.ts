/**
 * AAGUID → human-readable device name lookup.
 *
 * Sourced from the FIDO Alliance Metadata Service (MDS).
 * The all-zeros UUID (`00000000-...`) indicates a privacy-preserving authenticator
 * (Apple passkeys, and others that do not disclose identity).
 *
 * To get the full list: https://mds.fidoalliance.org/
 */
const AAGUID_MAP: Readonly<Record<string, string>> = {
  // Privacy-preserving (Apple passkeys on iOS/macOS)
  '00000000-0000-0000-0000-000000000000': 'Passkey',

  // Apple
  'dd4ec289-e01d-41c9-bb89-70fa845d4bf2': 'iCloud Keychain',
  'adce0002-35bc-c60a-648b-0b25f1f05503': 'Chrome on macOS',

  // Google
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': 'Google Password Manager',
  '39a5647e-1853-446c-a1f6-a79bae9f5bc7': 'Google Titan Security Key v2',
  'b93fd961-f2e6-462f-b122-82002247de78': 'Android Fingerprint',

  // Windows Hello
  '08987058-cadc-4b81-b6e1-30de50dcbe96': 'Windows Hello',
  '6028b017-b1d4-4c02-b4b3-afcdafc96bb2': 'Windows Hello',
  '9ddd1817-af5a-4672-a2b9-3e3dd95000a9': 'Windows Hello',
  'd916fa33-1a2a-4020-9f66-79ba0818ac05': 'Windows Hello',

  // YubiKey
  '2fc0579f-8113-47ea-b116-bb5a8db9202a': 'YubiKey 5 NFC',
  'c1f9a0bc-1dd2-404a-b27f-8e29047a43fd': 'YubiKey 5 Nano',
  'ee882879-721c-4913-9775-3dfcce97072a': 'YubiKey 5 USB-A',
  'e1a96183-5016-4f24-b55b-e3ae23614cc6': 'YubiKey 5Ci',
  'd8522d9f-575b-4866-88a9-ba99fa02f35b': 'YubiKey Bio',
  'a4e9fc6d-4cbe-4758-b8ba-37598bb5bbaa': 'YubiKey 5C NFC',

  // Password managers
  'f3809540-7f14-49c1-a8b3-8f813b225541': 'Bitwarden',
  'fdb141b2-5d84-443e-8a35-4698c205a502': 'Dashlane',
  'bada5566-a7aa-401f-bd96-45619a55120d': '1Password',

  // Samsung
  '53414d53-554e-4700-0000-000000000000': 'Samsung Pass',
};

/**
 * Returns a human-readable device name for a given AAGUID, or `null` if unknown.
 *
 * @param aaguid - UUID string in standard format (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
 * @returns Device name, or `null` when the AAGUID is not in the lookup table
 *
 * @example
 * getDeviceName('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4') // → 'Google Password Manager'
 * getDeviceName('cafebabe-0000-0000-0000-000000000000') // → null
 */
export function getDeviceName(aaguid: string): string | null {
  return AAGUID_MAP[aaguid.toLowerCase()] ?? null;
}

/**
 * Resolves a human-readable name for a credential using priority order:
 * 1. User-set alias (if provided)
 * 2. Device name from AAGUID lookup
 * 3. 'Passkey' as fallback
 *
 * @example
 * resolveCredentialName('ea9b8d66-...', null)       // → 'Google Password Manager'
 * resolveCredentialName(null, 'My YubiKey')          // → 'My YubiKey'
 * resolveCredentialName('unknown-aaguid', null)      // → 'Passkey'
 */
export function resolveCredentialName(
  aaguid: string | null | undefined,
  alias: string | null | undefined
): string {
  if (alias) return alias;
  if (aaguid) return getDeviceName(aaguid) ?? 'Passkey';
  return 'Passkey';
}
