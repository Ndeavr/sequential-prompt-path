/**
 * SolicitationActivationPage — Minimal /activation landing for SMS-driven contractors.
 * Reads ?t=<tracking_slug>, marks click, launches $1 activation checkout.
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";

interface TrackContext {
  company_name?: string;
  city?: string;
  category?: string;
  variant?: string;
}

export default function SolicitationActivationPage() {
  const [params] = useSearchParams();
  const trackingSlug = params.get("t");
  const [ctx, setCtx] = useState<TrackContext>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackingSlug) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("solicitation-track", {
          body: { slug: trackingSlug, event: "clicked" },
        });
        if (data?.context) setCtx(data.context);
      } catch {
        // silent — the page still works without context
      }
    })();
  }, [trackingSlug]);

  async function handleActivate() {
    setLoading(true);
    setError(null);
    try {
      // mark payment_started (best-effort)
      if (trackingSlug) {
        supabase.functions.invoke("solicitation-track", {
          body: { slug: trackingSlug, event: "payment_started" },
        }).catch(() => {});
      }
      const { data, error: fnErr } = await supabase.functions.invoke("create-activation-checkout", {
        body: { slug: trackingSlug || `solicit-${Date.now()}`, source: "solicitation" },
      });
      if (fnErr || !data?.url) {
        setError("Activation indisponible — réessayez dans quelques instants.");
        return;
      }
      redirectToCheckout(data.url);
    } catch {
      setError("Activation indisponible — réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-6 py-16">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 10%, hsl(220 90% 40% / 0.28), transparent 60%), radial-gradient(50% 60% at 90% 90%, hsl(190 90% 45% / 0.20), transparent 60%)",
        }}
        aria-hidden
      />
      <section className="max-w-xl w-full">
        {ctx.company_name && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            <span>Pour {ctx.company_name}{ctx.city ? ` · ${ctx.city}` : ""}</span>
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.03em]">
          Recevez des rendez-vous exclusifs.
          <br />
          <span className="text-white/60">Pas des leads partagés.</span>
        </h1>
        <p className="mt-5 text-lg text-white/75">
          Essai de 7 jours pour <span className="font-semibold text-white">1&nbsp;$</span>. Activation immédiate.
        </p>

        <Button
          onClick={handleActivate}
          disabled={loading}
          size="lg"
          className="mt-8 h-14 w-full text-base bg-white text-black hover:bg-white/90 rounded-2xl font-medium"
        >
          {loading ? "Préparation…" : (<>Activer mon profil <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>

        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

        <p className="mt-8 text-xs text-white/40">
          Aucun renouvellement automatique. Vous choisirez votre plan pendant l'essai.
        </p>
      </section>
    </main>
  );
}
