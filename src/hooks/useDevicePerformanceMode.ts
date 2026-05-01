/**
 * useDevicePerformanceMode — Detects low-power devices and exposes a flag.
 * Also toggles `<html class="low-power">` so CSS can disable heavy effects.
 */
import { useEffect, useState } from "react";

function detectLowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  const effective = conn?.effectiveType as string | undefined;
  if (effective === "2g" || effective === "slow-2g" || effective === "3g") return true;
  const mem = (navigator as any).deviceMemory as number | undefined;
  if (typeof mem === "number" && mem > 0 && mem < 4) return true;
  const cpu = navigator.hardwareConcurrency;
  if (typeof cpu === "number" && cpu > 0 && cpu < 4) return true;
  return false;
}

export function useDevicePerformanceMode(): { lowPower: boolean } {
  const [lowPower, setLowPower] = useState<boolean>(false);

  useEffect(() => {
    const v = detectLowPower();
    setLowPower(v);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("low-power", v);
    }
  }, []);

  return { lowPower };
}
