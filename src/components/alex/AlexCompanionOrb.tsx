/**
 * AlexCompanionOrb — 48px sticky orb that follows the user across non-home routes.
 * Morphs visually from the hero orb (same gradient + breathing aura).
 * Lazy-loads AlexAssistantSheet on first interaction.
 */
import { lazy, Suspense, useCallback, useState } from "react";
import { Mic } from "lucide-react";

const AlexAssistantSheet = lazy(() => import("@/components/alex/AlexAssistantSheet"));

export default function AlexCompanionOrb() {
  const [open, setOpen] = useState(false);

  const onClick = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label="Parler à Alex"
        data-testid="alex-companion-orb"
        className="fixed bottom-5 right-5 z-50 group focus:outline-none"
        style={{ width: 56, height: 56 }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background:
              "radial-gradient(circle, hsl(222 100% 60% / 0.35) 0%, transparent 70%)",
          }}
        />
        <span
          className="relative flex items-center justify-center rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
          style={{
            width: 48,
            height: 48,
            margin: 4,
            background:
              "linear-gradient(135deg, hsl(222 100% 45% / 0.95), hsl(222 100% 25% / 0.98))",
            border: "1.5px solid hsl(222 100% 70% / 0.32)",
            boxShadow:
              "0 0 30px -6px hsl(222 100% 65% / 0.55), inset 0 1px 1px hsl(0 0% 100% / 0.12)",
          }}
        >
          <Mic className="h-5 w-5 text-white/90" strokeWidth={1.6} />
        </span>
      </button>

      <Suspense fallback={null}>
        {open && <AlexAssistantSheet open={open} onClose={onClose} />}
      </Suspense>
    </>
  );
}
