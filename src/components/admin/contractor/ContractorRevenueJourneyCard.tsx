// Carte de suivi du parcours revenu.
// Règle stricte : toutes les étapes sont calculées pour UN SEUL contractor_id.
// Aucune donnée d'un autre entrepreneur n'est agrégée ici.
// Si aucune donnée réelle n'existe pour cet entrepreneur, l'étape affiche "Non trouvé".
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, AlertTriangle, Info } from "lucide-react";

type StepState = "done" | "missing" | "failed";

interface Step {
  label: string;
  state: StepState;
  detail: string;
  /** Table(s) réellement interrogées pour cette étape. */
  source: string;
}

interface JourneyResult {
  contractorId: string;
  steps: Step[];
  doneCount: number;
  complete: boolean;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-CA") : "date inconnue");

export function useContractorRevenueJourney(contractorId?: string) {
  return useQuery({
    queryKey: ["contractor-revenue-journey", contractorId],
    enabled: !!contractorId,
    queryFn: async (): Promise<JourneyResult> => {
      const id = contractorId!;

      const [quotes, ledger, subs, demands, outcomes] = await Promise.all([
        supabase
          .from("contractor_pricing_quotes")
          .select(
            "id, offer_kind, pricing_status, total_price_cents, stripe_checkout_session_id, created_at, accepted_at",
          )
          .eq("contractor_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("contractor_activation_ledger")
          .select("id, action, source, metadata, created_at")
          .eq("contractor_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("contractor_subscriptions")
          .select("id, status, plan_id, created_at")
          .eq("contractor_id", id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("demand_signals")
          .select("id, city, category, status, updated_at")
          .eq("matched_contractor_id", id)
          .order("updated_at", { ascending: false })
          .limit(10),
        supabase
          .from("platform_operation_outcomes")
          .select("id, business_outcome, block_reason, created_at")
          .eq("operation", "demand_matching")
          .eq("affected_record", `contractors:${id}`)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const quoteRows = quotes.data ?? [];
      const ledgerRows = ledger.data ?? [];
      const subRows = subs.data ?? [];
      const demandRows = demands.data ?? [];
      const outcomeRows = outcomes.data ?? [];

      // --- Étape 1 : offre / crédit 350 $ (devis OU écriture au registre d'activation)
      const fallbackQuote = quoteRows.find(
        (q) =>
          q.offer_kind === "fallback_credit" || q.offer_kind === "pack_350" || q.total_price_cents === 35000,
      );
      const creditLedger = ledgerRows.find((l) => (l.action ?? "").includes("350"));

      // --- Étape 2 : session Stripe (devis OU metadata du registre)
      const checkoutQuote = quoteRows.find((q) => !!q.stripe_checkout_session_id);
      const ledgerSessionId = ledgerRows
        .map((l) => (l.metadata as Record<string, unknown> | null)?.stripe_session_id)
        .find((s): s is string => typeof s === "string" && s.length > 0);
      const ledgerSessionRow = ledgerRows.find(
        (l) => (l.metadata as Record<string, unknown> | null)?.stripe_session_id === ledgerSessionId,
      );

      // --- Étape 3 : paiement ou crédit confirmé
      const paidQuote = quoteRows.find((q) => q.pricing_status === "paid");
      const activeSub = subRows.find((s) => s.status === "active");
      const grantedCredit = ledgerRows.find((l) => (l.action ?? "").includes("granted"));

      // --- Étape 4 : activation
      const activation = ledgerRows.find((l) => (l.action ?? "").includes("activat"));

      // --- Étape 5 : jumelage
      const matchedDemands = demandRows.filter((d) => d.status === "matched");
      const lastOutcome = outcomeRows[0];

      const steps: Step[] = [
        {
          label: "Offre / crédit 350 $ créé",
          state: fallbackQuote || creditLedger ? "done" : "missing",
          source: "contractor_pricing_quotes · contractor_activation_ledger",
          detail: fallbackQuote
            ? `Devis ${fallbackQuote.id.slice(0, 8)} (${fallbackQuote.offer_kind}) · ${fmt(fallbackQuote.created_at)}`
            : creditLedger
              ? `${creditLedger.action} · ${fmt(creditLedger.created_at)}`
              : "Non trouvé pour cet entrepreneur",
        },
        {
          label: "Session Stripe ouverte",
          state: checkoutQuote || ledgerSessionId ? "done" : "missing",
          source: "contractor_pricing_quotes.stripe_checkout_session_id · contractor_activation_ledger.metadata",
          detail: checkoutQuote
            ? `${checkoutQuote.stripe_checkout_session_id?.slice(0, 28)}… · ${fmt(checkoutQuote.created_at)}`
            : ledgerSessionId
              ? `${ledgerSessionId.slice(0, 28)}… · ${fmt(ledgerSessionRow?.created_at)}`
              : "Non trouvé pour cet entrepreneur",
        },
        {
          label: "Paiement / crédit confirmé",
          state: paidQuote || activeSub || grantedCredit ? "done" : "missing",
          source: "contractor_pricing_quotes · contractor_subscriptions · contractor_activation_ledger",
          detail: paidQuote
            ? `Devis payé ${paidQuote.id.slice(0, 8)} · ${fmt(paidQuote.accepted_at ?? paidQuote.created_at)}`
            : activeSub
              ? `Abonnement actif ${activeSub.plan_id ?? "plan inconnu"} · ${fmt(activeSub.created_at)}`
              : grantedCredit
                ? `${grantedCredit.action} · ${fmt(grantedCredit.created_at)}`
                : "Non trouvé pour cet entrepreneur",
        },
        {
          label: "Activation",
          state: activation ? "done" : "missing",
          source: "contractor_activation_ledger",
          detail: activation
            ? `${activation.action} (${activation.source ?? "source inconnue"}) · ${fmt(activation.created_at)}`
            : "Non trouvé pour cet entrepreneur",
        },
        {
          label: "Jumelage",
          state: matchedDemands.length > 0 ? "done" : lastOutcome ? "failed" : "missing",
          source: "demand_signals · platform_operation_outcomes",
          detail:
            matchedDemands.length > 0
              ? matchedDemands
                  .map((d) => `${d.id.slice(0, 8)} · ${d.category} · ${d.city} · ${fmt(d.updated_at)}`)
                  .join(" | ")
              : lastOutcome
                ? `Tentative ${lastOutcome.business_outcome} — ${lastOutcome.block_reason ?? "raison non consignée"} · ${fmt(lastOutcome.created_at)}`
                : "Non trouvé pour cet entrepreneur",
        },
      ];

      const doneCount = steps.filter((s) => s.state === "done").length;

      return { contractorId: id, steps, doneCount, complete: doneCount === steps.length };
    },
  });
}

const ContractorRevenueJourneyCard = ({ contractorId }: { contractorId: string }) => {
  const { data, isLoading } = useContractorRevenueJourney(contractorId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Parcours revenu (350 $ · activation · jumelage)</CardTitle>
        <p className="text-xs text-muted-foreground break-all">
          Entrepreneur unique : {contractorId}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading && <p className="text-muted-foreground">Chargement…</p>}

        {!isLoading && data && !data.complete && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <Info className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <p className="text-xs leading-relaxed">
              <span className="font-medium">Preuves partielles</span> — {data.doneCount}/{data.steps.length} étapes
              confirmées pour cet entrepreneur. Un parcours complet 350 $ → activation → jumelage sur un seul
              entrepreneur n'est pas encore démontré. Les étapes « Non trouvé » ne doivent pas être comblées par les
              données d'un autre profil.
            </p>
          </div>
        )}

        {!isLoading && data?.complete && (
          <div className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 p-3">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p className="text-xs leading-relaxed">
              <span className="font-medium">Parcours complet</span> — les 5 étapes sont confirmées sur ce seul
              entrepreneur.
            </p>
          </div>
        )}

        {!isLoading &&
          (data?.steps ?? []).map((s) => (
            <div key={s.label} className="flex items-start gap-3">
              {s.state === "done" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              ) : s.state === "failed" ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              ) : (
                <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{s.label}</p>
                  <Badge
                    variant={s.state === "done" ? "default" : s.state === "failed" ? "destructive" : "outline"}
                  >
                    {s.state === "done" ? "Confirmé" : s.state === "failed" ? "Échec" : "Non trouvé"}
                  </Badge>
                </div>
                <p className="text-muted-foreground break-all">{s.detail}</p>
                <p className="text-[11px] text-muted-foreground/70 break-all">Source : {s.source}</p>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default ContractorRevenueJourneyCard;
