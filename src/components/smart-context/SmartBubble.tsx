/**
 * <SmartBubble> — premium glass popover (desktop) / bottom sheet (mobile)
 * Explains: WHAT / WHY / MONEY IMPACT / AI RECOMMENDATION / ALEX
 *
 * Reads from the SmartContext registry (with optional runtime personalization).
 */
import { useState, type ReactNode } from "react";
import { Info, Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartContext } from "@/features/smartContext/useSmartContext";
import type { SmartContextRuntime, SmartRecommendationKind } from "@/features/smartContext/types";
import { supabase } from "@/integrations/supabase/client";

interface SmartBubbleProps {
  id: string;
  runtime?: SmartContextRuntime;
  trigger?: ReactNode;
  onAskAlex?: (entryId: string) => void;
  onAcceptRecommendation?: (value: string | number | undefined) => void;
}

const RECO_TONE: Record<SmartRecommendationKind, { label: string; className: string }> = {
  recommended: { label: "Recommandé", className: "bg-primary/15 text-primary border-primary/30" },
  not_recommended: { label: "À éviter", className: "bg-destructive/15 text-destructive border-destructive/30" },
  upgrade: { label: "Optimisation", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  opportunity: { label: "Opportunité", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  high_demand: { label: "Forte demande", className: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30" },
  visibility: { label: "Visibilité IA", className: "bg-violet-500/15 text-violet-500 border-violet-500/30" },
  capacity_warning: { label: "Capacité limite", className: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
};

function trackBubbleOpen(fieldId: string) {
  void (supabase as any).from("conversion_events").insert({
    event_type: "bubble_opened",
    value: JSON.stringify({ field_id: fieldId }),
  });
}

function BubbleBody({
  id,
  runtime,
  onAskAlex,
  onAcceptRecommendation,
}: Required<Pick<SmartBubbleProps, "id">> & Pick<SmartBubbleProps, "runtime" | "onAskAlex" | "onAcceptRecommendation">) {
  const entry = useSmartContext(id, runtime ?? {});
  if (!entry) {
    return (
      <div className="p-4 text-xs text-muted-foreground">Aucune information disponible.</div>
    );
  }
  const tone = entry.recommendation ? RECO_TONE[entry.recommendation.kind] : null;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-2">
        <div className="rounded-xl bg-foreground/90 text-background p-1.5 shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">UNPRO Intelligence</p>
          <p className="text-sm font-semibold text-foreground leading-tight">{entry.label}</p>
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">{entry.what}</p>

      <div className="rounded-2xl border border-border/40 bg-card/60 p-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pourquoi c'est important</p>
        <p className="text-xs text-foreground/85 leading-relaxed">{entry.why}</p>
        {entry.moneyImpact && (
          <p className="flex items-start gap-1.5 text-xs text-emerald-500/90">
            <TrendingUp className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{entry.moneyImpact}</span>
          </p>
        )}
      </div>

      {entry.warning && (
        <div className="flex items-start gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-3">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-500/90 leading-relaxed">{entry.warning}</p>
        </div>
      )}

      {entry.recommendation && tone && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className={`text-[10px] font-semibold border ${tone.className}`}>
              {tone.label}
            </Badge>
            {entry.recommendation.value !== undefined && (
              <span className="text-sm font-semibold text-primary">{String(entry.recommendation.value)}</span>
            )}
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">{entry.recommendation.reasonFr}</p>
          {entry.recommendation.value !== undefined && onAcceptRecommendation && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full rounded-xl text-xs h-8"
              onClick={() => onAcceptRecommendation(entry.recommendation?.value)}
            >
              Appliquer la recommandation
            </Button>
          )}
        </div>
      )}

      {entry.examples && entry.examples.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Exemple</p>
          {entry.examples.map((ex) => (
            <p key={ex} className="text-xs text-foreground/75 italic leading-relaxed">"{ex}"</p>
          ))}
        </div>
      )}

      {onAskAlex && (
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-xl text-xs h-9 gap-2"
          onClick={() => onAskAlex(entry.id)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Demander à Alex
        </Button>
      )}
    </div>
  );
}

export function SmartBubbleTrigger({ recommended }: { recommended?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Plus d'informations"
      className={`inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors ${
        recommended
          ? "text-primary hover:text-primary/80 shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );
}

export function SmartBubble({
  id,
  runtime,
  trigger,
  onAskAlex,
  onAcceptRecommendation,
}: SmartBubbleProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) trackBubbleOpen(id);
  };

  const trig = trigger ?? <SmartBubbleTrigger />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>{trig}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] border-t border-border/40 bg-card/95 backdrop-blur-2xl p-0 max-h-[85vh] overflow-y-auto"
        >
          <SheetTitle className="sr-only">Information</SheetTitle>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-foreground/15" />
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <BubbleBody
                  id={id}
                  runtime={runtime}
                  onAskAlex={onAskAlex}
                  onAcceptRecommendation={onAcceptRecommendation}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trig}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[360px] rounded-[24px] border-border/40 bg-card/95 backdrop-blur-2xl p-0 shadow-2xl"
      >
        <BubbleBody
          id={id}
          runtime={runtime}
          onAskAlex={onAskAlex}
          onAcceptRecommendation={onAcceptRecommendation}
        />
      </PopoverContent>
    </Popover>
  );
}

export default SmartBubble;
