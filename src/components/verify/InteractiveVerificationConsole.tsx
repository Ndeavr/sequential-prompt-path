/**
 * UNPRO — InteractiveVerificationConsole
 * Search-first verification: type → probable Google results → pick → live extrapolation timeline.
 */
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Shield, ShieldX, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroBusinessVerifySearch from "@/components/verify/HeroBusinessVerifySearch";
import ExtrapolationTimeline from "@/components/verify/ExtrapolationTimeline";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { runExtrapolation, computeVerdict, type ExtrapolationOutput } from "@/services/verification/extrapolationOrchestrator";
import type { BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";

export default function InteractiveVerificationConsole() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const [pick, setPick] = useState<BusinessSearchResult | null>(null);
  const [output, setOutput] = useState<ExtrapolationOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePick = useCallback(async (r: BusinessSearchResult) => {
    setPick(r);
    setOutput(null);
    setLoading(true);
    try {
      const res = await runExtrapolation(r);
      setOutput(res);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setPick(null);
    setOutput(null);
    setLoading(false);
  };

  const verdict = pick && output ? computeVerdict(pick, output) : null;
  const verdictMap = {
    succes: { Icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    attention: { Icon: ShieldAlert, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    non_succes: { Icon: Shield, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    se_tenir_loin: { Icon: ShieldX, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
  } as const;

  return (
    <div className="space-y-5">
      {!pick && (
        <>
          <HeroBusinessVerifySearch onPick={handlePick} />
          <p className="text-center text-xs text-muted-foreground">
            Tapez un nom d'entreprise — on liste les résultats probables et on vérifie pour vous.
          </p>
        </>
      )}

      <AnimatePresence mode="wait">
        {pick && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Vérification en cours pour <span className="font-semibold text-foreground">{pick.business_name}</span>
              </p>
              <Button variant="ghost" size="sm" onClick={reset} className="h-8 px-2 text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Autre entreprise
              </Button>
            </div>

            <ExtrapolationTimeline pick={pick} output={output} loading={loading} />

            {verdict && (() => {
              const v = verdictMap[verdict.verdict];
              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className={`rounded-2xl border ${v.border} ${v.bg} p-5 md:p-6`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center shrink-0`}>
                      <v.Icon className={`w-5 h-5 ${v.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${v.color} uppercase tracking-wide mb-1`}>{verdict.headline}</p>
                      <p className="text-sm text-foreground leading-relaxed">{verdict.short}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button size="sm" onClick={() => openAlex?.("general")} className="gap-2">
                          <Sparkles className="w-4 h-4" /> Réserver via Alex
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/verifier-un-entrepreneur?q=${encodeURIComponent(pick.business_name)}`, {
                          state: { autoRun: true, prefill: { business_name: pick.business_name, phone: pick.phone, website: pick.website, city: pick.city, place_id: pick.place_id } },
                        })} className="gap-2">
                          Rapport complet <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
