/**
 * useInspirationTheme — Manages the local light/dark theme for the Inspirations module.
 * Applies .light class to the document element when light mode is active, removes it otherwise.
 */
import { useState, useEffect } from "react";

export function useInspirationTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("unpro-inspirations-theme") !== "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("light");
      localStorage.setItem("unpro-inspirations-theme", "dark");
    } else {
      root.classList.add("light");
      localStorage.setItem("unpro-inspirations-theme", "light");
    }
    return () => {
      // Restore dark on unmount (default theme is dark)
      root.classList.remove("light");
    };
  }, [isDark]);

  return { isDark, setIsDark };
}
