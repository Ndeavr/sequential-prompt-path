/**
 * GuardrailAlexNoLoopReplay — Prevents Alex from replaying prompts or looping.
 *
 * Blocks children when paused or currently pausing — no re-triggering allowed.
 */
import type { AlexSilenceStatus } from "@/hooks/useAlexSilenceControl";
import type { ReactNode } from "react";

interface Props {
  status: AlexSilenceStatus;
  children: ReactNode;
  fallback?: ReactNode;
}

const BLOCKED_STATES: AlexSilenceStatus[] = ["pausing", "paused"];

export default function GuardrailAlexNoLoopReplay({ status, children, fallback = null }: Props) {
  if (BLOCKED_STATES.includes(status)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
