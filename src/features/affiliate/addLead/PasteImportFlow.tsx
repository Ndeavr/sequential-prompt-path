/**
 * Coller une liste / importer un CSV → aperçu modifiable → brouillon « Mes imports ».
 * Aucune réservation, aucun contact, aucune commission à l'import.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseList, validateListFile, stageImport, ACCEPTED_LIST_TYPES, type StageRow, type StageResult, type StageSource } from "./stageImport";
import { StageResultList } from "./StageResultList";

export function PasteImportFlow({ mode }: { mode: "paste" | "csv" }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<StageRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<StageResult[] | null>(null);

  const preview = (t: string) => {
    const { rows: r, truncated } = parseList(t);
    if (r.length === 0) return toast.error("Aucune ligne reconnue.");
    if (truncated) toast.warning("Seules les 100 premières lignes sont gardées pour ce lot.");
    setRows(r);
  };

  async function onFile(f: File | undefined) {
    if (!f) return;
    const err = validateListFile(f);
    if (err) return toast.error(err);
    setFileName(f.name);
    preview(await f.text());
  }

  async function save() {
    if (!rows) return;
    setBusy(true);
    try {
      setResults(await stageImport(rows, (mode === "csv" ? "csv" : "paste") as StageSource, fileName));
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  if (results && rows) return <StageResultList rows={rows} results={results} />;

  if (rows) {
    const edit = (i: number, k: keyof StageRow, v: string) =>
      setRows((prev) => prev!.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    return (
      <div className="space-y-3">
        <p className="text-sm text-foreground">{rows.length} ligne{rows.length > 1 ? "s" : ""} reconnue{rows.length > 1 ? "s" : ""}. Corrigez au besoin.</p>
        <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
          {rows.map((r, i) => (
            <li key={i} className="rounded-xl border border-border/40 p-2 grid grid-cols-2 gap-2">
              <Input aria-label={`Entreprise ligne ${i + 1}`} className="col-span-2 h-10" value={r.company_name ?? ""} placeholder="Entreprise" onChange={(e) => edit(i, "company_name", e.target.value)} />
              <Input aria-label={`Téléphone ligne ${i + 1}`} className="h-10" inputMode="tel" value={r.phone ?? ""} placeholder="Téléphone" onChange={(e) => edit(i, "phone", e.target.value)} />
              <Input aria-label={`Ville ligne ${i + 1}`} className="h-10" value={r.city ?? ""} placeholder="Ville" onChange={(e) => edit(i, "city", e.target.value)} />
              {(r.email || r.website) && <p className="col-span-2 text-[11px] text-muted-foreground truncate">{[r.email, r.website].filter(Boolean).join(" · ")}</p>}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">Enregistré dans « Mes imports » seulement : aucune réservation, aucun envoi, aucune commission.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setRows(null)} disabled={busy}>Modifier la liste</Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Enregistrer et vérifier</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "paste" ? (
        <>
          <p className="text-sm text-muted-foreground">Collez votre liste : une entreprise par ligne, ou des colonnes copiées d'un tableur (nom, téléphone, ville…).</p>
          <Textarea aria-label="Liste à coller" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Toiture Tremblay\t514 555-0199\tLaval"} />
          <Button className="w-full h-12" disabled={!text.trim()} onClick={() => preview(text)}>Voir l'aperçu</Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Fichier CSV ou texte, 100 lignes maximum. Pour Excel, enregistrez d'abord en CSV.</p>
          <Input type="file" accept={ACCEPTED_LIST_TYPES.join(",")} aria-label="Fichier CSV" onChange={(e) => onFile(e.target.files?.[0])} />
        </>
      )}
    </div>
  );
}
