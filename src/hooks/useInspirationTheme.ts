/**
 * useInspirationTheme — Delegates to the global theme toggle.
 */
import { useThemeToggle } from "@/hooks/useThemeToggle";

export function useInspirationTheme() {
  const { isDark, setTheme } = useThemeToggle();
  return {
    isDark,
    setIsDark: (dark: boolean) => setTheme(dark ? "dark" : "light"),
  };
}
