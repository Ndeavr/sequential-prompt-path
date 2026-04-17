/**
 * PageAdminCalendarConversionDashboard — admin analytics.
 */
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, TrendingUp, Users, AlertCircle } from "lucide-react";

interface Counts {
  total_connections: number;
  google_connected: number;
  apple_subscribed: number;
  failed: number;
  total_events: number;
  prompt_views: number;
  oauth_started: number;
  oauth_succeeded: number;
}

export default function PageAdminCalendarConversionDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      const [
        { count: totalConn },
        { count: googleConn },
        { count: appleConn },
        { count: failed },
        { count: totalEvt },
        { count: views },
        { count: started },
        { count: succeeded },
      ] = await Promise.all([
        supabase.from("calendar_connections").select("*", { count: "exact", head: true }),
        supabase.from("calendar_connections").select("*", { count: "exact", head: true }).eq("provider", "google").eq("connection_status", "connected"),
        supabase.from("calendar_connections").select("*", { count: "exact", head: true }).eq("provider", "apple").eq("connection_status", "subscribed_external"),
        supabase.from("calendar_connections").select("*", { count: "exact", head: true }).eq("connection_status", "failed"),
        supabase.from("calendar_conversion_events").select("*", { count: "exact", head: true }),
        supabase.from("calendar_conversion_events").select("*", { count: "exact", head: true }).eq("event_type", "prompt_viewed" as never),
        supabase.from("calendar_conversion_events").select("*", { count: "exact", head: true }).eq("event_type", "oauth_started" as never),
        supabase.from("calendar_conversion_events").select("*", { count: "exact", head: true }).eq("event_type", "oauth_succeeded" as never),
      ]);
      setCounts({
        total_connections: totalConn ?? 0,
        google_connected: googleConn ?? 0,
        apple_subscribed: appleConn ?? 0,
        failed: failed ?? 0,
        total_events: totalEvt ?? 0,
        prompt_views: views ?? 0,
        oauth_started: started ?? 0,
        oauth_succeeded: succeeded ?? 0,
      });
    })();
  }, []);

  const conversionRate = counts && counts.prompt_views > 0
    ? ((counts.oauth_succeeded / counts.prompt_views) * 100).toFixed(1)
    : "0.0";

  return (
    <MainLayout>
      <Helmet><title>Calendrier — Conversion — Admin</title></Helmet>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Calendar Conversion</h1>
          <p className="text-sm text-muted-foreground mb-6">Performance du module de connexion calendrier.</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={Users} label="Connexions totales" value={counts?.total_connections ?? "—"} />
            <Stat icon={Calendar} label="Google connectés" value={counts?.google_connected ?? "—"} />
            <Stat icon={Calendar} label="Apple abonnés" value={counts?.apple_subscribed ?? "—"} />
            <Stat icon={AlertCircle} label="Échecs" value={counts?.failed ?? "—"} tone="warn" />
            <Stat icon={TrendingUp} label="Vues prompt" value={counts?.prompt_views ?? "—"} />
            <Stat icon={TrendingUp} label="OAuth lancés" value={counts?.oauth_started ?? "—"} />
            <Stat icon={TrendingUp} label="OAuth réussis" value={counts?.oauth_succeeded ?? "—"} />
            <Stat icon={TrendingUp} label="Taux conversion" value={`${conversionRate}%`} tone="success" />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Calendar; label: string; value: string | number; tone?: "warn" | "success" }) {
  const accent =
    tone === "warn" ? "text-amber-400" :
    tone === "success" ? "text-emerald-400" :
    "text-primary";
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${accent}`} />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
