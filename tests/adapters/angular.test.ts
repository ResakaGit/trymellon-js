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
import { TryMellonService, provideTryMellonConfig } from '@trymellon/js/angular';

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
});

describe('Angular adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideTryMellonConfig({
          appId: 'app_test',
          publishableKey: 'key_test',
          apiBaseUrl: 'https://api.example.com',
        }),
        TryMellonService,
      ],
    });
  });

  it('TryMellonService provides client that can be used', () => {
    const service = TestBed.inject(TryMellonService);
    expect(service).toBeDefined();
    expect(service.client).toBeDefined();
    expect(typeof service.client.register).toBe('function');
    expect(typeof service.client.authenticate).toBe('function');
  });

  it('client.register can be called (integration)', async () => {
    const service = TestBed.inject(TryMellonService);
    const mockRegister = vi.spyOn(service.client, 'register').mockResolvedValue({
      ok: true,
      value: {
        success: true,
        credential_id: 'c1',
        status: 'verified',
        session_token: 't1',
        user: { user_id: 'u1', external_user_id: 'user_123' },
      },
    } as never);

    const result = await service.client.register({ externalUserId: 'user_123' });

    expect(mockRegister).toHaveBeenCalledWith({ externalUserId: 'user_123' });
    expect(result.ok).toBe(true);
  });
});
