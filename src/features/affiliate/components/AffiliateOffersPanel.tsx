/**
 * UNPRO — Panneau des deux offres (fiche entreprise affilié).
 * Aperçu seulement : aucun envoi, aucun statut modifié, aucun paiement.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateSelf } from "@/hooks/useAffiliateSelf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  activationCommissionCents, activationLink, customPlanLink, formatCad, offerTypeOf,
  OFFER_LABELS, projection24Cents, proposalStatusOf, PROPOSAL_STATUS_LABELS,
  recurringCommissionCents, resolveRate,
} from "../offers";

export default function AffiliateOffersPanel({ prospectId, companyName }: { prospectId: string; companyName?: string | null }) {
  const { data: affiliate } = useAffiliateSelf();
  const [preview, setPreview] = useState<{ kind: string; url: string } | null>(null);

  const rateQ = useQuery({
    queryKey: ["affiliate-rate", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliates").select("commission_rate, commission_pct").eq("id", affiliate!.id).maybeSingle();
      if (error) throw error;
      return resolveRate(data);
    },
  });

  const propQ = useQuery({
    queryKey: ["affiliate-proposal", affiliate?.id, prospectId],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_proposals")
        .select("recommended_plan_slug, monthly_price_cents, used_at, paid_at, payload, created_at")
        .eq("affiliate_id", affiliate!.id).eq("prospect_id", prospectId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const rate = rateQ.data ?? null;
  const prop = propQ.data ?? null;
  const type = offerTypeOf(prop);
  const status = proposalStatusOf(prop);
  const monthly = recurringCommissionCents(prop?.monthly_price_cents, rate);
  const projection = projection24Cents(monthly);
  const ref = affiliate?.referral_code ?? null;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://unpro.ca";

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Offres pour {companyName ?? "cette entreprise"}</h3>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline">{OFFER_LABELS[type]}</Badge>
          {status && <Badge variant="outline">{PROPOSAL_STATUS_LABELS[status]}</Badge>}
        </div>
        {propQ.error && <p className="mt-1 text-xs text-destructive">Proposition illisible : {(propQ.error as Error).message}</p>}
      </div>

      <div className="rounded-xl border border-border/40 p-4 space-y-2">
        <p className="font-semibold text-foreground">1. Activation UNPRO — 350 $ + taxes</p>
        <p className="text-xs text-muted-foreground">
          Paiement unique. Profil public et 12 mois de présence IA UNPRO. Aucun rendez-vous inclus par défaut :
          un nombre de rendez-vous n'est annoncé que s'il est calculé par le serveur avant le paiement.
        </p>
        <Button className="w-full" onClick={() => setPreview({ kind: "Activation 350 $", url: activationLink(origin, ref, prospectId) })}>
          Préparer l'offre à 350 $
        </Button>
      </div>

      <div className="rounded-xl border border-border/40 p-4 space-y-2">
        <p className="font-semibold text-foreground">2. Plan personnalisé</p>
        <p className="text-xs text-muted-foreground">
          Calculé selon les objectifs de contrats/rendez-vous, le panier moyen, la capacité, les services, le territoire et les disponibilités.
          L'inclusion de l'activation dépend du devis serveur; elle n'est jamais facturée deux fois.
        </p>
        <Button variant="outline" className="w-full" onClick={() => setPreview({ kind: "Plan personnalisé", url: customPlanLink(origin, ref, prospectId) })}>
          Construire le plan personnalisé
        </Button>
      </div>

      {preview && (
        <div className="rounded-xl bg-muted/40 p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Aperçu — {preview.kind} (rien n'est envoyé)</p>
          <p className="break-all text-xs text-muted-foreground">{preview.url}</p>
          {!ref && <p className="text-xs text-destructive">Code affilié introuvable : l'attribution ne sera pas incluse.</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(preview.url); toast.success("Lien copié"); }}>
              <Copy className="h-3.5 w-3.5 mr-1" />Copier
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(preview.url, "_blank", "noopener")}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />Ouvrir
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1 border-t border-border/40 pt-3 text-sm">
        <p className="font-semibold text-foreground">Commissions</p>
        {rateQ.error && <p className="text-xs text-destructive">Taux illisible : {(rateQ.error as Error).message}</p>}
        <Row label="Estimée — activation (unique, HT)" value={formatCad(activationCommissionCents(rate))} />
        <Row label="Estimée — plan personnalisé (par mois)" value={formatCad(monthly)} />
        {projection != null && <Row label={`Projection sur ${24} mois (hypothèse : rétention complète)`} value={formatCad(projection)} />}
        <Row label="Commission confirmée" value={prop?.paid_at ? "À rapprocher Stripe + droits" : "Non démontrée ici"} />
        <p className="text-[11px] text-muted-foreground">Taux {rate == null ? "à déterminer" : `${Math.round(rate * 1000) / 10} %`} selon votre dossier affilié.</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
