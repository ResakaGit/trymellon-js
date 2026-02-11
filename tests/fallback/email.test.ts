import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startEmailFallback, verifyEmailCode } from '../../src/fallback/email';
import { ApiClient } from '../../src/core/api';
import type { HttpClient } from '../../src/core/http-client';
import { ok, err } from '../../src/utils/result';
import { createError, createNetworkError } from '../../src/errors';

describe('startEmailFallback', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start email fallback successfully', async () => {
    mockHttpClient.post.mockResolvedValue(ok(undefined));
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await startEmailFallback('user_123', apiClient);

    expect(result.ok).toBe(true);
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/fallback/email/start'),
      { userId: 'user_123' },
      expect.any(Object)
    );
  });

  it('should return err when userId is empty', async () => {
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await startEmailFallback('', apiClient);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_ARGUMENT');
    }
  });

  it('should return err when userId is not a string', async () => {
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await startEmailFallback(null as unknown as string, apiClient);

    expect(result.ok).toBe(false);
  });

  it('should return err on API errors', async () => {
    mockHttpClient.post.mockResolvedValue(err(createError('NETWORK_FAILURE', 'Unreachable')));
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await startEmailFallback('user_123', apiClient);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
  });
});

describe('verifyEmailCode', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify email code successfully', async () => {
    mockHttpClient.post.mockResolvedValue(ok({ sessionToken: 'session_token_123' }));
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await verifyEmailCode('user_123', '123456', apiClient);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sessionToken).toBe('session_token_123');
    }
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/fallback/email/verify'),
      { userId: 'user_123', code: '123456' },
      expect.any(Object)
    );
  });

  it('should return err when userId is empty', async () => {
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await verifyEmailCode('', '123456', apiClient);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_ARGUMENT');
  });

  it('should return err when code is empty', async () => {
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await verifyEmailCode('user_123', '', apiClient);

    expect(result.ok).toBe(false);
  });

  it('should return err when API returns error', async () => {
    mockHttpClient.post.mockResolvedValue(err(createNetworkError()));
    const apiClient = new ApiClient(
      mockHttpClient as unknown as HttpClient,
      'https://api.example.com'
    );

    const result = await verifyEmailCode('user_123', '123456', apiClient);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NETWORK_FAILURE');
  });
});
