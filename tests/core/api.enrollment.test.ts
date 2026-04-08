import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/core/api';
import type { HttpClient } from '../../src/core/http-client';
import { ok } from '../../src/utils/result';

describe('ApiClient enrollment', () => {
  const mockHttpClient = {
    get: vi.fn(),
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startEnrollment', () => {
    it('calls POST correct URL with body { ticket_id, context_hash }', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          session_id: 'sess_enroll_1',
          challenge: {
            rp: { name: 'R', id: 'r.com' },
            user: { id: 'dXNlcl8x', name: 'u', displayName: 'U' },
            challenge: 'Y2hhbGxlbmdl',
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          },
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const result = await client.startEnrollment('ticket_abc', 'a'.repeat(64));

      expect(result.ok).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/enrollment/register/options',
        { ticket_id: 'ticket_abc', context_hash: 'a'.repeat(64) },
        expect.any(Object)
      );
    });

    it('includes defaultHeaders (publishable key) when client built with defaultHeaders', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          session_id: 'sess_1',
          challenge: {
            rp: { name: 'R', id: 'r.com' },
            user: { id: 'dXNlcl8x', name: 'u', displayName: 'U' },
            challenge: 'Y2hh',
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          },
        })
      );

      const defaultHeaders = { 'X-Publishable-Key': 'pk_live_xxx' };
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com',
        defaultHeaders
      );
      await client.startEnrollment('ticket_1', 'b'.repeat(64));

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/enrollment/register/options',
        { ticket_id: 'ticket_1', context_hash: 'b'.repeat(64) },
        expect.objectContaining({ 'X-Publishable-Key': 'pk_live_xxx' })
      );
    });
  });

  describe('finishEnrollment', () => {
    it('calls POST correct URL with payload including credential and context_hash', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          credential_id: 'cred_1',
          user_id: 'user_uuid_1',
          session_token: 'session_tok_1',
        })
      );

      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com'
      );
      const body = {
        credential: {
          id: 'c1',
          rawId: 'r1',
          response: { clientDataJSON: 'cdj', attestationObject: 'ao' },
        },
        context_hash: 'c'.repeat(64),
      };
      const result = await client.finishEnrollment('ticket_xyz', body);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.session_token).toBe('session_tok_1');
      }
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/enrollment/register',
        { ...body, ticket_id: 'ticket_xyz' },
        expect.any(Object)
      );
    });

    it('includes defaultHeaders when client built with defaultHeaders', async () => {
      mockHttpClient.post.mockResolvedValue(
        ok({
          credential_id: 'c1',
          status: 'verified',
          session_token: 'st_1',
          user: { user_id: 'u1' },
        })
      );

      const defaultHeaders = { 'X-Publishable-Key': 'pk_live_yyy' };
      const client = new ApiClient(
        mockHttpClient as unknown as HttpClient,
        'https://api.example.com',
        defaultHeaders
      );
      await client.finishEnrollment('ticket_2', {
        credential: {},
        context_hash: 'd'.repeat(64),
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'https://api.example.com/v1/enrollment/register',
        expect.objectContaining({ ticket_id: 'ticket_2', context_hash: 'd'.repeat(64) }),
        expect.objectContaining({ 'X-Publishable-Key': 'pk_live_yyy' })
      );
    });
  });
});
