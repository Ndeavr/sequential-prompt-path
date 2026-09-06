/**
 * PageAffiliateEntry — Page d'entrée personnalisée d'un affilié UNPRO.
 * Route: /:affiliateSlug  (ex. unpro.ca/lorraine)
 *
 * PUBLIC = accueil personnalisé + une action évidente.
 * Aucune mécanique interne (commissions, quotas, files, sous-affiliés,
 * conformité, identifiants) n'est exposée ici.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Users, Send, Wallet } from "lucide-react";
import { trackReferralEvent } from "@/hooks/useReferralAttribution";
import FallbackRoutePage from "@/pages/FallbackRoutePage";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";


interface AffiliateEntry {
  slug: string;
  first_name: string | null;
  display_name: string | null;
  status: string;
  referral_code: string;
  has_account: boolean;
}

export default function PageAffiliateEntry() {
  const { affiliateSlug } = useParams<{ affiliateSlug: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!affiliateSlug) return;
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.rpc("affiliate_entry_by_slug" as any, {
        p_slug: affiliateSlug,
      });
      if (cancel) return;

      if (error) {
        // Never silently show an empty affiliate page: audit + explicit state,
        // and keep any previously captured attribution untouched.
        console.error("[affiliate-entry] lookup failed", error.message);
        void logFunnelEvent({
          event_type: "affiliate_entry_lookup_failed",
          step: "affiliate_entry",
          metadata: { slug: affiliateSlug, error: error.message },
        });
        setLoadError(error.message);
        setAffiliate(null);
        setLoading(false);
        return;
      }

      const row = Array.isArray(data) ? (data[0] as AffiliateEntry | undefined) : undefined;
      setAffiliate(row ?? null);
      setLoading(false);

      if (row?.referral_code) {
        // Attribution écrite uniquement depuis une réponse valide.
        try {
          localStorage.setItem(
            "unpro_ref",
            JSON.stringify({
              refCode: row.referral_code,
              capturedAt: new Date().toISOString(),
              utmSource: "affiliate_entry",
            })
          );
        } catch {}
        trackReferralEvent("affiliate_entry_visit", row.referral_code, {
          targetType: "affiliate_entry",
          metadata: { slug: row.slug },
        });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [affiliateSlug]);

  const firstName = affiliate?.first_name?.trim() || null;

  const cta = useMemo(() => {
    if (!affiliate) return null;
    if (affiliate.has_account) {
      return {
        label: "Accéder à mon espace affilié",
        to: user ? "/affiliate" : `/affiliate/login?slug=${affiliate.slug}`,
      };
    }
    return {
      label: "Activer mon espace affilié",
      to: `/affilies/onboarding?slug=${affiliate.slug}&ref=${affiliate.referral_code}`,
    };
  }, [affiliate, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Lecture impossible (réseau / permissions) — état explicite, jamais un
  // affilié vide, et l'attribution déjà captée reste intacte.
  if (loadError) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Helmet>
          <title>Lien affilié temporairement indisponible — UNPRO</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-14">
          <div className="text-sm font-semibold tracking-[0.3em] text-primary">UNPRO</div>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">
            Ce lien ne peut pas être vérifié pour le moment.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Le service est temporairement indisponible. Réessayez dans un instant :
            votre lien reste valide et votre référence est conservée.
          </p>
          <Button size="lg" className="mt-8 h-14 w-full text-base" onClick={() => window.location.reload()}>
            Réessayer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Link to="/" className="mt-4 text-center text-sm text-muted-foreground underline-offset-2 hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Slug inconnu / désactivé — on rend le comportement normal du site
  // (page de repli / 404 existante) plutôt qu'une page affiliée trompeuse.
  if (!affiliate) {
    return <FallbackRoutePage />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Espace affilié UNPRO</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content="Votre espace affilié UNPRO." />
      </Helmet>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-14">
        <div className="text-sm font-semibold tracking-[0.3em] text-primary">UNPRO</div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight">
          {firstName ? `Bonjour ${firstName}` : "Bonjour"}
        </h1>

        <p className="mt-4 text-lg text-foreground/90">
          Recommandez des entreprises et professionnels à UNPRO.
        </p>
        <p className="mt-3 text-muted-foreground">
          Suivez vos prospects, envoyez vos invitations depuis votre tableau de bord
          et recevez vos commissions lorsque vos recommandations deviennent des
          clients payants.
        </p>

        {cta && (
          <Button
            size="lg"
            className="mt-10 h-14 w-full text-base"
            onClick={() => {
              trackReferralEvent("affiliate_entry_cta", affiliate.referral_code, {
                targetType: "affiliate_entry",
                metadata: { slug: affiliate.slug },
              });
              nav(cta.to);
            }}
          >
            {cta.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}

        <button
          type="button"
          onClick={() => setShowHow((v) => !v)}
          className="mt-6 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Comment ça fonctionne?
        </button>

        {showHow && (
          <div className="mt-6 space-y-4 rounded-2xl border border-border/50 bg-card/50 p-5">
            <Step icon={Users} title="1. Vous recommandez">
              Une entreprise ou un professionnel que vous connaissez.
            </Step>
            <Step icon={Send} title="2. UNPRO prend la relève">
              L'invitation et le suivi se font depuis votre tableau de bord.
            </Step>
            <Step icon={Wallet} title="3. Vous êtes payé">
              Lorsque votre recommandation devient un client payant.
            </Step>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}
