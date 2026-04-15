import { UserCheck, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  runId: string;
}

export default function PanelProfileCreationStatus({ runId }: Props) {
  const { data: events = [] } = useQuery({
    queryKey: ["sim-profile-events", runId],
    queryFn: async () => {
      const { data } = await supabase.from("simulation_profile_events").select("*").eq("run_id", runId);
      return data ?? [];
    },
  });

  if (events.length === 0) return null;

  return (
    <div className="glass-card rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-primary" /> Profil entrepreneur
      </h3>
      {events.map((ev: any) => (
        <div key={ev.id} className="flex items-center justify-between text-sm bg-muted/10 rounded-md px-3 py-2">
          <div>
            <p className="text-foreground">Completion: {ev.completion_before}% → {ev.completion_after}%</p>
            <p className="text-xs text-muted-foreground">{ev.profile_status_before} → {ev.profile_status_after}</p>
          </div>
          {ev.activated ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
        </div>
      ))}
    </div>
  );
}
