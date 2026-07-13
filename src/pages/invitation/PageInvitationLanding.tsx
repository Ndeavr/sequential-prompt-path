/**
 * PageInvitationLanding — /invitation/:token
 * Personalized landing for a scraped prospect (from SMS outreach).
 * Never redirects to /. On invalid token, shows a dead-end 410 page.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Prospect {
  id: string;
  business_name: string;
  city: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  category: string | null;
  contact_name: string | null;
  source: string | null;
  funnel_status: string | null;
  already_paid: boolean;
  recommendable: boolean;
  contractor_id: string | null;
}

export default function PageInvitationLanding() {
  const { token } = useParams<{ token: string }>();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("invitation-resolve", { body: { token } });
        if (error || !data?.prospect) { setNotFound(true); }
        else { setProspect(data.prospect); }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <p className="text-white/70">Chargement de votre fiche…</p>
      </main>
    );
  }

  if (notFound || !prospect) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-semibold mb-3">Cette invitation n'existe plus.</h1>
          <p className="text-white/60">
            Le lien reçu par SMS n'est plus valide. Contactez-nous si vous croyez qu'il s'agit d'une erreur.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 10%, hsl(220 90% 40% / 0.28), transparent 60%), radial-gradient(50% 60% at 90% 90%, hsl(190 90% 45% / 0.20), transparent 60%)",
        }}
        aria-hidden
      />
      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur mb-6">
          <Sparkles className="h-3 w-3" />
          <span>Fiche préparée pour {prospect.business_name}{prospect.city ? ` · ${prospect.city}` : ""}</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.03em]">
          Votre entreprise peut être recommandée par Alex.
        </h1>
        <p className="mt-4 text-lg text-white/75">
          Nous avons préparé une première fiche pour <span className="font-medium text-white">{prospect.business_name}</span>
          {prospect.city ? <> à <span className="font-medium text-white">{prospect.city}</span></> : null}.
        </p>

        {/* Fiche préremplie */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <h2 className="text-sm uppercase tracking-widest text-white/50 mb-4">Votre fiche</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <Row label="Entreprise" value={prospect.business_name} />
            <Row label="Catégorie" value={prospect.category ?? "à confirmer"} />
            <Row label="Ville" value={prospect.city ?? "—"} />
            <Row label="Téléphone" value={prospect.phone ?? "—"} />
            <Row label="Site web" value={prospect.website ?? "—"} />
            <Row label="Statut vérification" value={prospect.recommendable ? "Recommandable" : "En attente"} />
          </dl>
        </div>

        {/* Bloc valeur */}
        <div className="mt-8 grid gap-3 text-sm text-white/80">
          <ValueRow icon={<ShieldCheck className="h-4 w-4" />}>
            UNPRO ne vend pas de leads partagés.
          </ValueRow>
          <ValueRow icon={<CheckCircle2 className="h-4 w-4" />}>
            Rendez-vous exclusifs avec des propriétaires compatibles avec vos services.
          </ValueRow>
          <ValueRow icon={<Sparkles className="h-4 w-4" />}>
            Activation 7 jours pour <span className="font-semibold text-white">1&nbsp;$</span>.
          </ValueRow>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg" className="h-14 flex-1 text-base bg-white text-black hover:bg-white/90 rounded-2xl font-medium">
            <Link to={`/invitation/${token}/activate`}>
              Activer ma fiche pour 1 $ <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 flex-1 text-base rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Link to={`/invitation/${token}/edit`}>Vérifier mes informations</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-white/40">
          Aucun renouvellement automatique. Vous choisirez votre plan pendant l'essai.
        </p>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/50 text-[11px] uppercase tracking-widest">{label}</dt>
      <dd className="text-white/90 mt-0.5">{value}</dd>
    </div>
  );
}

function ValueRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-white/70">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
