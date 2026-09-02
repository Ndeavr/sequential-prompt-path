/**
 * PageInvitationActivate — /invitation/:token/activate
 * Summary + CTA to Stripe Checkout with landing_token metadata.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function PageInvitationActivate() {
  const { token } = useParams<{ token: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cancelled = params.get("cancelled") === "true";
  const [prospect, setProspect] = useState<{ business_name: string; city: string | null; already_paid: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("invitation-resolve", { body: { token } });
        if (error || !data?.prospect) { setNotFound(true); }
        else { setProspect(data.prospect); }
      } catch { setNotFound(true); }
      finally { setLoading(false); }
    })();
  }, [token]);

  async function handleActivate() {
    if (!token) return;
    setStarting(true);
    setError(null);
    try {
      navigate(`/entrepreneurs/audit-ia?at=${encodeURIComponent(token)}&utm_source=invitation`);
    } catch {
      setError("Activation indisponible — réessayez dans quelques instants.");
      setStarting(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center"><p className="text-white/70">Chargement…</p></main>;
  }
  if (notFound || !prospect) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-2">Cette invitation n'existe plus.</h1>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="max-w-xl mx-auto px-6 py-16">
        <Link to={`/invitation/${token}`} className="text-sm text-white/60 hover:text-white">← Retour</Link>
        <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-[-0.02em]">Activer votre fiche</h1>
        <p className="mt-3 text-white/70">
          <span className="text-white">{prospect.business_name}</span>{prospect.city ? ` · ${prospect.city}` : ""}
        </p>

        {cancelled && (
          <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Activation annulée. Vous pouvez recommencer.
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
          <Row label="Étape 1" value="Analyse IA gratuite" />
          <Row label="Étape 2" value="Profil à vérifier" strong />
          <Row label="Étape 3" value="Objectifs et capacité" />
          <Row label="Résultat" value="Plan et devis personnalisés" />
        </div>

        <Button
          onClick={handleActivate}
          disabled={starting || prospect.already_paid}
          size="lg"
          className="mt-8 h-14 w-full text-base bg-white text-black hover:bg-white/90 rounded-2xl font-medium"
        >
          {prospect.already_paid ? "Déjà activé" : starting ? "Préparation…" : (<>Commencer mon analyse gratuite <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </section>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/60">{label}</span>
      <span className={strong ? "text-white font-semibold" : "text-white/90 text-sm"}>{value}</span>
    </div>
  );
}
