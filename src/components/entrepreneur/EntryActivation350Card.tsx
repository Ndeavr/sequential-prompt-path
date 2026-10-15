/**
 * UNPRO — Activation d'entrée 350 $ (paiement unique) pour un nouvel entrepreneur.
 * Le montant et la garantie sont fixés côté serveur ; la page n'envoie aucun prix.
 * L'activation n'a lieu qu'après confirmation du paiement par le webhook Stripe.
 */
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { ENTRY_350 } from "@/lib/copy/offer350";
import { toast } from "sonner";
import { CallUnproLink } from "@/components/contact/CallUnproLink";

interface Props {
  quoteId: string;
  contractorId?: string | null;
  guaranteedAppointments: number | null;
  affiliateRef?: string | null;
  activationToken?: string | null;
  successUrl: string;
  cancelUrl: string;
  onLogin: () => void;
  onMore: () => void;
}

export function EntryActivation350Card(p: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setLoading(true);
    setError(null);
    void logFunnelEvent({ event_type: "entry_350_clicked", contractor_id: p.contractorId ?? null, metadata: { quote_id: p.quoteId } });
    try {
      const { data: s } = await supabase.auth.getSession();
      if (!s?.session) { setLoading(false); p.onLogin(); return; }
      const { data, error: fnErr } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          entryActivation: true,
          quoteId: p.quoteId,
          ...(p.affiliateRef && { ref: p.affiliateRef }),
          ...(p.activationToken && { activationToken: p.activationToken }),
          successUrl: p.successUrl,
          cancelUrl: p.cancelUrl,
        },
      });
      let payload = data as { url?: string; error?: string; code?: string } | null;
      if (!payload && fnErr) {
        // Réponse non-2xx : le corps JSON est dans error.context (Response brute).
        const ctx = (fnErr as { context?: Response }).context;
        try {
          if (ctx && typeof ctx.json === "function") payload = await ctx.clone().json();
        } catch { /* corps illisible : on garde l'erreur d'origine */ }
      }
      if (payload?.code === "already_active" || payload?.code === "already_paid") {
        toast.success("Votre profil est déjà activé.");
        window.location.assign("/pro");
        return;
      }
      if (payload?.code === "payment_received_pending") {
        // Paiement déjà reçu par Stripe : jamais de deuxième facturation.
        setError("Votre paiement a déjà été reçu. Ne payez pas une deuxième fois : la confirmation est en cours chez UNPRO.");
        setLoading(false);
        return;
      }
      if (payload?.error) throw new Error(payload.error);
      if (fnErr) throw fnErr;
      if (!payload?.url) throw new Error("url_manquante");
      redirectToCheckout(payload.url);
      setTimeout(() => setLoading(false), 2500);
    } catch (e) {
      void logFunnelEvent({ event_type: "entry_350_checkout_failed", contractor_id: p.contractorId ?? null, metadata: { quote_id: p.quoteId, reason: e instanceof Error ? e.message : String(e) } });
      setError(ENTRY_350.errorRetry);
      toast.error("Le paiement n'a pas pu démarrer.");
      setLoading(false);
    }
  };

  const g = p.guaranteedAppointments && p.guaranteedAppointments > 0 ? p.guaranteedAppointments : null;

  return (
    <div data-testid="entry-350-card" className="w-full rounded-[28px] border border-amber-400/30 bg-white/[0.05] backdrop-blur-xl p-5 sm:p-6 mb-5">
      <p className="text-xs uppercase tracking-wider text-amber-300">{ENTRY_350.eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">{ENTRY_350.title.replace("350 $", "350\u00a0$")}</h2>
      <ul className="mt-4 space-y-2 text-sm text-white/85">
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{ENTRY_350.profile}</li>
        <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{ENTRY_350.presence}</li>
        <li className="flex gap-2" data-testid="entry-350-appointments">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          {g ? ENTRY_350.appointments(g) : ENTRY_350.appointmentsPending}
        </li>
      </ul>
      <p className="mt-3 text-xs text-white/60">{ENTRY_350.paymentNote}</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="mt-5 w-full min-h-12 rounded-[18px] bg-amber-500 px-5 py-3 font-semibold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Ouverture du paiement…</span> : error ? "Réessayer" : ENTRY_350.cta}
      </button>
      <button type="button" onClick={p.onMore} className="mt-3 w-full min-h-11 rounded-[18px] border border-white/15 px-5 py-3 text-sm text-white/85 hover:bg-white/5">
        {ENTRY_350.ctaMore}
      </button>
      <div className="mt-2 flex justify-center">
        <CallUnproLink
          context={error ? "entry_350_checkout_error" : "entry_350_card"}
          label={error ? "Besoin d'aide? Appeler UNPRO" : "Une question avant d'activer? Appeler UNPRO"}
          compact
          className="text-white/80"
        />
      </div>
    </div>
  );
}
