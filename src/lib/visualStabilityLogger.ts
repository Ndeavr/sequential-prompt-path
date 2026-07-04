/**
 * visualStabilityLogger — client-side ring buffer for visual/render events.
 * Not exposed publicly. Read from /admin/site-health.
 */

export type VisualEventType =
  | "image_load_failed"
  | "empty_image_src"
  | "component_data_timeout"
  | "repeated_mount_detected"
  | "section_rendered_empty"
  | "console_error";

export interface VisualEvent {
  type: VisualEventType;
  at: number;
  payload: Record<string, unknown>;
}

const MAX_EVENTS = 200;
const MAX_ERRORS = 25;
const KEY = "__unpro_visual_stability_v1";

interface Store {
  events: VisualEvent[];
  errors: { at: number; message: string; source?: string }[];
  seenBrokenSrcs: Record<string, true>;
}

function readStore(): Store {
  if (typeof window === "undefined") return { events: [], errors: [], seenBrokenSrcs: {} };
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return { events: [], errors: [], seenBrokenSrcs: {} };
    return JSON.parse(raw) as Store;
  } catch {
    return { events: [], errors: [], seenBrokenSrcs: {} };
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota — ignore */
  }
}

export function logVisualEvent(type: VisualEventType, payload: Record<string, unknown> = {}) {
  const store = readStore();
  store.events.push({ type, at: Date.now(), payload });
  if (store.events.length > MAX_EVENTS) store.events.splice(0, store.events.length - MAX_EVENTS);
  writeStore(store);
}

export function markBrokenSrc(src: string): boolean {
  const store = readStore();
  if (store.seenBrokenSrcs[src]) return false;
  store.seenBrokenSrcs[src] = true;
  writeStore(store);
  return true;
}

export function getVisualStabilitySnapshot() {
  return readStore();
}

export function clearVisualStability() {
  writeStore({ events: [], errors: [], seenBrokenSrcs: {} });
}

let installed = false;
export function installConsoleErrorCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    try {
      const store = readStore();
      store.errors.push({
        at: Date.now(),
        message: args
          .map((a) => {
            if (a instanceof Error) return a.message;
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" ")
          .slice(0, 500),
      });
      if (store.errors.length > MAX_ERRORS) {
        store.errors.splice(0, store.errors.length - MAX_ERRORS);
      }
      writeStore(store);
    } catch {
      /* ignore */
    }
    originalError.apply(console, args as never);
  };

  window.addEventListener("error", (e) => {
    logVisualEvent("console_error", { message: e.message, source: e.filename });
  });
}
