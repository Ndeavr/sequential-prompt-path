/**
 * ActivationOffer1Dollar — Premium "1$ pendant 7 jours" CTA strip.
 * Launches Stripe Checkout via the create-activation-checkout edge function.
 */
import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";

interface Props {
  slug: string;
  companyName: string;
  onTrack?: (event: string, payload?: Record<string, unknown>) => void;
}

export default function ActivationOffer1Dollar({ slug, companyName, onTrack }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleActivate() {
    setLoading(true);
    setError(null);
    onTrack?.("activation_cta_click", { slug });
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("create-activation-checkout", {
        body: { slug },
      });
      if (fnErr || !data?.url) {
        setError("Activation indisponible — réessayez dans quelques secondes.");
        return;
      }
      redirectToCheckout(data.url);
    } catch {
      setError("Activation indisponible — réessayez dans quelques secondes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
        <div
          className="pointer-events-none absolute -inset-px opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 20% 0%, hsl(var(--primary)/0.45), transparent 60%), radial-gradient(60% 80% at 100% 100%, hsl(280 90% 60%/0.30), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/80">
              <Sparkles className="h-3 w-3" /> Offre d'activation
            </div>
            <h3 className="mt-2 text-2xl md:text-3xl font-semibold leading-tight">
              Activez votre visibilité IA locale
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Accès complet pendant 7 jours · profil optimisé · recommandations propriétaires · tableau de bord {companyName}.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 md:items-end">
            <div className="text-right md:text-right">
              <span className="text-4xl font-bold tracking-tight">1 $</span>
              <span className="ml-1 text-sm text-white/70">pendant 7 jours</span>
            </div>
            <Button
              onClick={handleActivate}
              disabled={loading}
              size="lg"
              className="bg-white text-black hover:bg-white/90 font-medium"
            >
              {loading ? "Préparation…" : (<>Activer maintenant <ArrowRight className="ml-1 h-4 w-4" /></>)}
            </Button>
          </div>
        </div>
        {error && <p className="relative mt-3 text-xs text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
