/**
 * UNPRO — Récapitulatif court de l'activation d'entrée 350 $, sans devis.
 * Le montant, les taxes et l'admissibilité sont fixés côté serveur; cette
 * carte ne fait que recueillir le nom DÉCLARÉ de l'entreprise et appeler le
 * checkout canonique (entryActivation, sans quoteId). Le retour de Stripe
 * ne prouve jamais le paiement : seul le webhook signé active le profil.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getClaraQualification } from "@/services/clara/claraContractorQualification";
import { contractorLoginPath } from "@/lib/routing/contractorAuthHandoff";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { normalizeRef } from "@/lib/activation350Links";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

const DECLARED_NAME_KEY = "unpro_entry350_declared_name";

export default function Entry350FastCheckout({ query }: { query: URLSearchParams }) {
  const navigate = useNavigate();
  const [company, setCompany] = useState(() => {
    try { return sessionStorage.getItem(DECLARED_NAME_KEY) || getClaraQualification().business_name || ""; }
    catch { return getClaraQualification().business_name || ""; }
  });
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // Code promo facultatif : jamais pré-rempli depuis l'URL; seul le serveur le valide.
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ state: "idle" | "checking" | "valid" | "refused"; code?: string; message?: string }>({ state: "idle" });
  const outcome = query.get("checkout");
  const ref = normalizeRef(query.get("ref"));

  const readReply = async (data: unknown, error: unknown) => {
    let reply = data as { code?: string; error?: string; url?: string } | null;
    if (!reply && error) {
      const context = (error as { context?: Response }).context;
      if (context && typeof context.clone === "function") {
        try { reply = await context.clone().json(); } catch { /* réseau */ }
      }
    }
    return reply;
  };

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || promo.state === "checking") return;
    setPromo({ state: "checking" });
    try {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) { setPromo({ state: "refused", message: "Connectez-vous pour vérifier ce code. Rien n'a été facturé." }); return; }
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { entryActivation: true, entryPromoPreview: true, entryPromoCode: code, declaredCompanyName: company.trim() || undefined },
      });
      const reply = await readReply(data, error);
      if (reply?.code === "promo_valid") { setPromo({ state: "valid", code }); return; }
      const message = reply?.code === "promo_used" ? "Ce code a déjà été utilisé."
        : reply?.code === "promo_invalid" ? "Ce code n'est pas valide."
        : reply?.code === "already_active" ? "Ce compte a déjà une activation enregistrée."
        : "Ce code n'est pas disponible pour le moment. Rien n'a été facturé.";
      setPromo({ state: "refused", message });
    } catch {
      setPromo({ state: "refused", message: "Vérification impossible pour le moment. Rien n'a été facturé." });
    }
  };

  const begin = async () => {
    if (busy) return;
    const name = company.trim();
    if (name.length < 2) { setErrorText("Confirmez le nom de votre entreprise."); return; }
    setBusy(true);
    setErrorText(null);
    try {
      sessionStorage.setItem(DECLARED_NAME_KEY, name);
      const { data: auth, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!auth.session) {
        navigate(contractorLoginPath(window.location.pathname + window.location.search));
        return;
      }
      const success = new URL(window.location.href);
      success.searchParams.set("activate", "1");
      success.searchParams.set("checkout", "success");
      success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
      const cancel = new URL(window.location.href);
      cancel.searchParams.set("activate", "1");
      cancel.searchParams.set("checkout", "canceled");
      cancel.searchParams.delete("session_id");
      const successUrl = success.toString().replace(/%7BCHECKOUT_SESSION_ID%7D/gi, "{CHECKOUT_SESSION_ID}");
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          entryActivation: true,
          declaredCompanyName: name,
          ...(promo.state === "valid" && promo.code ? { entryPromoCode: promo.code } : {}),
          ...(ref ? { ref } : {}),
          ...(query.get("t") ? { activationToken: query.get("t") } : {}),
          ...(query.get("utm_source") ? { source: query.get("utm_source") } : {}),
          ...(query.get("utm_campaign") ? { campaign: query.get("utm_campaign") } : {}),
          successUrl,
          cancelUrl: cancel.toString(),
        },
      });
      const reply = await readReply(data, error);
      if (reply?.code === "promo_used" || reply?.code === "promo_invalid" || reply?.code === "promo_unavailable") {
        setPromo({ state: "refused", message: reply.code === "promo_used" ? "Ce code a déjà été utilisé. Retirez-le pour payer le prix normal." : "Ce code n'est plus disponible. Retirez-le pour payer le prix normal." });
        return;
      }
      if (reply?.code === "already_active" || reply?.code === "already_paid") {
        setInfo("Ce compte a déjà une activation enregistrée. Consultez vos droits avant tout nouveau paiement.");
        return;
      }
      if (reply?.code === "payment_received_pending") {
        setInfo("Un paiement a déjà été reçu. Ne payez pas une deuxième fois : la confirmation est en cours.");
        return;
      }
      if (reply?.code === "entry350_live_not_released") {
        setErrorText("Le paiement n'est pas encore ouvert. Rien n'a été facturé.");
        return;
      }
      if (reply?.code === "business_name_required") {
        setErrorText("Confirmez le nom de votre entreprise avant le paiement.");
        return;
      }
      if (error || reply?.error || !reply?.url) throw new Error("unavailable");
      // This only measures a real server-created Stripe checkout handoff.
      // A redirect/success URL must NEVER be counted as paid revenue.
      // Ne jamais laisser la télémétrie ralentir indéfiniment un paiement déjà prêt.
      // L'écriture reste best-effort et ne constitue jamais une preuve de paiement.
      await Promise.race([
        logFunnelEvent({
          event_type: "stripe_checkout_started",
          step: "entry350_checkout_created",
          metadata: { surface: "activation_350", entry_activation: true },
        }).catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 500)),
      ]);
      redirectToCheckout(reply.url);
    } catch {
      setErrorText("Impossible d'ouvrir le paiement. Vos réponses sont conservées. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="activation-350-review" aria-label="Confirmer mon activation" data-testid="entry-350-direct-review"
      className="mt-5 rounded-[24px] border border-primary/30 bg-card p-5 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Votre activation UNPRO</p>
      <h2 className="mt-2 text-2xl font-semibold">350 $ + taxes · une seule fois</h2>
      <p className="mt-2 text-sm text-muted-foreground">Profil professionnel et 12 mois de Présence IA UNPRO. Aucun rendez-vous inclus, aucune apparition garantie dans ChatGPT. Licence valide requise pour être recommandé lorsque applicable.</p>
      <label htmlFor="activation350-business-name" className="mt-4 block text-sm font-semibold">Quel est le nom de votre entreprise?</label>
      <input id="activation350-business-name" data-testid="entry-350-business-name" autoComplete="organization"
        value={company} onChange={e => { setCompany(e.target.value); setErrorText(null); }} maxLength={160}
        placeholder="Nom de votre entreprise"
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-foreground" />
      {promo.state === "valid"
        ? <p className="mt-3 text-sm" data-testid="entry-350-promo-total">Code PROMO : 350,00 $ − 349,00 $ = 1,00 $ avant taxes. Si les taxes du Québec s'appliquent : 1,00 $ + TPS 0,05 $ + TVQ 0,10 $ = <strong>1,15 $ CA</strong> (prix normal 402,41 $). Usage unique, confirmé par Stripe au paiement.</p>
        : <p className="mt-3 text-sm">Si les taxes du Québec s'appliquent : 350,00 $ + TPS 17,50 $ + TVQ 34,91 $ = <strong>402,41 $ CA</strong>. Aucun abonnement.</p>}
      <div className="mt-4">
        <label htmlFor="activation350-promo" className="block text-sm font-semibold">Code promo (facultatif)</label>
        <div className="mt-2 flex gap-2">
          <input id="activation350-promo" data-testid="entry-350-promo-input" value={promoInput} maxLength={40} autoComplete="off"
            onChange={e => { setPromoInput(e.target.value); if (promo.state !== "idle") setPromo({ state: "idle" }); }}
            aria-describedby="activation350-promo-status"
            className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 uppercase text-foreground" />
          {promo.state === "valid"
            ? <Button type="button" variant="outline" className="min-h-12" onClick={() => { setPromo({ state: "idle" }); setPromoInput(""); }}>Retirer</Button>
            : <Button type="button" variant="outline" className="min-h-12" data-testid="entry-350-promo-apply"
                disabled={!promoInput.trim() || promo.state === "checking"} onClick={() => void applyPromo()}>
                {promo.state === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Appliquer"}
              </Button>}
        </div>
        <p id="activation350-promo-status" role="status" aria-live="polite" className={`mt-2 text-sm ${promo.state === "refused" ? "text-destructive" : "text-primary"}`}>
          {promo.state === "valid" ? "Code accepté : rabais unique de 349,00 $." : promo.state === "refused" ? promo.message : ""}
        </p>
      </div>
      {outcome === "success" && <p role="status" className="mt-3 text-sm text-primary">Retour de Stripe détecté. Ce retour ne prouve pas le paiement; seul le serveur peut confirmer votre activation. Vérifiez votre espace entrepreneur.</p>}
      {outcome === "canceled" && <p role="status" className="mt-3 text-sm">Paiement annulé : vos réponses sont conservées.</p>}
      {errorText && <p role="alert" className="mt-3 text-sm text-destructive">{errorText}</p>}
      {info && <p role="status" className="mt-3 text-sm">{info} <Link to="/pro" className="underline">Mon espace entrepreneur</Link></p>}
      <Button type="button" data-testid="entry-350-checkout" onClick={() => void begin()}
        disabled={busy || Boolean(info) || outcome === "success"} className="mt-4 min-h-12 w-full whitespace-normal">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Préparation…</> : "Continuer vers le paiement sécurisé"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">Connexion requise avant paiement. Clara garde la conversation dans la session en cours.</p>
    </section>
  );
}
