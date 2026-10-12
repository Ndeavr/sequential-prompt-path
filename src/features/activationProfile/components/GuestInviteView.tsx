/**
 * Vue d'une invitation protégée (dossier en revue, sans prospect).
 * Affiche seulement entreprise/ville/métier déclarés. Avoir le lien ne prouve
 * pas la propriété : la revendication reste en attente de vérification par
 * UNPRO avant tout paiement ou accès entrepreneur.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { saveReturnPath } from "@/lib/authReturn";
import { extractEdgeReason } from "@/lib/edgeFunctionError";
import { PUBLIC_PHONE } from "@/config/publicContact";
const PUBLIC_PHONE_DISPLAY = PUBLIC_PHONE.display;
const PUBLIC_PHONE_TEL = PUBLIC_PHONE.tel;

interface Invite {
  company_name: string | null; city: string | null; category: string | null;
  claim_status: string; expires_at: string;
}

export default function GuestInviteView({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [claim, setClaim] = useState<"idle" | "busy" | "pending" | "other" | "error">("idle");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("activation-token-resolve", { body: { token } });
      if (off) return;
      if (error || !data?.ok) return setState("invalid");
      setInvite(data as Invite);
      if (data.claim_status === "pending_verification" || data.claim_status === "verified") setClaim("pending");
      setState("ready");
      const { data: s } = await supabase.auth.getSession();
      if (!off) setSignedIn(!!s.session);
    })();
    return () => { off = true; };
  }, [token]);

  const requestClaim = async () => {
    setClaim("busy");
    const { data, error } = await supabase.functions.invoke("activation-claim", { body: { token } });
    if (data?.ok) return setClaim("pending");
    const reason = data?.reason ?? (error ? await extractEdgeReason(error, data) : null);
    setClaim(reason === "claimed_by_other" ? "other" : "error");
  };

  if (state === "loading") {
    return <main className="min-h-dvh grid place-items-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Chargement" /></main>;
  }
  if (state === "invalid" || !invite) {
    return (
      <main className="min-h-dvh bg-background px-5 py-12 max-w-md mx-auto space-y-3">
        <h1 className="text-xl font-semibold text-foreground">Ce lien est invalide ou expiré</h1>
        <p className="text-sm text-muted-foreground">Appelez-nous et nous vérifierons votre dossier.</p>
        <Button asChild className="min-h-11"><a href={PUBLIC_PHONE_TEL}>Appeler UNPRO · {PUBLIC_PHONE_DISPLAY}</a></Button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background px-5 py-10 max-w-md mx-auto space-y-5">
      <Helmet><title>Invitation UNPRO</title><meta name="robots" content="noindex" /></Helmet>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Invitation UNPRO</p>
        <h1 className="text-2xl font-semibold text-foreground">{invite.company_name ?? "Votre entreprise"}</h1>
        <p className="text-sm text-muted-foreground">{[invite.category, invite.city].filter(Boolean).join(" · ") || "—"}</p>
      </div>
      <ul className="text-sm text-foreground space-y-1.5 rounded-2xl border border-border p-4">
        <li>Informations : <strong>déclarées</strong> dans une liste professionnelle, non vérifiées par UNPRO.</li>
        <li>Licence RBQ : <strong>non vérifiée</strong>.</li>
        <li>Activation du profil : 350 $ + taxes, paiement unique, offert après vérification de votre entreprise.</li>
      </ul>
      {claim === "pending" ? (
        <div className="rounded-2xl border border-border p-4 space-y-2">
          <p className="font-medium text-foreground">Demande reçue — vérification en cours</p>
          <p className="text-sm text-muted-foreground">Nous confirmons que vous représentez bien cette entreprise avant d'ouvrir l'activation. Aucun paiement n'est demandé pour l'instant.</p>
        </div>
      ) : !signedIn ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">C'est bien votre entreprise ? Connectez-vous pour demander à la revendiquer.</p>
          <Button asChild className="w-full min-h-11">
            <Link to="/login" onClick={() => saveReturnPath(`/unpro/activate/${token}`)}>C'est mon entreprise</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="w-full min-h-11" onClick={requestClaim} disabled={claim === "busy"}>
            {claim === "busy" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Je représente cette entreprise
          </Button>
          {claim === "other" && <p className="text-sm text-destructive">Ce dossier est déjà en cours de revendication. Appelez-nous si c'est une erreur.</p>}
          {claim === "error" && <p className="text-sm text-destructive">Demande non enregistrée. Réessayez ou appelez-nous.</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Pas votre entreprise ? <a className="underline" href={PUBLIC_PHONE_TEL}>Appelez UNPRO · {PUBLIC_PHONE_DISPLAY}</a></p>
    </main>
  );
}
