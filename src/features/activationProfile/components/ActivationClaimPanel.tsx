/**
 * ActivationClaimPanel — L'activation se termine SUR la page d'activation.
 *
 * Aucune redirection vers l'écran de connexion générique : le contexte
 * (entreprise, métier, région, prospect, jeton) ne peut pas être perdu.
 * Vérification par code SMS, puis rattachement idempotent au bon profil.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { supabase } from "@/integrations/supabase/client";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import type { FreeYearOffer } from "@/pages/activation/PageUnproActivate";

type Phase = "idle" | "verify" | "claiming" | "done" | "failed";

const CLAIM_ERRORS: Record<string, string> = {
  not_authenticated: "Votre session s'est terminée. Recommencez la vérification ci-dessous.",
  token_not_found: "Ce lien n'est plus reconnu. Écrivez-nous et nous réactiverons votre accès.",
  token_expired: "Ce lien a expiré. Écrivez-nous et nous vous en enverrons un nouveau.",
  prospect_not_found: "Nous ne retrouvons plus cette entreprise. Écrivez-nous, nous corrigeons.",
  already_claimed: "Ce profil a déjà été activé par un autre compte. Écrivez-nous pour en reprendre l'accès.",
  missing_business_name: "Le nom de l'entreprise est manquant. Écrivez-nous, nous le corrigeons.",
  contractor_insert_failed: "L'activation n'a pas pu être enregistrée. Réessayez dans un instant.",
  claim_write_failed: "L'activation n'a pas pu être enregistrée. Réessayez dans un instant.",
  network_error: "Connexion instable. Réessayez.",
};

interface Props {
  token: string;
  prospectId: string | null;
  company: string;
  maskedContact?: string | null;
  preview?: boolean;
  /** Capacité réelle calculée en base ; jamais de rareté affichée sans elle. */
  freeYear?: FreeYearOffer | null;
}

export default function ActivationClaimPanel({ token, prospectId, company, maskedContact, preview, freeYear }: Props) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [grantedYear, setGrantedYear] = useState<{ slot_number?: number; founder_end?: string } | null>(null);

  const attribution = { prospect_id: prospectId, token, is_test: preview };

  const claim = useCallback(async () => {
    setPhase("claiming");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("activation-claim", {
        body: { token },
      });
      if (fnError || !data?.ok) {
        const reason = (data as { reason?: string } | null)?.reason ?? "network_error";
        setError(CLAIM_ERRORS[reason] ?? CLAIM_ERRORS.network_error);
        setPhase("failed");
        void logFunnelEvent({
          event_type: "activation_error",
          step: "claim",
          metadata: { code: reason },
          ...attribution,
        });
        return;
      }
      setAlreadyClaimed(Boolean(data.already_claimed));
      const fy = (data as { free_year?: { ok?: boolean; slot_number?: number; founder_end?: string } | null }).free_year;
      setGrantedYear(fy?.ok ? { slot_number: fy.slot_number, founder_end: fy.founder_end } : null);
      setPhase("done");
      void logFunnelEvent({
        event_type: "profile_claimed",
        step: "claim",
        contractor_id: data.contractor_id ?? null,
        metadata: { already_claimed: Boolean(data.already_claimed) },
        ...attribution,
      });
      void logFunnelEvent({
        event_type: "profile_activated",
        step: "claim",
        contractor_id: data.contractor_id ?? null,
        ...attribution,
      });
    } catch {
      setError(CLAIM_ERRORS.network_error);
      setPhase("failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, prospectId, preview]);

  /** Un entrepreneur déjà connecté n'a rien à revérifier. */
  const start = useCallback(async () => {
    setError(null);
    void logFunnelEvent({ event_type: "activation_cta_clicked", step: "activate", ...attribution });
    void logFunnelEvent({
      event_type: "claim_cta_clicked",
      step: "activate",
      metadata: { free_year_eligible: Boolean(freeYear?.eligible) },
      ...attribution,
    });
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      void claim();
      return;
    }
    void logFunnelEvent({ event_type: "auth_started", step: "activate", ...attribution });
    setPhase("verify");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claim, token, prospectId, preview]);

  useEffect(() => {
    if (phase !== "verify") return;
    void logFunnelEvent({ event_type: "otp_requested", step: "activate", ...attribution });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "done") {
    return (
      <div className="rounded-3xl border border-emerald-300/25 bg-emerald-400/[0.08] p-6 text-center backdrop-blur">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
        <h2 className="text-xl font-semibold text-white">
          {alreadyClaimed ? `Le profil de ${company} est déjà activé` : `Le profil de ${company} est activé`}
        </h2>
        {grantedYear && (
          <p className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.12] p-3 text-[13.5px] leading-relaxed text-emerald-100">
            Votre première année est gratuite
            {grantedYear.slot_number ? ` (place ${grantedYear.slot_number})` : ""}
            {grantedYear.founder_end
              ? `, jusqu'au ${new Date(grantedYear.founder_end).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}`
              : ""}
            . Aucun paiement, aucun renouvellement automatique.
          </p>
        )}
        <p className="mt-2 text-[14px] leading-relaxed text-white/75">
          Complétez maintenant votre profil pour recevoir des rendez-vous exclusifs dans votre territoire.
        </p>
        <Button
          onClick={() => {
            void logFunnelEvent({ event_type: "onboarding_started", step: "post_activation", ...attribution });
            navigate("/entrepreneur/onboarding");
          }}
          className="mt-5 h-13 w-full rounded-2xl bg-white py-3.5 text-base font-semibold text-[#050816] hover:bg-white/90"
        >
          Compléter mon profil <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-6 backdrop-blur">
      {phase === "verify" ? (
        <>
          <h2 className="text-lg font-semibold text-white">Vérifions que c'est bien vous</h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">
            {maskedContact
              ? `Nous vous envoyons un code à 6 chiffres au ${maskedContact}. Confirmez le numéro ci-dessous.`
              : "Nous vous envoyons un code à 6 chiffres par texto. Aucun mot de passe."}
          </p>
          <PhoneOtpForm className="mt-5" attribution={attribution} onSuccess={() => void claim()} />
        </>
      ) : (
        <>
          <Button
            onClick={() => void start()}
            disabled={phase === "claiming"}
            className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#050816] hover:bg-white/90"
          >
            {phase === "claiming" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activation en cours…</>
            ) : (
              <>{freeYear?.eligible ? "Réclamer gratuitement ma fiche" : "Activer mon profil gratuitement"} <ArrowRight className="ml-1 h-4 w-4" /></>
            )}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/50">
            <ShieldCheck className="h-3 w-3" /> Vérification par texto. Aucun paiement.
          </p>
        </>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-3.5 text-[13px] leading-relaxed text-rose-100">
          {error}
          <button
            type="button"
            onClick={() => void start()}
            className="mt-2 block underline underline-offset-4"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
