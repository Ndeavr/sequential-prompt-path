import { useState, useCallback } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"/, "").replace(/"$/, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"/, "").replace(/"$/, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return row;
  });
}

function extractDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch { return null; }
}

const FIELD_MAP: Record<string, string> = {
  business_name: "business_name",
  nom: "business_name",
  entreprise: "business_name",
  company: "business_name",
  name: "business_name",
  city: "city",
  ville: "city",
  category: "category",
  catégorie: "category",
  categorie: "category",
  website: "website",
  site: "website",
  site_web: "website",
  url: "website",
  email: "email",
  courriel: "email",
  phone: "phone",
  téléphone: "phone",
  telephone: "phone",
  tel: "phone",
  source: "source",
  priority_tier: "priority_tier",
  priority: "priority_tier",
  service_area: "service_area",
  zone: "service_area",
};

const AdminProspectImport = () => {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      setRows(parsed);
    };
    reader.readAsText(file);
  }, []);

  const mapRow = (raw: Record<string, string>) => {
    const mapped: Record<string, string> = {};
    for (const [key, val] of Object.entries(raw)) {
      const target = FIELD_MAP[key.toLowerCase()];
      if (target && val) mapped[target] = val;
    }
    return mapped;
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    const errors: string[] = [];
    let imported = 0;
    const usedSlugs = new Set<string>();

    for (const raw of rows) {
      try {
        const m = mapRow(raw);
        if (!m.business_name) { errors.push(`Ligne sans nom d'entreprise`); continue; }

        let slug = slugify(m.business_name);
        let suffix = 2;
        while (usedSlugs.has(slug)) { slug = `${slugify(m.business_name)}-${suffix++}`; }
        usedSlugs.add(slug);

        const domain = extractDomain(m.website);

        const { error } = await supabase.from("contractors_prospects").upsert({
          business_name: m.business_name,
          city: m.city || "Laval",
          category: m.category || null,
          website: m.website || null,
          domain,
          email: m.email || null,
          phone: m.phone || null,
          source: m.source || "csv_import",
          service_area: m.service_area || null,
          priority_tier: m.priority_tier || "B",
          landing_slug: slug,
          status: "new",
        }, { onConflict: "landing_slug" });

        if (error) { errors.push(`${m.business_name}: ${error.message}`); } else { imported++; }
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    setResult({ imported, failed: errors.length, errors });
    setImporting(false);
    if (imported > 0) toast.success(`${imported} prospects importés`);
  };

  return (
    <AdminLayout>
      <PageHeader title="Importer des prospects" description="Upload CSV pour alimenter le pipeline d'acquisition" />

      {/* Upload */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border/60 rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Glissez ou cliquez pour charger un CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
          {fileName && <p className="mt-3 text-sm flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />{fileName} — {rows.length} lignes</p>}
        </CardContent>
      </Card>

      {/* Preview */}
      {rows.length > 0 && !result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Aperçu ({Math.min(rows.length, 10)} premières lignes)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {Object.keys(rows[0] ?? {}).slice(0, 8).map((h) => (
                    <th key={h} className="p-2 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {Object.values(r).slice(0, 8).map((v, j) => (
                      <td key={j} className="p-2 truncate max-w-[150px]">{v || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
          <div className="p-4">
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importation..." : `Importer ${rows.length} prospects`}
            </Button>
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import terminé
            </div>
            <div className="flex gap-4">
              <Badge className="bg-green-500/20 text-green-400">{result.imported} importés</Badge>
              {result.failed > 0 && <Badge className="bg-red-500/20 text-red-400">{result.failed} erreurs</Badge>}
            </div>
            {result.errors.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
                {result.errors.slice(0, 20).map((e, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 text-red-400 shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminProspectImport;
