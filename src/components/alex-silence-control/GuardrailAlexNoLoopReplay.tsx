/**
 * GuardrailAlexNoLoopReplay — Prevents Alex from replaying prompts or looping.
 *
 * This is a pure logic guard — wraps children only if conditions allow.
 * If paused or already prompted, blocks children from re-triggering.
 */
import type { AlexSilenceStatus } from "@/hooks/useAlexSilenceControl";
import type { ReactNode } from "react";

interface Props {
  status: AlexSilenceStatus;
  children: ReactNode;
  /** What to show when blocked */
  fallback?: ReactNode;
}

const BLOCKED_STATES: AlexSilenceStatus[] = ["pausing", "paused"];

export default function GuardrailAlexNoLoopReplay({ status, children, fallback = null }: Props) {
  if (BLOCKED_STATES.includes(status)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
