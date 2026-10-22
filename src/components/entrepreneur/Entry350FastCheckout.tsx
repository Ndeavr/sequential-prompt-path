/** Quote-free entry activation review; the canonical server owns amount and eligibility. */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getClaraQualification } from "@/services/clara/claraContractorQualification";
import { contractorLoginPath } from "@/lib/routing/contractorAuthHandoff";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { normalizeRef } from "@/lib/activation350Links";

export default function Entry350FastCheckout({ query }: { query: URLSearchParams }) {
  const navigate = useNavigate();
  const [company, setCompany] = useState(() => {
    try { return sessionStorage.getItem("unpro_entry350_declared_name") || getClaraQualification().business_name || ""; }
    catch { return getClaraQualification().business_name || ""; }
  });
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const outcome = query.get("checkout");
  const ref = normalizeRef(query.get("ref"));
  const begin = async () => {
    if (busy) return;
    const name = company.trim();
    if (name.length < 2) { setErrorText("Confirmez le nom de votre entreprise."); return; }
    setBusy(true);
    setErrorText(null);
    try {
      sessionStorage.setItem("unpro_entry350_declared_name", name);
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
          ...(ref ? { ref } : {}),
          ...(query.get("t") ? { activationToken: query.get("t") } : {}),
          ...(query.get("utm_source") ? { source: query.get("utm_source") } : {}),
          ...(query.get("utm_campaign") ? { campaign: query.get("utm_campaign") } : {}),
          successUrl,
          cancelUrl: cancel.toString(),
        },
      });
      let reply = data as { code?: string; error?: string; url?: string } | null;
      if (!reply && error) {
        const context = (error as { context?: Response }).context;
        if (context && typeof context.clone === "function") {
          try { reply = await context.clone().json(); } catch { /* network error remains authoritative */ }
        }
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
      if (error || reply?.error || !reply?.url) throw new Error("unavailable");
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
        className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-3 text-foreground"/>
      <p className="mt-3 text-sm">Si les taxes du Québec s'appliquent : 350,00 $ + TPS 17,50 $ + TVQ 34,91 $ = <strong>402,41 $ CA</strong>. Aucun abonnement.</p>
      {outcome === "success" && <p role="status" className="mt-3 text-sm text-primary">Retour de Stripe détecté. Ce retour ne prouve pas le paiement; seul le serveur peut confirmer votre activation. Vérifiez votre espace entrepreneur.</p>}
      {outcome === "canceled" && <p role="status" className="mt-3 text-sm">Paiement annulé : vos réponses sont conservées.</p>}
      {errorText && <p role="alert" className="mt-3 text-sm text-destructive">{errorText}</p>}
      {info && <p role="status" className="mt-3 text-sm">{info} <Link to="/pro" className="underline">Mon espace entrepreneur</Link></p>}
      <Button type="button" data-testid="entry-350-checkout" onClick={() => void begin()}
        disabled={busy || Boolean(info) || outcome === "success"} className="mt-4 min-h-12 w-full whitespace-normal">
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Préparation…</> : "Continuer vers le paiement sécurisé"}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">Connexion requise avant paiement. Clara garde la conversation dans la session en cours.</p>
    </section>
  );
}
