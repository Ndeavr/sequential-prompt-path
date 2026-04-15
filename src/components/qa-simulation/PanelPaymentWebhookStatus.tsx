import { CreditCard, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  runId: string;
}

export default function PanelPaymentWebhookStatus({ runId }: Props) {
  const { data: events = [] } = useQuery({
    queryKey: ["sim-payment-events", runId],
    queryFn: async () => {
      const { data } = await supabase.from("simulation_payment_events").select("*").eq("run_id", runId);
      return data ?? [];
    },
  });

  if (events.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-primary" /> Paiement Stripe
      </h3>
      {events.map((ev: any) => (
        <div key={ev.id} className="flex items-center justify-between text-sm bg-muted/10 rounded-md px-3 py-2">
          <div>
            <p className="text-foreground">{ev.plan_code} — {(ev.amount_cents / 100).toFixed(2)} $</p>
            <p className="text-xs text-muted-foreground">Webhook: {ev.webhook_status}</p>
          </div>
          {ev.payment_status === "succeeded" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
        </div>
      ))}
    </div>
  );
}
