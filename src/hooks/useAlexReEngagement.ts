/**
 * useAlexReEngagement — React hook wrapping AlexReEngagementControlEngine.
 * Provides reactive state for UI components.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  AlexReEngagementControlEngine,
  type ConversationActivityState,
  type ReEngagementMessage,
} from "@/engines/alexReEngagementEngine";

interface UseAlexReEngagementReturn {
  state: ConversationActivityState;
  reengagementCount: number;
  lastMessage: ReEngagementMessage | null;
  trackActivity: () => void;
  start: () => void;
  stop: () => void;
}

interface Options {
  onReEngage?: (msg: ReEngagementMessage) => void;
  onPassive?: () => void;
  autoStart?: boolean;
}

export function useAlexReEngagement(opts: Options = {}): UseAlexReEngagementReturn {
  const [state, setState] = useState<ConversationActivityState>("active");
  const [count, setCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<ReEngagementMessage | null>(null);
  const engineRef = useRef<AlexReEngagementControlEngine | null>(null);

  useEffect(() => {
    const engine = new AlexReEngagementControlEngine(
      (msg) => {
        setCount((c) => c + 1);
        setLastMessage(msg);
        opts.onReEngage?.(msg);
      },
      () => {
        setState("passive");
        opts.onPassive?.();
      }
    );
    engineRef.current = engine;

    if (opts.autoStart !== false) {
      engine.start();
    }

    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackActivity = useCallback(() => {
    engineRef.current?.trackActivity();
    setState("active");
    setCount(0);
    setLastMessage(null);
  }, []);

  const start = useCallback(() => {
    engineRef.current?.start();
    setState("active");
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setState("passive");
  }, []);

  return { state, reengagementCount: count, lastMessage, trackActivity, start, stop };
}
