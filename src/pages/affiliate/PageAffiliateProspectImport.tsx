/**
 * PageAffiliateProspectImport — Copier-coller / CSV → prospects assignés.
 * Route: /affiliate/prospects/import
 *
 * MVP flow:
 * 1. Paste text or upload CSV
 * 2. Analyze (detect columns, map, normalize phones)
 * 3. Preview with dedupe/invalid flags
 * 4. Commit — insert into contractor_leads with assigned_affiliate_id
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateSelf } from "@/hooks/useAffiliateSelf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Wand2, Loader2, CheckCircle2, AlertTriangle, Copy as CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { normalizePhone } from "@/lib/normalizePhone";

type ParsedRow = {
  company_name?: string;
  contact_name?: string;
  phone?: string;
  phone_e164?: string | null;
  email?: string;
  website?: string;
  city?: string;
  category?: string;
  status: "ready" | "invalid" | "duplicate";
  reason?: string;
  raw: string;
};

const HEADER_MAP: Record<string, keyof ParsedRow | "note"> = {
  company: "company_name", entreprise: "company_name", "nom entreprise": "company_name", "nom de l'entreprise": "company_name",
  contact: "contact_name", nom: "contact_name", owner: "contact_name", proprietaire: "contact_name",
  phone: "phone", tel: "phone", telephone: "phone", mobile: "phone", "téléphone": "phone",
  email: "email", courriel: "email", "e-mail": "email",
  website: "website", site: "website", url: "website",
  city: "city", ville: "city", location: "city",
  category: "category", categorie: "category", "catégorie": "category", trade: "category",
};

function detectDelimiter(line: string): string {
  const counts = { "\t": (line.match(/\t/g) || []).length, ";": (line.match(/;/g) || []).length, ",": (line.match(/,/g) || []).length };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseText(text: string): ParsedRow[] {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const delim = detectDelimiter(lines[0]);
  const first = lines[0].split(delim).map((s) => s.trim().replace(/^"|"$/g, "").toLowerCase());
  const hasHeader = first.some((cell) => Object.keys(HEADER_MAP).some((k) => cell.includes(k)));
  const headerMap: (keyof ParsedRow | "note" | null)[] = hasHeader
    ? first.map((cell) => {
        for (const [k, v] of Object.entries(HEADER_MAP)) if (cell.includes(k)) return v;
        return null;
      })
    : ["company_name", "contact_name", "phone", "email", "website", "city", "category"];

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: ParsedRow = { status: "ready", raw: line };
    cells.forEach((cell, i) => {
      const key = headerMap[i];
      if (key && key !== "note") (row as any)[key] = cell;
    });

    // Fallback: try to find phone/email/city in unstructured cells if no header
    if (!hasHeader) {
      for (const cell of cells) {
        if (!row.phone && /[\d\-\(\)\s]{7,}/.test(cell) && cell.replace(/\D/g, "").length >= 10) row.phone = cell;
        if (!row.email && /@/.test(cell)) row.email = cell;
      }
    }

    // Normalize phone
    if (row.phone) {
      const norm = normalizePhone(row.phone);
      row.phone_e164 = norm.normalized;
      if (!norm.valid) { row.status = "invalid"; row.reason = "Téléphone invalide"; }
    }
    if (!row.company_name && !row.phone_e164 && !row.email) {
      row.status = "invalid"; row.reason = "Ligne incomplète";
    }
    return row;
  });
}

export default function PageAffiliateProspectImport() {
  const nav = useNavigate();
  const { data: affiliate } = useAffiliateSelf();
  const [step, setStep] = useState<"input" | "preview" | "done">("input");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; duplicates: number; invalid: number } | null>(null);

  const counts = useMemo(() => ({
    total: rows.length,
    ready: rows.filter((r) => r.status === "ready").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
  }), [rows]);

  async function handleFile(file: File) {
    const t = await file.text();
    setText(t);
  }

  async function analyze() {
    if (!text.trim()) return toast.error("Collez ou importez d'abord une liste.");
    setBusy(true);
    try {
      const parsed = parseText(text);
      if (parsed.length === 0) return toast.error("Aucune ligne détectée");

      // Dedupe against existing leads
      const phones = parsed.map((r) => r.phone_e164).filter(Boolean) as string[];
      const emails = parsed.map((r) => r.email?.toLowerCase()).filter(Boolean) as string[];
      const existing = new Set<string>();
      if (phones.length || emails.length) {
        const { data } = await (supabase as any).from("contractor_leads")
          .select("phone_e164, email")
          .or(`phone_e164.in.(${phones.map((p) => `"${p}"`).join(",") || '""'}),email.in.(${emails.map((e) => `"${e}"`).join(",") || '""'})`);
        (data ?? []).forEach((d: any) => {
          if (d.phone_e164) existing.add(`p:${d.phone_e164}`);
          if (d.email) existing.add(`e:${d.email.toLowerCase()}`);
        });
      }

      const flagged = parsed.map((r) => {
        if (r.status === "invalid") return r;
        const dup = (r.phone_e164 && existing.has(`p:${r.phone_e164}`)) || (r.email && existing.has(`e:${r.email.toLowerCase()}`));
        if (dup) return { ...r, status: "duplicate" as const, reason: "Existe déjà" };
        return r;
      });

      setRows(flagged);
      setStep("preview");
    } catch (e: any) {
      toast.error(e.message || "Analyse impossible");
    } finally { setBusy(false); }
  }

  async function commit() {
    if (!affiliate) return toast.error("Profil affilié manquant");
    setBusy(true);
    try {
      // Create batch
      const { data: batch, error: batchErr } = await (supabase as any)
        .from("affiliate_import_batches")
        .insert({
          affiliate_id: affiliate.id,
          source_type: "paste",
          total_rows: counts.total,
          valid_rows: counts.ready,
          duplicate_rows: counts.duplicate,
          invalid_rows: counts.invalid,
          status: "importing",
        })
        .select("id")
        .single();
      if (batchErr) throw batchErr;

      const readyRows = rows.filter((r) => r.status === "ready");
      const payload = readyRows.map((r) => ({
        source_type: "affiliate_import",
        source_label: `batch:${batch.id}`,
        company_name: r.company_name || null,
        full_name: r.contact_name || null,
        email: r.email?.toLowerCase() || null,
        phone: r.phone || null,
        phone_e164: r.phone_e164 || null,
        website_url: r.website || null,
        city: r.city || null,
        province: "QC",
        category_primary: r.category || null,
        created_by_affiliate_id: affiliate.id,
        assigned_affiliate_id: affiliate.id,
        consent_to_contact: "unknown",
        consent_channel: "affiliate_import",
        lead_status: "new",
        attribution_type: "affiliate_import",
      }));

      let imported = 0;
      if (payload.length > 0) {
        const { data, error } = await (supabase as any).from("contractor_leads").insert(payload).select("id");
        if (error) throw error;
        imported = data?.length ?? 0;
      }

      await (supabase as any).from("affiliate_import_batches").update({
        imported_rows: imported, status: "completed", completed_at: new Date().toISOString(),
      }).eq("id", batch.id);

      setResult({ imported, duplicates: counts.duplicate, invalid: counts.invalid });
      setStep("done");
      toast.success(`${imported} prospects ajoutés`);
    } catch (e: any) {
      toast.error(e.message || "Import échoué");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav("/affiliate")}><ArrowLeft className="h-4 w-4 mr-1" />Retour</Button>
          <div>
            <h1 className="text-2xl font-semibold">Importer une liste de prospects</h1>
            <p className="text-sm text-muted-foreground">Collez depuis Excel, Google Sheets ou un fichier CSV.</p>
          </div>
        </header>

        {step === "input" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Format libre — le système détecte les colonnes automatiquement.</span>
                <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted cursor-pointer">
                  <Upload className="h-4 w-4" /> Fichier CSV / TXT
                  <input type="file" className="hidden" accept=".csv,.txt,.tsv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </label>
              </div>
              <Textarea
                rows={14}
                placeholder={"Entreprise, Contact, Téléphone, Courriel, Ville, Catégorie\nToitures ABC, Marc, 514-555-0101, marc@abc.ca, Laval, toiture\nPlomberie Martin, martin@plomberiemartin.ca, Montréal"}
                className="font-mono text-xs"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button onClick={analyze} disabled={busy || !text.trim()} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Analyser la liste
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="Total" value={counts.total} />
              <StatCard label="Prêts" value={counts.ready} tone="ready" />
              <StatCard label="Doublons" value={counts.duplicate} tone="warn" />
              <StatCard label="Invalides" value={counts.invalid} tone="danger" />
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="max-h-[480px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left">
                        <th className="p-2">Statut</th>
                        <th className="p-2">Entreprise</th>
                        <th className="p-2">Contact</th>
                        <th className="p-2">Téléphone</th>
                        <th className="p-2">Courriel</th>
                        <th className="p-2">Ville</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">
                            {r.status === "ready" && <Badge variant="default" className="bg-emerald-500/20 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Prêt</Badge>}
                            {r.status === "duplicate" && <Badge variant="secondary"><CopyIcon className="h-3 w-3 mr-1" />Doublon</Badge>}
                            {r.status === "invalid" && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{r.reason}</Badge>}
                          </td>
                          <td className="p-2">{r.company_name || "—"}</td>
                          <td className="p-2">{r.contact_name || "—"}</td>
                          <td className="p-2 font-mono text-xs">{r.phone_e164 || r.phone || "—"}</td>
                          <td className="p-2 text-xs">{r.email || "—"}</td>
                          <td className="p-2">{r.city || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("input")}>Modifier</Button>
              <Button onClick={commit} disabled={busy || counts.ready === 0} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Importer {counts.ready} prospects
              </Button>
            </div>
          </>
        )}

        {step === "done" && result && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h2 className="text-2xl font-semibold">Import terminé</h2>
              <p className="text-muted-foreground">
                <strong>{result.imported}</strong> ajoutés · {result.duplicates} doublons ignorés · {result.invalid} invalides
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button onClick={() => nav("/affiliate")}>Voir mes prospects</Button>
                <Button variant="outline" onClick={() => { setStep("input"); setText(""); setRows([]); setResult(null); }}>Nouvel import</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "ready" | "warn" | "danger" }) {
  const tones: Record<string, string> = {
    ready: "border-emerald-500/40 bg-emerald-500/5",
    warn: "border-amber-500/40 bg-amber-500/5",
    danger: "border-destructive/40 bg-destructive/5",
  };
  return (
    <div className={`rounded-xl border p-4 ${tone ? tones[tone] : "bg-card"}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
