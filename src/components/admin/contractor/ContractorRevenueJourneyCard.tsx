// Carte de suivi du parcours revenu (données réelles uniquement, aucun placeholder).
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

type StepState = "done" | "pending" | "failed";

interface Step {
  label: string;
  state: StepState;
  detail: string;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-CA") : null);

export function useContractorRevenueJourney(contractorId?: string) {
  return useQuery({
    queryKey: ["contractor-revenue-journey", contractorId],
    enabled: !!contractorId,
    queryFn: async (): Promise<Step[]> => {
      const [quotes, ledger, subs, demands, outcomes] = await Promise.all([
        supabase
          .from("contractor_pricing_quotes")
          .select("id, offer_kind, pricing_status, total_price_cents, stripe_checkout_session_id, created_at, accepted_at")
          .eq("contractor_id", contractorId!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("contractor_activation_ledger")
          .select("id, action, source, created_at")
          .eq("contractor_id", contractorId!)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("contractor_subscriptions")
          .select("id, status, plan_code, current_period_end, created_at")
          .eq("contractor_id", contractorId!)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("demand_signals")
          .select("id, city, category, status, updated_at")
          .eq("matched_contractor_id", contractorId!)
          .order("updated_at", { ascending: false })
          .limit(10),
        supabase
          .from("platform_operation_outcomes")
          .select("id, business_outcome, block_reason, payload, created_at")
          .eq("operation", "demand_matching")
          .eq("affected_record", `contractors:${contractorId}`)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const quoteRows = quotes.data ?? [];
      const fallback = quoteRows.find((q) => q.offer_kind === "fallback_credit" || q.total_price_cents === 35000);
      const checkoutQuote = quoteRows.find((q) => !!q.stripe_checkout_session_id);
      const paidQuote = quoteRows.find((q) => q.pricing_status === "paid");
      const activation = (ledger.data ?? []).find((l) => l.action?.includes("activat"));
      const activeSub = (subs.data ?? []).find((s) => s.status === "active");
      const matchedDemands = (demands.data ?? []).filter((d) => d.status === "matched");
      const lastOutcome = (outcomes.data ?? [])[0];

      return [
        {
          label: "Offre / crédit 350 $ créé",
          state: fallback ? "done" : "pending",
          detail: fallback
            ? `Devis ${fallback.id.slice(0, 8)} · ${fmt(fallback.created_at)}`
            : "Aucune offre de crédit 350 $ enregistrée",
        },
        {
          label: "Session Stripe ouverte",
          state: checkoutQuote ? "done" : "pending",
          detail: checkoutQuote
            ? `${checkoutQuote.stripe_checkout_session_id?.slice(0, 24)}… · ${fmt(checkoutQuote.created_at)}`
            : "Aucune session de paiement enregistrée sur un devis",
        },
        {
          label: "Paiement / crédit confirmé",
          state: paidQuote || activeSub ? "done" : "pending",
          detail: paidQuote
            ? `Devis payé ${paidQuote.id.slice(0, 8)} · ${fmt(paidQuote.accepted_at ?? paidQuote.created_at)}`
            : activeSub
              ? `Abonnement actif ${activeSub.plan_code ?? ""} · ${fmt(activeSub.created_at)}`
              : "Aucun paiement ni crédit confirmé",
        },
        {
          label: "Activation",
          state: activation ? "done" : "pending",
          detail: activation
            ? `${activation.action} (${activation.source ?? "source inconnue"}) · ${fmt(activation.created_at)}`
            : "Aucune activation enregistrée",
        },
        {
          label: "Jumelage",
          state: matchedDemands.length > 0 ? "done" : lastOutcome ? "failed" : "pending",
          detail:
            matchedDemands.length > 0
              ? matchedDemands
                  .map((d) => `${d.id.slice(0, 8)} · ${d.category} · ${d.city} · ${fmt(d.updated_at)}`)
                  .join(" | ")
              : lastOutcome
                ? `Aucun jumelage — ${lastOutcome.block_reason ?? "raison non consignée"} · ${fmt(lastOutcome.created_at)}`
                : "Jumelage jamais tenté",
        },
      ];
    },
  });
}

const ContractorRevenueJourneyCard = ({ contractorId }: { contractorId: string }) => {
  const { data: steps, isLoading } = useContractorRevenueJourney(contractorId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Parcours revenu (350 $ · activation · jumelage)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}
        {!isLoading &&
          (steps ?? []).map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              {s.state === "done" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              ) : s.state === "failed" ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              ) : (
                <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{s.label}</p>
                  <Badge variant={s.state === "done" ? "default" : s.state === "failed" ? "destructive" : "outline"}>
                    {s.state === "done" ? "Confirmé" : s.state === "failed" ? "Échec" : "En attente"}
                  </Badge>
                </div>
                <p className="text-muted-foreground break-all">{s.detail}</p>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default ContractorRevenueJourneyCard;
