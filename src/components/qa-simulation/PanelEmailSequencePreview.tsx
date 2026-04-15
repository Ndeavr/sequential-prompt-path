import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  runId: string;
}

export default function PanelEmailSequencePreview({ runId }: Props) {
  const { data: events = [] } = useQuery({
    queryKey: ["sim-email-events", runId],
    queryFn: async () => {
      const { data } = await supabase.from("simulation_email_events").select("*").eq("run_id", runId);
      return data ?? [];
    },
  });

  if (events.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" /> Séquence email
      </h3>
      {events.map((ev: any) => (
        <div key={ev.id} className="flex items-center justify-between text-sm bg-muted/10 rounded-md px-3 py-2">
          <div>
            <p className="text-foreground">{ev.template_code}</p>
            <p className="text-xs text-muted-foreground">{ev.recipient_email}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {ev.delivery_status === "delivered" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            )}
            <span>{ev.delivery_status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
