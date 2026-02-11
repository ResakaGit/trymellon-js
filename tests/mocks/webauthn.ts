export type WebAuthnMockConfig = {
  shouldSucceed?: boolean;
  shouldTimeout?: boolean;
  shouldCancel?: boolean;
  delay?: number;
  authenticatorType?: 'platform' | 'cross-platform';
  credentialId?: string;
};

export function createWebAuthnMock(config: WebAuthnMockConfig = {}) {
  const {
    shouldSucceed = true,
    shouldTimeout = false,
    shouldCancel = false,
    delay = 0,
    authenticatorType = 'platform',
    credentialId = 'mock_credential_id',
  } = config;

  const createMockCredential = (): PublicKeyCredential => {
    const rawId = new ArrayBuffer(8);
    const clientDataJSON = new ArrayBuffer(8);
    const authenticatorData = new ArrayBuffer(8);
    const signature = new ArrayBuffer(8);
    const attestationObject = new ArrayBuffer(8);

    return {
      id: credentialId,
      rawId,
      response: {
        clientDataJSON,
        ...(shouldSucceed && {
          attestationObject,
          authenticatorData,
          signature,
        }),
      } as AuthenticatorAttestationResponse | AuthenticatorAssertionResponse,
      type: 'public-key',
      getClientExtensionResults: () => ({}),
    } as PublicKeyCredential;
  };

  const createMockAssertionCredential = (): PublicKeyCredential => {
    const rawId = new ArrayBuffer(8);
    const clientDataJSON = new ArrayBuffer(8);
    const authenticatorData = new ArrayBuffer(8);
    const signature = new ArrayBuffer(8);

    return {
      id: credentialId,
      rawId,
      response: {
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle: new ArrayBuffer(8),
      } as AuthenticatorAssertionResponse,
      type: 'public-key',
      getClientExtensionResults: () => ({}),
    } as PublicKeyCredential;
  };

  const mockCreate = async (_options: CredentialCreationOptions): Promise<PublicKeyCredential> => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (shouldTimeout) {
      throw new DOMException('Operation timed out', 'TimeoutError');
    }

    if (shouldCancel) {
      throw new DOMException('User cancelled', 'NotAllowedError');
    }

    if (!shouldSucceed) {
      throw new DOMException('Operation failed', 'UnknownError');
    }

    return createMockCredential();
  };

  const mockGet = async (_options: CredentialRequestOptions): Promise<PublicKeyCredential> => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (shouldTimeout) {
      throw new DOMException('Operation timed out', 'TimeoutError');
    }

    if (shouldCancel) {
      throw new DOMException('User cancelled', 'NotAllowedError');
    }

    if (!shouldSucceed) {
      throw new DOMException('Operation failed', 'UnknownError');
    }

    return createMockAssertionCredential();
  };

  const mockIsUserVerifyingPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
    return authenticatorType === 'platform';
  };

  const mockIsConditionalMediationAvailable = async (): Promise<boolean> => {
    return true;
  };

  const PublicKeyCredentialMock = class {
    static isUserVerifyingPlatformAuthenticatorAvailable =
      mockIsUserVerifyingPlatformAuthenticatorAvailable;
    static isConditionalMediationAvailable = mockIsConditionalMediationAvailable;
  } as unknown as typeof PublicKeyCredential;

  const navigatorMock = {
    credentials: {
      create: mockCreate,
      get: mockGet,
    },
  } as unknown as Navigator;

  return {
    PublicKeyCredential: PublicKeyCredentialMock,
    navigator: navigatorMock,
  };
}

export function setupWebAuthnMock(
  config: WebAuthnMockConfig = {},
  globalScope: typeof globalThis = globalThis
): () => void {
  const mock = createWebAuthnMock(config);

  const originalNavigator = globalScope.navigator;
  const originalPublicKeyCredential = globalScope.PublicKeyCredential;

  globalScope.navigator = mock.navigator;
  globalScope.PublicKeyCredential = mock.PublicKeyCredential;

  return () => {
    globalScope.navigator = originalNavigator;
    globalScope.PublicKeyCredential = originalPublicKeyCredential;
  };
}
