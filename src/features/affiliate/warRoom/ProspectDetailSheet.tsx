/**
 * Fiche prospect (affilié) — données réelles d'un prospect ASSIGNÉ seulement.
 * Source : RPC manual_prospect_detail_for_me (vérifie JWT + propriété de l'assignation).
 * Affiche les coordonnées pour vérification manuelle; ne déclenche aucun envoi.
 */
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { formatPhoneDisplay } from "@/utils/formatPhone";

export type ProspectDetail = {
  prospect_id: string; business_name: string | null; legal_name: string | null;
  category: string | null; city: string | null; region: string | null;
  phone_e164: string | null; phone_secondary: string | null; phone_line_type: string | null;
  phone_validation_status: string | null; sms_eligible: boolean | null;
  email: string | null; website_url: string | null; google_business_url: string | null;
  source: string | null; source_table: string | null;
  rbq_number: string | null; rbq_source_url: string | null;
  outreach_status: string | null; delivery_status: string | null; sms_error_code: string | null;
  email_failure_reason: string | null; last_attempt_at: string | null;
  email_sent_at: string | null; outreach_sent_at: string | null;
  queue: string | null; assignment_status: string | null; assigned_at: string | null;
  attempts: number | null; last_outcome: string | null; last_outcome_at: string | null;
  next_action: string | null; due_at: string | null;
};

export function lineTypeLabel(t: string | null | undefined): string {
  if (t === "landline") return "Ligne fixe — SMS interdit";
  if (t === "mobile") return "Cellulaire";
  if (t === "voip" || t === "nonFixedVoip") return "Téléphonie IP";
  return "Type de ligne non vérifié";
}

/** Raison de blocage SMS, échec fermé. null = aucun blocage côté ligne. */
export function smsBlockReason(d: Pick<ProspectDetail, "phone_e164" | "phone_line_type" | "sms_eligible">): string | null {
  if (!d.phone_e164) return "Aucun numéro";
  if (d.phone_line_type === "landline") return "Ligne fixe : SMS interdit, appel seulement";
  if (d.phone_line_type !== "mobile" || d.sms_eligible !== true) return "Type de ligne non vérifié : SMS bloqué";
  return null;
}

export function sourceLabel(s: string | null | undefined): string {
  if (s === "google_places") return "Google Places";
  return s ? s : "Source non indiquée";
}

export function licenceLabel(d: Pick<ProspectDetail, "rbq_number" | "rbq_source_url">): string {
  if (!d.rbq_number) return "Licence RBQ : à vérifier (aucune déclarée)";
  return `Licence RBQ ${d.rbq_number} : déclarée, à vérifier au registre`;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

function Row({ label, value, copy, href }: { label: string; value: string | null; copy?: boolean; href?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-border/30">
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value ?? "Indisponible"}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {copy && value && (
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Copier ${label}`}
            onClick={() => { navigator.clipboard?.writeText(value); toast.success("Copié"); }}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        {href && (
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Ouvrir ${label}`}
            onClick={() => window.open(href, "_blank", "noopener,noreferrer")}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProspectDetailSheet({ prospectId, open, onOpenChange }: {
  prospectId: string; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const q = useQuery({
    queryKey: ["manual-prospect-detail", prospectId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("manual_prospect_detail_for_me", { p_prospect_id: prospectId });
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as ProspectDetail | null;
    },
  });
  const d = q.data;
  const safeUrl = (u: string | null) => (u && /^https:\/\//i.test(u) ? u : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader><SheetTitle>Fiche prospect</SheetTitle></SheetHeader>
        {q.isLoading && <p className="py-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>}
        {q.isError && (
          <div className="py-6 space-y-2">
            <p className="text-sm text-destructive">Fiche non chargée.</p>
            <Button size="sm" variant="outline" onClick={() => q.refetch()}>Réessayer</Button>
          </div>
        )}
        {!q.isLoading && !q.isError && !d && (
          <p className="py-6 text-sm text-muted-foreground">Ce prospect ne vous est pas assigné ou n'est plus actif.</p>
        )}
        {d && (
          <div className="pt-2">
            <p className="text-base font-semibold text-foreground">{d.business_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mb-2">{[d.category, d.city].filter(Boolean).join(" · ") || "—"}</p>
            <p className="text-[11px] text-muted-foreground mb-2">Aucun compte entrepreneur créé : fiche prospect seulement.</p>
            <Row label="Téléphone professionnel" value={d.phone_e164 ? formatPhoneDisplay(d.phone_e164) : null} copy />
            <Row label="Type de ligne" value={lineTypeLabel(d.phone_line_type)} />
            {d.phone_secondary && <Row label="Téléphone secondaire (non vérifié)" value={formatPhoneDisplay(d.phone_secondary)} copy />}
            <Row label="Courriel" value={d.email} copy />
            <Row label="Site web" value={d.website_url} href={safeUrl(d.website_url)} />
            <Row label="Provenance" value={sourceLabel(d.source)} />
            <Row label="Fiche Google" value={d.google_business_url ? "Disponible" : null} href={safeUrl(d.google_business_url)} />
            <Row label="Licence" value={licenceLabel(d)} />
            <Row label="Dernière tentative journalisée"
              value={d.last_attempt_at ? `${fmt(d.last_attempt_at)} · ${d.delivery_status ?? d.outreach_status ?? "statut inconnu"}${d.sms_error_code ? ` (code ${d.sms_error_code})` : ""}` : "Aucune"} />
            <Row label="Tentatives par vous" value={String(d.attempts ?? 0)} />
            <Row label="Dernier résultat" value={d.last_outcome ? `${d.last_outcome} · ${fmt(d.last_outcome_at)}` : "Aucun"} />
            <Row label="Assigné le" value={fmt(d.assigned_at)} />
            <Row label="Prochaine action" value={d.next_action ? `${d.next_action}${d.due_at ? ` · ${fmt(d.due_at)}` : ""}` : "À définir"} />
            <p className="text-[11px] text-muted-foreground pt-3">
              SMS : {smsBlockReason(d) ?? "ligne admissible"}. Contact réel seulement après vérification de conformité et du consentement.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
