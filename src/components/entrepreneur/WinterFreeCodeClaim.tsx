import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

const KEY = "unpro_winter_free_code";
const REASONS: Record<string, string> = {
  invalid_or_expired: "Ce code n'est pas valide ou est expiré.",
  not_free_activation_code: "Ce code ne donne pas accès à l'activation offerte.",
  no_business: "Créez d'abord le profil de votre entreprise, puis revenez avec ce code.",
  ambiguous_business: "Plusieurs entreprises sont liées à ce compte. Écrivez à Clara pour choisir la bonne.",
  business_already_has_offer: "Votre entreprise a déjà reçu une offre d'activation. Une seule par entreprise.",
  city_not_eligible: "La ville principale de votre entreprise ne correspond pas à ce code.",
  service_not_offered: "Ce code est réservé aux entreprises qui offrent ce service sur leur profil.",
  exhausted: "Les 25 places de ce code sont toutes prises.",
  retry_conflict: "Une demande est déjà en cours. Réessayez dans un instant.",
};

/** Activation offerte (codes saisonniers). Le serveur décide de tout : ville, service, places, unicité. */
export default function WinterFreeCodeClaim({ initialCode }: { initialCode?: string | null }) {
  const [code, setCode] = useState(() => (initialCode || sessionStorage.getItem(KEY) || "").toUpperCase());
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; msg: string; end?: string; start?: string } | null>(null);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session)); }, []);
  useEffect(() => { if (code) sessionStorage.setItem(KEY, code); }, [code]);

  const claim = async () => {
    if (busy || !code.trim()) return;
    setBusy(true); setRes(null);
    void logFunnelEvent({ event_type: "free_code_submitted", metadata: { surface: "activation_350", offer: "hiver_abris_2026" } });
    const { data, error } = await supabase.rpc("claim_scoped_free_activation" as never, { p_code: code.trim() } as never);
    setBusy(false);
    const d = data as { ok?: boolean; reason?: string; founder_start?: string; founder_end?: string } | null;
    if (error || !d) { setRes({ ok: false, msg: "Le serveur n'a pas confirmé. Rien n'a été activé ; vous pouvez réessayer sans risque de doublon." }); return; }
    if (d.ok) {
      void logFunnelEvent({ event_type: "free_code_accepted", metadata: { surface: "activation_350", offer: "hiver_abris_2026" } });
      sessionStorage.removeItem(KEY);
      setRes({ ok: true, msg: "Activation offerte confirmée.", start: d.founder_start, end: d.founder_end });
    } else setRes({ ok: false, msg: REASONS[d.reason || ""] || "Ce code ne peut pas être appliqué." });
  };

  const fmt = (s?: string) => (s ? new Date(s).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "");

  return (
    <div className="mt-4 rounded-[28px] border border-border bg-card p-5" data-testid="winter-free-code">
      <p className="font-semibold">Vous avez un code d'activation offerte?</p>
      <p className="mt-1 text-sm text-muted-foreground">Petits services saisonniers (ex. abris d'auto). 0 $ : profil + 12 mois de présence UNPRO, aucun renouvellement payant automatique. Aucun rendez-vous ni contrat garanti ; les options de rendez-vous sont distinctes.</p>
      {res?.ok ? (
        <p className="mt-3 text-sm" role="status"><strong>{res.msg}</strong> 0 $ facturé. Du {fmt(res.start)} au {fmt(res.end)}. Aucune reconduction payante.</p>
      ) : authed === false ? (
        <Link to={`/login?redirect=${encodeURIComponent("/entrepreneurs/activation-350?code=" + code)}`} className="mt-3 block text-sm font-semibold text-primary underline">Se connecter pour appliquer le code (il sera conservé)</Link>
      ) : (
        <div className="mt-3 flex gap-2">
          <input aria-label="Code d'activation" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="min-h-11 flex-1 rounded-[18px] border border-input bg-background px-3 text-sm" placeholder="HIVER-…" />
          <Button type="button" className="min-h-11 rounded-[18px]" disabled={busy || !code.trim()} onClick={claim}>{busy ? "Vérification…" : "Appliquer"}</Button>
        </div>
      )}
      {res && !res.ok && <p className="mt-2 text-sm text-destructive" role="alert">{res.msg}</p>}
    </div>
  );
}
