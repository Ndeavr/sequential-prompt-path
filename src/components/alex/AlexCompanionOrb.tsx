/**
 * AlexCompanionOrb — sticky morphing orb that follows the user across non-home routes.
 * Lazy-loads AlexAssistantSheet on first interaction.
 */
import { lazy, Suspense, useCallback, useState } from "react";
import AlexMorphingOrb from "@/components/alex/AlexMorphingOrb";

const AlexAssistantSheet = lazy(() => import("@/components/alex/AlexAssistantSheet"));

export default function AlexCompanionOrb() {
  const [open, setOpen] = useState(false);
  const onClick = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <div
        className="fixed right-4 z-50 bottom-24 md:bottom-5 md:right-5"
        data-testid="alex-companion-orb"
      >
        <AlexMorphingOrb size="sm" onClick={onClick} ariaLabel="Parler à Alex" />
      </div>
      <Suspense fallback={null}>
        {open && <AlexAssistantSheet open={open} onClose={onClose} />}
      </Suspense>
    </>
  );
}
