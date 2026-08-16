/**
 * useThemeToggle — reactive access to the UNPRO theme store.
 * API kept identical to the previous stub so no call site breaks.
 */
import { useCallback, useEffect, useState } from "react";
import {
  getThemeMode,
  initTheme,
  resolveTheme,
  setThemeMode,
  subscribeTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme/themeStore";

export function useThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => getThemeMode());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme());

  useEffect(() => {
    initTheme();
    setMode(getThemeMode());
    setResolved(resolveTheme());
    return subscribeTheme((m, r) => {
      setMode(m);
      setResolved(r);
    });
  }, []);

  const setTheme = useCallback((t: ThemeMode) => setThemeMode(t), []);
  const toggle = useCallback(() => {
    setThemeMode(resolveTheme() === "dark" ? "light" : "dark");
  }, []);

  return {
    /** Resolved theme actually painted. */
    theme: resolved,
    /** User selection, including "system". */
    mode,
    isDark: resolved === "dark",
    toggle,
    setTheme,
  };
}
