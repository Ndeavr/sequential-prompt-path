/**
 * UNPRO — Autopilot Property Dashboard
 * Manage rules, view events, actions, and notifications.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Zap, Bell, Home, Play, Loader2, Shield,
  AlertTriangle, CheckCircle, Clock, Sparkles, TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  processing: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  error: "bg-red-500/20 text-red-400",
};
const URGENCY_ICONS: Record<string, React.ElementType> = {
  critical: AlertTriangle,
  high: Zap,
  medium: Clock,
  low: CheckCircle,
};

export default function AdminAutopilotDashboard() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ["autopilot-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("autopilot_rules" as any).select("*").order("priority");
      return (data || []) as any[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["autopilot-events"],
    queryFn: async () => {
      const { data } = await supabase.from("autopilot_events" as any).select("*").order("triggered_at", { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["autopilot-actions"],
    queryFn: async () => {
      const { data } = await supabase.from("autopilot_actions" as any).select("*").order("created_at", { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["autopilot-notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("user_notifications" as any).select("*").eq("type", "autopilot").order("created_at", { ascending: false }).limit(30);
      return (data || []) as any[];
    },
  });

  const runAutopilot = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("property-autopilot", { body: { action: "evaluate" } });
      if (error) throw error;
      toast.success(`${data?.eventsCreated || 0} événements déclenchés`);
      qc.invalidateQueries({ queryKey: ["autopilot-events"] });
      qc.invalidateQueries({ queryKey: ["autopilot-actions"] });
      qc.invalidateQueries({ queryKey: ["autopilot-notifications"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(228,33%,4%)] text-[hsl(220,20%,93%)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center">
              <Brain className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Autopilot Properties</h1>
              <p className="text-sm text-[hsl(220,14%,50%)]">Surveillance automatique des propriétés</p>
            </div>
          </div>
          <Button
            onClick={runAutopilot}
            disabled={running}
            className="gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border-0 text-white"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Analyse..." : "Lancer autopilot"}
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Règles actives", value: rules.filter((r: any) => r.is_active).length, icon: Shield, color: "text-blue-400" },
            { label: "Événements", value: events.length, icon: Zap, color: "text-amber-400" },
            { label: "Actions en attente", value: actions.filter((a: any) => a.status === "pending").length, icon: Sparkles, color: "text-orange-400" },
            { label: "Notifications", value: notifications.length, icon: Bell, color: "text-emerald-400" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-4"
            >
              <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-[hsl(220,14%,50%)]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Rules */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">Règles actives</h2>
          <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl divide-y divide-[hsl(228,18%,13%)]">
            {rules.length === 0 && <div className="p-6 text-center text-sm text-[hsl(220,14%,50%)]">Aucune règle configurée</div>}
            {rules.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${r.is_active ? "bg-emerald-500/10" : "bg-[hsl(220,14%,50%)]/10"}`}>
                  <Shield className={`h-5 w-5 ${r.is_active ? "text-emerald-400" : "text-[hsl(220,14%,50%)]"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.label_fr || r.action_type}</p>
                  <p className="text-[10px] text-[hsl(220,14%,50%)]">
                    {r.trigger_type} • {r.action_type} • priorité {r.priority}
                  </p>
                </div>
                <Badge className={`${r.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-[hsl(220,14%,50%)]/20 text-[hsl(220,14%,50%)]"} border-0 text-[10px]`}>
                  {r.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">Événements récents</h2>
          <div className="space-y-2">
            {events.length === 0 && (
              <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-6 text-center text-sm text-[hsl(220,14%,50%)]">
                Aucun événement déclenché
              </div>
            )}
            {events.slice(0, 15).map((evt: any, i: number) => {
              const urgency = (evt.metadata as any)?.urgency || "medium";
              const UrgIcon = URGENCY_ICONS[urgency] || Clock;
              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-xl p-3 flex items-center gap-3"
                >
                  <UrgIcon className={`h-4 w-4 flex-shrink-0 ${urgency === "critical" ? "text-red-400" : urgency === "high" ? "text-amber-400" : "text-blue-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{(evt.metadata as any)?.risk || evt.event_type}</p>
                    <p className="text-[9px] text-[hsl(220,14%,50%)]">{new Date(evt.triggered_at).toLocaleString("fr-CA")}</p>
                  </div>
                  <Badge className={`${STATUS_COLORS[evt.status]} border-0 text-[9px]`}>{evt.status}</Badge>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
