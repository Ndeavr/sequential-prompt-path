/**
 * Screen 6 — Calendar Connection
 * Real Google Calendar OAuth (canonical module) + simple availability + sticky CTA.
 * "Connecté" is shown only from the saved calendar_connections row read back from
 * the server; a click never marks the calendar connected.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, Loader2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import { useCalendarConnections } from "@/hooks/useCalendarConnection";
import { calendarSuccessPath } from "@/lib/calendarReturn";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import ButtonConnectGoogleCalendar from "@/components/calendar/ButtonConnectGoogleCalendar";
import GoogleCalendarSelector from "@/components/calendar/GoogleCalendarSelector";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const TIME_SLOTS = ["8h-12h", "12h-17h", "17h-20h"];

export const ACTIVATION_CALENDAR_ROUTE = "/entrepreneur/activer/calendrier";
/** Google returns to the success check, which then brings the user back here. */
export const ACTIVATION_CALENDAR_OAUTH_RETURN = calendarSuccessPath({
  role: "contractor",
  surface: "activation",
  returnTo: ACTIVATION_CALENDAR_ROUTE,
});

export default function ScreenCalendar() {
  const navigate = useNavigate();
  const { state, loading: funnelLoading, updateFunnel } = useActivationFunnel();
  const { google, readiness, loading, error, refresh } = useCalendarConnections();
  const [selectedDays, setSelectedDays] = useState<string[]>(["Lun", "Mar", "Mer", "Jeu", "Ven"]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(["8h-12h", "12h-17h"]);
  useHesitationRescue({ screenKey: "calendar" });

  // Mirror the funnel flag from server truth only (both directions), never from a click.
  const serverReady = readiness === "ready";
  useEffect(() => {
    if (funnelLoading || loading || error || !state.id) return;
    if (state.calendar_connected !== serverReady) void updateFunnel({ calendar_connected: serverReady });
  }, [funnelLoading, loading, error, state.id, state.calendar_connected, serverReady, updateFunnel]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const handleContinue = () => navigate("/entrepreneur/activer/plan");
  const email = google?.provider_account_email ?? null;

  const connectButton = (label?: string) => (
    <ButtonConnectGoogleCalendar
      surface="activation"
      role="contractor"
      returnTo={ACTIVATION_CALENDAR_OAUTH_RETURN}
      className="w-full h-12"
      label={label}
    />
  );

  return (
    <FunnelLayout currentStep="assets_studio" showProgress={false}>
      <motion.div
        className="max-w-md mx-auto pb-28 sm:pb-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">Connectez votre calendrier</h1>
        <p className="text-sm text-muted-foreground mb-6">Recevez des rendez-vous directement dans votre agenda.</p>

        {/* Google Calendar connect — state read from the saved connection */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 mb-6 space-y-3" data-calendar-readiness={loading ? "loading" : error ? "error" : readiness}>
          {loading ? (
            <div role="status" className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-foreground">Vérification de votre agenda…</p>
            </div>
          ) : error ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-foreground">Nous n'avons pas pu vérifier votre agenda.</p>
              <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => void refresh()}>
                Vérifier à nouveau
              </Button>
            </div>
          ) : readiness === "not_connected" ? (
            connectButton()
          ) : readiness === "reconnect_required" ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-500" aria-hidden />
                <p className="text-sm text-foreground">
                  L'accès à Google Agenda a été retiré ou est incomplet. Reconnectez-le pour recevoir des rendez-vous.
                </p>
              </div>
              {connectButton("Reconnecter Google Agenda")}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {readiness === "ready" ? "Prêt à recevoir des rendez-vous" : "Google Agenda connecté"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {readiness === "no_selection"
                      ? "Choisissez votre calendrier"
                      : readiness === "not_synced"
                        ? "Disponibilités non encore synchronisées"
                        : email ?? "Google Agenda"}
                  </p>
                </div>
              </div>
              {readiness === "no_selection" && <GoogleCalendarSelector />}
            </>
          )}
        </div>

        {/* Availability selector */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-3">Disponibilités</h3>
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Jours disponibles</p>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                    selectedDays.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/50 text-muted-foreground"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Plages horaires</p>
            <div className="flex gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                    selectedSlots.includes(slot)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/50 text-muted-foreground"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop CTAs */}
        <div className="space-y-3 hidden sm:block">
          <Button size="lg" className="w-full h-14 text-base font-semibold rounded-xl" onClick={handleContinue}>
            Voir mon plan recommandé
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={handleContinue}>
            <SkipForward className="w-4 h-4 mr-2" />
            Passer pour l'instant
          </Button>
        </div>
      </motion.div>

      <StickyMobileCTA
        label="Voir mon plan recommandé"
        onClick={handleContinue}
        icon={<ArrowRight className="w-5 h-5 mr-2" />}
        secondaryLabel="Passer pour l'instant"
        secondaryOnClick={handleContinue}
        secondaryIcon={<SkipForward className="w-4 h-4 mr-2" />}
      />
    </FunnelLayout>
  );
}
