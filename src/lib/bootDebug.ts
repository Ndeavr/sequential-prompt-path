/**
 * Boot diagnostics — global tracer for app/Alex stuck-loading triage.
 * Exposes window.__UNPRO_DEBUG and logBoot(step, data?).
 */

export interface BootStep {
  step: string;
  data?: any;
  time: string;
  elapsed: number;
}

export interface BootDebug {
  bootSteps: BootStep[];
  errors: any[];
  lastStep: string | null;
  startedAt: number;
}

declare global {
  interface Window {
    __UNPRO_DEBUG: BootDebug;
  }
}

if (typeof window !== "undefined" && !window.__UNPRO_DEBUG) {
  window.__UNPRO_DEBUG = {
    bootSteps: [],
    errors: [],
    lastStep: null,
    startedAt: Date.now(),
  };
}

export function logBoot(step: string, data: any = {}): void {
  if (typeof window === "undefined") return;
  const dbg = window.__UNPRO_DEBUG;
  if (!dbg) return;
  const entry: BootStep = {
    step,
    data,
    time: new Date().toISOString(),
    elapsed: Date.now() - dbg.startedAt,
  };
  dbg.bootSteps.push(entry);
  if (dbg.bootSteps.length > 300) dbg.bootSteps.shift();
  dbg.lastStep = step;
  // eslint-disable-next-line no-console
  console.log(`[UNPRO_BOOT] ${step}`, data);
}

export function logBootError(step: string, err: any): void {
  if (typeof window === "undefined") return;
  const dbg = window.__UNPRO_DEBUG;
  if (!dbg) return;
  dbg.errors.push({ step, err: String(err), time: new Date().toISOString() });
  logBoot(step, { error: String(err) });
}

/** Promise.race helper with a configurable timeout. Accepts thenables. */
export function withTimeout<T>(
  p: PromiseLike<T>,
  ms: number,
  tag: string,
): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout:${tag}:${ms}ms`)), ms),
    ),
  ]);
}
