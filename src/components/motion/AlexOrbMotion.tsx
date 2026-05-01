/**
 * AlexOrbMotion — Wrapper around the existing premium AlexOrb that
 * adds sound effects on state transitions and exposes the new "routing" state.
 *
 * Kept thin: AlexOrb does all visual work; this layer is sound + lifecycle.
 */
import { useEffect, useRef } from "react";
import AlexOrb, { type AlexOrbProps, type AlexOrbState } from "@/components/alex/AlexOrb";
import { useUnproSound } from "@/hooks/useUnproSound";

export type AlexOrbMotionState = AlexOrbState | "routing";

interface Props extends Omit<AlexOrbProps, "state"> {
  state?: AlexOrbMotionState;
}

export default function AlexOrbMotion({ state = "idle", ...rest }: Props) {
  const prev = useRef<AlexOrbMotionState>(state);
  const sounds = useUnproSound();

  useEffect(() => {
    if (state === prev.current) return;
    switch (state) {
      case "listening":
        sounds.alexListening();
        break;
      case "thinking":
        sounds.alexThinking();
        break;
      case "success":
        sounds.matchSuccess();
        break;
      case "error":
        sounds.errorSoft();
        break;
      case "routing":
        sounds.scanStart();
        break;
    }
    prev.current = state;
  }, [state, sounds]);

  // AlexOrb already supports "routing" after our extension; cast safely
  return <AlexOrb state={state as AlexOrbState} {...rest} />;
}
