import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageIsrDemoCancel() {
  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("unpro.isrDemoRunId") : null;
    if (id) {
      supabase
        .from("demo_contractor_plan_tests")
        .update({ payment_status: "cancelled", flow_status: "cancelled" })
        .eq("id", id);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <Helmet>
        <title>Paiement annulé — Démo ISR</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-20 h-[480px] w-[480px] rounded-full bg-indigo-500/15 blur-[120px]" />
      </div>

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 pt-16">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.04em]">Paiement annulé</h1>
          <p className="mt-2 text-sm text-white/60">
            Aucun montant n'a été prélevé. Vous pouvez reprendre la démo quand vous le souhaitez.
          </p>
          <Link
            to="/demo/isroyal-alex-plan-test"
            className="mt-6 inline-block rounded-[18px] bg-amber-300 px-5 py-3 text-sm font-semibold text-[#050816] hover:-translate-y-0.5 transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
          >
            Reprendre la démo
          </Link>
        </div>
      </div>
    </div>
  );
}
