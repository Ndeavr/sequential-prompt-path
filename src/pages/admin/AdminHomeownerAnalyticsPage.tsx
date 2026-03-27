/**
 * AdminHomeownerAnalyticsPage — Conversion analytics for homeowner voice closer.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, CheckCircle2, Calendar, Phone, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminHomeownerAnalyticsPage() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["admin-homeowner-analytics"],
    queryFn: async () => {
      const [sessions, diagnoses, recommendations, bookings, objections, events] = await Promise.all([
        (supabase.from("alex_homeowner_sessions") as any).select("id, current_step, booking_ready, booking_submitted, project_type, city, created_at"),
        (supabase.from("homeowner_project_diagnoses") as any).select("id"),
        (supabase.from("homeowner_match_recommendations") as any).select("id, is_primary"),
        (supabase.from("alex_homeowner_booking_drafts") as any).select("id, booking_status"),
        (supabase.from("alex_homeowner_objections") as any).select("id, objection_type, resolved"),
        (supabase.from("alex_homeowner_events") as any).select("id, event_type"),
      ]);

      const totalSessions = sessions.data?.length || 0;
      const diagnosisCount = diagnoses.data?.length || 0;
      const recommendationCount = recommendations.data?.filter((r: any) => r.is_primary)?.length || 0;
      const calendarOpened = bookings.data?.filter((b: any) => ["calendar_opened", "booking_submitted"].includes(b.booking_status))?.length || 0;
      const contactCaptured = bookings.data?.filter((b: any) => b.booking_status !== "draft")?.length || 0;
      const bookingSubmitted = bookings.data?.filter((b: any) => b.booking_status === "booking_submitted")?.length || 0;

      // Top objections
      const objectionCounts: Record<string, number> = {};
      objections.data?.forEach((o: any) => {
        objectionCounts[o.objection_type] = (objectionCounts[o.objection_type] || 0) + 1;
      });
      const topObjections = Object.entries(objectionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // Top project types
      const projectCounts: Record<string, number> = {};
      sessions.data?.forEach((s: any) => {
        if (s.project_type) projectCounts[s.project_type] = (projectCounts[s.project_type] || 0) + 1;
      });
      const topProjects = Object.entries(projectCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      return {
        totalSessions,
        diagnosisRate: totalSessions ? Math.round((diagnosisCount / totalSessions) * 100) : 0,
        recommendationRate: totalSessions ? Math.round((recommendationCount / totalSessions) * 100) : 0,
        calendarRate: totalSessions ? Math.round((calendarOpened / totalSessions) * 100) : 0,
        contactRate: totalSessions ? Math.round((contactCaptured / totalSessions) * 100) : 0,
        bookingRate: totalSessions ? Math.round((bookingSubmitted / totalSessions) * 100) : 0,
        topObjections,
        topProjects,
      };
    },
  });

  const funnel = [
    { label: "Sessions", value: stats?.totalSessions || 0, icon: Home, color: "text-primary" },
    { label: "Diagnostic", value: `${stats?.diagnosisRate || 0}%`, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Recommandation", value: `${stats?.recommendationRate || 0}%`, icon: CheckCircle2, color: "text-blue-500" },
    { label: "Contact capturé", value: `${stats?.contactRate || 0}%`, icon: Phone, color: "text-amber-500" },
    { label: "Calendrier ouvert", value: `${stats?.calendarRate || 0}%`, icon: Calendar, color: "text-violet-500" },
    { label: "Réservation", value: `${stats?.bookingRate || 0}%`, icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted/50">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Homeowner Voice Analytics</h1>
          <p className="text-sm text-muted-foreground">Conversion funnel propriétaires</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {funnel.map((item) => (
          <Card key={item.label} className="border-border/40">
            <CardContent className="p-4 text-center">
              <item.icon className={`h-5 w-5 mx-auto mb-2 ${item.color}`} />
              <div className="text-2xl font-bold text-foreground">{item.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top objections */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Objections fréquentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.topObjections?.length ? stats.topObjections.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-foreground capitalize">{type.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground font-mono text-xs">{count}</span>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Top projects */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" />
              Types de projets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.topProjects?.length ? stats.topProjects.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-foreground capitalize">{type}</span>
                <span className="text-muted-foreground font-mono text-xs">{count}</span>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
