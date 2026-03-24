/**
 * UNPRO — Alex Sales Panel
 * AI-powered sales advisor for contractor dashboard.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, TrendingDown, ArrowUpRight, DollarSign,
  Target, AlertTriangle, CheckCircle2, ChevronRight,
  Zap, Crown, Star, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexSales, type SalesAnalysis } from "@/hooks/useAlexSales";

const PLAN_ICONS: Record<string, any> = {
  pro: Zap,
  premium: Star,
  elite: Crown,
  signature: Shield,
  current: CheckCircle2,
};

const PLAN_LABELS: Record<string, string> = {
  recrue: "Recrue",
  pro: "Pro — 49$/mois",
  premium: "Premium — 99$/mois",
  elite: "Élite — 199$/mois",
  signature: "Signature — 399$/mois",
  current: "Plan actuel",
};

export default function AlexSalesPanel() {
  const { analysis, isLoading, error, analyze, hasProfile } = useAlexSales();
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (hasProfile && !analysis && !isLoading) {
      analyze();
    }
  }, [hasProfile]);

  if (dismissed || !hasProfile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-secondary/[0.04] to-accent/[0.06] backdrop-blur-xl p-5 space-y-4 shadow-[var(--shadow-glow)] relative overflow-hidden"
    >
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Alex — Mode Vente
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold uppercase tracking-wider">IA</span>
            </h3>
            <p className="text-[10px] text-muted-foreground">Analyse de vos opportunités</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-background/40 border border-border/20">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-spin border-t-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Alex analyse votre profil…</p>
            <p className="text-[10px] text-muted-foreground">Évaluation des opportunités manquées</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <p className="text-xs text-destructive">{error}</p>
          <button onClick={analyze} className="text-[10px] text-primary mt-1 hover:underline">Réessayer</button>
        </div>
      )}

      {/* Analysis Result */}
      <AnimatePresence>
        {analysis && !isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3 relative z-10"
          >
            {/* Impact Banner */}
            {analysis.estimated_monthly_loss_cad > 0 && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/20">
                <TrendingDown className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">{analysis.impact_statement}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    ~{analysis.missed_opportunities} rendez-vous manqués · ~{analysis.estimated_monthly_loss_cad.toLocaleString("fr-CA")} $/mois en revenus perdus
                  </p>
                </div>
              </div>
            )}

            {/* Diagnosis */}
            <div className="p-3.5 rounded-xl bg-background/50 border border-border/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Diagnostic</p>
                  <p className="text-sm text-foreground leading-snug">{analysis.diagnosis}</p>
                </div>
              </div>
            </div>

            {/* Sales Message */}
            <div className="p-3.5 rounded-xl bg-primary/[0.06] border border-primary/15">
              <p className="text-sm text-foreground leading-relaxed italic">"{analysis.sales_message}"</p>
            </div>

            {/* Priority Actions */}
            <AnimatePresence>
              {(expanded || analysis.priority_actions.length <= 2) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vos prochaines actions</p>
                  {analysis.priority_actions.map((action, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/40 border border-border/15"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{action}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {analysis.priority_actions.length > 2 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline"
              >
                Voir les {analysis.priority_actions.length} actions <ChevronRight className="w-3 h-3" />
              </button>
            )}

            {/* Plan Recommendation */}
            {analysis.recommended_plan !== "current" && (
              <PlanRecommendation analysis={analysis} />
            )}

            {analysis.recommended_plan === "current" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20">
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                <p className="text-xs text-foreground font-medium">
                  Votre plan actuel est adapté. Concentrez-vous sur l'optimisation de votre profil.
                </p>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[9px] text-muted-foreground">
                Confiance de l'analyse: {analysis.confidence}%
              </p>
              <button
                onClick={analyze}
                className="text-[10px] text-primary hover:underline font-medium"
              >
                Rafraîchir l'analyse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PlanRecommendation({ analysis }: { analysis: SalesAnalysis }) {
  const Icon = PLAN_ICONS[analysis.recommended_plan] || Zap;
  const label = PLAN_LABELS[analysis.recommended_plan] || analysis.recommended_plan;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-accent/[0.04] p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-foreground">Recommandation Alex</p>
          <p className="text-sm font-bold text-primary">{label}</p>
        </div>
        {analysis.estimated_monthly_loss_cad > 0 && (
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground">ROI estimé</p>
            <p className="text-sm font-bold text-green-500">
              +{analysis.estimated_monthly_loss_cad.toLocaleString("fr-CA")}$/mois
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{analysis.recommended_plan_reason}</p>

      {analysis.objection_handler && (
        <div className="p-2.5 rounded-lg bg-background/40 border border-border/15">
          <p className="text-[10px] font-bold text-muted-foreground mb-0.5">💡 Saviez-vous?</p>
          <p className="text-[11px] text-foreground leading-snug">{analysis.objection_handler}</p>
        </div>
      )}

      <Link to="/pricing">
        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-primary to-accent text-white border-0 rounded-xl h-10 text-xs font-bold hover:brightness-110 hover:shadow-[var(--shadow-glow)] transition-all gap-1.5"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Voir le plan {label.split("—")[0].trim()}
        </Button>
      </Link>
    </motion.div>
  );
}
