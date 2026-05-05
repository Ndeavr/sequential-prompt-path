/**
 * ContractorGrowthDashboard — 3 sections: Situation / Goals / Plan.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useContractorStore } from "./contractorStore";
import { useAlexVisualStore } from "../visual/visualStore";
import { supabase } from "@/integrations/supabase/client";
import ContractorProfileCard from "./ContractorProfileCard";
import AippScoreCard from "./AippScoreCard";
import GrowthPathTable from "./GrowthPathTable";

interface Props {
  actionId: string;
}

const APPOINTMENT_OPTIONS = [5, 10, 25, 50];

export default function ContractorGrowthDashboard({ actionId }: Props) {
  const { profile, aipp, goals, setGoals, setPlan } = useContractorStore();
  const pushAction = useAlexVisualStore((s) => s.pushAction);
  const [busy, setBusy] = useState(false);

  async function recommend() {
    if (!goals.desired_appointments) return;
    setBusy(true);
    try {
      const avgJob = 1500;
      const closeRate = 0.4;
      const targetRevenue = goals.desired_appointments * avgJob * closeRate;
      const { data, error } = await supabase.functions.invoke("compute-plan-recommendation", {
        body: {
          target_revenue: targetRevenue,
          average_job_value: avgJob,
          close_rate: closeRate,
          appointment_capacity: goals.desired_appointments,
          territory: goals.priority_cities?.[0],
          category: goals.priority_services?.[0],
        },
      });
      const reco = data?.recommended_plan || "premium";
      const reason =
        reco === "elite" || reco === "signature"
          ? "Vous visez un volume élevé — ce plan vous donne la priorité territoire."
          : reco === "premium"
          ? "Meilleur équilibre entre volume, coût et capacité actuelle."
          : "Bon point de départ pour valider le canal sans surengagement.";
      setPlan({
        recommended_plan: reco,
        reason,
        expected_appointments: goals.desired_appointments,
      });
      pushAction({
        id: `plan-table-${Date.now()}`,
        type: "contractor_plan_table",
        payload: {},
      });
      pushAction({
        id: `growth-path-${Date.now()}`,
        type: "contractor_growth_path",
        payload: {},
      });
    } catch (e) {
      console.error("[recommend plan]", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Section 1: Situation */}
      {profile && <ContractorProfileCard />}
      {aipp && <AippScoreCard />}

      {/* Section 2: Goals */}
      <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Vos objectifs</p>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Combien de rendez-vous qualifiés par mois?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {APPOINTMENT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setGoals({ desired_appointments: n })}
                className={`py-2 rounded-lg text-sm border transition ${
                  goals.desired_appointments === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Villes prioritaires (séparées par virgule)</p>
          <input
            value={goals.priority_cities?.join(", ") || ""}
            onChange={(e) => setGoals({ priority_cities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="Laval, Terrebonne"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
          />
        </div>

        <button
          disabled={busy || !goals.desired_appointments}
          onClick={recommend}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Recommander le bon plan
        </button>
      </div>
    </div>
  );
}
