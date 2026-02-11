export type TelemetryEvent = 'register' | 'authenticate';

export type TelemetryPayload = {
  event: TelemetryEvent;
  latencyMs: number;
  ok: true;
};

export interface TelemetrySender {
  send(payload: TelemetryPayload): Promise<void>;
}

/**
 * Builds the minimal telemetry payload (no PII).
 */
export function buildTelemetryPayload(event: TelemetryEvent, latencyMs: number): TelemetryPayload {
  return { event, latencyMs, ok: true };
}
