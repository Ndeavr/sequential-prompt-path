/**
 * CASL human review — reuses `casl_consent_evidence` (append-only + `casl_evidence_human_review_guard`).
 * Rows are auto-captured; NONE is legally reviewed until an admin signs here.
 * Server trigger enforces: admin signing as self, ≥30 char reason, HTTPS source,
 * no approval of third-party sources (Google Places, directories, registries) as "public conspicuous".
 * A signature never enables sending: the global gate, verified mobile and 350 $ link still apply.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { classifyPrefix, reviewPriority } from "@/lib/phone/cnacPrefix";
import { approvalBlocker, bucketOf, BUCKET_LABEL, lineStates, paginate, validateDecision, MIN_NOTE, type ReviewBucket } from "@/lib/casl/reviewRules";

const QC = new Set(["514", "438", "450", "579", "418", "581", "367", "819", "873", "354", "263", "468"]);
const TOLLFREE = new Set(["800", "833", "844", "855", "866", "877", "888"]);

type Ev = {
  id: string; destination_type: string; destination_normalized: string; source_url: string | null; source_type: string | null;
  source_publisher: string | null; business_relevance_explanation: string | null; lawful_basis: string | null;
  retrieved_at: string | null; reviewer_id: string | null; reviewer_notes: string | null; refusal_statement_found: boolean | null;
  is_valid: boolean; created_at: string;
};

export const maskNum = (n: string) => (n.length >= 10 ? `${n.slice(0, 3)} •••-${n.slice(-4)}` : "•••");

export function precheck(n: string): string | null {
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(n)) return "Format invalide";
  if (TOLLFREE.has(n.slice(0, 3))) return "Numéro sans frais (pas un mobile)";
  if (!QC.has(n.slice(0, 3))) return "Indicatif hors Québec";
  return null;
}

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return "lien"; } };
const SOURCE_KIND: Record<string, string> = { company_website: "Site de l'entreprise", google_business_profile: "Google Places (tiers)", government_registry: "Registre public (tiers)" };
const FILTERS: (ReviewBucket | "all")[] = ["preuve_potentielle", "source_tierce", "exclu", "admissible_sur_preuve", "all"];

export default function CaslHumanReviewPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<ReviewBucket | "all">("preuve_potentielle");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, { note: string; opened: boolean; date: string }>>({});
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["casl-review"],
    queryFn: async () => {
      const [ev, oo, dl] = await Promise.all([
        supabase.from("casl_consent_evidence" as any)
          .select("id,destination_type,destination_normalized,source_url,source_type,source_publisher,business_relevance_explanation,lawful_basis,retrieved_at,reviewer_id,reviewer_notes,refusal_statement_found,is_valid,created_at")
          .order("created_at", { ascending: false }).limit(3000),
        supabase.from("sms_opt_outs" as any).select("normalized_phone").limit(5000),
        supabase.from("sms_events_v2" as any).select("normalized_phone").eq("status", "delivered").eq("message_type", "outreach").not("twilio_sid", "is", null).not("delivered_at", "is", null).limit(5000),
      ]);
      if (ev.error) throw ev.error; if (oo.error) throw oo.error; if (dl.error) throw dl.error;
      const norm = (p: string) => String(p).replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
      const delivered = new Set(((dl.data as any[]) ?? []).map((o) => norm(o.normalized_phone)));
      const opted = new Set(((oo.data as any[]) ?? []).map((o) => norm(o.normalized_phone)));
      const seen = new Set<string>();
      const rows = [];
      for (const r of (ev.data as unknown as Ev[]) ?? []) {
        const key = `${r.destination_type}:${r.destination_normalized}`;
        if (seen.has(key)) continue; // one card per destination (newest evidence kept, history stays in DB)
        seen.add(key);
        const isPhone = r.destination_type !== "email";
        const optedOut = isPhone && opted.has(norm(r.destination_normalized));
        const pre = isPhone ? precheck(norm(r.destination_normalized)) : null;
        const pfx = isPhone ? classifyPrefix(r.destination_normalized) : null;
        const bucket = pre && !r.reviewer_id ? "exclu" : bucketOf(r, { optedOut });
        rows.push({ ...r, isPhone, optedOut, pre, pfx, bucket, deliveredBefore: isPhone && delivered.has(norm(r.destination_normalized)) });
      }
      return rows.sort((a, b) => (b.pfx ? reviewPriority(b.pfx.class, b.deliveredBefore) : 0) - (a.pfx ? reviewPriority(a.pfx.class, a.deliveredBefore) : 0));
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of data ?? []) c[r.bucket] = (c[r.bucket] ?? 0) + 1;
    return c;
  }, [data]);
  const filtered = useMemo(() => (data ?? []).filter((r) => filter === "all" || r.bucket === filter), [data, filter]);
  const pg = paginate(filtered, page);

  const decide = useMutation({
    mutationFn: async ({ id, ok }: { id: string; ok: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Session administrateur requise");
      const f = form[id] ?? { note: "", opened: false, date: today };
      const err = validateDecision(f.note, f.opened, f.date);
      if (err) throw new Error(err);
      const text = `[HUMAIN] source consultée le ${f.date} — ${f.note.trim()}`;
      const patch = ok
        ? { reviewer_id: u.user.id, reviewer_notes: text }
        : { is_valid: false, invalidated_at: new Date().toISOString(), invalidated_reason: `human_review_rejected: ${text}`, reviewer_id: u.user.id, reviewer_notes: text };
      const { error } = await supabase.from("casl_consent_evidence" as any).update(patch).eq("id", id);
      if (error) {
        const m = error.message ?? "";
        if (m.includes("third_party")) throw new Error("Refusé : une source tierce ne peut pas être approuvée comme publication par l'entreprise");
        if (m.includes("requires_admin")) throw new Error("Refusé : réservé aux administrateurs");
        throw new Error("Décision non enregistrée");
      }
    },
    onSuccess: () => { toast.success("Décision signée et journalisée"); qc.invalidateQueries({ queryKey: ["casl-review"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Autres prospects — revue humaine LCAP</CardTitle>
        <p className="text-xs text-muted-foreground">
          Preuve captée ≠ base légale. Signer ici n'envoie rien : mobile vérifié, lien 350 $ et contrôle final restent requis.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtre de revue">
          {FILTERS.map((f) => (
            <Button key={f} role="tab" aria-selected={filter === f} size="sm" variant={filter === f ? "default" : "outline"} className="min-h-11 shrink-0"
              onClick={() => { setFilter(f); setPage(0); }}>
              {f === "all" ? "Tous" : BUCKET_LABEL[f]} {f === "all" ? data?.length ?? "" : counts[f] ?? 0}
            </Button>
          ))}
        </div>
        {isLoading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Chargement…</p>}
        {error && <div className="text-sm text-destructive">Lecture impossible (accès administrateur requis). <Button variant="link" size="sm" onClick={() => refetch()}>Réessayer</Button></div>}
        {data && pg.items.length === 0 && <p className="text-sm text-muted-foreground">Aucun dossier dans ce filtre.</p>}

        {pg.items.map((r) => {
          const blocker = approvalBlocker(r, { optedOut: r.optedOut }) ?? r.pre;
          const f = form[r.id] ?? { note: "", opened: false, date: today };
          const set = (p: Partial<typeof f>) => setForm({ ...form, [r.id]: { ...f, ...p } });
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-xl border border-border p-3 space-y-2">
              <button className="w-full text-left min-h-11" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.id)}>
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-foreground">{r.isPhone ? maskNum(r.destination_normalized.replace(/^\+?1/, "")) : r.destination_normalized.replace(/^(.).*@/, "$1•••@")}</span>
                  <Badge variant={r.bucket === "preuve_potentielle" ? "default" : "outline"}>{BUCKET_LABEL[r.bucket as ReviewBucket]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{SOURCE_KIND[r.source_type ?? ""] ?? r.source_type ?? "source ?"} · {r.source_publisher ?? "—"}</div>
              </button>
              {isOpen && (
                <div className="space-y-2 text-xs text-foreground">
                  <div className="flex flex-wrap gap-1">
                    {r.isPhone && lineStates({ prefixMobileProbable: r.pfx?.class === "prefix_mobile_probable", deliveredBefore: r.deliveredBefore, verifiedRecently: false })
                      .map((s) => <Badge key={s.key} variant="outline" title={s.tip}>{s.label}</Badge>)}
                    {r.optedOut && <Badge variant="destructive">STOP</Badge>}
                  </div>
                  <p>Pertinence : {r.business_relevance_explanation ?? "non documentée"}</p>
                  <p>Captée le {r.retrieved_at ? new Date(r.retrieved_at).toLocaleDateString("fr-CA") : "?"} · base proposée : publication bien visible (consentement implicite, à confirmer)</p>
                  {r.source_url && <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="underline text-primary inline-flex min-h-11 items-center">Ouvrir la source ({host(r.source_url)})</a>}
                  <p>Voie : {r.isPhone ? "SMS bloqué tant que le mobile n'est pas vérifié · Appel B2B à examiner (règles de télémarketing, liste interne d'exclusion)" : "Courriel à examiner (LCAP) — envois globaux désactivés"}</p>
                  {r.reviewer_id ? (
                    <p className="rounded-md bg-muted p-2">Décision signée : {r.reviewer_notes ?? "—"}</p>
                  ) : (
                    <div className="space-y-2 rounded-md border border-border p-2">
                      {blocker && <p className="text-destructive">Approbation impossible : {blocker}</p>}
                      <label className="flex items-center gap-2 min-h-11">
                        <input type="checkbox" className="h-5 w-5" checked={f.opened} onChange={(e) => set({ opened: e.target.checked })} />
                        J'ai ouvert et examiné la source, et cherché une mention de refus
                      </label>
                      <Input type="date" aria-label="Date de consultation" value={f.date} onChange={(e) => set({ date: e.target.value })} />
                      <Input placeholder={`Justification (${MIN_NOTE} caractères min.)`} value={f.note} onChange={(e) => set({ note: e.target.value })} />
                      <div className="flex gap-2">
                        {!blocker && <Button className="min-h-11 flex-1" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, ok: true })}>Approuver la base légale</Button>}
                        <Button className="min-h-11 flex-1" variant={blocker ? "default" : "outline"} disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, ok: false })}>Rejeter</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {data && pg.pages > 1 && (
          <div className="flex items-center justify-between">
            <Button variant="outline" className="min-h-11" disabled={pg.page === 0} onClick={() => setPage(pg.page - 1)}>Précédent</Button>
            <span className="text-xs text-muted-foreground">Lot {pg.page + 1} / {pg.pages} (25 max)</span>
            <Button variant="outline" className="min-h-11" disabled={pg.page >= pg.pages - 1} onClick={() => setPage(pg.page + 1)}>Suivant</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
