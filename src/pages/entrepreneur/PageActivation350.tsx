/**
 * UNPRO — Page d'activation 350 $ (paiement unique) pour entrepreneurs référés.
 * Route : /entrepreneurs/activation-350?ref=CODE
 *
 * Aucun paiement ici : le CTA mène au parcours canonique existant
 * (devis-personnalise → plan-personnalise → EntryActivation350Card →
 * create-checkout-session entry_activation_350 → webhook signé).
 * Le code ?ref est conservé dans l'URL à chaque étape et résolu côté serveur.
 */
import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Check, ShieldCheck, Info, ArrowRight } from "lucide-react";
import { captureAttribution, trackReferralEvent } from "@/hooks/useReferralAttribution";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { CallUnproLink } from "@/components/contact/CallUnproLink";
import { buildActivation350Links, normalizeRef } from "@/lib/activation350Links";

export default function PageActivation350() {
  const [sp] = useSearchParams();
  const ref = normalizeRef(sp.get("ref"));
  const links = useMemo(() => buildActivation350Links(sp), [sp]);

  useEffect(() => {
    captureAttribution(sp);
    void logFunnelEvent({ event_type: "activation_page_viewed", metadata: { ref, surface: "activation_350" } });
    if (ref) void trackReferralEvent("landing_view", ref, { role: "contractor", targetType: "activation_350" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onActivate = () => void logFunnelEvent({ event_type: "activation_cta_clicked", metadata: { ref, surface: "activation_350" } });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Activer ma présence IA — 350 $ + taxes | UNPRO</title>
        <meta name="description" content="Paiement unique de 350 $ + taxes : profil entrepreneur UNPRO et 12 mois de présence IA sur UNPRO. Aucun abonnement." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-10 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Entrepreneurs · Paiement unique</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Soyez l'entrepreneur que les propriétaires trouvent quand ils posent la question à Clara.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Des propriétaires du Québec décrivent leur projet à Clara, l'assistante d'UNPRO. Votre profil lui permet de vous considérer quand votre métier, votre territoire et vos licences correspondent.
        </p>

        <section aria-labelledby="inclus" className="mt-8 rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <h2 id="inclus" className="text-lg font-semibold">Ce que comprend l'activation</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />Votre profil d'entreprise UNPRO</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />12 mois de présence IA sur UNPRO, à partir du paiement confirmé</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />Admissibilité au jumelage UNPRO, seulement si vos licences requises (RBQ ou autres) sont valides et vérifiées</li>
            <li className="flex gap-2" data-testid="activation-350-appointments"><Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><span><strong>0 rendez-vous inclus.</strong> Des rendez-vous exclusifs peuvent être offerts ensuite, en option, à un prix et un volume affichés avant tout paiement.</span></li>
          </ul>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-2xl font-semibold">350 $ <span className="text-base font-normal text-muted-foreground">+ taxes</span></p>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="activation-350-tax">
              Avec TPS (17,50 $) et TVQ (34,91 $) : 402,41 $ CA. Paiement unique, aucun abonnement, aucun renouvellement automatique.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              À titre de référence seulement : l'ancien forfait Présence était de 49 $/mois, soit 588 $ sur 12 mois. Ce forfait n'est plus offert; ce n'est pas un prix régulier.
            </p>
          </div>

          <Link
            to={links.activate}
            onClick={onActivate}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-5 py-3 text-center font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Activer ma présence IA — 350 $ + taxes <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to={links.audit}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[18px] border border-border px-5 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Voir d'abord mon audit IA
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            Prochaine étape : confirmer votre entreprise, votre métier et votre territoire (environ 2 minutes), puis paiement sécurisé par Stripe. Votre profil n'est activé qu'après confirmation du paiement.
          </p>
        </section>

        <section aria-labelledby="honnete" className="mt-6 rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <h2 id="honnete" className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden />Ce que l'activation ne garantit pas</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Le jumelage UNPRO est distinct des recommandations de ChatGPT ou d'autres assistants indépendants. UNPRO ne contrôle pas ces outils et ne promet ni indexation ni recommandation de leur part.</li>
            <li>Le paiement ne vérifie pas votre licence RBQ : la vérification se fait séparément, et un profil sans licence valide requise reste privé.</li>
            <li>Aucun rendez-vous, recommandation ou résultat n'est garanti par l'activation.</li>
          </ul>
        </section>

        {ref && <p className="mt-6 text-center text-xs text-muted-foreground">Recommandé par un partenaire UNPRO · code {ref}</p>}
        <div className="mt-4 flex justify-center"><CallUnproLink context="activation_350_landing" label="Une question? Appeler UNPRO" compact /></div>
      </div>
    </main>
  );
}
