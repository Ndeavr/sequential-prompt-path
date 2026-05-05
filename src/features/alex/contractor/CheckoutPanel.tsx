/**
 * CheckoutPanel — Triggers Stripe checkout for the chosen contractor plan.
 */
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useContractorStore } from "./contractorStore";

const PLAN_LABELS: Record<string, { name: string; price: number }> = {
  recrue: { name: "Recrue", price: 149 },
  pro: { name: "Pro", price: 349 },
  premium: { name: "Premium", price: 599 },
  elite: { name: "Élite", price: 999 },
  signature: { name: "Signature", price: 1799 },
};

interface Props {
  actionId: string;
  plan_code: string;
}

export default function CheckoutPanel({ plan_code }: Props) {
  const [busy, setBusy] = useState(false);
  const profile = useContractorStore((s) => s.profile);
  const meta = PLAN_LABELS[plan_code] || PLAN_LABELS.premium;

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
        window.location.href = url;
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
