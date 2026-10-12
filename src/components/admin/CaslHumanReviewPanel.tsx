/**
 * CASL human review — reuses `casl_consent_evidence` (append-only trigger).
 * Rows are auto-captured; NONE is human-reviewed until an admin decides here.
 * Approve = sets reviewer_id + notes (historical fields untouched).
 * Reject = is_valid=false with invalidation reason (allowed by trigger).
 * No line-type is inferred: Twilio CA Line Type returns 60601 (CLNPC not authorized).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const QC = new Set(["514", "438", "450", "579", "418", "581", "367", "819", "873", "354", "263", "468"]);
const TOLLFREE = new Set(["800", "833", "844", "855", "866", "877", "888"]);

type Ev = {
  id: string;
  destination_normalized: string;
  source_url: string | null;
  source_publisher: string | null;
  business_relevance_explanation: string | null;
  lawful_basis: string | null;
  retrieved_at: string | null;
  reviewer_id: string | null;
  refusal_statement_found: boolean | null;
  is_valid: boolean;
  created_at: string;
};

export const maskNum = (n: string) => (n.length >= 10 ? `${n.slice(0, 3)} •••-${n.slice(-4)}` : "•••");

export function precheck(n: string): string | null {
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(n)) return "Format invalide";
  if (TOLLFREE.has(n.slice(0, 3))) return "Numéro sans frais (pas un mobile)";
  if (!QC.has(n.slice(0, 3))) return "Indicatif hors Québec";
  return null;
}

export default function CaslHumanReviewPanel() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading, error } = useQuery({
    queryKey: ["casl-review"],
    queryFn: async () => {
      const [ev, oo] = await Promise.all([
        supabase
          .from("casl_consent_evidence" as any)
          .select("id,destination_normalized,source_url,source_publisher,business_relevance_explanation,lawful_basis,retrieved_at,reviewer_id,refusal_statement_found,is_valid,created_at")
          .eq("is_valid", true)
          .is("reviewer_id", null)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("sms_opt_outs" as any).select("normalized_phone").limit(5000),
      ]);
      if (ev.error) throw ev.error;
      if (oo.error) throw oo.error;
      const opted = new Set(((oo.data as any[]) ?? []).map((o) => String(o.normalized_phone).replace(/^\+1/, "")));
      const seen = new Set<string>();
      const rows: (Ev & { block: string | null })[] = [];
      for (const r of (ev.data as unknown as Ev[]) ?? []) {
        if (seen.has(r.destination_normalized)) continue; // dedupe by number
        seen.add(r.destination_normalized);
        const block = opted.has(r.destination_normalized)
          ? "Opposition STOP"
          : r.refusal_statement_found
            ? "Refus publié"
            : precheck(r.destination_normalized);
        rows.push({ ...r, block });
      }
      return rows;
    },
  });

  const queue = useMemo(() => (data ?? []).filter((r) => !r.block).slice(0, 25), [data]);
  const excluded = (data ?? []).filter((r) => r.block).length;

  const decide = useMutation({
    mutationFn: async ({ id, ok }: { id: string; ok: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Session requise");
      const note = (notes[id] ?? "").trim();
      if (note.length < 5) throw new Error("Justification requise (5 caractères min.)");
      const patch = ok
        ? { reviewer_id: u.user.id, reviewer_notes: `[HUMAIN] ${note}` }
        : { is_valid: false, invalidated_at: new Date().toISOString(), invalidated_reason: `human_review_rejected: ${note}`, reviewer_id: u.user.id };
      const { error } = await supabase.from("casl_consent_evidence" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Décision enregistrée"); qc.invalidateQueries({ queryKey: ["casl-review"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revue humaine CASL — lot de revue (25)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Type de ligne non confirmé : la vérification Twilio Canada est refusée (erreur 60601, autorisation CLNPC absente).
          Approuver ici valide la base légale, pas le caractère mobile. Aucun envoi n'est déclenché.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm">Chargement…</p>}
        {error && <p className="text-sm text-destructive">Lecture impossible.</p>}
        {data && (
          <p className="text-sm">
            {data.length} numéros distincts non revus · {excluded} exclus automatiquement (pré-filtre, pas une revue) · {queue.length} affichés
          </p>
        )}
        {queue.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="font-mono">{maskNum(r.destination_normalized)}</span>
              <Badge variant="outline">{r.lawful_basis ?? "base ?"}</Badge>
              <Badge variant="secondary">Capture auto — non revue</Badge>
            </div>
            <p className="text-sm">{r.business_relevance_explanation ?? "Pertinence non documentée"}</p>
            {r.source_url && (
              <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-sm underline break-all">
                {r.source_publisher ?? "Source"} — {r.source_url}
              </a>
            )}
            <Input placeholder="Justification de la décision" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
            <div className="flex gap-2">
              <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, ok: true })}>Approuver la base légale</Button>
              <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, ok: false })}>Rejeter</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
