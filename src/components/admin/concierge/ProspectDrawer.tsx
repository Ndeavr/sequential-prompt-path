/**
 * UNPRO — Concierge prospect drawer (slide-in command surface).
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Globe, Phone, Mail, Award } from "lucide-react";
import { CONCIERGE_STAGES, useConciergeTouches, useUpdateProspect, type ConciergeStage, type ConciergeTarget } from "@/hooks/useConcierge";
import WeaknessCard from "./WeaknessCard";
import MessageComposer from "./MessageComposer";
import ConciergeTimeline from "./ConciergeTimeline";
import CustomOfferBuilder from "./CustomOfferBuilder";

type Props = { prospect: ConciergeTarget | null; onClose: () => void };

export default function ProspectDrawer({ prospect, onClose }: Props) {
  const { data: touches = [] } = useConciergeTouches(prospect?.id ?? null);
  const updateProspect = useUpdateProspect();
  if (!prospect) return null;

  const aipp = Math.round(prospect.aipp_score ?? 0);

  return (
    <Sheet open={!!prospect} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-[#050816]/95 backdrop-blur-2xl border-l border-white/10">
        <SheetHeader className="space-y-2 pb-3 border-b border-white/10">
          <SheetTitle className="text-lg font-semibold tracking-tight">{prospect.business_name}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {prospect.trade && <Badge variant="outline" className="text-[10px]">{prospect.trade}</Badge>}
            {prospect.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prospect.city}</span>}
            {prospect.review_rating && (
              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{prospect.review_rating} · {prospect.review_count} avis</span>
            )}
            <span className="flex items-center gap-1"><Award className="h-3 w-3" />IA {aipp}/100</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {prospect.website_url && <a className="flex items-center gap-1 text-primary hover:underline" href={prospect.website_url} target="_blank" rel="noreferrer"><Globe className="h-3 w-3" />Site</a>}
            {prospect.phone && <a className="flex items-center gap-1 text-primary hover:underline" href={`tel:${prospect.phone}`}><Phone className="h-3 w-3" />{prospect.phone}</a>}
            {prospect.email && <a className="flex items-center gap-1 text-primary hover:underline" href={`mailto:${prospect.email}`}><Mail className="h-3 w-3" />{prospect.email}</a>}
          </div>
        </SheetHeader>

        <div className="py-4 space-y-5">
          {/* Stage */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Étape</span>
            <Select
              value={prospect.concierge_stage ?? "discovered"}
              onValueChange={(v) => updateProspect.mutate({ id: prospect.id, patch: { concierge_stage: v as ConciergeStage } })}
            >
              <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONCIERGE_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <WeaknessCard prospect={prospect} />

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Message personnalisé</div>
            <MessageComposer prospect={prospect} />
          </div>

          <CustomOfferBuilder prospect={prospect} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Timeline</div>
              {prospect.public_slug && (
                <Button asChild size="sm" variant="ghost" className="text-[11px] h-7">
                  <a href={`/pro/${prospect.public_slug}`} target="_blank" rel="noreferrer">Voir landing →</a>
                </Button>
              )}
            </div>
            <ConciergeTimeline touches={touches} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
