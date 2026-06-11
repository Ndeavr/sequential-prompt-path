/**
 * UNPRO — Vision IA 5 Ans : module principal
 * Affiche le titre, la timeline, les 3 scénarios, les observations IA et le CTA.
 * Pilote l'A/B testing via useVisionIAVariant.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useVisionIAVariant, trackVisionEvent } from "../useVisionIAVariant";
import { COPY_VARIANTS, CTA_VARIANTS, orderScenarios } from "../abVariants";
import type { FutureAnalysis } from "../types";
import VisionTimeline from "./VisionTimeline";
import ScenarioCard from "./ScenarioCard";
import AIObservationsCard from "./AIObservationsCard";
import VisionLoadingState from "./VisionLoadingState";

interface Props {
  companyId: string;
  contractorId?: string;
  signals?: Record<string, any>;
  onCTA?: () => void;
}

export default function VisionIAModule({ companyId, contractorId, signals, onCTA }: Props) {
  const variants = useVisionIAVariant(companyId);
  const [analysis, setAnalysis] = useState<FutureAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!companyId || !variants) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);

      // 1. Try existing analysis
      const { data: existing } = await supabase
        .from("company_future_analysis" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && !cancelled) {
        setAnalysis(existing as any);
        setLoading(false);
        trackVisionEvent(companyId, "view", { cached: true });
        return;
      }

      // 2. Generate
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("future-analysis-agent", {
          body: {
            company_id: companyId,
            contractor_id: contractorId,
            signals: signals ?? {},
            ab_variant_copy: variants.copy,
            ab_variant_order: variants.order,
            ab_variant_cta: variants.cta,
            ab_variant_sms: variants.sms,
          },
        });
        if (fnErr || !data?.ok) throw fnErr ?? new Error("generation_failed");
        if (!cancelled) {
          setAnalysis(data.analysis);
          trackVisionEvent(companyId, "view", { cached: false });
        }
      } catch (e) {
        console.error("Vision IA generation failed", e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [companyId, contractorId, variants]);

  if (!variants || loading) return <VisionLoadingState />;

  if (error || !analysis) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-readable-body">L'analyse n'est pas encore prête. Nous continuons en arrière-plan.</p>
        {onCTA && (
          <Button onClick={onCTA} variant="outline">
            Continuer
          </Button>
        )}
      </div>
    );
  }

  const copy = COPY_VARIANTS[variants.copy];
  const ordered = orderScenarios(variants.order, {
    no_change: analysis.scenario_no_change,
    growth: analysis.scenario_growth,
    unpro: analysis.scenario_unpro,
  });

  return (
    <div className="space-y-6 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-2xl mx-auto px-2"
      >
        <h1 className="text-readable text-2xl md:text-3xl font-semibold tracking-tight mb-3">
          {copy.title}
        </h1>
        <p className="text-readable-body text-sm md:text-base leading-relaxed">
          {copy.subtitle}
        </p>
      </motion.div>

      <VisionTimeline timeline={analysis.timeline_data ?? {}} />

      <div className="grid gap-4 md:grid-cols-3">
        {ordered.map((s, i) => (
          <ScenarioCard
            key={s.key}
            kind={s.key === "growth" ? "growth" : (s.key as any)}
            data={s.data}
            index={i}
            onHover={() => trackVisionEvent(companyId, "scenario_hover", { scenario: s.key })}
          />
        ))}
      </div>

      <AIObservationsCard
        strengths={analysis.strengths ?? []}
        weaknesses={analysis.weaknesses ?? []}
      />

      <div className="flex justify-center pt-2">
        <Button
          size="lg"
          className="rounded-full px-8"
          onClick={() => {
            trackVisionEvent(companyId, "cta_click", { cta: variants.cta });
            onCTA?.();
          }}
        >
          {CTA_VARIANTS[variants.cta]}
        </Button>
      </div>
    </div>
  );
}
