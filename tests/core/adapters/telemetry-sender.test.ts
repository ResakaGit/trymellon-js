import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDefaultTelemetrySender } from '../../../src/core/adapters/telemetry-sender';

describe('createDefaultTelemetrySender', () => {
  const endpoint = 'https://api.example.com/telemetry';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('send uses fetch when navigator.sendBeacon is not available', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    const origNav = global.navigator;
    (global as unknown as { navigator: unknown }).navigator = { sendBeacon: undefined };

    const sender = createDefaultTelemetrySender(endpoint);
    await sender.send({ event: 'register', latencyMs: 100, ok: true });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ event: 'register', latencyMs: 100, ok: true }),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      })
    );

    (global as unknown as { navigator: typeof origNav }).navigator = origNav;
  });

  it('send uses navigator.sendBeacon when available', async () => {
    const mockSendBeacon = vi.fn().mockReturnValue(true);
    const origNav = global.navigator;
    (global as unknown as { navigator: { sendBeacon: ReturnType<typeof vi.fn> } }).navigator = {
      ...origNav,
      sendBeacon: mockSendBeacon,
    };

    const sender = createDefaultTelemetrySender(endpoint);
    await sender.send({ event: 'authenticate', latencyMs: 200, ok: true });

    expect(mockSendBeacon).toHaveBeenCalledTimes(1);
    expect(mockSendBeacon).toHaveBeenCalledWith(
      endpoint,
      JSON.stringify({ event: 'authenticate', latencyMs: 200, ok: true })
    );

    (global as unknown as { navigator: typeof origNav }).navigator = origNav;
  });
});
