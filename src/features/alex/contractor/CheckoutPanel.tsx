/**
 * CheckoutPanel — Triggers Stripe checkout for the chosen contractor plan.
 */
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useContractorStore } from "./contractorStore";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
// CANONICAL PRICING — never hardcode a price here. Single source:
// src/config/contractorPlans.ts (mirrors public.plans).
import { CANONICAL_PLAN_LABELS, PLAN_PRICE_MAP, type ContractorPlanSlug } from "@/config/pricing";

function planMeta(code: string): { name: string; price: number } {
  const slug = (code || "").toLowerCase() as ContractorPlanSlug;
  const price = PLAN_PRICE_MAP[slug];
  if (price === undefined) {
    return { name: CANONICAL_PLAN_LABELS.pro, price: PLAN_PRICE_MAP.pro };
  }
  return { name: CANONICAL_PLAN_LABELS[slug] ?? slug, price };
}

interface Props {
  actionId: string;
  plan_code: string;
}

export default function CheckoutPanel({ plan_code }: Props) {
  const [busy, setBusy] = useState(false);
  const profile = useContractorStore((s) => s.profile);
  const meta = planMeta(plan_code);

  async function activate() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-contractor-checkout", {
        body: {
          plan_code,
          billing_cycle: "monthly",
          contractor: {
            business_name: profile?.business_name,
            phone: profile?.phone,
            website: profile?.website,
            rbq: profile?.rbq,
          },
          success_path: "/contractor/activated",
          cancel_path: "/",
        },
      });
      const url = data?.url || data?.checkout_url;
      if (url) {
        redirectToCheckout(url);
      } else {
        console.error("[checkout]", error || data);
        setBusy(false);
      }
    } catch (e) {
      console.error("[checkout]", e);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-3 shadow-[0_0_30px_-12px_hsl(var(--primary))]">
      <div>
        <p className="text-xs uppercase tracking-wide text-primary font-semibold">Activer mon profil</p>
        <p className="text-lg font-semibold text-foreground mt-1">Plan {meta.name}</p>
        <p className="text-sm text-muted-foreground">{meta.price}$/mois · TPS/TVQ ajoutées</p>
      </div>
      <button
        disabled={busy}
        onClick={activate}
        className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {busy ? "Redirection sécurisée…" : "Activer mon profil"}
      </button>
      <p className="text-[10px] text-center text-muted-foreground">
        Paiement sécurisé via Stripe. Annulable en tout temps.
      </p>
    </div>
  );
}
