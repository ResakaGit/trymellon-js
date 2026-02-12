import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrossDeviceManager } from '../../src/core/cross-device-manager';
import type { ApiClient } from '../../src/core/api';
import { ok, err } from '../../src/utils/result';
import { createError } from '../../src/errors';

describe('CrossDeviceManager', () => {
  const mockApiClient = {
    initCrossDeviceAuth: vi.fn(),
    getCrossDeviceStatus: vi.fn(),
    getCrossDeviceContext: vi.fn(),
    verifyCrossDeviceAuth: vi.fn(),
  };

  let manager: CrossDeviceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new CrossDeviceManager(mockApiClient as unknown as ApiClient);
  });

  describe('init', () => {
    it('should delegate to apiClient.initCrossDeviceAuth and return result', async () => {
      mockApiClient.initCrossDeviceAuth.mockResolvedValue(
        ok({
          session_id: 'sess_cd_1',
          qr_url: 'https://example.com/qr',
          expires_at: '2026-02-12T12:00:00Z',
        })
      );
      const result = await manager.init();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_id).toBe('sess_cd_1');
        expect(result.value.qr_url).toBe('https://example.com/qr');
      }
      expect(mockApiClient.initCrossDeviceAuth).toHaveBeenCalledTimes(1);
    });

    it('should return err when apiClient.initCrossDeviceAuth fails', async () => {
      mockApiClient.initCrossDeviceAuth.mockResolvedValue(
        err(createError('NETWORK_FAILURE', 'API error'))
      );
      const result = await manager.init();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
    });
  });

  describe('waitForSession', () => {
    it('should return ok when status is completed on first poll', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({
          status: 'completed',
          session_token: 'st_1',
          user_id: 'user_1',
        })
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_token).toBe('st_1');
        expect(result.value.user_id).toBe('user_1');
      }
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledWith('sess_1');
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledTimes(1);
    });

    it('should return err when status is completed but session_token is missing', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({
          status: 'completed',
          user_id: 'user_1',
          session_token: undefined,
        })
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.message).toContain('Missing data');
    });

    it('should return err when status is completed but user_id is missing', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        ok({
          status: 'completed',
          session_token: 'st_1',
          user_id: undefined,
        })
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(false);
    });

    it('should return err when getCrossDeviceStatus fails', async () => {
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(
        err(createError('NETWORK_FAILURE', 'fail'))
      );
      const result = await manager.waitForSession('sess_1');
      expect(result.ok).toBe(false);
    });

    it('should return err when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const result = await manager.waitForSession('sess_1', controller.signal);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('ABORT_ERROR');
      expect(mockApiClient.getCrossDeviceStatus).not.toHaveBeenCalled();
    });

    it('should poll until completed then return ok', async () => {
      mockApiClient.getCrossDeviceStatus
        .mockResolvedValueOnce(ok({ status: 'pending' }))
        .mockResolvedValueOnce(ok({ status: 'pending' }))
        .mockResolvedValueOnce(
          ok({ status: 'completed', session_token: 'st_2', user_id: 'user_2' })
        );
      const result = await manager.waitForSession('sess_2');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_token).toBe('st_2');
        expect(result.value.user_id).toBe('user_2');
      }
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalledTimes(3);
    });

    it('should return TIMEOUT when status never becomes completed', async () => {
      vi.useFakeTimers();
      mockApiClient.getCrossDeviceStatus.mockResolvedValue(ok({ status: 'pending' }));
      const resultPromise = manager.waitForSession('sess_3');
      await vi.advanceTimersByTimeAsync(2000 * 61);
      const result = await resultPromise;
      vi.useRealTimers();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('TIMEOUT');
      expect(mockApiClient.getCrossDeviceStatus).toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    const validContextOptions = {
      challenge: 'Y2hhbGxlbmdl',
      rpId: 'example.com',
      userVerification: 'preferred' as const,
    };

    it('should get context, trigger credentials.get, and verify', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(ok({ options: validContextOptions }));
      mockApiClient.verifyCrossDeviceAuth.mockResolvedValue(ok(undefined));
      const result = await manager.approve('sess_approve');
      expect(result.ok).toBe(true);
      expect(mockApiClient.getCrossDeviceContext).toHaveBeenCalledWith('sess_approve');
      expect(mockApiClient.verifyCrossDeviceAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'sess_approve',
          credential: expect.objectContaining({
            type: 'public-key',
            id: expect.any(String),
            rawId: expect.any(String),
            response: expect.objectContaining({
              clientDataJSON: expect.any(String),
              authenticatorData: expect.any(String),
              signature: expect.any(String),
            }),
          }),
        })
      );
    });

    it('should return err when getCrossDeviceContext fails', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(
        err(createError('NETWORK_FAILURE', 'fail'))
      );
      const result = await manager.approve('sess_fail');
      expect(result.ok).toBe(false);
      expect(mockApiClient.verifyCrossDeviceAuth).not.toHaveBeenCalled();
    });

    it('should return err when verifyCrossDeviceAuth fails', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(ok({ options: validContextOptions }));
      mockApiClient.verifyCrossDeviceAuth.mockResolvedValue(
        err(createError('SESSION_EXPIRED', 'Session expired'))
      );
      const result = await manager.approve('sess_verify_fail');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('SESSION_EXPIRED');
    });

    it('should return err when createAuthenticationOptions fails (invalid options)', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(
        ok({ options: { challenge: '', rpId: 'x.com' } })
      );
      const result = await manager.approve('sess_bad_options');
      expect(result.ok).toBe(false);
      expect(mockApiClient.verifyCrossDeviceAuth).not.toHaveBeenCalled();
    });

    it('should return err when navigator.credentials.get throws', async () => {
      mockApiClient.getCrossDeviceContext.mockResolvedValue(ok({ options: validContextOptions }));
      const originalGet = navigator.credentials.get;
      navigator.credentials.get = vi
        .fn()
        .mockRejectedValue(new DOMException('User cancelled', 'NotAllowedError'));
      try {
        const result = await manager.approve('sess_cred_fail');
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe('USER_CANCELLED');
        expect(mockApiClient.verifyCrossDeviceAuth).not.toHaveBeenCalled();
      } finally {
        navigator.credentials.get = originalGet;
      }
    });
  });
});
