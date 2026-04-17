import { describe, it, expect } from 'vitest';
import { mapBackendErrorCodeToTryMellon, type TryMellonErrorCode } from '../../src/errors';

/**
 * Contract test — ADR-SDK-004 §2.6.
 * Any backend code added without an SDK mapping must cause this test to fail
 * (UNKNOWN_ERROR leak) before it reaches users.
 */
describe('mapBackendErrorCodeToTryMellon — F1 identity + siwe contract', () => {
  const F1_MAPPING: ReadonlyArray<readonly [string, TryMellonErrorCode]> = [
    // Identity linking (F1.1 backend)
    ['identity_link_challenge_not_found', 'LINK_CHALLENGE_NOT_FOUND'],
    ['identity_link_otp_invalid', 'LINK_OTP_INVALID'],
    ['identity_link_otp_expired', 'LINK_OTP_EXPIRED'],
    ['identity_link_identifier_already_linked', 'IDENTIFIER_ALREADY_LINKED'],
    ['identity_link_identifier_not_owned_by_user', 'IDENTIFIER_NOT_OWNED'],
    ['identity_link_email_already_taken_in_tenant', 'EMAIL_ALREADY_TAKEN'],
    ['identity_link_unlink_last_identifier_denied', 'UNLINK_LAST_IDENTIFIER_DENIED'],
    ['identity_link_identifier_not_found', 'LINK_CHALLENGE_NOT_FOUND'],
    // SIWE (F1.2 backend)
    ['siwe_nonce_expired', 'SIWE_NONCE_EXPIRED'],
    ['siwe_nonce_already_used', 'SIWE_NONCE_REPLAY'],
    ['siwe_signature_invalid', 'SIWE_SIGNATURE_INVALID'],
    ['siwe_message_malformed', 'SIWE_MESSAGE_MALFORMED'],
    ['siwe_chain_not_allowed', 'SIWE_CHAIN_NOT_ALLOWED'],
    ['siwe_domain_mismatch', 'SIWE_DOMAIN_MISMATCH'],
    ['siwe_address_mismatch', 'SIWE_ADDRESS_MISMATCH'],
    // Anonymous recovery
    ['user_anonymous_recovery_not_available', 'ANONYMOUS_RECOVERY_NOT_AVAILABLE'],
  ];

  it.each(F1_MAPPING)(
    'Given backend code "%s", when mapped, then SDK code is "%s"',
    (backendCode, expected) => {
      expect(mapBackendErrorCodeToTryMellon(backendCode)).toBe(expected);
    }
  );

  it('Given backend code in UPPER case, when mapped, then normalization preserves the mapping', () => {
    expect(mapBackendErrorCodeToTryMellon('SIWE_SIGNATURE_INVALID')).toBe('SIWE_SIGNATURE_INVALID');
    expect(mapBackendErrorCodeToTryMellon('IDENTITY_LINK_OTP_INVALID')).toBe('LINK_OTP_INVALID');
  });

  it('Given unknown F1 code, when mapped, then returns UNKNOWN_ERROR (leak detector)', () => {
    expect(mapBackendErrorCodeToTryMellon('siwe_not_yet_added_to_mapper')).toBe('UNKNOWN_ERROR');
    expect(mapBackendErrorCodeToTryMellon('identity_link_something_new')).toBe('UNKNOWN_ERROR');
  });
});
