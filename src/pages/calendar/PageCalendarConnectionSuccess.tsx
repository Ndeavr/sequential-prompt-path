/**
 * PageCalendarConnectionSuccess — post-OAuth landing.
 */
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useCalendarConnections, useCalendarConversionTracking } from "@/hooks/useCalendarConnection";
import WidgetCalendarAvailabilityPreview from "@/components/calendar/WidgetCalendarAvailabilityPreview";

export default function PageCalendarConnectionSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const provider = params.get("provider") ?? "google";
  const { primary, refresh } = useCalendarConnections();
  const { track } = useCalendarConversionTracking();

  useEffect(() => {
    refresh();
    track({ surface: "callback_success", event_type: "calendar_connected", provider });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MainLayout>
      <Helmet>
        <title>Calendrier connecté — UNPRO</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Calendrier connecté</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {provider === "google" ? "Google Calendar" : "Apple Calendar"}
              {primary?.provider_account_email ? ` · ${primary.provider_account_email}` : ""}
            </p>
          </div>

          <WidgetCalendarAvailabilityPreview role="homeowner" />

          <div className="flex gap-2">
            <Button onClick={() => navigate("/dashboard")} className="flex-1 rounded-full">Mon tableau de bord</Button>
            <Button variant="outline" onClick={() => navigate("/account")} className="flex-1 rounded-full">Mon compte</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
