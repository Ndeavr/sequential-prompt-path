/**
 * /pro/onboarding/:token — private autopilot landing.
 * Reads lead snapshot via pro-onboarding-token, then activates Stripe checkout
 * by reusing the existing pro-founder-checkout-guest function.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Sparkles, Star, ShieldCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Lead = {
  lead_id: string;
  business_name: string;
  first_name: string | null;
  city: string | null;
  category: string | null;
  google_rating: number | null;
  reviews_count: number | null;
  rbq: string | null;
  neq: string | null;
  fit_score: number | null;
  fit_reasons: string[];
  ai_visibility_score: number | null;
  recommended_plan_slug: string;
  email: string | null;
};

export default function PageProPrivateOnboarding() {
  const { token } = useParams<{ token: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("pro-onboarding-token", {
          body: { token },
        });
        if (!active) return;
        if (error || !data?.ok) {
          setError(data?.error ?? "Lien invalide ou expiré.");
        } else {
          setLead(data.lead as Lead);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  async function startCheckout() {
    if (!lead || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("pro-founder-checkout-guest", {
        body: {
          prospectId: lead.lead_id,
          email: lead.email ?? undefined,
          planSlug: lead.recommended_plan_slug,
        },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("Checkout indisponible. Réessayez.");
      setCheckoutUrl(url);
      try { window.top!.location.href = url; } catch { window.location.href = url; }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#060B14] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </main>
    );
  }
  if (error || !lead) {
    return (
      <main className="min-h-screen bg-[#060B14] text-white flex items-center justify-center px-6 alex-immersive">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-2">Lien indisponible</h1>
          <p className="text-white/70 text-sm">{error ?? "Ce lien d'activation n'est plus valide."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060B14] text-white alex-immersive">
      <div className="mx-auto max-w-xl px-5 py-10 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Profil privé · Activation Fondateur</span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">
          {lead.business_name}
        </h1>
        <p className="text-white/70 text-[15px] leading-snug">
          {lead.category ? `${lead.category} · ` : ""}{lead.city ?? "Québec"}
        </p>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Score d'admissibilité UNPRO</span>
            <span className="text-2xl font-semibold text-amber-300">
              {lead.fit_score ?? "—"}<span className="text-white/40 text-sm">/100</span>
            </span>
          </div>
          {lead.google_rating && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <Star className="w-4 h-4 text-amber-300" />
              {lead.google_rating} sur Google
              {lead.reviews_count ? ` · ${lead.reviews_count} avis` : ""}
            </div>
          )}
          {(lead.rbq || lead.neq) && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              {lead.rbq ? `RBQ ${lead.rbq}` : ""}{lead.rbq && lead.neq ? " · " : ""}{lead.neq ? `NEQ ${lead.neq}` : ""}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-sm font-semibold text-white/80 mb-3">Pourquoi vous avez été sélectionné</h2>
          <ul className="space-y-2">
            {(lead.fit_reasons?.length ? lead.fit_reasons : ["Présence détectée dans une catégorie à forte demande."]).map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent p-5">
          <p className="text-xs uppercase tracking-wider text-amber-300 mb-1">Plan recommandé</p>
          <p className="text-xl font-semibold mb-2">Fondateur — Recrue</p>
          <p className="text-sm text-white/70 mb-4">
            Essai 7 jours pour 1 $, puis 149 $/mois. Rendez-vous exclusifs garantis, jamais partagés.
          </p>
          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              target="_top"
              className="block w-full text-center rounded-2xl bg-amber-400 text-[#060B14] py-4 font-semibold"
            >
              Ouvrir le paiement sécurisé
            </a>
          ) : (
            <button
              onClick={startCheckout}
              disabled={busy}
              className="w-full rounded-2xl bg-amber-400 text-[#060B14] py-4 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? "Préparation du paiement…" : "Activer mon profil pour 1 $"}
            </button>
          )}
          {error && <p className="mt-3 text-sm text-red-400 text-center">{error}</p>}
        </section>

        <p className="text-center text-xs text-white/40">
          Paiement sécurisé Stripe · Annulable en tout temps
        </p>
      </div>
    </main>
  );
}
