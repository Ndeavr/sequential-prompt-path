/**
 * useThemeToggle — Global light/dark theme management for UNPRO.
 * Applies .light class to document root when light mode is active.
 * Persists preference in localStorage.
 */
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "unpro-theme";

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return "light";
  return "dark";
}

export function useThemeToggle() {
  const [theme, setThemeState] = useState<"dark" | "light">(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
  }, []);

  return { theme, isDark: theme === "dark", toggle, setTheme };
}
