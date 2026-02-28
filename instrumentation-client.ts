// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

function getSampleRate(envKey: string, fallback: number) {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Keep defaults low in production; override via env vars when needed.
  tracesSampleRate: getSampleRate("SENTRY_TRACES_SAMPLE_RATE", isProd ? 0.1 : 1),
  enableLogs: !isProd,

  replaysSessionSampleRate: getSampleRate(
    "SENTRY_REPLAYS_SESSION_SAMPLE_RATE",
    isProd ? 0.01 : 0.1
  ),

  replaysOnErrorSampleRate: getSampleRate(
    "SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE",
    1
  ),

  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
