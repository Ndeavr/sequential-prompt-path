// PROTECTED FILE — ALEX VOICE CORE
// Do not modify unless task explicitly says VOICE.
// Any change requires voice_smoke_test passing before deploy.
/**
 * AlexOrb — wrapper mapping zustand alex store mode → AlexMorphingOrb state.
 */
import AlexMorphingOrb, {
  type AlexOrbStateV2,
  type AlexOrbSize,
} from "@/components/alex/AlexMorphingOrb";
import { useAlexStore } from "./state/alexStore";

interface AlexOrbProps {
  onTap?: () => void;
  size?: AlexOrbSize;
}

export function AlexOrb({ onTap, size = "md" }: AlexOrbProps) {
  const mode = useAlexStore((s) => s.mode);

  const state: AlexOrbStateV2 =
    mode === "speaking"
      ? "speaking"
      : mode === "listening"
      ? "listening"
      : mode === "thinking" ||
        mode === "connecting_voice" ||
        mode === "analyzing_image" ||
        mode === "waiting_for_reply"
      ? "thinking"
      : mode === "error"
      ? "error"
      : "idle";

  return <AlexMorphingOrb state={state} size={size} onClick={onTap} ariaLabel="Alex" />;
}