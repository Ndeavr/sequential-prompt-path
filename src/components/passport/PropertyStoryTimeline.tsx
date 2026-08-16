/**
 * UNPRO — « L'histoire de votre maison »
 * Mobile-first chronological timeline of the Passeport Maison.
 * Reads only real data (usePropertyStory). Missing fields are omitted, never invented.
 */
import { useState } from "react";
import { usePropertyStory, type StoryEntry, type StoryCategory } from "@/hooks/usePropertyStory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProvenanceBadge from "./ProvenanceBadge";
import AddEventDialog from "./AddEventDialog";
import {
  Search, Wrench, Hammer, ArrowUpCircle, ShieldCheck, FileText,
  Plus, CalendarClock, Paperclip, HardHat,
} from "lucide-react";

const ICONS: Record<StoryCategory, React.ElementType> = {
  inspection: Search,
  maintenance: Wrench,
  repair: Hammer,
  renovation: HardHat,
  upgrade: ArrowUpCircle,
  warranty: ShieldCheck,
  document: FileText,
  other: FileText,
};

const CATEGORY_LABELS: Record<StoryCategory, string> = {
  inspection: "Inspection",
  maintenance: "Entretien",
  repair: "Réparation",
  renovation: "Rénovation",
  upgrade: "Amélioration",
  warranty: "Garantie",
  document: "Document",
  other: "Autre",
};

const money = (v: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

const dateLabel = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : null;

function StoryCard({ entry }: { entry: StoryEntry }) {
  const Icon = ICONS[entry.category];
  const when = dateLabel(entry.date);

  return (
    <div className="relative pl-9">
      <span className="absolute left-0 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
      </span>

      <Card className="border-border/50 bg-card/70 backdrop-blur-sm transition-colors hover:border-primary/30">
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {CATEGORY_LABELS[entry.category]}
            </Badge>
            <ProvenanceBadge provenance={entry.provenance} />
            {entry.hasFile && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Paperclip className="h-2.5 w-2.5" /> Pièce jointe
              </span>
            )}
          </div>

          <p className="text-sm font-semibold leading-snug text-foreground">{entry.title}</p>

          {entry.description && (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {when && <span>{when}</span>}
            {entry.cost != null && <span>{money(entry.cost)}</span>}
            {entry.provider && <span>{entry.provider}</span>}
            {entry.warrantyEndDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> Jusqu'au {dateLabel(entry.warrantyEndDate)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface Props {
  propertyId: string;
  /** Limit the number of entries (dashboard preview). */
  limit?: number;
  showHeader?: boolean;
}

export default function PropertyStoryTimeline({ propertyId, limit, showHeader = true }: Props) {
  const { data: story, isLoading } = usePropertyStory(propertyId);
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  const groups = limit
    ? (() => {
        let left = limit;
        const out: typeof story.byYear = [];
        for (const g of story!.byYear) {
          if (left <= 0) break;
          out.push({ year: g.year, entries: g.entries.slice(0, left) });
          left -= g.entries.length;
        }
        return out;
      })()
    : story!.byYear;

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              L'histoire de votre maison
            </h3>
            <p className="text-xs text-muted-foreground">
              {story!.counts.total > 0
                ? `${story!.counts.total} élément(s) documenté(s) · ${story!.counts.verified} vérifié(s)`
                : "Chaque ajout construit la mémoire de votre propriété."}
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3" /> Ajouter
          </Button>
        </div>
      )}

      {story!.counts.total === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-sm font-medium text-foreground">
              L'histoire de votre maison commence ici.
            </p>
            <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
              Ajoutez un rapport d'inspection, une facture ou une garantie. UNPRO conserve la mémoire de
              votre propriété et vous aide à prévoir ce qui vient ensuite.
            </p>
            <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Ajouter un premier élément
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.year ?? "undated"} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-bold text-foreground">
                  {group.year ?? "Date à confirmer"}
                </span>
                <span className="h-px flex-1 bg-border/60" />
              </div>
              <div className="relative space-y-3">
                <span className="absolute bottom-2 left-[13px] top-2 w-px bg-border/50" aria-hidden />
                {group.entries.map((entry) => (
                  <StoryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddEventDialog open={showAdd} onOpenChange={setShowAdd} propertyId={propertyId} />
    </div>
  );
}
