/**
 * UNPRO — Alex Predictive Seller Page (Contractor-facing)
 * Full-page view combining all predictive seller components
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, AlertTriangle } from "lucide-react";
import { generateAlexScript } from "@/lib/alexPredictiveScripts";
import type { PredictiveContext } from "@/lib/alexPredictiveScripts";
import AlexMarketCloserPanel from "@/components/alex-seller/AlexMarketCloserPanel";
import WidgetRecommendedAction from "@/components/alex-seller/WidgetRecommendedAction";
import CardExclusivityOpportunity from "@/components/alex-seller/CardExclusivityOpportunity";
import CardLeadPredictedValue from "@/components/alex-seller/CardLeadPredictedValue";
import CardPredictedProfitValue from "@/components/alex-seller/CardPredictedProfitValue";
import { toast } from "sonner";

function useContractorLeadOpportunity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["alex-seller-opportunity", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get contractor's top opportunity (most recent high-quality lead in their area)
      const { data: contractor } = await supabase
        .from("contractors")
        .select("id, city, specialty")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!contractor) return null;

      // Get latest lead with predictions for this area
      const { data: leads } = await supabase
        .from("market_leads")
        .select("*, market_lead_predictions(*), market_lead_risk_scores(*), market_next_best_actions(*)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (!leads?.length) return null;

      // Pick best lead (highest quality score)
      const best = leads.reduce((a: any, b: any) => {
        const aScore = (Array.isArray(a.market_lead_predictions) ? a.market_lead_predictions[0] : a.market_lead_predictions)?.predicted_lead_quality_score || 0;
        const bScore = (Array.isArray(b.market_lead_predictions) ? b.market_lead_predictions[0] : b.market_lead_predictions)?.predicted_lead_quality_score || 0;
        return bScore > aScore ? b : a;
      });

      const pred = Array.isArray(best.market_lead_predictions) ? best.market_lead_predictions[0] : best.market_lead_predictions;
      const risk = Array.isArray(best.market_lead_risk_scores) ? best.market_lead_risk_scores[0] : best.market_lead_risk_scores;
      const action = Array.isArray(best.market_next_best_actions) ? best.market_next_best_actions[0] : best.market_next_best_actions;

      // Get dynamic price
      const { data: price } = await supabase
        .from("market_dynamic_prices")
        .select("*")
        .eq("city_slug", best.city_slug || "")
        .eq("trade_slug", best.trade_slug || "")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return { lead: best, pred, risk, action, price, contractor };
    },
  });
}

export default function PageAlexPredictiveSeller() {
  const { data, isLoading, error } = useContractorLeadOpportunity();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center max-w-sm">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive font-medium">Erreur de chargement</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (!data || !data.lead) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center max-w-sm">
          <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">Aucune opportunité pour le moment</p>
          <p className="text-xs text-muted-foreground mt-1">
            Alex vous notifiera dès qu'un rendez-vous qualifié correspondra à votre profil.
          </p>
        </div>
      </div>
    );
  }

  const { lead, pred, risk, action, price } = data;

  const ctx: PredictiveContext = {
    predicted_contract_value: pred?.predicted_contract_value,
    predicted_profit_value: pred?.predicted_profit_value,
    predicted_close_probability: pred?.predicted_close_probability,
    predicted_lead_quality_score: pred?.predicted_lead_quality_score,
    predicted_pricing_sensitivity: pred?.predicted_pricing_sensitivity,
    predicted_abandon_probability: pred?.predicted_abandon_probability,
    predicted_show_probability: pred?.predicted_show_probability,
    predicted_best_offer_type: pred?.predicted_best_offer_type,
    predicted_next_best_action: pred?.predicted_next_best_action,
    confidence_score: pred?.confidence_score,
    overall_risk_level: risk?.risk_level ?? undefined,
    no_show_risk: risk?.no_show_risk ?? undefined,
    price_objection_risk: risk?.price_objection_risk ?? undefined,
    competitor_loss_risk: risk?.competitor_loss_risk ?? undefined,
    dynamic_price_cents: price?.final_price_cents,
    urgency_level: lead.urgency_level,
    trade_slug: lead.trade_slug,
    city_slug: lead.city_slug,
    is_exclusive: false,
    allocation_mode: "standard",
  };

  const script = generateAlexScript(ctx);

  const handleCta = () => toast.success(`Action : ${script.cta_action}`);
  const handleSecondary = () => toast.info("Ouverture du chat Alex…");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-4 pb-28">
        {/* Page title */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="font-display text-lg font-bold text-foreground">Votre prochaine opportunité</h1>
          <p className="text-xs text-muted-foreground capitalize">{lead.trade_slug} · {lead.city_slug}</p>
        </motion.div>

        {/* Predicted value + profit cards */}
        <div className="grid grid-cols-1 gap-3">
          <CardLeadPredictedValue
            contractValue={pred?.predicted_contract_value}
            closeProb={pred?.predicted_close_probability}
            qualityScore={pred?.predicted_lead_quality_score}
            confidence={pred?.confidence_score}
          />
          <CardPredictedProfitValue
            profitValue={pred?.predicted_profit_value}
            contractValue={pred?.predicted_contract_value}
            dynamicPriceCents={price?.final_price_cents}
            riskLevel={risk?.overall_risk_level}
          />
        </div>

        {/* Exclusivity */}
        <CardExclusivityOpportunity
          isExclusive={ctx.is_exclusive || false}
          allocationMode={ctx.allocation_mode}
          tradeSlug={lead.trade_slug}
          citySlug={lead.city_slug}
        />

        {/* Recommended action */}
        {action && (
          <WidgetRecommendedAction
            actionType={action.action_type}
            actionLabel={action.action_label}
            reasoning={action.reasoning}
            priority={action.priority}
            onAction={handleCta}
          />
        )}

        {/* Alex closer — sticky at bottom on mobile */}
        <div className="hidden lg:block">
          <AlexMarketCloserPanel script={script} onCtaClick={handleCta} onSecondaryClick={handleSecondary} />
        </div>
      </div>

      {/* Mobile sticky Alex panel */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-background/80 backdrop-blur-md border-t border-border/20 z-40">
        <AlexMarketCloserPanel script={script} onCtaClick={handleCta} onSecondaryClick={handleSecondary} />
      </div>
    </div>
  );
}
