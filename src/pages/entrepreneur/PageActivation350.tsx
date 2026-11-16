/**
 * UNPRO — Page d'activation Présence IA 350 $ pour entrepreneurs référés.
 * Route : /entrepreneurs/activation-350?ref=CODE
 *
 * Aucun paiement ici : le CTA mène au parcours canonique existant
 * (devis-personnalise → plan-personnalise → EntryActivation350Card →
 * create-checkout-session entry_activation_350 → webhook signé).
 * Le code ?ref est conservé dans l'URL à chaque étape et résolu côté serveur.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Check, ArrowRight, ChevronDown, CalendarCheck, Minus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureAttribution, trackReferralEvent } from "@/hooks/useReferralAttribution";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import { GUARANTEE_COPY, isGuaranteeOfferParam } from "../../../supabase/functions/_shared/contractGuarantee";
import Entry350FastCheckout from "@/components/entrepreneur/Entry350FastCheckout";
import { ClaraWorkPanel } from "@/components/entrepreneur/ClaraContractorWorkspace";
import UnproLogo from "@/components/brand/UnproLogo";
import AuditVideoBlock from "@/components/audit-ia/AuditVideoBlock";
import { buildActivation350Links, normalizeRef } from "@/lib/activation350Links";
import WinterFreeCodeClaim from "@/components/entrepreneur/WinterFreeCodeClaim";

export const ACTIVATION_350_APPT_DISCLOSURE =
  "Profil + 12 mois de présence UNPRO.";

export const ACTIVATION_350_CLARA_OPENING =
  "Bonjour! Je peux regarder comment votre entreprise est présentée aux propriétaires et aux IA. Quel est le nom de votre entreprise ou son site Web?";

const BENEFITS = [
  {
    t: "Un profil clair, compris par l'IA",
    d: "Nous structurons vos services, spécialités, territoires et licences pour que les moteurs de recherche et les assistants IA, dont ChatGPT, comprennent mieux ce que vous faites.",
  },
  {
    t: "12 mois d'optimisation par UNPRO",
    d: "Nous optimisons et maintenons votre profil UNPRO pendant 12 mois pour mieux présenter votre entreprise aux propriétaires et aux outils IA.",
  },
  {
    t: "Considéré pour les jumelages exclusifs UNPRO",
    d: "Clara aide à rapprocher les propriétaires et les entrepreneurs selon le type de projet, les spécialités et le territoire. Admissibilité : licences requises (RBQ ou autres) vérifiées.",
  },
];

export default function PageActivation350() {
  const [sp] = useSearchParams();
  const ref = normalizeRef(sp.get("ref"));
  const links = useMemo(() => buildActivation350Links(sp), [sp]);
  const [chatOpen, setChatOpen] = useState(false);
  const reviewOpen = sp.get("activate") === "1";
  const guarantee = isGuaranteeOfferParam(sp.get("offre"));

  useEffect(() => {
    if (reviewOpen) requestAnimationFrame(() => document.getElementById("inscription")?.scrollIntoView({ block: "start" }));
  }, [reviewOpen]);

  useEffect(() => {
    captureAttribution(sp);
    void logFunnelEvent({ event_type: "activation_page_viewed", metadata: { ref, surface: "activation_350" } });
    if (ref) void trackReferralEvent("landing_view", ref, { role: "contractor", targetType: "activation_350" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onActivate = () => void logFunnelEvent({ event_type: "activation_cta_clicked", metadata: { ref, surface: "activation_350" } });
  const ctaCls =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-primary px-5 py-3 text-center font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

  return (
    <main className="home-light activation-clara-page min-h-screen bg-background pb-28 text-foreground sm:pb-10">
      <Helmet>
        <title>Profil UNPRO — Présence IA 350 $ + taxes, paiement unique pour 12 mois | UNPRO</title>
        <meta name="description" content="Le profil AIPP est un profil professionnel structuré qui aide les outils IA à comprendre votre entreprise. 12 mois de présence IA sur UNPRO, paiement unique de 350 $ + taxes applicables." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto w-full max-w-xl px-4 pt-4 sm:pt-6">
        <UnproLogo size={110} variant="primary" animated={false} />

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Entrepreneurs · Inscription</p>
        <h1 className="mt-2 text-[2rem] font-bold leading-[1.1] sm:text-4xl">Votre entreprise est-elle bien comprise par les intelligences artificielles&nbsp;?</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Le profil AIPP est un profil professionnel structuré pour les recherches IA : il rassemble vos services, votre expertise, vos secteurs et vos preuves de confiance. Même si votre entreprise n'a pas besoin de clients supplémentaires, cette présence IA reste utile.
        </p>

        <div className="mt-5 rounded-[28px] border border-border bg-card p-5" data-testid="activation-350-offer">
          <p className="text-lg font-semibold">Profil AIPP + 12 mois de présence IA sur UNPRO</p>
          <p className="mt-1 text-3xl font-semibold">350 $ <span className="text-base font-normal text-muted-foreground">+ taxes · paiement unique pour 12 mois</span></p>
          <p className="mt-1 text-sm text-muted-foreground" data-testid="activation-350-monthly-equivalent">L’équivalent de 29,17 $ par mois pendant un an — 350 $ + taxes, payable en un versement.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {["Profil entreprise UNPRO complet", "12 mois de présence sur UNPRO", "Vos préférences : mandats voulus, exclusions et territoires desservis", "Couvre 12 mois, aucun renouvellement automatique"].map((x) => (
              <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{x}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            <strong className="text-foreground">Après l'achat :</strong> vous confirmez votre métier et votre territoire, puis votre profil est activé dès la confirmation du paiement par Stripe. Aucun rendez-vous n'est inclus par défaut.
          </p>
          <div className="mt-5 space-y-3">
            <Link to={links.activate} onClick={onActivate} className={ctaCls} data-testid="activation-350-cta">
              Activer mon profil AIPP — 350 $ + taxes <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Button type="button" variant="outline" className="min-h-11 w-full rounded-[18px]" aria-expanded={chatOpen} aria-controls="activation-clara-chat" onClick={() => setChatOpen((o) => !o)}>
              {chatOpen ? <Minus className="h-4 w-4" aria-hidden /> : <MessageCircle className="h-4 w-4" aria-hidden />} Parler à Clara
            </Button>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Vous désirez aussi des rendez-vous exclusifs&nbsp;? C'est une option distincte, jamais incluse par défaut. <Link to={links.more} className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Voir les options</Link>
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          Comment ça marche : Clara note vos types de travaux, vos secteurs et vos préférences. Les jumelages se font selon les demandes compatibles, votre disponibilité et votre admissibilité. Les rendez-vous dépendent de l'offre choisie et des demandes reçues ; l'offre exacte est affichée avant tout paiement.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground" aria-label="Exemples de préférences">
          <li>« Des thermopompes centrales plutôt que des réparations »</li>
          <li>« De la peinture intérieure, seulement dans mon secteur »</li>
          <li>« De l'isolation d'entretoit »</li>
        </ul>

        {(sp.get("code") || "").toUpperCase().startsWith("HIVER-") || sp.get("offre") === "hiver" ? <WinterFreeCodeClaim initialCode={sp.get("code")} /> : null}

        {reviewOpen && <div id="inscription" className="scroll-mt-4"><Entry350FastCheckout query={sp} /></div>}
        {sp.get("checkout") === "success" && <div className="mt-4"><ClaraWorkPanel fr returnedFromCheckout /></div>}

        <div id="activation-clara-chat" className="activation-clara-chat mt-4" hidden={!chatOpen}>
          <ClaraConversationBox
            forcedAudience="contractor"
            contractorOpening={ACTIVATION_350_CLARA_OPENING}
            heading="Parler à Clara"
          />
        </div>

        <Link to={links.audit} className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[18px] border border-border px-5 py-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Voir mon audit IA gratuit
        </Link>
      </div>

      <div className="mt-6" aria-label="Vidéo de présentation UNPRO">
        <AuditVideoBlock />
      </div>

      <div className="mx-auto w-full max-w-xl px-4">
        <section aria-labelledby="change" className="mt-4 rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <h2 id="change" className="text-xl font-semibold">Voici ce que 350 $ change pour votre entreprise</h2>
          <ul className="mt-5 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b.t} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10"><Check className="h-4 w-4 text-primary" aria-hidden /></span>
                <span><span className="block font-semibold">{b.t}</span><span className="mt-1 block text-sm text-muted-foreground">{b.d}</span></span>
              </li>
            ))}
          </ul>

          <p className="mt-5 rounded-2xl bg-muted p-4 text-sm">
            <strong>Notre engagement :</strong> Votre profil professionnel UNPRO, optimisé et présent pendant 12 mois.
          </p>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-3xl font-semibold">350 $ <span className="text-base font-normal text-muted-foreground">+ taxes</span></p>
            <p className="mt-2 text-xs text-muted-foreground">Valeur de référence : l'ancien forfait Présence (49 $/mois) totalisait 588 $ sur 12 mois.</p>
          </div>

          <Link to={links.activate} onClick={onActivate} className={`mt-5 ${ctaCls}`}>
            Activer mon profil AIPP <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <p className="mt-3 text-sm text-muted-foreground" data-testid="activation-350-appointments">{ACTIVATION_350_APPT_DISCLOSURE}</p>

          <details className="group mt-4 rounded-2xl border border-border px-4 py-3 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Détails et conditions <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Prochaine étape : confirmer votre entreprise, votre métier et votre territoire, puis paiement sécurisé par Stripe. Le profil est activé seulement après confirmation du paiement.</li>
              <li>Le paiement ne vérifie pas votre licence : la vérification RBQ (si requise) se fait séparément. Sans licence valide, le profil reste privé et n'est pas jumelé.</li>
              <li>ChatGPT, Google et les autres assistants sont des outils indépendants. UNPRO ne les contrôle pas et ne garantit ni classement, ni réponse, ni indexation de leur part.</li>
              {guarantee
                ? <li>Offre 10 contrats garantis : {GUARANTEE_COPY.conditions} Aucun rendez-vous ni recommandation n'est garanti séparément.</li>
                : <li>Aucun rendez-vous, recommandation ou résultat n'est garanti par l'activation.</li>}
            </ul>
          </details>
        </section>

        <section aria-labelledby="rdv" className="mt-6 rounded-[28px] border border-border bg-card p-5 sm:p-6">
          <h2 id="rdv" className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck className="h-5 w-5 text-primary" aria-hidden />Vous voulez des rendez-vous qualifiés exclusifs dès maintenant?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Découvrez les options pour votre métier et votre région. Prix et volume affichés avant tout paiement.</p>
          <Link to={links.more} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="activation-350-more">
            Je veux aussi des rendez-vous exclusifs <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link to="/entrepreneurs/thermopompes" className="mt-2 block text-sm text-muted-foreground underline-offset-4 hover:underline">Thermopompes : des rendez-vous selon vos préférences</Link>
          <Link to="/calendrier-intelligent" className="mt-2 block text-sm text-muted-foreground underline-offset-4 hover:underline" data-testid="activation-350-calendar">
            Découvrir le calendrier intelligent UNPRO
          </Link>
        </section>

      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        <Link to={links.activate} onClick={onActivate} className={ctaCls}>
          Activer mon profil AIPP · 350 $
        </Link>
      </div>
    </main>
  );
}
