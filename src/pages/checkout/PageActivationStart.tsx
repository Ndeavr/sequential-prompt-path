/**
 * Module 4 — Activation Start Page
 * Every status here is read back from saved server state:
 * - plan: contractor_subscriptions (active/trialing) written by the payment webhook;
 * - calendar: calendar_connections via deriveCalendarReadiness (canonical OAuth);
 * - appointments: never marked ready from this page.
 * Nothing is shown as paid, connected or confirmed without that proof.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, Calendar, Check, Clock, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useContractorProfile } from "@/hooks/useContractor";
import { useContractorSubscription } from "@/hooks/useSubscription";
import { useCalendarConnections, type CalendarReadiness } from "@/hooks/useCalendarConnection";
import { calendarSuccessPath } from "@/lib/calendarReturn";
import ButtonConnectGoogleCalendar from "@/components/calendar/ButtonConnectGoogleCalendar";
import GoogleCalendarSelector from "@/components/calendar/GoogleCalendarSelector";
import { cn } from "@/lib/utils";

export const ACTIVATION_START_ROUTE = "/activation/start";
const CALENDAR_RETURN = calendarSuccessPath({ role: "contractor", surface: "activation_start", returnTo: ACTIVATION_START_ROUTE });
const ACTIVE_STATUSES = ["active", "trialing"];

type StepStatus = "done" | "pending" | "unknown";

export function calendarStepLabel(readiness: CalendarReadiness): string {
  switch (readiness) {
    case "ready": return "Agenda connecté";
    case "no_selection": return "Agenda : calendrier à choisir";
    case "not_synced": return "Disponibilités à confirmer";
    default: return "Agenda : connexion à terminer";
  }
}

export default function PageActivationStart() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const profile = useContractorProfile();
  const sub = useContractorSubscription();
  const calendar = useCalendarConnections();

  const planLoading = profile.isLoading || (!!profile.data?.id && sub.isLoading);
  const planError = profile.isError || sub.isError;
  const planActive = !!sub.data && ACTIVE_STATUSES.includes(sub.data.status);

  const steps: { code: string; title: string; status: StepStatus }[] = [
    { code: "plan_confirmed", title: planActive ? "Plan actif confirmé" : "Paiement à confirmer", status: planLoading || planError ? "unknown" : planActive ? "done" : "pending" },
    { code: "profile_created", title: "Profil créé", status: profile.isLoading || profile.isError ? "unknown" : profile.data?.id ? "done" : "pending" },
    { code: "calendar_connected", title: calendarStepLabel(calendar.readiness), status: calendar.loading || calendar.error ? "unknown" : calendar.readiness === "ready" ? "done" : "pending" },
    { code: "appointments", title: "Rendez-vous : en attente", status: "pending" },
    { code: "cockpit_ready", title: "Cockpit accessible", status: session ? "done" : "pending" },
  ];

  const connectButton = (label?: string) => (
    <ButtonConnectGoogleCalendar surface="activation_start" role="contractor" returnTo={CALENDAR_RETURN} className="w-full h-12" label={label} />
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3">
          <p className="text-sm font-bold text-foreground">Mise en route</p>
          <p className="text-xs text-muted-foreground">L'état réel de votre activation</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-36">
        {/* Plan status — server truth only */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/50 bg-card p-4" data-plan-status={planLoading ? "loading" : planError ? "error" : planActive ? "active" : "pending"}>
          {planLoading ? (
            <div role="status" className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden />
              <p className="text-sm text-foreground">Vérification de votre plan…</p>
            </div>
          ) : planError ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-foreground">Nous n'avons pas pu vérifier votre plan.</p>
              <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => { void profile.refetch(); void sub.refetch(); }}>Vérifier à nouveau</Button>
            </div>
          ) : planActive ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"><Check className="w-5 h-5 text-primary" aria-hidden /></div>
              <div>
                <p className="text-sm font-bold text-foreground">Plan actif</p>
                <p className="text-xs text-muted-foreground">Confirmé par votre compte</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 mt-0.5 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-sm font-bold text-foreground">Paiement à confirmer</p>
                  <p className="text-xs text-muted-foreground">Votre plan s'affichera comme actif dès que le paiement sera confirmé.</p>
                </div>
              </div>
              <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => navigate("/entrepreneur/activer/plan")}>Voir mon plan</Button>
            </div>
          )}
        </motion.div>

        {/* Checklist */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
          <p className="text-sm font-bold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" aria-hidden /> Checklist d'activation</p>
          <ul className="space-y-3">
            {steps.map((step) => (
              <li key={step.code} className="flex items-center gap-3" data-step={step.code} data-status={step.status}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", step.status === "done" ? "bg-primary/15" : "bg-muted/50")}>
                  {step.status === "done" ? <Check className="w-4 h-4 text-primary" aria-hidden /> : step.status === "unknown" ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" aria-hidden /> : <Clock className="w-4 h-4 text-muted-foreground" aria-hidden />}
                </div>
                <span className={cn("text-sm font-medium", step.status === "done" ? "text-foreground" : "text-muted-foreground")}>{step.title}</span>
                <span className="sr-only">{step.status === "done" ? "terminé" : step.status === "unknown" ? "vérification" : "en attente"}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Calendar — saved connection only; errors never block the other steps */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card p-5 space-y-3" data-calendar-readiness={calendar.loading ? "loading" : calendar.error ? "error" : calendar.readiness}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-primary" aria-hidden /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{calendar.loading ? "Vérification de votre agenda…" : calendarStepLabel(calendar.readiness)}</p>
              <p className="text-xs text-muted-foreground mt-1">Vous pouvez continuer les autres étapes même si l'agenda n'est pas encore prêt.</p>
            </div>
          </div>
          {calendar.loading ? null : calendar.error ? (
            <div role="alert" className="space-y-2">
              <p className="text-sm text-foreground">Nous n'avons pas pu vérifier votre agenda.</p>
              <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => void calendar.refresh()}>Vérifier à nouveau</Button>
            </div>
          ) : calendar.readiness === "not_connected" ? connectButton("Connecter Google Agenda")
            : calendar.readiness === "reconnect_required" ? (
              <div className="space-y-2">
                <p className="flex items-start gap-2 text-sm text-foreground"><AlertTriangle className="w-4 h-4 mt-0.5 text-destructive" aria-hidden />L'accès à Google Agenda a été retiré ou est incomplet.</p>
                {connectButton("Reconnecter Google Agenda")}
              </div>
            ) : calendar.readiness === "no_selection" ? <GoogleCalendarSelector />
            : calendar.readiness === "not_synced" ? <p className="text-xs text-muted-foreground">Vos disponibilités ne sont pas encore synchronisées : statut en attente.</p>
            : <p className="text-xs text-muted-foreground">{calendar.google?.provider_account_email ?? "Google Agenda"}</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><BarChart3 className="w-5 h-5 text-primary" aria-hidden /></div>
            <div>
              <p className="text-sm font-bold text-foreground">Votre cockpit</p>
              <p className="text-xs text-muted-foreground">Suivez votre profil, votre agenda et vos demandes.</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/30 p-4">
        <div className="max-w-lg mx-auto space-y-2">
          <Button size="lg" variant="premium" className="w-full h-12 rounded-xl text-base" onClick={() => navigate("/pro")}>
            <BarChart3 className="w-4 h-4 mr-2" aria-hidden /> Entrer dans mon cockpit
          </Button>
          <Button variant="outline" size="lg" className="w-full h-10 rounded-xl text-sm" onClick={() => navigate("/conversation")}>
            <MessageCircle className="w-4 h-4 mr-2" aria-hidden /> Parler à Clara
          </Button>
        </div>
      </div>
    </div>
  );
}
