/**
 * UNPRO theme store — Light / Dark / Auto.
 *
 * Single source of truth for the visual mode. Applies the `dark` class on
 * <html>, keeps <meta name="theme-color"> in sync and persists the choice in
 * localStorage. No table, no migration.
 *
 * NOTE: the default mode is `dark` (cinematic premium). Only an explicit user
 * choice switches to `light` or `system` — existing surfaces keep rendering
 * exactly as before for everyone who never touches the switcher.
 */

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "unpro-theme";
export const DEFAULT_THEME_MODE: ThemeMode = "dark";

const THEME_COLOR: Record<ResolvedTheme, string> = {
  dark: "#050816",
  light: "#F7FAFF",
};

type Listener = (mode: ThemeMode, resolved: ResolvedTheme) => void;

const listeners = new Set<Listener>();
let mode: ThemeMode = DEFAULT_THEME_MODE;

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function prefersDark(): boolean {
  if (!isBrowser() || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(m: ThemeMode = mode): ResolvedTheme {
  if (m === "system") return prefersDark() ? "dark" : "light";
  return m;
}

function readStored(): ThemeMode {
  if (!isBrowser()) return DEFAULT_THEME_MODE;
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage blocked — fall back to default */
  }
  return DEFAULT_THEME_MODE;
}

function apply(resolved: ResolvedTheme) {
  if (!isBrowser()) return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLOR[resolved]);
}

function emit() {
  const resolved = resolveTheme();
  listeners.forEach((l) => l(mode, resolved));
}

/** Enable the 240ms cross-fade only after the first paint (no boot flash). */
function enableTransitions() {
  if (!isBrowser()) return;
  window.requestAnimationFrame(() => {
    document.documentElement.setAttribute("data-theme-ready", "true");
  });
}

let initialized = false;

export function initTheme() {
  if (!isBrowser() || initialized) return;
  initialized = true;
  mode = readStored();
  apply(resolveTheme());
  enableTransitions();

  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode === "system") {
        apply(resolveTheme());
        emit();
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
  }

  window.addEventListener("storage", (e) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    mode = readStored();
    apply(resolveTheme());
    emit();
  });
}

export function getThemeMode(): ThemeMode {
  if (!initialized) mode = readStored();
  return mode;
}

export function setThemeMode(next: ThemeMode) {
  mode = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }
  apply(resolveTheme());
  emit();
}

export function subscribeTheme(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
