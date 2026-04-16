/**
 * LoggerAlexSilenceEvents — Passive component that logs silence state changes.
 * Renders nothing. Purely observational.
 */
import { useEffect, useRef } from "react";
import type { AlexSilenceStatus } from "@/hooks/useAlexSilenceControl";

interface Props {
  status: AlexSilenceStatus;
  silenceCycle: number;
  sessionId?: string | null;
}

export default function LoggerAlexSilenceEvents({ status, silenceCycle, sessionId }: Props) {
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== status) {
      console.log(
        `[AlexSilence] ${prevStatus.current} → ${status} | cycle=${silenceCycle} | session=${sessionId || "n/a"}`
      );
      prevStatus.current = status;
    }
  }, [status, silenceCycle, sessionId]);

  return null;
}
