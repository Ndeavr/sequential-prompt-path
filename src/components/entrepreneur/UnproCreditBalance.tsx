/**
 * UNPRO — Solde de crédit entrepreneur (lecture seule).
 * Le solde est écrit exclusivement côté serveur, après confirmation Stripe.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_CREDIT_COPY } from "@/lib/offers/fallbackCredit350";

function formatCAD(cents: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function UnproCreditBalance() {
  const { data, isLoading } = useQuery({
    queryKey: ["unpro-credit-balance"],
    queryFn: async () => {
      const { data: wallet, error } = await supabase
        .from("contractor_wallet")
        .select("balance_cents")
        .maybeSingle();
      if (error) throw error;
      return wallet?.balance_cents ?? 0;
    },
  });

  if (isLoading || !data || data <= 0) return null;

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-readable-secondary">
        {FALLBACK_CREDIT_COPY.balanceLabel}
      </p>
      <p className="mt-1 text-2xl font-semibold text-readable">{formatCAD(data)}</p>
      <p className="mt-2 text-xs text-readable-muted">
        {FALLBACK_CREDIT_COPY.creditNotice}
      </p>
    </div>
  );
}

export default UnproCreditBalance;
