/**
 * PageCalendarConnectionSuccess — post-OAuth landing.
 * Says "connected" only after rereading the saved connection with the
 * required Google permissions, then returns to the starting route/context.
 */
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCalendarConnections, useCalendarConversionTracking, useStartGoogleOAuth } from "@/hooks/useCalendarConnection";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import { CALENDAR_CHANGED_EVENT, calendarContextFallback, safeCalendarReturn } from "@/lib/calendarReturn";
import GoogleCalendarSelector from "@/components/calendar/GoogleCalendarSelector";

export default function PageCalendarConnectionSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { activeRole } = useActiveRole();
  const provider = params.get("provider") ?? "google";
  const role = params.get("role") === "contractor" || params.get("role") === "professional"
    ? params.get("role") as "contractor" | "professional"
    : "homeowner";
  const surface = params.get("surface") ?? "callback_success";
  const { primary, isConnected, loading, error, refresh } = useCalendarConnections();
  const { track } = useCalendarConversionTracking();
  const { startGoogle } = useStartGoogleOAuth();
  const [retrying, setRetrying] = useState(false);
  const tracked = useRef(false);

  // Starting route first; contextual fallback only when it is missing. Never forces a role.
  const backTo = safeCalendarReturn(params.get("return_to")) ?? calendarContextFallback(activeRole);

  useEffect(() => {
    if (loading || !isConnected || tracked.current) return;
    tracked.current = true;
    window.dispatchEvent(new Event(CALENDAR_CHANGED_EVENT));
    track({ surface, role_context: role, event_type: "contractor_calendar_connected", provider });
  }, [loading, isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = async () => {
    setRetrying(true);
    try {
      const started = await startGoogle(`${window.location.pathname}${window.location.search}`);
      if (!started) setRetrying(false);
    } catch {
      setRetrying(false);
    }
  };

  return (
    <MainLayout>
      <Helmet>
        <title>{isConnected ? "Calendrier connecté" : "Connexion du calendrier"} — UNPRO</title>
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {loading ? (
            <div role="status" className="rounded-2xl border border-border/50 bg-card/60 p-6 text-center">
              <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-foreground">Vérification de votre connexion Google…</p>
            </div>
          ) : isConnected ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Calendrier connecté</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Google Agenda{primary?.provider_account_email ? ` · ${primary.provider_account_email}` : ""}
              </p>
            </div>
          ) : (
            <div role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
              <AlertTriangle className="w-7 h-7 mx-auto mb-3 text-amber-400" aria-hidden />
              <h1 className="text-xl font-bold text-foreground">Connexion non confirmée</h1>
              <p className="text-sm text-muted-foreground mt-2">
                {error
                  ? "Nous n'avons pas pu relire votre connexion. Réessayez dans un instant."
                  : "Google n'a pas accordé toutes les autorisations d'agenda nécessaires, ou l'accès a été retiré. Vous pouvez reprendre la connexion."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={() => void (error ? refresh() : retry())} disabled={retrying} className="rounded-full">
                  {error ? "Vérifier à nouveau" : retrying ? "Ouverture de Google…" : "Reprendre la connexion Google"}
                </Button>
              </div>
            </div>
          )}

          {!loading && isConnected && provider === "google" && <GoogleCalendarSelector />}

          <div className="flex gap-2">
            <Button onClick={() => navigate(backTo, { replace: true })} className="flex-1 rounded-full">
              {isConnected ? "Continuer" : "Retour"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/account")} className="flex-1 rounded-full">Mon compte</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
