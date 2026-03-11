import type { ApiClient } from './api';
import type { Result } from '../utils/result';
import { err } from '../utils/result';
import { createError, mapWebAuthnError } from '../errors';
import type { TryMellonError } from '../errors';
import type { OnboardingStartOptions, OnboardingCompleteResult } from '../types';
import { createRegistrationOptions } from './webauthn';
import { serializeCredentialForRegister } from './webauthn-utils';
import { validateCredentialStructure } from '../utils/validation';
import type { OnboardingRegisterResponseWithChallenge } from './validators';
import { waitWithAbort } from './polling-utils';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // ~2 minutes

export class OnboardingManager {
  constructor(private readonly apiClient: ApiClient) {}

  /**
   * Executes the full onboarding flow in a single call.
   * 1. Starts onboarding
   * 2. Polls for 'pending_passkey' or 'completed' status
   * 3. If pending_passkey: when API returns challenge, registers passkey (WebAuthn) then completes onboarding
   * 4. If pending_passkey but API does not return challenge: returns NOT_SUPPORTED with onboarding_url for user to complete elsewhere
   */
  async startFlow(
    options: OnboardingStartOptions & { company_name?: string },
    signal?: AbortSignal
  ): Promise<Result<OnboardingCompleteResult, TryMellonError>> {
    const startResult = await this.apiClient.startOnboarding({ user_role: options.user_role });
    if (!startResult.ok) return err(startResult.error);

    const { session_id } = startResult.value;

    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      if (signal?.aborted) {
        return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
      }

      const waitResult = await waitWithAbort(POLL_INTERVAL_MS, signal);
      if (waitResult === 'aborted') {
        return err(createError('ABORT_ERROR', 'Operation aborted by user or timeout'));
      }

      const statusResult = await this.apiClient.getOnboardingStatus(session_id);
      if (!statusResult.ok) return err(statusResult.error);

      const status = statusResult.value.status;
      const onboarding_url = statusResult.value.onboarding_url;

      if (status === 'pending_passkey') {
        const registerInfoResult = await this.apiClient.getOnboardingRegister(session_id);
        if (!registerInfoResult.ok) return err(registerInfoResult.error);

        const registerInfo = registerInfoResult.value as OnboardingRegisterResponseWithChallenge;

        if (!registerInfo.challenge) {
          return err(
            createError(
              'NOT_SUPPORTED',
              'Onboarding requires user action - complete passkey registration at the provided onboarding_url',
              { onboarding_url }
            )
          );
        }

        const creationOptionsResult = createRegistrationOptions(registerInfo.challenge);
        if (!creationOptionsResult.ok) return err(creationOptionsResult.error);

        let credential: Credential | null;
        try {
          credential = await navigator.credentials.create(creationOptionsResult.value);
        } catch (e) {
          return err(mapWebAuthnError(e));
        }

        try {
          validateCredentialStructure(credential, 'create');
        } catch (e) {
          return err(mapWebAuthnError(e));
        }

        let serializedCredential;
        try {
          serializedCredential = serializeCredentialForRegister(credential as PublicKeyCredential);
        } catch (e) {
          return err(mapWebAuthnError(e));
        }

        const registerPasskeyResult = await this.apiClient.registerOnboardingPasskey(session_id, {
          credential: serializedCredential,
          challenge: registerInfo.challenge.challenge,
        });
        if (!registerPasskeyResult.ok) return err(registerPasskeyResult.error);

        const completeResult = await this.apiClient.completeOnboarding(session_id, {
          company_name: options.company_name,
        });
        return completeResult;
      }

      if (status === 'completed') {
        const completeResult = await this.apiClient.completeOnboarding(session_id, {
          company_name: options.company_name,
        });
        return completeResult;
      }
    }

    return err(createError('TIMEOUT', 'Onboarding timed out'));
  }
}
