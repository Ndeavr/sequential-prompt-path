import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  ISR_BRAND,
  recommendPlan,
  type IsrAnswerKey,
  type IsrAnswers,
} from "@/config/isrDemoConfig";
import IsrIdentityCard from "@/components/demo-isr/IsrIdentityCard";
import IsrAlexConversation from "@/components/demo-isr/IsrAlexConversation";
import IsrPlanGrid from "@/components/demo-isr/IsrPlanGrid";
import IsrSignaturePanel from "@/components/demo-isr/IsrSignaturePanel";
import IsrAdminPeek from "@/components/demo-isr/IsrAdminPeek";

const RUN_KEY = "unpro.isrDemoRunId";

export default function PageIsrDemoPlanTest() {
  const [answers, setAnswers] = useState<IsrAnswers>({});
  const [demoRunId, setDemoRunId] = useState<string | null>(null);

  const recommended = useMemo(() => recommendPlan(answers), [answers]);

  // Ensure a single demo run row exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = typeof window !== "undefined" ? localStorage.getItem(RUN_KEY) : null;
      if (existing) { setDemoRunId(existing); return; }
      const { data } = await supabase
        .from("demo_contractor_plan_tests")
        .insert({
          company_name: ISR_BRAND.company,
          legal_name: ISR_BRAND.legal,
          website: ISR_BRAND.website,
          phone_primary: ISR_BRAND.phones[0],
          phone_secondary: ISR_BRAND.phones[1],
          flow_status: "started",
          payment_status: "not_started",
          raw_answers: {},
        })
        .select("id")
        .single();
      if (!cancelled && data?.id) {
        localStorage.setItem(RUN_KEY, data.id);
        setDemoRunId(data.id);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAnswer = async (key: IsrAnswerKey, value: string) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (!demoRunId) return;
    const reco = recommendPlan(next);
    const column =
      key === "capacity" ? "selected_capacity"
      : key === "territory" ? "selected_territory"
      : key === "project_type" ? "selected_project_type"
      : key === "objective" ? "selected_objective"
      : "wants_ai_priority";
    const patch: Record<string, unknown> = {
      [column]: value,
      raw_answers: next,
      flow_status: reco ? "plan_recommended" : "started",
    };
    if (reco) patch.recommended_plan = reco;
    await supabase.from("demo_contractor_plan_tests").update(patch).eq("id", demoRunId);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <Helmet>
        <title>Démo ISR — Sélection intelligente du plan UNPRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-20 h-[480px] w-[480px] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-cyan-400/15 blur-[140px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <header className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">UNPRO · Démo entrepreneur</div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-[-0.04em] leading-tight">
            Démo ISR — Sélection intelligente du plan UNPRO
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/65 max-w-2xl">
            Alex analyse les objectifs, le territoire et la capacité d'ISR pour recommander
            le bon plan avant activation.
          </p>
        </header>

        <div className="space-y-5">
          <IsrIdentityCard />
          <IsrAlexConversation
            answers={answers}
            onAnswer={handleAnswer}
            recommended={recommended}
          />
          <IsrPlanGrid recommended={recommended} />
          {recommended && <IsrSignaturePanel demoRunId={demoRunId} />}
        </div>

        <IsrAdminPeek />
      </div>
    </div>
  );
}
