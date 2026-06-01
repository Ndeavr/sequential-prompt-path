import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, DollarSign, Copy, ExternalLink } from "lucide-react";

const PLAN_PRICES: Record<string, { name: string; price: number; appts: number }> = {
  recrue:    { name: "Recrue",    price: 149,  appts: 0  },
  pro:       { name: "Pro",       price: 349,  appts: 5  },
  premium:   { name: "Premium",   price: 599,  appts: 10 },
  elite:     { name: "Élite",     price: 999,  appts: 25 },
  signature: { name: "Signature", price: 1799, appts: 50 },
};

export function PlanProposalPanel({
  prospect,
  onRefresh,
}: {
  prospect: {
    id: string;
    business_name: string;
    trade: string | null;
    city: string | null;
    recommended_plan: string | null;
  };
  onRefresh: () => void;
}) {
  const [computing, setComputing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  const compute = async () => {
    setComputing(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-pricing-quote", {
        body: {
          prospect_id: prospect.id,
          trade: prospect.trade ?? "general",
          city: prospect.city ?? "Montréal",
        },
      });
      if (error) throw error;
      setQuote(data);
      // Persist recommendation back to prospect
      if (data?.recommended_plan) {
        await supabase
          .from("contractor_prospects")
          .update({
            recommended_plan: data.recommended_plan,
            recommended_plan_reason: data.reason ?? null,
            estimated_capacity: data.monthly_capacity ?? null,
            estimated_monthly_value: data.estimated_monthly_value ?? null,
          })
          .eq("id", prospect.id);
        onRefresh();
      }
      toast.success("Plan recommandé calculé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setComputing(false);
    }
  };

  const createCheckout = async (planCode: string) => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-contractor-checkout", {
        body: { plan_code: planCode, prospect_id: prospect.id },
      });
      if (error) throw error;
      if (data?.url) {
        await navigator.clipboard.writeText(data.url);
        toast.success("Lien Stripe copié dans le presse-papier", {
          action: { label: "Ouvrir", onClick: () => window.open(data.url, "_blank") },
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const currentPlan = prospect.recommended_plan ?? quote?.recommended_plan;
  const planDef = currentPlan ? PLAN_PRICES[currentPlan] : null;

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{prospect.business_name}</h3>
          <Button onClick={compute} disabled={computing} variant="outline" size="sm">
            {computing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
            Calculer plan recommandé
          </Button>
        </div>

        {planDef ? (
          <>
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6 mb-4">
              <div className="text-xs uppercase tracking-wider text-blue-300 mb-1">Plan recommandé</div>
              <div className="text-3xl font-semibold">{planDef.name}</div>
              <div className="text-2xl text-blue-300 mt-1">{planDef.price}$/mois</div>
              {planDef.appts > 0 && (
                <div className="text-sm text-zinc-300 mt-2">
                  {planDef.appts} rendez-vous exclusifs garantis/mois
                </div>
              )}
              {quote?.reason && (
                <div className="text-xs text-zinc-400 mt-3 italic">{quote.reason}</div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {quote?.monthly_capacity && (
                <Card className="bg-white/5 border-white/10 p-3">
                  <div className="text-xs text-zinc-400">Capacité</div>
                  <div className="text-lg font-semibold">{quote.monthly_capacity} RDV/mo</div>
                </Card>
              )}
              {quote?.estimated_monthly_value && (
                <Card className="bg-white/5 border-white/10 p-3">
                  <div className="text-xs text-zinc-400">Valeur potentielle</div>
                  <div className="text-lg font-semibold">{Math.round(quote.estimated_monthly_value).toLocaleString()}$</div>
                </Card>
              )}
              <Card className="bg-white/5 border-white/10 p-3">
                <div className="text-xs text-zinc-400">Territoire</div>
                <div className="text-lg font-semibold">{prospect.city ?? "—"}</div>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => createCheckout(currentPlan)} disabled={creating} className="flex-1">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Créer lien Stripe ({planDef.name})
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/contractor/ai-score/${prospect.id}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Landing
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-zinc-400">
            Aucun plan recommandé. Lance le calcul pour obtenir une recommandation IA.
          </div>
        )}
      </Card>

      <div className="text-xs text-zinc-500">
        Plans (jamais downsell) : Recrue 149$ · Pro 349$ · Premium 599$ · Élite 999$ · Signature 1799$/mo
      </div>
    </div>
  );
}
