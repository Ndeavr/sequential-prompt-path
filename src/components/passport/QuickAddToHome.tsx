/**
 * UNPRO — « + Ajouter à ma maison »
 * Persistent mobile-first quick action for the Passeport Maison.
 * Reuses the existing dialogs (documents + events) — no new upload system.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PASSPORT_QUICK_ADD } from "@/lib/copy/passportPositioning";
import AddDocumentDialog from "./AddDocumentDialog";
import AddEventDialog from "./AddEventDialog";
import {
  Plus, Receipt, Camera, Hammer, HardHat, Search, ShieldCheck, Wrench, FileText,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  invoice: Receipt,
  photo: Camera,
  repair: Hammer,
  renovation: HardHat,
  inspection: Search,
  warranty: ShieldCheck,
  maintenance: Wrench,
  other: FileText,
};

interface Props {
  propertyId: string;
  /** Sticky floating button on mobile (default) or inline trigger. */
  variant?: "floating" | "inline";
}

export default function QuickAddToHome({ propertyId, variant = "floating" }: Props) {
  const [open, setOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const choose = (kind: string) => {
    setOpen(false);
    if (kind === "document") setDocOpen(true);
    else setEventOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {variant === "floating" ? (
            <Button
              size="lg"
              className="fixed bottom-20 right-4 z-40 gap-2 rounded-full px-5 shadow-[var(--shadow-lg)] md:hidden"
            >
              <Plus className="h-4 w-4" /> Ajouter à ma maison
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Ajouter à ma maison
            </Button>
          )}
        </SheetTrigger>

        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="font-display">Ajouter à ma maison</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2 pb-4">
            {PASSPORT_QUICK_ADD.map((option) => {
              const Icon = ICONS[option.key] ?? FileText;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => choose(option.kind)}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/70 p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <AddDocumentDialog open={docOpen} onOpenChange={setDocOpen} propertyId={propertyId} />
      <AddEventDialog open={eventOpen} onOpenChange={setEventOpen} propertyId={propertyId} />
    </>
  );
}
