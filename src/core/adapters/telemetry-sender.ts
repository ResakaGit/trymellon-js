import type { TelemetrySender, TelemetryPayload } from '../ports/telemetry';

/**
 * Default telemetry sender: sends payload via sendBeacon (or fetch) to the given endpoint.
 * No retries; fire-and-forget.
 */
export function createDefaultTelemetrySender(endpoint: string): TelemetrySender {
  return {
    async send(payload: TelemetryPayload): Promise<void> {
      const body = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(endpoint, body);
        return;
      }
      if (typeof fetch !== 'undefined') {
        await fetch(endpoint, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        });
      }
    },
  };
}
