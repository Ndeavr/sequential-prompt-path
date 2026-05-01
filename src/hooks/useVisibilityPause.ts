/**
 * useVisibilityPause — Returns whether the document is currently visible.
 * Used by motion components to pause heavy loops when tab is hidden.
 */
import { useEffect, useState } from "react";

export function useVisibilityPause(): { visible: boolean } {
  const [visible, setVisible] = useState<boolean>(
    typeof document === "undefined" ? true : !document.hidden,
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return { visible };
}
