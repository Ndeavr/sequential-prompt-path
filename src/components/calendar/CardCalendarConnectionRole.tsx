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
}

export default function CardCalendarConnectionRole({
  role,
  surface = "dashboard",
  lang = "fr",
  showAppleCTA = true,
}: Props) {
  const prompt = useCalendarPrompt(role, surface, lang);
  const { primary, isConnected } = useCalendarConnections();
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
        {primary && <BadgeCalendarConnectionStatus status={primary.connection_status} />}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        {prompt?.subtext ?? "On vérifie seulement votre disponibilité."}
      </p>

      {!isConnected && (
        <div className="space-y-2.5 mb-5">
          <ButtonConnectGoogleCalendar
            surface={surface}
            role={role}
            label={prompt?.primary_cta ?? "Connecter Google Calendar"}
            className="w-full"
          />
          {showAppleCTA && (
            <ButtonSubscribeAppleCalendar
              surface={surface}
              role={role}
              label={prompt?.secondary_cta ?? "S'abonner avec Apple Calendar"}
              className="w-full"
            />
          )}
        </div>
      )}

      {isConnected && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">
            Calendrier connecté{primary?.provider_account_email ? ` — ${primary.provider_account_email}` : ""}.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <PanelCalendarConnectionBenefits role={role} />
        <PanelCalendarPermissionsExplainer />
      </div>
    </motion.div>
  );
}
