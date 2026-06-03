/**
 * UNPRO — Concierge Activation Cockpit
 * War room for personally closing the first 5 contractor activations.
 * Positioning: AI visibility + guaranteed appointments. Never "leads" or "subscription".
 */
import { useMemo, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Award, Crosshair, Target, Flame, CheckCircle2, ArrowUpRight } from "lucide-react";
import { useConciergeTargets, CONCIERGE_STAGES, type ConciergeTarget } from "@/hooks/useConcierge";
import ProspectDrawer from "@/components/admin/concierge/ProspectDrawer";

function nextBestAction(p: ConciergeTarget): string {
  switch (p.concierge_stage) {
    case "discovered":
    case null:
    case undefined:
      return "Envoyer l'ouverture";
    case "contacted": return "Attendre · relancer 48h";
    case "replied": return "Envoyer le suivi";
    case "interested": return "Envoyer la fermeture";
    case "demo_sent": return "Appeler maintenant";
    case "offer_sent": return "Relancer le paiement";
    case "payment_pending": return "Confirmer le paiement";
    case "followup_needed": return "Relancer aujourd'hui";
    case "activated": return "Terminé · vérifier page IA";
    case "rejected": return "Archivé";
    default: return "Définir prochaine action";
  }
}

const STAGE_TONE: Record<string, string> = {
  discovered: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  contacted: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  replied: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  interested: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  demo_sent: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  offer_sent: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  payment_pending: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  activated: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  followup_needed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  rejected: "bg-zinc-700/30 text-zinc-400 border-zinc-700/40",
};

export default function PageConciergeCockpit() {
  const { data: targets = [], isLoading } = useConciergeTargets();
  const [selected, setSelected] = useState<ConciergeTarget | null>(null);

  const todayFive = useMemo(() => {
    const pri = targets.filter(t => (t.concierge_priority ?? 0) > 0)
      .sort((a, b) => (b.concierge_priority ?? 0) - (a.concierge_priority ?? 0));
    if (pri.length >= 5) return pri.slice(0, 5);
    return [...pri, ...targets.filter(t => !pri.includes(t))].slice(0, 5);
  }, [targets]);

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const recentlyTouched = targets.filter(t => t.last_action_at && new Date(t.last_action_at).toDateString() === today).length;
    const demos = targets.filter(t => t.concierge_stage === "demo_sent" || t.concierge_stage === "offer_sent").length;
    const activated = targets.filter(t => t.concierge_stage === "activated").length;
    return { conversations: recentlyTouched, demos, activated };
  }, [targets]);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-3 md:p-6 space-y-5 pb-20">
        {/* Hero */}
        <header className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Crosshair className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Activation Concierge</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Devenez l'un des entrepreneurs que l'IA recommande en premier · Rendez-vous exclusifs, pas des leads partagés
              </p>
            </div>
          </div>
        </header>

        {/* Metric strip */}
        <div className="grid grid-cols-3 gap-2">
          <MetricCard icon={Target} label="Conversations aujourd'hui" value={metrics.conversations} target={5} />
          <MetricCard icon={Flame} label="Démos/Offres" value={metrics.demos} target={2} />
          <MetricCard icon={CheckCircle2} label="Activations" value={metrics.activated} target={1} />
        </div>

        {/* Today's 5 */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground/90">Les 5 d'aujourd'hui</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {todayFive.map(p => (
                <ProspectMiniCard key={p.id} prospect={p} onOpen={() => setSelected(p)} />
              ))}
              {todayFive.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
                  Aucun prospect ne correspond aux critères (4.4★, 25+ avis). Importez via le hub d'acquisition.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Hot pipeline */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground/90">Pipeline chaud · {targets.length} cibles</h2>
          <Card className="bg-card/30 border-border/30 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/20">
                      <th className="text-left py-2 px-3">Entreprise</th>
                      <th className="text-left py-2 px-3 hidden sm:table-cell">Métier · Ville</th>
                      <th className="text-left py-2 px-3 hidden md:table-cell">Avis</th>
                      <th className="text-left py-2 px-3">IA</th>
                      <th className="text-left py-2 px-3">Étape</th>
                      <th className="text-left py-2 px-3 hidden lg:table-cell">Prochaine action</th>
                      <th className="text-right py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(p => (
                      <tr key={p.id} className="border-b border-border/10 hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelected(p)}>
                        <td className="py-2.5 px-3 font-medium truncate max-w-[200px]">{p.business_name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground hidden sm:table-cell text-xs">
                          {p.trade || p.category_slug} · {p.city}
                        </td>
                        <td className="py-2.5 px-3 hidden md:table-cell text-xs">
                          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{p.review_rating} · {p.review_count}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono">{Math.round(p.aipp_score ?? 0)}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className={`text-[10px] ${STAGE_TONE[p.concierge_stage ?? "discovered"]}`}>
                            {CONCIERGE_STAGES.find(s => s.key === (p.concierge_stage ?? "discovered"))?.label}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-foreground/80">{nextBestAction(p)}</td>
                        <td className="py-2.5 px-3 text-right">
                          <ArrowUpRight className="h-3.5 w-3.5 inline text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <ProspectDrawer prospect={selected} onClose={() => setSelected(null)} />
    </AdminLayout>
  );
}

function MetricCard({ icon: Icon, label, value, target }: { icon: any; label: string; value: number; target: number }) {
  const pct = Math.min(100, (value / target) * 100);
  const reached = value >= target;
  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${reached ? "text-emerald-400" : "text-foreground"}`}>{value}</span>
        <span className="text-xs text-muted-foreground">/ {target}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${reached ? "bg-emerald-400" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProspectMiniCard({ prospect, onOpen }: { prospect: ConciergeTarget; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="text-left rounded-2xl border border-border/30 bg-card/40 hover:bg-white/[0.05] hover:border-primary/40 transition-all p-3 group">
      <div className="text-sm font-semibold truncate">{prospect.business_name}</div>
      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
        <MapPin className="h-2.5 w-2.5" />{prospect.city}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="flex items-center gap-0.5 text-amber-300"><Star className="h-2.5 w-2.5" />{prospect.review_rating}</span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-0.5 text-foreground/80"><Award className="h-2.5 w-2.5" />{Math.round(prospect.aipp_score ?? 0)}</span>
      </div>
      <div className="mt-2 text-[10px] text-primary/90 truncate">{nextBestAction(prospect)} →</div>
    </button>
  );
}
