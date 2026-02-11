export {
  validateRegisterStartResponse,
  validateAuthStartResponse,
  validateRegisterFinishResponse,
  validateAuthFinishResponse,
} from './register-auth';
export { validateSessionValidateResponse } from './session';
export { validateEmailVerifyResponse } from './email';
export {
  validateOnboardingStartResponse,
  validateOnboardingStatusResponse,
  validateOnboardingRegisterResponse,
  validateOnboardingRegisterPasskeyResponse,
  validateOnboardingCompleteResponse,
} from './onboarding';
export type { OnboardingRegisterResponseWithChallenge } from './onboarding';
