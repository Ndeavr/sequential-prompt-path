/**
 * UNPRO — Revenue Rescue Queue widget.
 * Displays leads bucketed by proximity to revenue.
 */
import { Flame, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useRevenueRescueQueue, type JourneyStateRow } from "@/hooks/useContractorJourney";

function minutesAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

const BUCKET_META: Record<
  string,
  { label: string; color: string; priority: number }
> = {
  registered_not_paid: { label: "Inscrit — pas payé", color: "text-red-400 border-red-500/40 bg-red-500/10", priority: 1 },
  paid_not_activated: { label: "Payé — pas activé",   color: "text-amber-400 border-amber-500/40 bg-amber-500/10", priority: 2 },
  clicked_not_registered: { label: "Cliqué — pas inscrit", color: "text-blue-400 border-blue-500/40 bg-blue-500/10", priority: 3 },
};

function BucketSection({ title, rows }: { title: string; rows: JourneyStateRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {title} <span className="text-foreground/80">({rows.length})</span>
      </h4>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const meta = BUCKET_META[r.rescue_bucket ?? ""] ?? BUCKET_META.clicked_not_registered;
          return (
            <li key={r.journey_key}>
              <Link
                to={`/admin/contractor/${encodeURIComponent(r.journey_key)}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/20 bg-card/30 hover:bg-muted/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.company_name || r.phone || r.email || r.journey_key.slice(0, 8)}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {r.phone ?? ""} · {r.last_known_path ?? "—"} · il y a {minutesAgo(r.last_activity_at)}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function RevenueRescueQueue() {
  const { data = [], isLoading } = useRevenueRescueQueue();

  const registeredNotPaid   = data.filter(r => r.rescue_bucket === "registered_not_paid");
  const paidNotActivated    = data.filter(r => r.rescue_bucket === "paid_not_activated");
  const clickedNotRegistered = data.filter(r => r.rescue_bucket === "clicked_not_registered");

  return (
    <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold">🔥 Hot Leads — Revenue Rescue</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">{data.length}</Badge>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-muted-foreground">Aucun lead à récupérer. 🎉</div>
      ) : (
        <>
          <BucketSection title="Inscrit — pas payé (le plus chaud)" rows={registeredNotPaid} />
          <BucketSection title="Payé — pas activé" rows={paidNotActivated} />
          <BucketSection title="Cliqué — pas inscrit" rows={clickedNotRegistered} />
        </>
      )}
    </div>
  );
}
