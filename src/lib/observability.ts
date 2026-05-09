/**
 * UNPRO — Observability (optional Sentry)
 * No-op unless VITE_SENTRY_DSN is set. Avoids hard dep on @sentry/react
 * by using a dynamic import — if the package isn't installed it silently
 * falls back to a console-only reporter.
 */

type ErrorReporter = {
  captureException: (err: unknown, ctx?: Record<string, any>) => void;
  captureMessage: (msg: string, ctx?: Record<string, any>) => void;
};

let reporter: ErrorReporter = {
  captureException: (err, ctx) => {
    if (import.meta.env.DEV) console.error("[obs] exception", err, ctx);
  },
  captureMessage: (msg, ctx) => {
    if (import.meta.env.DEV) console.warn("[obs] message", msg, ctx);
  },
};

export async function initObservability(): Promise<void> {
  const dsn = (import.meta.env as any).VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  try {
    // Dynamic import — only loaded if dep exists.
    const Sentry: any = await import(/* @vite-ignore */ "@sentry/react").catch(() => null);
    if (!Sentry) {
      console.warn("[obs] VITE_SENTRY_DSN set but @sentry/react not installed — skipping init.");
      return;
    }
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
    reporter = {
      captureException: (err, ctx) => Sentry.captureException(err, { extra: ctx }),
      captureMessage: (msg, ctx) => Sentry.captureMessage(msg, { extra: ctx }),
    };
    // Hook to global errors
    window.addEventListener("unhandledrejection", (e) => {
      Sentry.captureException(e.reason, { extra: { kind: "unhandledrejection" } });
    });
  } catch (e) {
    console.warn("[obs] init failed", e);
  }
}

export function captureException(err: unknown, ctx?: Record<string, any>) {
  reporter.captureException(err, ctx);
}

export function captureMessage(msg: string, ctx?: Record<string, any>) {
  reporter.captureMessage(msg, ctx);
}
