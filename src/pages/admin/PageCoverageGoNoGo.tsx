/**
 * UNPRO — /coverage (admin)
 * GO / NO GO selector by Ville × Métier.
 */
import { Helmet } from "react-helmet-async";
import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CoverageResult {
  active: number;
  coveragePct: number;
  qualityScore: number;
  decision: "GO" | "WATCH" | "NO_GO";
}

// Mock evaluator — replace with real query against city_activity_matrix later.
function evaluateCoverage(city: string, trade: string): CoverageResult | null {
  if (!city.trim() || !trade.trim()) return null;
  // Deterministic pseudo from inputs
  const seed = (city + trade).toLowerCase().split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const active = (seed % 35) + 2;
  const coveragePct = Math.min(100, (seed % 80) + 20);
  const qualityScore = Math.min(100, ((seed * 3) % 60) + 40);
  let decision: CoverageResult["decision"] = "GO";
  if (active < 5 || coveragePct < 50) decision = "NO_GO";
  else if (active < 12 || coveragePct < 75 || qualityScore < 65) decision = "WATCH";
  return { active, coveragePct, qualityScore, decision };
}

export default function PageCoverageGoNoGo() {
  const [city, setCity] = useState("Montréal");
  const [trade, setTrade] = useState("Peintre");

  const result = useMemo(() => evaluateCoverage(city, trade), [city, trade]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>UNPRO Admin — Couverture Ville × Métier</title>
      </Helmet>

      <div className="mx-auto max-w-2xl px-5 py-10 flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Couverture</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Avons-nous assez de pros qualifiés pour livrer ?
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Ville</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-11 bg-white/5 border-white/10" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Métier</Label>
            <Input value={trade} onChange={(e) => setTrade(e.target.value)} className="h-11 bg-white/5 border-white/10" />
          </div>
        </div>

        {result && (
          <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/10 flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Actifs" value={String(result.active)} />
              <Stat label="Couverture" value={`${result.coveragePct}%`} />
              <Stat label="Qualité" value={String(result.qualityScore)} />
            </div>
            <DecisionBadge decision={result.decision} />
            <p className="text-xs text-muted-foreground">
              Question simulée : « Assez de {trade.toLowerCase()}s à {city} ? »
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.02]">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: CoverageResult["decision"] }) {
  const cfg = {
    GO: { Icon: CheckCircle2, label: "GO", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    WATCH: { Icon: AlertTriangle, label: "À SURVEILLER", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    NO_GO: { Icon: XCircle, label: "NO GO", cls: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
  }[decision];
  return (
    <div className={`inline-flex items-center gap-2 self-start px-4 py-2 rounded-full border text-sm font-semibold ${cfg.cls}`}>
      <cfg.Icon className="h-4 w-4" />
      {cfg.label}
    </div>
  );
}
