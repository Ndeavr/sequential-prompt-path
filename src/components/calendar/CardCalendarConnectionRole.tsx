/**
 * CardCalendarConnectionRole — generic role-aware connection card with prompt + CTAs.
 */
import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import ButtonConnectGoogleCalendar from "./ButtonConnectGoogleCalendar";
import ButtonSubscribeAppleCalendar from "./ButtonSubscribeAppleCalendar";
import PanelCalendarConnectionBenefits from "./PanelCalendarConnectionBenefits";
import PanelCalendarPermissionsExplainer from "./PanelCalendarPermissionsExplainer";
import BadgeCalendarConnectionStatus from "./BadgeCalendarConnectionStatus";
import { useCalendarConnections, useCalendarPrompt, useCalendarConversionTracking } from "@/hooks/useCalendarConnection";
import { useEffect } from "react";

interface Props {
  role: "homeowner" | "contractor" | "professional";
  surface?: string;
  lang?: "fr" | "en";
  showAppleCTA?: boolean;
  returnTo?: string;
}

export default function CardCalendarConnectionRole({
  role,
  surface = "dashboard",
  lang = "fr",
  showAppleCTA = true,
  returnTo,
}: Props) {
  const prompt = useCalendarPrompt(role, surface, lang);
  const { primary, isConnected, hasExternalAppleFeed, loading } = useCalendarConnections();
  const { track } = useCalendarConversionTracking();

  useEffect(() => {
    track({ surface, role_context: role, event_type: "prompt_viewed" });
  }, [surface, role]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card/95 to-card/80 p-5 sm:p-6 shadow-lg backdrop-blur-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Calendrier</p>
            <h3 className="text-base font-bold text-foreground">{prompt?.headline ?? "Connectez votre calendrier"}</h3>
          </div>
        </div>
        {!loading && primary && <BadgeCalendarConnectionStatus status={primary.connection_status} />}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        {prompt?.subtext ?? "On vérifie seulement votre disponibilité."}
      </p>

      {loading && (
        <p role="status" className="text-sm text-muted-foreground mb-5">
          Vérification de la connexion…
        </p>
      )}

      {!loading && !isConnected && (
        <div className="space-y-2.5 mb-5">
          {hasExternalAppleFeed && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-foreground">
              <p className="font-semibold">Lien d'abonnement Apple généré.</p>
              <p className="mt-1 text-muted-foreground">
                Envoi unidirectionnel seulement. UNPRO ne peut ni confirmer l'abonnement dans Apple,
                ni lire vos disponibilités. Connectez Google pour synchroniser les plages occupées.
              </p>
            </div>
          )}
          <ButtonConnectGoogleCalendar
            surface={surface}
            role={role}
            returnTo={returnTo}
            label={prompt?.primary_cta ?? "Connecter Google Calendar"}
            className="w-full"
          />
          {showAppleCTA && !hasExternalAppleFeed && (
            <ButtonSubscribeAppleCalendar
              surface={surface}
              role={role}
              label={prompt?.secondary_cta ?? "Créer un lien Apple Calendar (envoi seulement)"}
              className="w-full"
            />
          )}
          <p className="text-xs text-muted-foreground text-center pt-1">
            Google : lecture de disponibilités avec autorisation. Apple : abonnement sortant seulement.
          </p>
        </div>
      )}

      {!loading && isConnected && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-600/25 mb-5">
          <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Connexion Google Calendar enregistrée{primary?.provider === "google" && primary.provider_account_email ? ` — ${primary.provider_account_email}` : ""}.
          </p>
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <PanelCalendarConnectionBenefits role={role} />
          <PanelCalendarPermissionsExplainer />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Les suggestions selon vos créneaux occupés seront disponibles après une connexion Google autorisée.
        </p>
      )}
    </motion.div>
  );
}
