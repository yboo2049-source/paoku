export interface TelemetryEvent {
  type: 'metric' | 'event';
  name: string;
  value?: number;
  data?: Record<string, any>;
  timestamp: number;
}

export function logMetric(name: string, value: number, data?: Record<string, any>) {
  const event: TelemetryEvent = {
    type: 'metric',
    name,
    value,
    data,
    timestamp: Date.now()
  };
  console.log(`[TELEMETRY] ${JSON.stringify(event)}`);
}

export function logEvent(name: string, data?: Record<string, any>) {
  const event: TelemetryEvent = {
    type: 'event',
    name,
    data,
    timestamp: Date.now()
  };
  console.log(`[TELEMETRY] ${JSON.stringify(event)}`);
}
