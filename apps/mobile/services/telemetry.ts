type TrackPayload = { event: string; properties?: Record<string, any> };

const PROVIDER = process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER || '';
const WRITE_KEY = process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY || '';

function enabled() {
  return Boolean(PROVIDER && WRITE_KEY);
}

export function track({ event, properties }: TrackPayload) {
  if (!enabled()) return;
  // Placeholder: integrate provider SDK here (Amplitude/Segment/etc.)
  // For now, log to console to verify calls in dev builds.
  // eslint-disable-next-line no-console
  console.log('[telemetry] track', event, properties);
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (!enabled()) return;
  // eslint-disable-next-line no-console
  console.log('[telemetry] identify', userId, traits);
}

export function screen(name: string, properties?: Record<string, any>) {
  if (!enabled()) return;
  // eslint-disable-next-line no-console
  console.log('[telemetry] screen', name, properties);
}

