import { describe, it, expect } from 'vitest';
import { buildTelemetryPayload } from '../../src/core/ports/telemetry';

describe('buildTelemetryPayload', () => {
  it('should return payload with event, latencyMs and ok: true', () => {
    expect(buildTelemetryPayload('register', 100)).toEqual({
      event: 'register',
      latencyMs: 100,
      ok: true,
    });
    expect(buildTelemetryPayload('authenticate', 250)).toEqual({
      event: 'authenticate',
      latencyMs: 250,
      ok: true,
    });
  });
});
