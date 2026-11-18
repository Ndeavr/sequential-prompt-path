/**
 * SectionPlansPreviewV2 — Présence IA (décision 2026-11-18) : Lancement 350 $ en premier,
 * Fondateur 1 995 $ en option secondaire. Paiement unique, sans abonnement automatique.
 * Les anciens forfaits mensuels restent servis à leurs clients historiques ailleurs;
 * ils ne sont plus présentés ici. Montants indicatifs : le serveur fixe le prix réel.
 */
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ENTRY_350, PRESENCE_FOUNDER } from "@/lib/copy/offer350";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionPlansPreviewV2({ onTrackCta }: Props) {
  const navigate = useNavigate();
  return (
    <section id="section-plans" className="px-5 py-12">
      <div className="mx-auto max-w-md">
        <h2 className="mb-2 text-center font-display text-2xl font-bold text-foreground sm:text-3xl">Votre Présence IA UNPRO</h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">{ENTRY_350.paymentLabel}</p>
        <div className="rounded-xl border border-primary/50 bg-card p-4">
          <p className="font-display text-lg font-bold text-foreground">Présence IA — Lancement</p>
          <p className="text-sm text-muted-foreground">Profil entrepreneur + 12 mois de Présence IA sur UNPRO</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-foreground">350 $ <span className="text-sm font-normal text-muted-foreground">+ taxes · 12 mois</span></p>
          <Button size="lg" className="mt-3 h-12 w-full gap-2 rounded-xl"
            onClick={() => { onTrackCta("plans_presence_launch", "plans"); navigate("/entrepreneurs/activation-350"); }}>
            Activer mon profil — 350 $ + taxes <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-card/60 p-4">
          <p className="font-semibold text-foreground">{PRESENCE_FOUNDER.name}</p>
          <p className="text-sm text-muted-foreground">{PRESENCE_FOUNDER.price}. Mêmes prestations, sans rendez-vous, priorité ni exclusivité inclus.</p>
          <p className="mt-2 text-xs text-muted-foreground">{PRESENCE_FOUNDER.illustration}</p>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Rendez-vous : seulement selon un devis distinct, avec quantité et prix affichés avant paiement.</p>
      </div>
    </section>
  );
}
