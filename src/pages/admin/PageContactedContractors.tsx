/**
 * UNPRO — /admin/contacted-contractors
 * Lists every contractor journey (SMS-touched or later).
 * Click a row → /admin/contractor/:journey_key.
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useContactedContractors, stageLabelFr, type JourneyStateRow } from "@/hooks/useContractorJourney";
import RevenueRescueQueue from "@/components/admin/forensics/RevenueRescueQueue";
import DataIntegrityBanner from "@/components/admin/forensics/DataIntegrityBanner";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import { ChevronRight, Search } from "lucide-react";

function minutesAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

// Closer-to-$ = higher priority
function proximityScore(r: JourneyStateRow): number {
  if (r.has_paid && !r.has_activated) return 95;
  if (r.has_checkout_opened) return 90;
  if (r.has_checkout_started) return 85;
  if (r.has_registration_completed) return 80;
  if (r.has_step_pricing) return 75;
  if (r.has_registration_started) return 60;
  if (r.has_clicked) return 40;
  if (r.has_sms_delivered) return 20;
  if (r.has_sms_sent) return 10;
  return 0;
}

const STAGE_FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "clicked_not_registered", label: "Cliqué — pas inscrit" },
  { value: "registered_not_paid", label: "Inscrit — pas payé" },
  { value: "paid_not_activated", label: "Payé — pas activé" },
];

export default function PageContactedContractors() {
  useAdminPageTracking();
  const { data = [], isLoading } = useContactedContractors();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return data
      .filter(r => {
        if (filter !== "all" && r.rescue_bucket !== filter) return false;
        if (!norm) return true;
        return (
          (r.company_name ?? "").toLowerCase().includes(norm) ||
          (r.phone ?? "").toLowerCase().includes(norm) ||
          (r.email ?? "").toLowerCase().includes(norm) ||
          (r.last_known_path ?? "").toLowerCase().includes(norm)
        );
      })
      .map(r => ({ ...r, _score: proximityScore(r) }))
      .sort((a, b) => b._score - a._score || +new Date(b.last_activity_at) - +new Date(a.last_activity_at));
  }, [data, q, filter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Contractor Revenue Forensics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drill into each contractor's exact journey. No aggregates. Append-only events. Trié par proximité à la conversion.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Chercher entreprise, phone, email, page…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8"
              />
            </div>
            {STAGE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  filter === f.value ? "bg-primary text-primary-foreground border-primary" : "border-border/30 hover:bg-muted/20"
                }`}
              >{f.label}</button>
            ))}
          </div>

          <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_120px_120px_28px] gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/10">
              <div>Contractor</div>
              <div>Dernière page</div>
              <div>Étape</div>
              <div>Activité</div>
              <div />
            </div>
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Aucun contractor.</div>
            ) : (
              <ul className="divide-y divide-border/10 max-h-[70vh] overflow-y-auto">
                {rows.map((r) => (
                  <li key={r.journey_key}>
                    <Link
                      to={`/admin/contractor/${encodeURIComponent(r.journey_key)}`}
                      className="grid grid-cols-[1fr_1fr_120px_120px_28px] gap-3 px-4 py-2.5 items-center hover:bg-muted/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {r.company_name || r.phone || r.email || r.journey_key.slice(0, 8)}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {r.phone ?? ""} {r.email ? `· ${r.email}` : ""}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground truncate">
                        {r.last_known_path ?? "—"}
                      </div>
                      <Badge variant="outline" className="text-[10px] justify-self-start">
                        {stageLabelFr(r.current_stage)}
                      </Badge>
                      <div className="text-xs text-muted-foreground">il y a {minutesAgo(r.last_activity_at)}</div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside>
          <RevenueRescueQueue />
        </aside>
      </div>
    </div>
  );
}
