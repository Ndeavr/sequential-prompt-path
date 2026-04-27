/**
 * PanelContractorAdvisorAlex — Shared autonomous contractor advisor.
 *
 * Used in:
 *   - /alex (chat surface)
 *   - /entrepreneur/dashboard (cockpit)
 *   - admin preview
 *
 * Rules (NEVER violate):
 *   - Never restart onboarding if a contractor profile exists → recall memory
 *   - Never expose legacy plans (Essentiel etc.) — only Recrue/Pro/Premium/Élite/Signature
 *   - One input only: site / RBQ / NEQ / phone / business name → instant AIPP scan
 *   - No long questionnaire: chips for objectives, instant plan recommendation
 *
 * Acts as Alex's autonomous Growth Advisor + AIPP Engine + Closer.
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Globe, Phone, Building2, Loader2, TrendingUp,
  ArrowRight, CheckCircle2, Zap, Target, Award, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ScoreRing from "@/components/ui/score-ring";
import { useContractorProfile } from "@/hooks/useContractor";
import { useContractorAIPPComputed } from "@/hooks/useAIPPScore";
import { supabase } from "@/integrations/supabase/client";
import { CONTRACTOR_PLANS, getContractorPlan, type ContractorPlanSlug } from "@/config/contractorPlans";
import { runContractorEnrichment, getContractorCheckoutUrl } from "@/services/alexContractorOnboardingService";
import { toast } from "sonner";

type Objective = "more_calls" | "more_quotes" | "fill_schedule" | "dominate_city" | "premium_jobs";

interface ObjectiveChip {
  key: Objective;
  label: string;
  recommendedPlan: ContractorPlanSlug;
}

const OBJECTIVES: ObjectiveChip[] = [
  { key: "more_calls",     label: "Plus d'appels",          recommendedPlan: "pro" },
  { key: "more_quotes",    label: "Plus de soumissions",    recommendedPlan: "premium" },
  { key: "fill_schedule",  label: "Remplir mon agenda",     recommendedPlan: "premium" },
  { key: "premium_jobs",   label: "Jobs rentables",         recommendedPlan: "elite" },
  { key: "dominate_city",  label: "Dominer ma ville",       recommendedPlan: "signature" },
];

interface QuickWin { label: string; impact: string; }

function buildQuickWins(score: number): QuickWin[] {
  const all: QuickWin[] = [
    { label: "Ajouter un CTA d'appel direct",    impact: "+22 % d'appels" },
    { label: "Récolter 10 avis Google",          impact: "+18 % de confiance" },
    { label: "Optimiser pour mobile",            impact: "+14 % conversion" },
    { label: "Photos avant/après réelles",       impact: "+27 % engagement" },
    { label: "SEO local (ville + spécialité)",   impact: "+37 % visibilité" },
    { label: "Réponse < 5 min aux demandes",     impact: "+31 % closing" },
  ];
  // Lower score = more wins surfaced
  const count = score < 50 ? 5 : score < 70 ? 4 : 3;
  return all.slice(0, count);
}

function recommendPlan(score: number, objective: Objective | null): ContractorPlanSlug {
  if (objective) return OBJECTIVES.find((o) => o.key === objective)!.recommendedPlan;
  if (score < 50) return "pro";
  if (score < 70) return "premium";
  if (score < 85) return "elite";
  return "signature";
}

export interface PanelContractorAdvisorAlexProps {
  /** Where this panel is rendered — affects copy + density */
  surface?: "chat" | "dashboard" | "admin";
  /** Optional override identity (admin preview / impersonation) */
  previewIdentity?: { businessName?: string; website?: string; phone?: string; rbq?: string; neq?: string };
  /** Hide the "Open chat with Alex" CTA (for /alex itself) */
  hideOpenChatCta?: boolean;
}

export default function PanelContractorAdvisorAlex({
  surface = "dashboard",
  previewIdentity,
  hideOpenChatCta = false,
}: PanelContractorAdvisorAlexProps) {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useContractorProfile();
  const { data: liveAipp } = useContractorAIPPComputed();

  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanScore, setScanScore] = useState<number | null>(null);
  const [scanGap, setScanGap] = useState<string | null>(null);
  const [objective, setObjective] = useState<Objective | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // ---- Memory recall ----------------------------------------------------
  // If contractor already exists, never restart onboarding — load score & continue.
  const recalledScore = liveAipp?.score ?? profile?.aipp_score ?? null;
  const isReturning = !!profile && !previewIdentity;

  useEffect(() => {
    // Pre-fill query with website if known so user can re-scan with one click
    if (profile?.website && !query) setQuery(profile.website);
    if (previewIdentity?.website && !query) setQuery(previewIdentity.website);
  }, [profile?.website, previewIdentity?.website]);

  const displayedScore = scanScore ?? recalledScore ?? null;
  const displayedGap = scanGap ?? (recalledScore != null ? "Optimisations restantes" : null);
  const businessName =
    previewIdentity?.businessName ?? profile?.business_name ?? "votre entreprise";

  const recommended = useMemo<ContractorPlanSlug>(() => {
    return recommendPlan(displayedScore ?? 50, objective);
  }, [displayedScore, objective]);

  const recommendedPlan = getContractorPlan(recommended)!;
  const quickWins = useMemo(() => buildQuickWins(displayedScore ?? 50), [displayedScore]);

  // ---- Actions ----------------------------------------------------------
  async function handleScan() {
    const value = query.trim();
    if (!value) {
      toast.error("Entrez votre site web, RBQ, NEQ, téléphone ou nom d'entreprise.");
      return;
    }
    setScanning(true);
    setScanScore(null);
    setScanGap(null);

    // Heuristic field routing
    const isUrl = /https?:\/\/|www\.|\.[a-z]{2,}\b/i.test(value);
    const isPhone = /^\+?\d[\d\s\-().]{6,}$/.test(value);
    const isRbq = /^\d{4}-\d{4}-\d{2}$/.test(value) || /^\d{10}$/.test(value);
    const isNeq = /^\d{10}$/.test(value);

    try {
      const res = await runContractorEnrichment({
        businessName: !isUrl && !isPhone && !isRbq ? value : (profile?.business_name ?? ""),
        website: isUrl ? value : profile?.website,
        phone: isPhone ? value : profile?.phone,
        rbq: isRbq ? value : undefined,
        neq: isNeq ? value : undefined,
      });
      setScanScore(res.preview.score);
      setScanGap(res.preview.topGap);

      // Persist score on contractor row when logged in
      if (profile?.user_id) {
        await supabase
          .from("contractors")
          .update({ aipp_score: res.preview.score })
          .eq("user_id", profile.user_id);
      }
    } catch (e: any) {
      toast.error(e?.message || "Analyse impossible. Réessayez.");
    } finally {
      setScanning(false);
    }
  }

  async function handleActivatePlan() {
    setCheckingOut(true);
    try {
      const result = await getContractorCheckoutUrl(recommended);
      if (result.requiresAuth) {
        navigate(`/auth?next=/entrepreneur/checkout/${recommended}`);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      toast.error(result.error || "Impossible de lancer le paiement.");
    } finally {
      setCheckingOut(false);
    }
  }

  // ---- Render -----------------------------------------------------------
  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Header — memory aware */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Alex — Conseiller IA
          </p>
          <h2 className="text-lg font-semibold text-foreground leading-tight">
            {isReturning
              ? <>Bonjour {businessName}.{" "}
                  {recalledScore != null
                    ? <>Votre AIPP est à <span className="text-primary">{recalledScore}/100</span>.</>
                    : "On reprend où on s'est arrêté."}
                </>
              : "Votre potentiel en 30 secondes."}
          </h2>
        </div>
      </motion.div>

      {/* Input — site / RBQ / NEQ / phone / name */}
      {(!isReturning || !displayedScore) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Entrez l'un de ces éléments — j'analyse instantanément :
          </p>
          <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" /> Site web</Badge>
            <Badge variant="outline">RBQ</Badge>
            <Badge variant="outline">NEQ</Badge>
            <Badge variant="outline" className="gap-1"><Phone className="w-3 h-3" /> Téléphone</Badge>
            <Badge variant="outline" className="gap-1"><Building2 className="w-3 h-3" /> Nom</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Collez votre site web ou numéro RBQ…"
              className="flex-1"
              disabled={scanning}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
            />
            <Button onClick={handleScan} disabled={scanning} className="gap-2">
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {scanning ? "Analyse…" : "Analyser"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Score + insights */}
      <AnimatePresence>
        {(scanning || displayedScore != null) && (
          <motion.div
            key="score-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center gap-5">
              <div className="shrink-0">
                {scanning ? (
                  <div className="w-[100px] h-[100px] rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                ) : (
                  <ScoreRing score={displayedScore ?? 0} size={100} strokeWidth={8} label="AIPP" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  {scanning ? "Analyse en cours" : "Score AIPP"}
                </p>
                <p className="text-base font-medium text-foreground">
                  {scanning
                    ? "Présence web, avis, branding, SEO local…"
                    : displayedGap
                      ? <>Principal gain : <span className="text-primary">{displayedGap}</span></>
                      : "Votre profil est bien positionné."}
                </p>
                {!scanning && displayedScore != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Plus le score monte, plus vous remontez dans les recommandations Alex.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick wins */}
      {!scanning && displayedScore != null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-5 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            Gains rapides
          </h3>
          <div className="space-y-2">
            {quickWins.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{w.label}</span>
                </div>
                <span className="text-xs font-medium text-primary">{w.impact}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Objective chips */}
      {!scanning && displayedScore != null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-5 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            Quel est votre objectif principal ?
          </h3>
          <div className="flex flex-wrap gap-2">
            {OBJECTIVES.map((o) => (
              <button
                key={o.key}
                onClick={() => setObjective(o.key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  objective === o.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommended plan — uses CONTRACTOR_PLANS only (no legacy) */}
      {!scanning && displayedScore != null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 shadow-lg border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary mb-1 flex items-center gap-1">
                <Award className="w-3 h-3" /> Plan recommandé
              </p>
              <h3 className="text-xl font-bold text-foreground">
                {recommendedPlan.name}{" "}
                <span className="text-base font-medium text-muted-foreground">
                  · {recommendedPlan.monthlyPrice} $/mois
                </span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {recommendedPlan.subtitle}
              </p>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {recommendedPlan.features.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleActivatePlan}
              disabled={checkingOut}
              className="flex-1 gap-2"
              size="lg"
            >
              {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Activer {recommendedPlan.name}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/entrepreneur/pricing")}
            >
              Voir comparaison
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Plans actuels : Recrue 149 $ · Pro 349 $ · Premium 599 $ · Élite 999 $ · Signature 1799 $
          </p>
        </motion.div>
      )}

      {/* Open chat CTA */}
      {!hideOpenChatCta && surface !== "chat" && (
        <button
          onClick={() => navigate("/alex-conversation")}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <MessageCircle className="w-4 h-4" />
          Parler à Alex
        </button>
      )}

      {/* Loading state for first-load contractor data */}
      {profileLoading && !displayedScore && !scanning && (
        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement de votre profil…
        </div>
      )}
    </div>
  );
}
