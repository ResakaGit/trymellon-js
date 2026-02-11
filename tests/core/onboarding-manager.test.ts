import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OnboardingManager } from '../../src/core/onboarding-manager';
import type { ApiClient } from '../../src/core/api';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';

describe('OnboardingManager', () => {
  let mockApiClient: {
    startOnboarding: ReturnType<typeof vi.fn>;
    getOnboardingStatus: ReturnType<typeof vi.fn>;
    getOnboardingRegister: ReturnType<typeof vi.fn>;
    registerOnboardingPasskey: ReturnType<typeof vi.fn>;
    completeOnboarding: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApiClient = {
      startOnboarding: vi.fn(),
      getOnboardingStatus: vi.fn(),
      getOnboardingRegister: vi.fn(),
      registerOnboardingPasskey: vi.fn(),
      completeOnboarding: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return NOT_SUPPORTED with onboarding_url when API does not return challenge', async () => {
    mockApiClient.startOnboarding.mockResolvedValue(
      ok({ session_id: 's1', onboarding_url: 'https://go.example.com/onboard', expires_in: 3600 })
    );
    mockApiClient.getOnboardingStatus.mockResolvedValueOnce(
      ok({
        status: 'pending_passkey',
        onboarding_url: 'https://go.example.com/onboard',
        expires_in: 3600,
      })
    );
    mockApiClient.getOnboardingRegister.mockResolvedValue(
      ok({
        session_id: 's1',
        status: 'pending_passkey',
        onboarding_url: 'https://go.example.com/onboard',
      })
    );

    const manager = new OnboardingManager(mockApiClient as unknown as ApiClient);
    const result = await manager.startFlow({ user_role: 'maintainer' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_SUPPORTED');
      expect(result.error.message).toContain('onboarding_url');
      expect((result.error.details as { onboarding_url?: string })?.onboarding_url).toBe(
        'https://go.example.com/onboard'
      );
    }
    expect(mockApiClient.getOnboardingRegister).toHaveBeenCalledWith('s1');
    expect(mockApiClient.registerOnboardingPasskey).not.toHaveBeenCalled();
  });

  it('should complete flow when API returns challenge and navigator.credentials.create succeeds', async () => {
    const challenge = {
      rp: { name: 'R', id: 'r.com' },
      user: { id: 'dXNlcl8x', name: 'n', displayName: 'D' },
      challenge: 'Y2hhbGxlbmdl',
      pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
    };

    mockApiClient.startOnboarding.mockResolvedValue(
      ok({ session_id: 's1', onboarding_url: 'https://go.example.com', expires_in: 3600 })
    );
    mockApiClient.getOnboardingStatus.mockResolvedValue(
      ok({
        status: 'pending_passkey',
        onboarding_url: 'https://go.example.com',
        expires_in: 3600,
      })
    );
    mockApiClient.getOnboardingRegister.mockResolvedValue(
      ok({
        session_id: 's1',
        status: 'pending_passkey',
        onboarding_url: 'https://go.example.com',
        challenge,
      })
    );

    const mockCredential = {
      id: 'cred_1',
      rawId: new ArrayBuffer(8),
      type: 'public-key' as const,
      response: {
        clientDataJSON: new ArrayBuffer(8),
        attestationObject: new ArrayBuffer(8),
      },
    };
    vi.stubGlobal('navigator', {
      credentials: {
        create: vi.fn().mockResolvedValue(mockCredential),
      },
    });

    mockApiClient.registerOnboardingPasskey.mockResolvedValue(
      ok({ session_id: 's1', status: 'pending_data', user_id: 'u1', tenant_id: 't1' })
    );
    mockApiClient.completeOnboarding.mockResolvedValue(
      ok({
        session_id: 's1',
        status: 'completed',
        user_id: 'u1',
        tenant_id: 't1',
        session_token: 'tok_1',
      })
    );

    const manager = new OnboardingManager(mockApiClient as unknown as ApiClient);
    const result = await manager.startFlow({ user_role: 'maintainer' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_token).toBe('tok_1');
      expect(result.value.status).toBe('completed');
    }
    expect(mockApiClient.registerOnboardingPasskey).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({
        challenge: 'Y2hhbGxlbmdl',
        credential: expect.any(Object),
      })
    );
    expect(mockApiClient.completeOnboarding).toHaveBeenCalledWith('s1', {
      company_name: undefined,
    });
  });

  it('should return error when startOnboarding fails', async () => {
    mockApiClient.startOnboarding.mockResolvedValue(
      err(createError('NETWORK_FAILURE', 'API unreachable'))
    );

    const manager = new OnboardingManager(mockApiClient as unknown as ApiClient);
    const result = await manager.startFlow({ user_role: 'app_user' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
    expect(mockApiClient.getOnboardingStatus).not.toHaveBeenCalled();
  });

  it('should return error when getOnboardingStatus fails during poll', async () => {
    mockApiClient.startOnboarding.mockResolvedValue(
      ok({ session_id: 's1', onboarding_url: 'https://x.com', expires_in: 3600 })
    );
    mockApiClient.getOnboardingStatus.mockResolvedValue(
      err(createError('NETWORK_FAILURE', 'Poll failed'))
    );

    const manager = new OnboardingManager(mockApiClient as unknown as ApiClient);
    const result = await manager.startFlow({ user_role: 'maintainer' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
  });

  it('should return completed result when status is already completed on first poll', async () => {
    mockApiClient.startOnboarding.mockResolvedValue(
      ok({ session_id: 's1', onboarding_url: 'https://x.com', expires_in: 3600 })
    );
    mockApiClient.getOnboardingStatus.mockResolvedValue(
      ok({
        status: 'completed',
        onboarding_url: 'https://x.com',
        expires_in: 3600,
      })
    );
    mockApiClient.completeOnboarding.mockResolvedValue(
      ok({
        session_id: 's1',
        status: 'completed',
        user_id: 'u1',
        tenant_id: 't1',
        session_token: 'tok_final',
      })
    );

    const manager = new OnboardingManager(mockApiClient as unknown as ApiClient);
    const result = await manager.startFlow({ user_role: 'maintainer', company_name: 'Acme' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.session_token).toBe('tok_final');
    }
    expect(mockApiClient.completeOnboarding).toHaveBeenCalledWith('s1', { company_name: 'Acme' });
  });
});
