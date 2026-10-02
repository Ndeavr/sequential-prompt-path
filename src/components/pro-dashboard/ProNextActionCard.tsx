/**
 * UNPRO — Après activation : une seule prochaine action utile.
 *
 * Vérification RBQ manquante → la nommer précisément.
 * Sinon disponibilités manquantes → les indiquer.
 * Sinon → voir les rendez-vous.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isContractorAgreementActive } from "@/lib/billing/contractorActivationState";

interface Props {
  profile: any;
  appointments: any[];
}

export default function ProNextActionCard({ profile, appointments }: Props) {
  const [hasAvailability, setHasAvailability] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!profile?.id) return;
    void (async () => {
      const { count } = await supabase
        .from("booking_availability")
        .select("id", { count: "exact", head: true })
        .eq("contractor_id", profile.id)
        .eq("is_active", true);
      if (!cancelled) setHasAvailability((count ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const rbqPending =
    !profile?.rbq_number || profile?.rbq_compliance_status !== "verified";

  let title: string;
  let detail: string;
  let cta: string;
  let to: string;

  if (rbqPending) {
    title = "Prochaine action : votre licence RBQ";
    detail = !profile?.rbq_number
      ? "Ajoutez votre numéro de licence RBQ à votre fiche. Sans lui, aucun mandat ne peut vous être confié."
      : "Votre licence RBQ est en cours de vérification par UNPRO. Vous pouvez compléter votre fiche pendant ce temps.";
    cta = "Compléter ma fiche";
    to = "/pro/profile";
  } else if (hasAvailability === false) {
    title = "Prochaine action : vos disponibilités";
    detail = "Indiquez vos plages horaires pour recevoir des rendez-vous. Aucun compte externe requis.";
    cta = "Indiquer mes disponibilités";
    to = "/pro/booking-settings";
  } else {
    title = "Prochaine action : vos rendez-vous";
    detail = `Vous avez ${appointments.length} rendez-vous dans votre espace.`;
    cta = "Voir mes rendez-vous";
    to = "/pro/appointments";
  }

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/70 p-5 space-y-3"
      data-testid="pro-next-action"
    >
      {isContractorAgreementActive(profile) && (
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Votre entente est activée.
        </p>
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{detail}</p>
      </div>
      <Link
        to={to}
        className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2"
      >
        {cta} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
