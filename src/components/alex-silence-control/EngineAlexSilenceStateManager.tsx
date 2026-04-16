/**
 * EngineAlexSilenceStateManager — Single compassionate prompt, then full stop.
 *
 * RULES:
 * - 1 presence prompt max per cycle
 * - NO final phrase
 * - Full stop immediately after single prompt
 * - Resume only on orb click
 */
import { type ReactNode } from "react";
import { useAlexSilenceControl, type AlexSilenceStatus, type AlexSilenceSnapshot } from "@/hooks/useAlexSilenceControl";

interface Props {
  language?: "fr" | "en";
  sessionId?: string | null;
  onPresencePrompt?: (text: string) => void;
  onPause?: () => void;
  onResume?: (snapshot: AlexSilenceSnapshot | null) => void;
  children: (controls: {
    status: AlexSilenceStatus;
    silenceCycle: number;
    recordActivity: () => void;
    persistSnapshot: (snap: AlexSilenceSnapshot) => void;
    resumeFromOrb: () => void;
    startMonitoring: () => void;
    forceClose: () => void;
    isPaused: boolean;
    isIdle: boolean;
  }) => ReactNode;
}

export default function EngineAlexSilenceStateManager({
  language = "fr",
  sessionId,
  onPresencePrompt,
  onPause,
  onResume,
  children,
}: Props) {
  const control = useAlexSilenceControl({
    language,
    sessionId,
    onPresencePrompt,
    onPause,
    onResume,
  });

  return <>{children(control)}</>;
}
