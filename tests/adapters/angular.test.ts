/**
 * Angular adapter integration test.
 * Excluded from default Vitest run (vitest.config.ts) due to Angular/ESM loading.
 * Loads adapter from dist via vitest.angular.config.ts alias; run after npm run build.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { TryMellonService, provideTryMellon } from '@trymellon/js/angular';
import { TryMellon } from '@trymellon/js';

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
});

describe('Angular adapter', () => {
  let client: TryMellon;

  beforeEach(() => {
    vi.clearAllMocks();
    const result = TryMellon.create({
      appId: 'app_test',
      publishableKey: 'key_test',
      apiBaseUrl: 'https://api.example.com',
    });
    if (!result.ok) throw new Error('expected ok');
    client = result.value;

    TestBed.configureTestingModule({
      providers: [provideTryMellon(client), TryMellonService],
    });
  });

  it('TryMellonService provides client that can be used', () => {
    const service = TestBed.inject(TryMellonService);
    expect(service).toBeDefined();
    expect(service.client).toBeDefined();
    expect(typeof service.client.signUp).toBe('function');
    expect(typeof service.client.signIn).toBe('function');
  });

  it('client.signUp can be called (integration)', async () => {
    const service = TestBed.inject(TryMellonService);
    const mockSignUp = vi.spyOn(service.client, 'signUp').mockResolvedValue({
      ok: true,
      value: {
        success: true,
        credential_id: 'c1',
        status: 'verified',
        session_token: 't1',
        user: { user_id: 'u1', external_user_id: 'user_123' },
      },
    } as never);

    const result = await service.client.signUp({ externalUserId: 'user_123' });

    expect(mockSignUp).toHaveBeenCalledWith({ externalUserId: 'user_123' });
    expect(result.ok).toBe(true);
  });
});
