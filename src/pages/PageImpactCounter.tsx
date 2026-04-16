/**
 * PageImpactCounter — Full detail page for the UNPRO AI Impact Counter.
 * Displays all 3 metrics with graphs, explanations, and milestones.
 */
import { FileCheck, Clock, DollarSign, TrendingUp, Info, ArrowLeft } from "lucide-react";
import { useImpactCounter } from "@/hooks/useImpactCounter";
import { formatNumberQc, formatCurrencyQc, computeProjection, SCENARIO_CONFIGS } from "@/lib/counterEngine";
import CounterCard from "@/components/impact-counter/CounterCard";
import BadgeModelEstimateLive from "@/components/impact-counter/BadgeModelEstimateLive";
import BannerImpactDisclaimer from "@/components/impact-counter/BannerImpactDisclaimer";
import GraphMiniRealtime from "@/components/impact-counter/GraphMiniRealtime";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MILESTONES = [10_000, 25_000, 50_000, 100_000, 250_000, 500_000];

function MilestoneTimeline({ current }: { current: number }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        Jalons
      </h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {MILESTONES.map((m) => {
          const reached = current >= m;
          return (
            <div
              key={m}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                reached
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/20 border-border/30 text-muted-foreground"
              }`}
            >
              {formatNumberQc(m)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EXPLANATIONS = [
  {
    icon: FileCheck,
    title: "Soumissions épargnées",
    desc: "Nombre estimé de soumissions inutiles évitées grâce au matching intelligent d'UNPRO. Au lieu de demander 3 soumissions et comparer manuellement, l'IA identifie le bon professionnel directement.",
    color: "text-primary",
  },
  {
    icon: Clock,
    title: "Heures récupérées",
    desc: "Temps total économisé par les propriétaires et entrepreneurs québécois. Inclut le temps de recherche, de comparaison, d'appels et de coordination évité grâce à l'automatisation intelligente.",
    color: "text-accent",
  },
  {
    icon: DollarSign,
    title: "Publicité épargnée",
    desc: "Montant estimé que les entrepreneurs auraient dépensé en publicité pour obtenir les mêmes rendez-vous qualifiés. UNPRO remplace les leads payants par un matching organique basé sur la performance.",
    color: "text-success",
  },
];

export default function PageImpactCounter() {
  const snap = useImpactCounter("realiste");
  const cfg = SCENARIO_CONFIGS.realiste;

  // Projections
  const in30d = computeProjection(cfg, new Date(Date.now() + 30 * 86400000));
  const in90d = computeProjection(cfg, new Date(Date.now() + 90 * 86400000));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-foreground">Compteur d'impact IA</h1>
            <p className="text-[10px] text-muted-foreground">Estimation en direct</p>
          </div>
          <BadgeModelEstimateLive className="ml-auto" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Live counter cards */}
        <div className="grid grid-cols-1 gap-4">
          <CounterCard
            label="Soumissions épargnées"
            value={snap.savedSubmissions}
            formatter={formatNumberQc}
            icon={<FileCheck />}
            accentClass="text-primary"
          />
          <CounterCard
            label="Heures récupérées"
            value={snap.hoursSaved}
            formatter={formatNumberQc}
            icon={<Clock />}
            accentClass="text-accent"
          />
          <CounterCard
            label="Publicité épargnée"
            value={snap.adSavingsCad}
            formatter={formatCurrencyQc}
            icon={<DollarSign />}
            accentClass="text-success"
          />
        </div>

        {/* Daytime indicator */}
        {snap.isDaytime && (
          <p className="text-center text-xs text-muted-foreground/70">
            ☀️ Activité plus élevée en journée — les chiffres accélèrent entre 7 h et 22 h
          </p>
        )}

        {/* Milestones */}
        <MilestoneTimeline current={snap.savedSubmissions} />

        {/* Mini graphs */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Activité temps réel</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border/30 bg-card/40 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Volume global</p>
              <GraphMiniRealtime style="smooth" height={48} baseValue={snap.savedSubmissions} />
            </div>
            <div className="rounded-2xl border border-border/30 bg-card/40 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Temps économisé</p>
              <GraphMiniRealtime style="stepped" height={48} baseValue={snap.hoursSaved} />
            </div>
            <div className="rounded-2xl border border-border/30 bg-card/40 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Économies pub</p>
              <GraphMiniRealtime style="dynamic" height={48} baseValue={snap.adSavingsCad} />
            </div>
          </div>
        </div>

        {/* Projections */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Projections</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border/30 bg-card/40 p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Dans 30 jours</p>
              <p className="text-lg font-bold text-primary tabular-nums">{formatNumberQc(in30d.savedSubmissions)}</p>
              <p className="text-[10px] text-muted-foreground">soumissions évitées</p>
            </div>
            <div className="rounded-2xl border border-border/30 bg-card/40 p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Dans 90 jours</p>
              <p className="text-lg font-bold text-primary tabular-nums">{formatNumberQc(in90d.savedSubmissions)}</p>
              <p className="text-[10px] text-muted-foreground">soumissions évitées</p>
            </div>
          </div>
        </div>

        {/* Explanations */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            Explication des chiffres
          </h3>
          <div className="space-y-3">
            {EXPLANATIONS.map((e) => (
              <div key={e.title} className="rounded-2xl border border-border/30 bg-card/40 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <e.icon className={`h-4 w-4 ${e.color}`} />
                  <h4 className="text-sm font-semibold text-foreground">{e.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <BannerImpactDisclaimer />

        {/* Model badge */}
        <p className="text-center text-[10px] text-muted-foreground/50 pb-4">
          Modèle mis à jour le 1<sup>er</sup> janvier 2026
        </p>
      </div>
    </div>
  );
}
