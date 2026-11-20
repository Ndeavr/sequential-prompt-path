/**
 * UNPRO — /entrepreneur/:slug/reclamer
 *
 * Entrée de réclamation sûre :
 *  - ?t=<jeton opaque> → parcours canonique /unpro/activate/:token
 *    (fiche préremplie sourcée, réclamation authentifiée avec code,
 *    checkout canonique 350 $ + taxes, activation par webhook seulement) ;
 *  - sans jeton → seule une fiche déjà publique est montrée, avec son nom
 *    exact ; aucun nom n'est déduit de l'URL ; sinon 404 honnête.
 * Aucun paiement sur cette page. L'ancien checkout de réclamation est retiré.
 */
import { useEffect, useMemo } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ShieldCheck, MapPin, Wrench, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CorrectionRequestCard from "@/features/contractorProfile/recommendationPage/sections/CorrectionRequestCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import {
  isOpaqueToken,
  isValidSlug,
  publicVerificationLabel,
  resolveClaimEntry,
  type PublicContractorRow,
} from "@/lib/contractor/claimEntry";

const T = {
  fr: {
    title: "Réclamer cette entreprise · UNPRO",
    back: "Retour",
    notFoundTitle: "Fiche introuvable",
    notFoundBody:
      "Aucune fiche publique ne correspond à cette adresse. Si vous avez reçu un lien personnel UNPRO, ouvrez-le tel quel : il contient votre code d'accès.",
    notFoundCta: "Identifier mon entreprise",
    prefilled: "Informations publiques à confirmer",
    city: "Ville",
    trade: "Métier",
    pending: "En attente",
    attachedTitle: "Cette fiche est déjà rattachée à un compte",
    attachedBody:
      "Un lien public ne prouve pas la propriété d'une entreprise. Si c'est votre entreprise, l'équipe UNPRO vérifie la demande (contact maîtrisé, NEQ, licence RBQ) avant tout changement.",
    ownTitle: "C'est votre fiche",
    ownBody: "Complétez votre profil avec Clara, puis activez votre présence : 350 $ + taxes, paiement unique, 12 mois.",
    ownCta: "Compléter ma fiche",
    activateCta: "Voir l'activation 350 $ + taxes",
    noPayment: "Aucun paiement sur cette page. L'activation est confirmée seulement après la confirmation du paiement par Stripe.",
  },
  en: {
    title: "Claim this business · UNPRO",
    back: "Back",
    notFoundTitle: "Profile not found",
    notFoundBody:
      "No public profile matches this address. If you received a personal UNPRO link, open it as is: it contains your access code.",
    notFoundCta: "Identify my business",
    prefilled: "Public information to confirm",
    city: "City",
    trade: "Trade",
    pending: "Pending",
    attachedTitle: "This profile is already linked to an account",
    attachedBody:
      "A public link does not prove ownership. If this is your business, the UNPRO team reviews the request (verified contact, NEQ, RBQ licence) before any change.",
    ownTitle: "This is your profile",
    ownBody: "Complete your profile with Clara, then activate your presence: $350 + taxes, one-time payment, 12 months.",
    ownCta: "Complete my profile",
    activateCta: "See the $350 + taxes activation",
    noPayment: "No payment on this page. Activation is confirmed only after Stripe confirms the payment.",
  },
} as const;

export default function PageClaimWizard() {
  const { slug = "" } = useParams<{ slug: string }>();
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const { user, isLoading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const t = T[lang === "en" ? "en" : "fr"];
  const hasToken = isOpaqueToken(search.get("t"));

  const { data: contractor, isLoading } = useQuery({
    queryKey: ["claim-entry-contractor", slug],
    enabled: !hasToken && isValidSlug(slug),
    queryFn: async (): Promise<PublicContractorRow | null> => {
      // Même source que la fiche publique /entrepreneur/:slug (RLS publique).
      const { data, error } = await supabase
        .from("contractors")
        .select("id, user_id, business_name, city, specialty, public_status")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as PublicContractorRow | null) ?? null;
    },
    retry: 0,
  });

  const entry = resolveClaimEntry({
    slug,
    search,
    contractor: contractor ?? null,
    viewerUserId: user?.id ?? null,
  });

  useEffect(() => {
    if (entry.kind === "redirect_token" || isLoading) return;
    void logFunnelEvent({
      event_type: "landing_viewed",
      step: "claim_entry",
      // Chemin sans paramètres : jamais de jeton ni de PII dans les journaux.
      current_path: "/entrepreneur/:slug/reclamer",
      token: "",
      suppress_prospect_ref: true,
      contractor_id: "contractor" in entry ? entry.contractor.id : null,
      dedupe_key: `claim_entry_view:${slug}`,
      metadata: { surface: "claim_entry", outcome: entry.kind, utm_source: search.get("utm_source"), utm_campaign: search.get("utm_campaign") },
    });
  }, [entry.kind, isLoading, slug, search]);

  if (entry.kind === "redirect_token") return <Navigate to={entry.path} replace />;

  const trackClick = (target: string) =>
    void logFunnelEvent({
      event_type: "claim_cta_clicked",
      step: "claim_entry",
      current_path: "/entrepreneur/:slug/reclamer",
      token: "",
      suppress_prospect_ref: true,
      contractor_id: "contractor" in entry ? entry.contractor.id : null,
      metadata: { surface: "claim_entry", outcome: entry.kind, target },
    });

  const loading = isLoading || authLoading;

  return (
    <main className="alex-immersive min-h-[100svh] bg-background px-5 py-10 text-foreground">
      <Helmet>
        <title>{t.title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto max-w-xl space-y-6">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t.back}
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : entry.kind === "not_found" ? (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6" data-testid="claim-not-found">
            <h1 className="text-2xl font-bold">{t.notFoundTitle}</h1>
            <p className="text-muted-foreground">{t.notFoundBody}</p>
            <Link to="/contractor/join" onClick={() => trackClick("contractor_join")} className="block">
              <Button size="lg" className="w-full">
                {t.notFoundCta} <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </section>
        ) : (
          <>
            <section className="space-y-4 rounded-2xl border border-border bg-card p-6" data-testid="claim-preview">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t.prefilled}</p>
              <h1 className="text-2xl font-bold leading-tight">{entry.contractor.business_name}</h1>
              <dl className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <dt className="sr-only">{t.city}</dt>
                  <dd>{entry.contractor.city?.trim() || t.pending}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <dt className="sr-only">{t.trade}</dt>
                  <dd>{entry.contractor.specialty?.trim() || t.pending}</dd>
                </div>
              </dl>
              <span className="inline-flex rounded-full border border-border px-3 py-1 text-xs" data-testid="claim-verification">
                {publicVerificationLabel(entry.contractor.public_status, lang === "en" ? "en" : "fr")}
              </span>
            </section>

            {entry.kind === "own_profile" ? (
              <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold">{t.ownTitle}</h2>
                <p className="text-sm text-muted-foreground">{t.ownBody}</p>
                <Link to="/pro/profile" onClick={() => trackClick("pro_profile")} className="block">
                  <Button size="lg" className="w-full">{t.ownCta} <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
                </Link>
                <Link to="/entrepreneurs/activation-350" onClick={() => trackClick("entry_350")} className="block">
                  <Button size="lg" variant="outline" className="w-full">{t.activateCta}</Button>
                </Link>
              </section>
            ) : (
              <section className="space-y-3 rounded-2xl border border-border bg-card p-6" data-testid="claim-already-attached">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{t.attachedTitle}</h2>
                    <p className="text-sm text-muted-foreground">{t.attachedBody}</p>
                  </div>
                </div>
                {/* Révision humaine : demande en attente dans contractor_profile_corrections, jamais un transfert automatique. */}
                <div onClickCapture={() => trackClick("correction_request")}>
                  <CorrectionRequestCard
                    contractorId={entry.contractor.id}
                    contractorSlug={slug}
                    businessName={entry.contractor.business_name ?? ""}
                  />
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">{t.noPayment}</p>
      </div>
    </main>
  );
}
