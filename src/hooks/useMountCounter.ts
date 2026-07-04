import { useEffect } from "react";
import { logVisualEvent } from "@/lib/visualStabilityLogger";

const counts = new Map<string, number>();

/**
 * useMountCounter — opt-in mount counter. Logs when the same component name
 * mounts more than `threshold` times in a session (typical remount thrash).
 */
export function useMountCounter(name: string, threshold = 3) {
  useEffect(() => {
    const next = (counts.get(name) ?? 0) + 1;
    counts.set(name, next);
    if (next === threshold + 1) {
      logVisualEvent("repeated_mount_detected", { component: name, count: next });
    }
  }, [name, threshold]);
}
