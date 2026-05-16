/**
 * AlexCameraInvitePill — Inline contextual invitation to enable the camera.
 *
 * Rendered inside the chat only when Alex detects a visual-diagnostic keyword
 * (e.g. moisi, fissure, infiltration, toit, dégât). Never shown on page load.
 * Routes through `permissionManager` so denials respect the 7d cooldown.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  request as requestPermission,
  isInCooldown,
  PERMISSION_COPY,
} from "@/lib/permissionManager";

interface Props {
  /** Called when the user grants the camera permission. */
  onGranted?: (stream: MediaStream) => void;
  /** Called when the user dismisses or denies. */
  onDismiss?: () => void;
}

const VISUAL_KEYWORDS = [
  "moisi", "moisissure", "fissure", "infiltration", "toit", "toiture",
  "dégât", "dommage", "eau", "fuite", "tache", "mur", "plafond",
];

/** Helper to test whether a transcript should surface the pill. */
export function shouldOfferCamera(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return VISUAL_KEYWORDS.some((k) => lower.includes(k));
}

export default function AlexCameraInvitePill({ onGranted, onDismiss }: Props) {
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  if (hidden || isInCooldown("camera")) return null;

  const handleEnable = async () => {
    setBusy(true);
    const status = await requestPermission("camera");
    setBusy(false);
    if (status === "granted") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        onGranted?.(stream);
      } catch {/* swallow */}
      setHidden(true);
    } else {
      setHidden(true);
      onDismiss?.();
    }
  };

  const handleDismiss = () => {
    setHidden(true);
    onDismiss?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mx-auto my-2 flex w-full max-w-sm items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 backdrop-blur-sm"
    >
      <Camera className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-xs text-foreground/90">{PERMISSION_COPY.camera}</span>
      <Button size="sm" className="h-7 px-3 text-xs" onClick={handleEnable} disabled={busy}>
        Activer
      </Button>
      <button
        type="button"
        aria-label="Ignorer"
        onClick={handleDismiss}
        className="rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
