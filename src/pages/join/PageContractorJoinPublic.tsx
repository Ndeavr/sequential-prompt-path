/**
 * UNPRO — Public cold-entry contractor onboarding (master)
 * Route: /join (no token — public)
 * One screen → instant magical demo → CTA to existing AIPP/plan/checkout flow.
 *
 * Pipeline:
 *   1. User enters phone OR website OR business name
 *   2. fn-instant-profile-demo runs (≤10s)
 *   3. Profile + AIPP score + revenue gap + recommended plan revealed
 *   4. CTA → /entrepreneur/plans (existing native checkout)
 *
 * Reuses existing modules: search-gmb-profile pipeline, AIPP scoring,
 * canonical pricing config. Does NOT duplicate /entrepreneur/join (form-based)
 * — this is the conversion-first wow demo.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  Globe,
  Building2,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Loader2,
  Star,
  ShieldCheck,
  Zap,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CANONICAL_PLAN_LABELS, type ContractorPlanSlug } from "@/config/pricing";
import { trackFunnelEvent } from "@/utils/trackFunnelEvent";

type EntryMode = "phone" | "website" | "name";

interface DemoResult {
  profile: {
    business_name: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    rating: number;
    review_count: number;
    category: string;
    photos: { url: string }[];
    logo_url: string | null;
    is_mock: boolean;
  };
  aipp: {
    score: number;
    breakdown: Record<string, number>;
    level: string;
  };
  revenue_gap: {
    lost_min: number;
    lost_max: number;
    lost_revenue_min: number;
  };
  recommended_plan: {
    code: string;
    label: string;
    price_monthly: number;
    reason: string;
  };
  narrative: {
    headline: string;
    loss: string;
    cta: string;
  };
}

const SCORE_LABELS: Record<string, string> = {
  visibility: "Visibilité",
  conversion: "Conversion",
  reviews: "Avis",
  seo: "SEO",
  trust: "Confiance",
  branding: "Branding",
  speed: "Rapidité",
  ai_structure: "Structure IA",
};

export default function PageContractorJoinPublic() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<EntryMode>("phone");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DemoResult | null>(null);

  useEffect(() => {
    void trackFunnelEvent("landing_viewed", { source: "join_public", mode }, "join_public");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fake but smooth progress while edge function runs (reads as instant)
  useEffect(() => {
    if (!loading) return;
    setProgress(0);
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(95, p + Math.max(1, (95 - p) * 0.15)));
    }, 180);
    return () => window.clearInterval(id);
  }, [loading]);

  const placeholder = useMemo(() => {
    if (mode === "phone") return "514-249-9522";
    if (mode === "website") return "https://votreentreprise.ca";
    return "Nom de votre entreprise";
  }, [mode]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = value.trim();
    if (!v) {
      toast.error("Entrez un numéro, un site web ou un nom d'entreprise.");
      return;
    }
    setLoading(true);
    setResult(null);
    void trackFunnelEvent("import_started", { source: "join_public", mode, length: v.length }, "join_public");

    try {
      const payload: Record<string, string> = {};
      if (mode === "phone") payload.phone = v;
      else if (mode === "website") payload.website = v;
      else payload.business_name = v;

      const { data, error } = await supabase.functions.invoke<DemoResult>(
        "fn-instant-profile-demo",
        { body: payload }
      );
      if (error) throw error;
      if (!data) throw new Error("Réponse vide");
      setProgress(100);
      // Small delay so the bar finishes visually
      await new Promise((r) => setTimeout(r, 280));
      setResult(data);
      void trackFunnelEvent("aipp_viewed", { source: "join_public",
        mode,
        score: data.aipp.score,
        plan: data.recommended_plan.code,
        is_mock: data.profile.is_mock,
      });
    } catch (err) {
      console.error("[PageContractorJoinPublic] demo error:", err);
      toast.error("Échec de l'analyse. Réessayez avec un autre signal.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!result) return;
    void trackFunnelEvent("plan_selected", { source: "join_public",
      plan: result.recommended_plan.code,
    });
    // Persist demo so the next page can resume
    try {
      sessionStorage.setItem(
        "unpro_join_demo",
        JSON.stringify({
          business_name: result.profile.business_name,
          city: result.profile.city,
          phone: result.profile.phone,
          website: result.profile.website,
          score: result.aipp.score,
          recommended_plan: result.recommended_plan.code,
          revenue_gap: result.revenue_gap,
        })
      );
    } catch {
      /* sessionStorage unavailable */
    }
    navigate("/entrepreneurs/plans");
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-400/8 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <header className="flex items-center gap-2 mb-8">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium tracking-wider text-blue-300/80 uppercase">
            UNPRO · Démo instantanée
          </span>
        </header>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="entry"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-3">
                Voyez votre entreprise{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  comme l'IA la voit
                </span>
                .
              </h1>
              <p className="text-base sm:text-lg text-white/70 mb-8 max-w-xl">
                Entrez un seul élément. UNPRO construit votre profil, calcule
                votre score AIPP et vous montre combien de clients vous perdez —
                en moins de 10 secondes.
              </p>

              {/* Mode chips */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {(
                  [
                    { id: "phone", icon: Phone, label: "Téléphone" },
                    { id: "website", icon: Globe, label: "Site web" },
                    { id: "name", icon: Building2, label: "Nom" },
                  ] as { id: EntryMode; icon: typeof Phone; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id);
                      setValue("");
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      mode === m.id
                        ? "bg-blue-500/20 border-blue-400/60 text-white"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    autoFocus
                    type={mode === "phone" ? "tel" : mode === "website" ? "url" : "text"}
                    inputMode={mode === "phone" ? "tel" : "text"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    disabled={loading}
                    className="h-14 text-base bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-blue-400 pl-4 pr-12"
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !value.trim()}
                  className="h-14 px-6 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-semibold hover:opacity-90"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Analyser
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </Button>
              </form>

              {loading && (
                <div className="mt-6">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-300"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Recherche du profil · Analyse AIPP · Calcul du manque à gagner…
                  </p>
                </div>
              )}

              {/* Trust line */}
              <div className="mt-10 flex flex-wrap items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Aucune carte requise
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> ≤ 10 secondes
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Données publiques uniquement
                </span>
              </div>
            </motion.div>
          ) : (
            <ResultPanel
              key="result"
              result={result}
              onCta={handleClose}
              onRestart={() => {
                setResult(null);
                setValue("");
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onCta,
  onRestart,
}: {
  result: DemoResult;
  onCta: () => void;
  onRestart: () => void;
}) {
  const { profile, aipp, revenue_gap, recommended_plan, narrative } = result;
  const planLabel =
    CANONICAL_PLAN_LABELS[recommended_plan.code as ContractorPlanSlug] ??
    recommended_plan.label;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Profile header */}
      <Card className="bg-white/[0.04] border-white/10 p-5 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt=""
              className="w-14 h-14 rounded-xl object-cover bg-white/10"
              onError={(e) => ((e.currentTarget.style.display = "none"))}
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-400/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-300" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate">
              {profile.business_name}
            </h2>
            <p className="text-sm text-white/60 truncate">
              {profile.category} · {profile.city || "Québec"}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
              {profile.rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {profile.rating.toFixed(1)} ({profile.review_count})
                </span>
              )}
              {profile.is_mock && (
                <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-300/80">
                  Démo
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Score reveal */}
      <Card className="bg-gradient-to-br from-blue-950/60 to-slate-950/60 border-blue-400/20 p-6">
        <div className="text-xs uppercase tracking-wider text-blue-300/70 mb-1">
          Score AIPP
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-5xl sm:text-6xl font-bold text-white">
            {aipp.score}
          </span>
          <span className="text-xl text-white/40">/ 100</span>
          <Badge className="ml-2 bg-blue-500/20 text-blue-200 border-blue-400/30 capitalize">
            {aipp.level}
          </Badge>
        </div>
        <p className="text-sm text-white/70 mb-4">{narrative.headline}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Object.entries(aipp.breakdown).map(([k, v]) => (
            <div key={k} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
              <div className="text-[11px] text-white/50 mb-1">{SCORE_LABELS[k] ?? k}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-semibold text-white">{v}</span>
                <span className="text-[10px] text-white/30">/100</span>
              </div>
              <div className="h-0.5 bg-white/5 rounded mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-300"
                  style={{ width: `${Math.min(100, v)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Revenue gap */}
      <Card className="bg-rose-950/30 border-rose-400/20 p-5">
        <div className="flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-rose-300 mt-0.5 shrink-0" />
          <div>
            <div className="text-xs uppercase tracking-wider text-rose-300/80 mb-1">
              Manque à gagner estimé
            </div>
            <p className="text-base text-white">
              {revenue_gap.lost_min}–{revenue_gap.lost_max} clients/mois ·{" "}
              <span className="font-semibold text-rose-200">
                {revenue_gap.lost_revenue_min.toLocaleString("fr-CA")} $+ par mois
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/* Plan recommendation + CTA */}
      <Card className="bg-gradient-to-br from-blue-500/15 to-cyan-400/10 border-blue-400/30 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-blue-300/80 mb-1">
              Plan recommandé
            </div>
            <div className="text-2xl font-bold">{planLabel}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {recommended_plan.price_monthly} $
            </div>
            <div className="text-xs text-white/50">/mois</div>
          </div>
        </div>
        <p className="text-sm text-white/70 mb-4">{recommended_plan.reason}</p>
        <Button
          onClick={onCta}
          className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-semibold hover:opacity-90"
        >
          Activer {planLabel} maintenant
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Card>

      <button
        onClick={onRestart}
        className="text-sm text-white/40 hover:text-white/70 underline underline-offset-4 mx-auto block"
      >
        Analyser une autre entreprise
      </button>
    </motion.div>
  );
}
