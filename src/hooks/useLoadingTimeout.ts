/**
 * useLoadingTimeout — flips to true after `ms` once `loading` is true.
 * Used by guards/screens to break "infinite Chargement…" states.
 */
import { useEffect, useState } from "react";
import { logBoot } from "@/lib/bootDebug";

export function useLoadingTimeout(loading: boolean, ms = 6000, tag = "loading"): boolean {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading) {
      if (timedOut) setTimedOut(false);
      return;
    }
    const t = setTimeout(() => {
      setTimedOut(true);
      logBoot(`LOADING_TIMEOUT:${tag}`, { ms });
    }, ms);
    return () => clearTimeout(t);
  }, [loading, ms, tag, timedOut]);
  return timedOut;
}
