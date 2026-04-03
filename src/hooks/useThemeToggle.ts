/**
 * useThemeToggle — Dark-only mode for UNPRO.
 * Forces dark theme. Toggle removed from UI.
 * Structure kept for future extension.
 */
import { useCallback } from "react";

export function useThemeToggle() {
  // Force dark — remove .light class if present
  if (typeof window !== "undefined") {
    document.documentElement.classList.remove("light");
  }

  const toggle = useCallback(() => {}, []);
  const setTheme = useCallback((_t: "dark" | "light") => {}, []);

  return { theme: "dark" as const, isDark: true, toggle, setTheme };
}
