import { useMemo, useState } from "react";
import { Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { useImportContractors } from "@/hooks/useAcquisitionFunnel";

const SAMPLE = "Company,Contact,Phone,Email,Website,City,Category\nToiture Exemple,Marc Tremblay,514-555-0101,info@example.com,example.com,Laval,toiture";

function parseDelimited(text: string): Array<Record<string, string>> {
  const cleaned = text.trim();
  if (!cleaned) return [];
  const delimiter = cleaned.includes("\t") ? "\t" : ",";
  const lines = cleaned.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
}

export default function PageAdminImportContractors() {
  const [raw, setRaw] = useState(SAMPLE);
  const [result, setResult] = useState<any>(null);
  const importer = useImportContractors();
  const rows = useMemo(() => parseDelimited(raw), [raw]);

  async function handleFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setRaw(text);
  }

  async function submit() {
    if (rows.length === 0) {
      toast.error("Aucune ligne importable");
      return;
    }
    try {
      const response = await importer.mutateAsync({ rows, auto_send: true });
      setResult(response);
      toast.success(`${response.imported ?? 0} entreprises importées · ${response.queued ?? 0} en file`);
    } catch (e: any) {
      toast.error("Import échoué", { description: e?.message ?? "Erreur inconnue" });
    }
  }

  return (
    <div className="admin-theme min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl p-5 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Import Contractors</h1>
          <p className="text-sm text-white/70 mt-1">CSV, lignes Excel collées, ou fichier texte — validation, enrichissement, file et envoi sans clic additionnel.</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-wide text-white/50">Données</div>
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs hover:bg-white/[0.08] cursor-pointer">
                <Upload className="w-4 h-4" /> Fichier CSV
                <input className="hidden" type="file" accept=".csv,.txt,.tsv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="min-h-[360px] w-full rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-white outline-none focus:border-cyan-400/40"
              spellCheck={false}
            />
            <button
              onClick={submit}
              disabled={importer.isPending || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" /> Importer · valider · envoyer
            </button>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wide text-white/50">Aperçu</div>
              <div className="mt-2 text-4xl font-semibold">{rows.length}</div>
              <div className="text-sm text-white/60">lignes détectées</div>
            </div>
            {result && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm">
                <div className="font-semibold text-emerald-200">Import terminé</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-white/80">
                  <span>Importées</span><strong>{result.imported}</strong>
                  <span>Validées</span><strong>{result.verified}</strong>
                  <span>En file</span><strong>{result.queued}</strong>
                  <span>Envoyées</span><strong>{result.sent}</strong>
                  <span>Erreurs</span><strong>{result.errors}</strong>
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-wide text-white/50">Colonnes attendues</div>
              <div className="mt-2 text-sm text-white/70">Company, Contact, Phone, Email, Website, City, Category</div>
            </div>
          </aside>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-xs">
            <thead className="bg-white/[0.04] text-white/60"><tr>{["Company","Contact","Phone","Email","Website","City","Category"].map((h) => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{rows.slice(0, 20).map((row, i) => <tr key={i} className="border-t border-white/5">{["Company","Contact","Phone","Email","Website","City","Category"].map((h) => <td key={h} className="px-3 py-2 text-white/70">{row[h] ?? "—"}</td>)}</tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );
}